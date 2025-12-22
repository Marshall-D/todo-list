// app/hooks/useVoice.ts

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";
import type { Task } from "../../App";

/**
 * useVoice - voice-to-task hook using device speech recognition (expo-speech-recognition).
 *
 * Goals & behavior:
 * - Provide an accessible Start / Stop flow so users explicitly start recording.
 * - Capture intermediate and final results produced by the native recognizer and prefer the most confident alternative.
 * - Normalize and split final transcription into individual tasks (splitters like commas/and/then/or).
 * - Preserve earlier captured segments for long recordings by preferring finalTextRef and falling back to interimTextRef.
 * - Retry logic / watchdog to handle recognizer timeouts and no-speech events.
 *
 * Notes:
 * - The native event typings are conservative; we cast event args to `any` where we rely on fields (transcript, alternatives, results).
 * - This hook persists tasks via getStoredTasks/saveTasks and triggers onRefresh after saving.
 */
export type UseVoiceReturn = {
  fabOptionsVisible: boolean;
  setFabOptionsVisible: (v: boolean) => void;
  voiceModalVisible: boolean;
  setVoiceModalVisible: (v: boolean) => void;
  listening: boolean;
  interimText: string;
  finalText: string;
  retryCount: number;
  MAX_RETRIES: number;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  operationModalVisible: boolean;
  operationModalTitle?: string;
  operationModalMsg?: string;
  setOperationModalVisible: (v: boolean) => void;
};

export function useVoice(onRefresh: () => Promise<any> | void): UseVoiceReturn {
  // maximum retries when no-speech / watchdog triggers
  const MAX_RETRIES = 3;

  // UI state for the FAB options modal
  const [fabOptionsVisible, setFabOptionsVisible] = useState(false);

  // voice modal (where Start / Stop is shown)
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const voiceModalVisibleRef = useRef<boolean>(voiceModalVisible);
  useEffect(() => {
    voiceModalVisibleRef.current = voiceModalVisible;
  }, [voiceModalVisible]);

  // whether the recognizer is currently listening
  const [listening, setListening] = useState(false);

  // interimText: immediate partial results from the recognizer (frequent updates)
  const [interimText, setInterimText] = useState("");
  const interimTextRef = useRef<string>(interimText);
  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  // finalText: more stable "result" updates from the recognizer
  const [finalText, setFinalText] = useState("");
  const finalTextRef = useRef<string>(finalText);
  useEffect(() => {
    finalTextRef.current = finalText;
  }, [finalText]);

  // operation modal (for errors / notices)
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [operationModalTitle, setOperationModalTitle] = useState<
    string | undefined
  >(undefined);
  const [operationModalMsg, setOperationModalMsg] = useState<
    string | undefined
  >(undefined);

  // retry counter (exposed so UI can show attempts if desired)
  const [retryCount, setRetryCount] = useState(0);
  const retryCountRef = useRef<number>(retryCount);
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  // watchdog timer ref - stops listening after a timeout and optionally restarts
  const watchdogRef = useRef<number | null>(null);

  // guard to ensure stopListening's processing runs only once at a time
  const processingRef = useRef(false);

  /**
   * chooseBestAlternative - helper that picks the alternative with the highest numeric confidence
   * if confidences exist; otherwise pick a random alternative as a fallback.
   *
   * Reason: some recognizers produce multiple alternatives with confidence scores; preferring the
   * highest-confidence choice reduces noisy outputs.
   */
  const chooseBestAlternative = useCallback((alternatives: any[]) => {
    if (!Array.isArray(alternatives) || alternatives.length === 0)
      return undefined;
    let bestIdx = 0;
    let bestConf: number | null = null;
    let allConfMissing = true;
    for (let i = 0; i < alternatives.length; i++) {
      const conf =
        typeof alternatives[i]?.confidence === "number"
          ? alternatives[i].confidence
          : null;
      if (conf !== null) {
        allConfMissing = false;
        if (bestConf === null || conf > (bestConf ?? -Infinity)) {
          bestConf = conf;
          bestIdx = i;
        }
      }
    }
    if (!allConfMissing && bestConf !== null) {
      return (
        alternatives[bestIdx].transcript ??
        alternatives[bestIdx].text ??
        undefined
      );
    }
    const pickIdx = Math.floor(Math.random() * alternatives.length);
    return (
      alternatives[pickIdx].transcript ??
      alternatives[pickIdx].text ??
      undefined
    );
  }, []);

  /**
   * extractTranscriptFromEvent - robust extractor that reads the most plausible text string
   * out of a variety of shapes the native recognizer might emit (transcript, alternatives, results, text).
   *
   * - Prefers single highest-confidence alternative if present.
   * - If results is present with multiple sub-results, collects one best alternative per result to preserve order.
   * - Returns `undefined` when no usable text is present.
   *
   * Accepts `any` shaped event because the library typings don't expose the full runtime shape.
   */
  const extractTranscriptFromEvent = useCallback(
    (ev: any): string | undefined => {
      if (!ev) return undefined;

      // 1) direct transcript field (very common)
      if (typeof ev.transcript === "string" && ev.transcript.trim()) {
        return ev.transcript.trim();
      }

      // 2) top-level alternatives array
      if (Array.isArray(ev.alternatives) && ev.alternatives.length > 0) {
        const best = chooseBestAlternative(ev.alternatives);
        if (best) return best.trim();
      }

      // 3) results array (some recognizers provide a results[] with alternatives inside)
      if (Array.isArray(ev.results) && ev.results.length > 0) {
        const flatAlts: { transcript: string; confidence: number | null }[] =
          [];

        for (const r of ev.results) {
          if (!r) continue;

          // Use alternatives[] when available (preferred)
          if (Array.isArray(r.alternatives) && r.alternatives.length > 0) {
            for (const a of r.alternatives) {
              const txt = (a?.transcript ?? a?.text ?? "").trim();
              const conf =
                typeof a?.confidence === "number" ? a.confidence : null;
              if (txt) flatAlts.push({ transcript: txt, confidence: conf });
            }
            continue;
          }

          // Some results have transcript + confidence at top level
          if (typeof r.transcript === "string" && r.transcript.trim()) {
            const txt = r.transcript.trim();
            const conf = typeof r.confidence === "number" ? r.confidence : null;
            flatAlts.push({ transcript: txt, confidence: conf });
            continue;
          }

          // legacy fallback for other text fields
          if (typeof r.text === "string" && r.text.trim()) {
            flatAlts.push({ transcript: r.text.trim(), confidence: null });
          }
        }

        // If numeric confidences exist, pick the single alt with the highest confidence
        const numericConfs = flatAlts.filter(
          (a) => typeof a.confidence === "number"
        );
        if (numericConfs.length > 0) {
          let maxConf = -Infinity;
          for (const a of numericConfs) {
            if ((a.confidence ?? -Infinity) > maxConf)
              maxConf = a.confidence ?? -Infinity;
          }
          const candidates = numericConfs.filter(
            (a) => (a.confidence ?? -Infinity) === maxConf
          );
          const chosen =
            candidates.length === 1
              ? candidates[0]
              : candidates[Math.floor(Math.random() * candidates.length)];
          return chosen.transcript;
        }

        // No numeric confidences: build sequential parts, taking one best alternative per result.
        const parts: string[] = [];
        for (const r of ev.results) {
          if (!r) continue;
          if (Array.isArray(r.alternatives) && r.alternatives.length > 0) {
            const best = chooseBestAlternative(r.alternatives);
            if (best) parts.push(best.trim());
            continue;
          }
          if (typeof r.transcript === "string" && r.transcript.trim()) {
            parts.push(r.transcript.trim());
            continue;
          }
          if (typeof r.text === "string" && r.text.trim()) {
            parts.push(r.text.trim());
          }
        }
        const collected = parts.join(" ").trim();
        if (collected) return collected;
      }

      // 4) fallbacks
      if (typeof ev.text === "string" && ev.text.trim()) return ev.text.trim();
      if (typeof ev.value === "string" && ev.value.trim())
        return ev.value.trim();
      return undefined;
    },
    [chooseBestAlternative]
  );

  /**
   * normalizeTranscript - lightweight post-processing to:
   * - collapse duplicate words produced by noisy recognizers,
   * - trim excessive whitespace,
   * - remove spaces before punctuation.
   *
   * This is intentionally conservative: we avoid heavy rewriting to not accidentally change user intent.
   */
  const normalizeTranscript = useCallback((txt: string) => {
    if (!txt) return "";
    let s = txt.trim();
    s = s.replace(/\s+/g, " ");
    s = s.replace(/\b(\w+)(?: \1\b)+/gi, "$1"); // remove adjacent duplicates like "to to to"
    const words = s.split(" ");
    const cleaned: string[] = [];
    let i = 0;
    while (i < words.length) {
      let consumed = false;
      // detect repeated n-gram patterns and collapse them (e.g., "buy milk buy milk")
      for (const n of [3, 2, 1]) {
        if (i + n * 2 - 1 < words.length) {
          const a = words
            .slice(i, i + n)
            .map((w) => w.toLowerCase())
            .join(" ");
          const b = words
            .slice(i + n, i + n * 2)
            .map((w) => w.toLowerCase())
            .join(" ");
          if (a === b) {
            cleaned.push(...words.slice(i, i + n));
            i += n * 2;
            consumed = true;
            break;
          }
        }
      }
      if (!consumed) {
        cleaned.push(words[i]);
        i += 1;
      }
    }
    let result = cleaned.join(" ").trim();
    result = result.replace(/\b(\w+)(?: \1\b)+/gi, "$1");
    result = result.replace(/\s+([,.;?!])/g, "$1");
    return result;
  }, []);

  /**
   * parseTranscriptionToTasks - split a final transcription into likely task titles.
   *
   * - Splits on common delimiters: commas, semicolons, "and", "then", "or", ampersand.
   * - If only one part is detected but it contains 'and' inside, a fallback split is attempted.
   *
   * This is intentionally heuristic — the task of deciding what constitutes separate actionable tasks
   * from free speech is subjective, so keep these rules simple and predictable.
   */
  const parseTranscriptionToTasks = useCallback((text: string): string[] => {
    if (!text || !text.trim()) return [];
    const splitter = /\s*(?:,|;|\band\b|\bthen\b|\bor\b|&)\s*/i;
    const parts = text
      .split(splitter)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 1) {
      const fallback = text
        .split(/\s+and\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (fallback.length > 1) return fallback;
    }

    return parts;
  }, []);

  /**
   * areSimilar - cheap heuristic to dedupe very similar task titles.
   * Uses word-overlap normalized to the shorter title length.
   */
  const areSimilar = useCallback((a: string, b: string) => {
    const wa = a.toLowerCase().split(/\s+/).filter(Boolean);
    const wb = b.toLowerCase().split(/\s+/).filter(Boolean);
    if (wa.length === 0 || wb.length === 0) return false;
    const setA = new Set(wa);
    let common = 0;
    for (const w of wb) if (setA.has(w)) common++;
    const denom = Math.min(wa.length, wb.length);
    return denom > 0 && common / denom >= 0.6; // 60% overlap => similar
  }, []);

  // Reference for calling startListening from watchdog retries
  const startListeningRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * startWatchdog - when listening, schedule a timer that will stop the recognizer if no results arrive.
   *
   * - If no interim/final text is produced, it will attempt restarts up to MAX_RETRIES.
   * - After retries exhausted, show an operation modal indicating no speech was detected.
   *
   * The default timeout is set to 20s but you can tweak as necessary if recognizer behaves differently on some devices.
   */
  const startWatchdog = useCallback(
    (timeoutMs = 20000) => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
      }
      watchdogRef.current = setTimeout(() => {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {
          // ignore stop errors
        }
        setListening(false);

        // If we have not collected any interim or final text, attempt restart logic
        if (!finalTextRef.current && !interimTextRef.current) {
          if (retryCountRef.current < MAX_RETRIES) {
            const next = retryCountRef.current + 1;
            setRetryCount(next);
            setTimeout(() => {
              if (!voiceModalVisibleRef.current) return;
              if (startListeningRef.current) startListeningRef.current();
            }, 400);
          } else {
            setOperationModalTitle("No speech detected");
            setOperationModalMsg(
              "No speech was captured. Try again with a quieter environment or check microphone permissions."
            );
            setOperationModalVisible(true);
          }
        }
        watchdogRef.current = null;
      }, timeoutMs) as unknown as number;
    },
    [MAX_RETRIES]
  );

  /**
   * startListening - request permissions and start the native recognizer.
   *
   * - Resets retry/final/interim buffers so each recording starts clean.
   * - Sets listening=true and starts the watchdog.
   */
  const startListening = useCallback(async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm?.granted) {
        setOperationModalTitle("Permission denied");
        setOperationModalMsg(
          "Please allow microphone / speech permissions in settings."
        );
        setOperationModalVisible(true);
        return;
      }

      setRetryCount(0);
      setFinalText("");
      finalTextRef.current = "";
      setInterimText("");
      interimTextRef.current = "";
      processingRef.current = false;
      setListening(true);

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });

      startWatchdog(18000);
    } catch (err) {
      console.error("[speech] startListening error", err);
      setOperationModalTitle("Error");
      setOperationModalMsg("Failed to start speech recognition.");
      setOperationModalVisible(true);
      setListening(false);
    }
  }, [startWatchdog]);

  // publish startListening to a ref so watchdog retries can call it
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  /**
   * stopListening - called when user taps Stop (or when app wants to finalize recognition).
   *
   * Process:
   * 1) stop the native recognizer (best-effort).
   * 2) prefer finalTextRef over interimTextRef to preserve earlier captured segments.
   * 3) normalize -> split into candidate task titles.
   * 4) dedupe and collapse heuristically to produce finalCandidates.
   * 5) persist tasks and trigger onRefresh.
   */
  const stopListening = useCallback(async () => {
    if (processingRef.current) {
      return; // prevent duplicate processing
    }
    processingRef.current = true;

    try {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (err) {
        console.warn("[speech] stop error", err);
      }

      setListening(false);

      // prefer finalText, fallback to interim (this preserves earlier captures when OS overwrites)
      const transcript = (
        finalTextRef.current ||
        interimTextRef.current ||
        ""
      ).trim();

      // clear UI buffers
      setInterimText("");
      interimTextRef.current = "";
      setFinalText("");
      finalTextRef.current = "";

      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }

      // close voice UI
      setVoiceModalVisible(false);
      setFabOptionsVisible(false);

      if (!transcript) {
        setOperationModalTitle("No speech detected");
        setOperationModalMsg("We didn't catch anything — try again.");
        setOperationModalVisible(true);
        processingRef.current = false;
        return;
      }

      // normalize and split transcription into parts
      const normalized = normalizeTranscript(transcript);
      let titlesRaw = parseTranscriptionToTasks(normalized);

      // If user actually provided splitters, we can keep multiple parts.
      // But if multiple parts returned with NO splitter token, collapse — often recognizer returns variants.
      const hadSplitter = /,|;|\band\b|\bthen\b|\bor\b|&/i.test(normalized);

      if (titlesRaw.length > 1 && !hadSplitter) {
        // pick the longest part (assume most complete)
        let longest = titlesRaw[0];
        for (const t of titlesRaw) {
          if (t.length > longest.length) longest = t;
        }
        titlesRaw = [longest];
      }

      // Dedupe near-duplicates using areSimilar heuristic and filter tiny entries.
      const seenLower = new Set<string>();
      const finalCandidates: string[] = [];
      for (const t of titlesRaw.map((s) => s.trim()).filter(Boolean)) {
        if (t.length <= 1) continue;
        const lower = t.toLowerCase();
        let skip = false;
        for (const kept of finalCandidates) {
          if (areSimilar(kept, t)) {
            // keep the longer title if similar
            if (t.length > kept.length) {
              const idx = finalCandidates.indexOf(kept);
              finalCandidates.splice(idx, 1, t);
            }
            skip = true;
            break;
          }
        }
        if (!skip && !seenLower.has(lower)) {
          finalCandidates.push(t);
          seenLower.add(lower);
        }
      }

      // If still multiple candidates but no splitter found, collapse to one (avoid duplicates)
      if (finalCandidates.length > 1 && !hadSplitter) {
        let longest = finalCandidates[0];
        for (const t of finalCandidates)
          if (t.length > longest.length) longest = t;
        finalCandidates.splice(0, finalCandidates.length, longest);
      }

      if (finalCandidates.length === 0) {
        setOperationModalTitle("No tasks found");
        setOperationModalMsg("Could not parse tasks from speech.");
        setOperationModalVisible(true);
        processingRef.current = false;
        return;
      }

      // Persist tasks in a batch and refresh UI
      try {
        const stored = (await getStoredTasks()) || [];
        const now = Date.now();
        const newTasks: Task[] = finalCandidates.map((title, i) => ({
          id: (now + i).toString(),
          title,
          description: undefined,
          completed: false,
          createdAt: now + i,
        }));
        const updated = [...newTasks, ...stored];
        await saveTasks(updated);
        await onRefresh();
        setOperationModalTitle("Added tasks");
        setOperationModalMsg(
          `Added ${newTasks.length} task${newTasks.length > 1 ? "s" : ""}.`
        );
        setOperationModalVisible(true);
      } catch (err) {
        console.error("[speech] adding tasks error", err);
        setOperationModalTitle("Error");
        setOperationModalMsg("Failed to save tasks.");
        setOperationModalVisible(true);
      }
    } finally {
      processingRef.current = false;
    }
  }, [normalizeTranscript, parseTranscriptionToTasks, onRefresh, areSimilar]);

  // === Event handlers ===
  // Note: useSpeechRecognitionEvent's TypeScript signature may not include these string keys.
  // We cast the event name to any and the handler event param to any because runtime events
  // include fields like `transcript`, `alternatives`, `results` that the typings don't expose.

  // Interim results - often fast partial transcripts, update UI so the user sees feedback.
  useSpeechRecognitionEvent("interim" as any, (event: any) => {
    const t = extractTranscriptFromEvent(event);
    if (t) {
      setInterimText(t);
      interimTextRef.current = t;
    } else {
      setInterimText(event.transcript ?? "");
      interimTextRef.current = event.transcript ?? "";
    }
  });

  // Result events - more stable segments. We normalize and store into finalTextRef.
  useSpeechRecognitionEvent("result" as any, (event: any) => {
    const t = extractTranscriptFromEvent(event);
    if (t) {
      const normalized = normalizeTranscript(t);
      setFinalText(normalized);
      finalTextRef.current = normalized;
    } else if (typeof event.transcript === "string") {
      const t2 = event.transcript.trim();
      const normalized = normalizeTranscript(t2);
      setFinalText(normalized);
      finalTextRef.current = normalized;
    }
    // reset interim after a result arrives (we now have a stable piece)
    setInterimText("");
    interimTextRef.current = "";
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  });

  // Error events from native recognizer. We handle no-speech and network separately.
  useSpeechRecognitionEvent("error" as any, (ev: any) => {
    console.warn("[speech error]", ev);

    const code =
      typeof ev?.code === "number"
        ? ev.code
        : typeof ev?.code === "string"
          ? Number(ev.code)
          : undefined;

    const message = ev?.message ?? ev?.error ?? "Unknown error";
    const isNoSpeech =
      code === 7 ||
      ev?.error === "no-speech" ||
      (typeof message === "string" &&
        message.toLowerCase().includes("no speech"));
    const isNetwork =
      code === 2 ||
      ev?.error === "network" ||
      (typeof message === "string" &&
        message.toLowerCase().includes("network"));

    // retry on no-speech up to MAX_RETRIES, else show modal
    if (isNoSpeech && voiceModalVisibleRef.current) {
      if (retryCountRef.current < MAX_RETRIES) {
        const next = retryCountRef.current + 1;
        setRetryCount(next);
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {
          // ignore
        }
        setTimeout(() => {
          if (!voiceModalVisibleRef.current) return;
          if (startListeningRef.current) startListeningRef.current();
        }, 400);
        return;
      }
      setOperationModalTitle("No speech detected");
      setOperationModalMsg(
        "We couldn't detect speech after several attempts. Make sure microphone is enabled and try again."
      );
      setOperationModalVisible(true);
      setListening(false);
      return;
    }

    if (isNetwork) {
      setListening(false);
      setOperationModalTitle("Network error");
      setOperationModalMsg(
        "Speech recognition reported a network error. Check your internet connection and that the device has speech services (e.g., Google app / Speech Services on Android). You can retry."
      );
      setOperationModalVisible(true);
      return;
    }

    // Generic fallback error presentation
    setListening(false);
    setOperationModalTitle("Speech error");
    setOperationModalMsg(String(message));
    setOperationModalVisible(true);
  });

  /**
   * NOTE: Changed — do NOT auto-start when the modal opens.
   * The user must press Start. This avoids the recognizer immediately starting and potentially
   * missing earlier speech due to OS overwriting or other focus issues.
   */
  useEffect(() => {
    if (voiceModalVisible) {
      setRetryCount(0);
      // Do not auto-start; user must tap Start.
      return;
    } else {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        // ignore stop errors
      }
      // clear transient state
      setListening(false);
      setInterimText("");
      interimTextRef.current = "";
      setFinalText("");
      finalTextRef.current = "";
      processingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceModalVisible]);

  // Public API returned to screens/components
  return {
    fabOptionsVisible,
    setFabOptionsVisible,
    voiceModalVisible,
    setVoiceModalVisible,
    listening,
    interimText,
    finalText,
    retryCount,
    MAX_RETRIES,
    startListening,
    stopListening,
    operationModalVisible,
    operationModalTitle,
    operationModalMsg,
    setOperationModalVisible,
  };
}
