// app/hooks/useVoice.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";
import type { Task } from "../../App";

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
  const MAX_RETRIES = 3;

  const [fabOptionsVisible, setFabOptionsVisible] = useState(false);

  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const voiceModalVisibleRef = useRef<boolean>(voiceModalVisible);
  useEffect(() => {
    voiceModalVisibleRef.current = voiceModalVisible;
  }, [voiceModalVisible]);

  const [listening, setListening] = useState(false);

  const [interimText, setInterimText] = useState("");
  const interimTextRef = useRef<string>(interimText);
  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  const [finalText, setFinalText] = useState("");
  const finalTextRef = useRef<string>(finalText);
  useEffect(() => {
    finalTextRef.current = finalText;
  }, [finalText]);

  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [operationModalTitle, setOperationModalTitle] = useState<
    string | undefined
  >(undefined);
  const [operationModalMsg, setOperationModalMsg] = useState<
    string | undefined
  >(undefined);

  // retry counter
  const [retryCount, setRetryCount] = useState(0);
  const retryCountRef = useRef<number>(retryCount);
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  // watchdog timer ref
  const watchdogRef = useRef<number | null>(null);

  // guard so we only process stopListening once per modal open
  const processingRef = useRef(false);

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

  // Modified extractor: prefer the single highest-confidence alternative across the event.
  const extractTranscriptFromEvent = useCallback(
    (ev: any): string | undefined => {
      if (!ev) return undefined;

      // 1) Straight transcript field (simple cases)
      if (typeof ev.transcript === "string" && ev.transcript.trim()) {
        return ev.transcript.trim();
      }

      // 2) Top-level alternatives array
      if (Array.isArray(ev.alternatives) && ev.alternatives.length > 0) {
        const best = chooseBestAlternative(ev.alternatives);
        if (best) return best.trim();
      }

      // 3) results array: flatten alternatives across results
      if (Array.isArray(ev.results) && ev.results.length > 0) {
        const flatAlts: { transcript: string; confidence: number | null }[] =
          [];

        for (const r of ev.results) {
          if (!r) continue;

          // If result contains an alternatives array, use those
          if (Array.isArray(r.alternatives) && r.alternatives.length > 0) {
            for (const a of r.alternatives) {
              const txt = (a?.transcript ?? a?.text ?? "").trim();
              const conf =
                typeof a?.confidence === "number" ? a.confidence : null;
              if (txt) flatAlts.push({ transcript: txt, confidence: conf });
            }
            continue;
          }

          // If the result has transcript + confidence at the result level,
          // treat that as a single alternative with a numeric confidence.
          if (typeof r.transcript === "string" && r.transcript.trim()) {
            const txt = r.transcript.trim();
            const conf = typeof r.confidence === "number" ? r.confidence : null;
            flatAlts.push({ transcript: txt, confidence: conf });
            continue;
          }

          // legacy fallback if result has other text fields
          if (typeof r.text === "string" && r.text.trim()) {
            flatAlts.push({ transcript: r.text.trim(), confidence: null });
          }
        }

        // If there are numeric confidences, pick the single highest-confidence alt.
        const numericConfs = flatAlts.filter(
          (a) => typeof a.confidence === "number"
        );
        if (numericConfs.length > 0) {
          // find max confidence
          let maxConf = -Infinity;
          for (const a of numericConfs) {
            if ((a.confidence ?? -Infinity) > maxConf)
              maxConf = a.confidence ?? -Infinity;
          }
          // candidates that match maxConf
          const candidates = numericConfs.filter(
            (a) => (a.confidence ?? -Infinity) === maxConf
          );
          // pick one candidate: if more than 1 (tie), pick random among them
          const chosen =
            candidates.length === 1
              ? candidates[0]
              : candidates[Math.floor(Math.random() * candidates.length)];
          return chosen.transcript;
        }

        // No numeric confidences -> fallback: choose best alternative per result (one per result),
        // but DO NOT join multiple variants from the same result. This preserves sequential segments.
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

  // normalizer (aggressive but safe)
  const normalizeTranscript = useCallback((txt: string) => {
    if (!txt) return "";
    let s = txt.trim();
    s = s.replace(/\s+/g, " ");
    s = s.replace(/\b(\w+)(?: \1\b)+/gi, "$1"); // remove adjacent duplicates
    const words = s.split(" ");
    const cleaned: string[] = [];
    let i = 0;
    while (i < words.length) {
      let consumed = false;
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

  // helper: decide if two titles are "similar" (word-overlap heuristic)
  const areSimilar = useCallback((a: string, b: string) => {
    const wa = a.toLowerCase().split(/\s+/).filter(Boolean);
    const wb = b.toLowerCase().split(/\s+/).filter(Boolean);
    if (wa.length === 0 || wb.length === 0) return false;
    const setA = new Set(wa);
    let common = 0;
    for (const w of wb) if (setA.has(w)) common++;
    // measure against the shorter length to allow minor additions
    const denom = Math.min(wa.length, wb.length);
    return denom > 0 && common / denom >= 0.6; // 60% overlap => similar
  }, []);

  const startListeningRef = useRef<(() => Promise<void>) | null>(null);

  // startWatchdog uses startListeningRef.current() when restarting
  const startWatchdog = useCallback(
    (timeoutMs = 20000) => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
      }
      watchdogRef.current = setTimeout(() => {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {
          // ignore
        }
        setListening(false);

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

  // start listening (permissions + start)
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

  // publish to ref so watchdog can call it even though it's declared later
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // stop listening and process finalText -> batch save
  const stopListening = useCallback(async () => {
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;

    try {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (err) {
        console.warn("[speech] stop error", err);
      }

      setListening(false);

      // prefer finalText, fallback to interim
      const transcript = (
        finalTextRef.current ||
        interimTextRef.current ||
        ""
      ).trim();

      // reset UI buffers
      setInterimText("");
      interimTextRef.current = "";
      setFinalText("");
      finalTextRef.current = "";

      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }

      setVoiceModalVisible(false);
      setFabOptionsVisible(false);

      if (!transcript) {
        setOperationModalTitle("No speech detected");
        setOperationModalMsg("We didn't catch anything — try again.");
        setOperationModalVisible(true);
        processingRef.current = false;
        return;
      }

      const normalized = normalizeTranscript(transcript);

      let titlesRaw = parseTranscriptionToTasks(normalized);

      // Determine if user actually used splitters (commas, 'and', 'then', 'or', '&')
      const hadSplitter = /,|;|\band\b|\bthen\b|\bor\b|&/i.test(normalized);

      // If parser returned multiple parts but there was NO splitter token in the normalized transcript,
      // this likely means the recognizer returned multiple variant sentences — collapse to ONE.
      if (titlesRaw.length > 1 && !hadSplitter) {
        // pick the longest part (most complete) as representative
        let longest = titlesRaw[0];
        for (const t of titlesRaw) {
          if (t.length > longest.length) longest = t;
        }
        titlesRaw = [longest];
      }

      // Now dedupe near-duplicates (word-overlap heuristic) and filter tiny entries
      const seenLower = new Set<string>();
      const finalCandidates: string[] = [];
      for (const t of titlesRaw.map((s) => s.trim()).filter(Boolean)) {
        if (t.length <= 1) continue;
        const lower = t.toLowerCase();
        let skip = false;
        for (const kept of finalCandidates) {
          if (areSimilar(kept, t)) {
            // keep longer of the two
            if (t.length > kept.length) {
              // replace kept with t
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

      // If there are still multiple finalCandidates but there was no splitter, collapse again to 1:
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

      // batch save
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

  // event handlers using expo hooks
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
    setInterimText("");
    interimTextRef.current = "";
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  });

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

    setListening(false);
    setOperationModalTitle("Speech error");
    setOperationModalMsg(String(message));
    setOperationModalVisible(true);
  });

  // NOTE: Changed — do NOT auto-start when the modal opens.
  // The user must press Start.
  useEffect(() => {
    if (voiceModalVisible) {
      setRetryCount(0);
      // Intentionally do NOT auto-start listening here. User will tap Start button.
      return;
    } else {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        // ignore
      }
      setListening(false);
      setInterimText("");
      interimTextRef.current = "";
      setFinalText("");
      finalTextRef.current = "";
      processingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceModalVisible]);

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
