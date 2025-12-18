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
  debugLogs: string[];
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  operationModalVisible: boolean;
  operationModalTitle?: string;
  operationModalMsg?: string;
  setOperationModalVisible: (v: boolean) => void;
};

/**
 * useVoice - encapsulates all speech recognition logic & state
 * onRefresh should be provided (from useTasks) so hook can refresh UI after saving tasks
 */
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
  const [finalText, setFinalText] = useState("");

  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [operationModalTitle, setOperationModalTitle] = useState<
    string | undefined
  >(undefined);
  const [operationModalMsg, setOperationModalMsg] = useState<
    string | undefined
  >(undefined);

  // debug logs
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs((prev) => {
      const next = [`${ts} ${msg}`, ...prev].slice(0, 80);
      return next;
    });
    // keep console.debug so devs can follow logs
    console.debug(msg);
  }, []);

  // retry counter
  const [retryCount, setRetryCount] = useState(0);
  const retryCountRef = useRef<number>(retryCount);
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  // watchdog timer ref
  const watchdogRef = useRef<number | null>(null);

  // Utilities moved from original component
  const dumpEvent = useCallback((ev: any) => {
    try {
      return JSON.stringify(
        ev,
        (_, v) => {
          if (typeof v === "bigint") return String(v);
          return v;
        },
        2
      );
    } catch {
      return String(ev);
    }
  }, []);

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

  const extractTranscriptFromEvent = useCallback(
    (ev: any): string | undefined => {
      if (!ev) return undefined;
      if (typeof ev.transcript === "string" && ev.transcript.trim()) {
        return ev.transcript.trim();
      }
      if (Array.isArray(ev.alternatives) && ev.alternatives.length > 0) {
        const best = chooseBestAlternative(ev.alternatives);
        if (best) return best.trim();
      }
      if (Array.isArray(ev.results) && ev.results.length > 0) {
        const parts: string[] = [];
        for (const r of ev.results) {
          if (!r) continue;
          if (Array.isArray(r.alternatives) && r.alternatives.length > 0) {
            const best = chooseBestAlternative(r.alternatives);
            if (best) parts.push(String(best).trim());
            continue;
          }
          if (typeof r.transcript === "string" && r.transcript.trim()) {
            parts.push(r.transcript.trim());
            continue;
          }
        }
        const collected = parts.join(" ").trim();
        if (collected) return collected;
      }
      if (typeof ev.text === "string" && ev.text.trim()) return ev.text.trim();
      if (typeof ev.value === "string" && ev.value.trim())
        return ev.value.trim();
      return undefined;
    },
    [chooseBestAlternative]
  );

  const normalizeTranscript = useCallback((txt: string) => {
    if (!txt) return "";
    let s = txt.trim();
    s = s.replace(/\s+/g, " ");
    const words = s.split(" ");
    const dedupedWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
        continue;
      }
      dedupedWords.push(words[i]);
    }
    const phrases = dedupedWords;
    const cleaned: string[] = [];
    let i = 0;
    while (i < phrases.length) {
      const tryN = [3, 2];
      let consumed = false;
      for (const n of tryN) {
        if (i + n * 2 - 1 < phrases.length) {
          const a = phrases
            .slice(i, i + n)
            .map((w) => w.toLowerCase())
            .join(" ");
          const b = phrases
            .slice(i + n, i + n * 2)
            .map((w) => w.toLowerCase())
            .join(" ");
          if (a === b) {
            cleaned.push(...phrases.slice(i, i + n));
            i += n * 2;
            consumed = true;
            break;
          }
        }
      }
      if (!consumed) {
        cleaned.push(phrases[i]);
        i += 1;
      }
    }
    let result = cleaned.join(" ").trim();
    result = result.replace(/\b(\w+)(?: \1\b)+/gi, "$1");
    result = result.replace(/\s+([,.;?!])/g, "$1");
    return result;
  }, []);

  // parser for transcription -> task titles
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

  // event handlers using expo hooks
  useSpeechRecognitionEvent("interim", (event) => {
    addDebugLog(`[event interim] ${dumpEvent(event)}`);
    const t = extractTranscriptFromEvent(event);
    if (t) {
      addDebugLog(`[interim extracted] "${t}"`);
      setInterimText(t);
    } else {
      setInterimText(event.transcript ?? "");
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    addDebugLog(`[event result] ${dumpEvent(event)}`);
    const t = extractTranscriptFromEvent(event);
    const prev = finalText;
    if (t) {
      addDebugLog(`[result extracted] "${t}"`);
      let updated = "";
      if (!prev) {
        updated = t;
      } else if (t.startsWith(prev)) {
        updated = t;
      } else if (prev.endsWith(t)) {
        updated = prev;
      } else {
        updated = `${prev} ${t}`;
      }
      const normalized = normalizeTranscript(updated);
      addDebugLog(`[result normalized] "${normalized}"`);
      setFinalText(normalized);
    } else if (typeof event.transcript === "string") {
      const t2 = event.transcript.trim();
      let updated = "";
      if (!prev) updated = t2;
      else if (t2.startsWith(prev)) updated = t2;
      else updated = `${prev} ${t2}`;
      const normalized = normalizeTranscript(updated);
      addDebugLog(`[result fallback normalized] "${normalized}"`);
      setFinalText(normalized);
    } else {
      addDebugLog("[result] no transcript found in event");
    }
    setInterimText("");
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
      addDebugLog("[watchdog] cleared after result");
    }
  });

  useSpeechRecognitionEvent("error", (ev) => {
    addDebugLog(`[event error] ${dumpEvent(ev)}`);
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
        addDebugLog(`[retry] no-speech -> retrying ${next}/${MAX_RETRIES}`);
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {
          addDebugLog(`[stop during retry] ${String(e)}`);
        }
        setTimeout(() => {
          if (!voiceModalVisibleRef.current) return;
          startListening();
        }, 400);
        return;
      }
      addDebugLog("[retry] exceeded max retries for no-speech");
      setOperationModalTitle("No speech detected");
      setOperationModalMsg(
        "We couldn't detect speech after several attempts. Make sure microphone is enabled and try again."
      );
      setOperationModalVisible(true);
      setListening(false);
      return;
    }

    if (isNetwork) {
      addDebugLog(`[network error] ${message}`);
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

  const startWatchdog = useCallback(
    (timeoutMs = 20000) => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
      }
      addDebugLog(`[watchdog] starting for ${timeoutMs}ms`);
      watchdogRef.current = setTimeout(() => {
        addDebugLog("[watchdog] triggered - stopping listening due to timeout");
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {
          addDebugLog(`[watchdog stop error] ${String(e)}`);
        }
        setListening(false);
        if (!finalText && !interimText) {
          if (retryCountRef.current < MAX_RETRIES) {
            const next = retryCountRef.current + 1;
            setRetryCount(next);
            addDebugLog(
              `[watchdog retry] attempting restart ${next}/${MAX_RETRIES}`
            );
            setTimeout(() => {
              if (!voiceModalVisibleRef.current) return;
              startListening();
            }, 400);
          } else {
            addDebugLog("[watchdog] exceeded retries, showing message");
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
    [addDebugLog, finalText, interimText]
  );

  // start listening (permissions + start)
  const startListening = useCallback(async () => {
    addDebugLog("[action] startListening invoked");
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      addDebugLog(`[permission result] ${dumpEvent(perm)}`);
      if (!perm?.granted) {
        setOperationModalTitle("Permission denied");
        setOperationModalMsg(
          "Please allow microphone / speech permissions in settings."
        );
        setOperationModalVisible(true);
        addDebugLog("[permission] not granted");
        return;
      }

      setRetryCount(0);
      setFinalText("");
      setInterimText("");
      setListening(true);

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });

      addDebugLog("[speech] started");
      startWatchdog(18000);
    } catch (err) {
      addDebugLog(`[startListening error] ${String(err)}`);
      console.error("[speech] startListening error", err);
      setOperationModalTitle("Error");
      setOperationModalMsg("Failed to start speech recognition.");
      setOperationModalVisible(true);
      setListening(false);
    }
  }, [addDebugLog, dumpEvent, startWatchdog]);

  // stop listening and process finalText -> batch save
  const stopListening = useCallback(async () => {
    addDebugLog("[action] stopListening invoked");
    try {
      await ExpoSpeechRecognitionModule.stop();
      addDebugLog("[speech] stop() called");
    } catch (err) {
      addDebugLog(`[stop error] ${String(err)}`);
      console.warn("[speech] stop error", err);
    } finally {
      setListening(false);
      const transcript = (finalText || interimText || "").trim();
      addDebugLog(`[collected transcript (pre-normalize)] "${transcript}"`);

      setInterimText("");
      setFinalText("");

      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
        addDebugLog("[watchdog] cleared on stop");
      }

      setVoiceModalVisible(false);
      setFabOptionsVisible(false);

      if (!transcript) {
        setOperationModalTitle("No speech detected");
        setOperationModalMsg("We didn't catch anything — try again.");
        setOperationModalVisible(true);
        return;
      }

      const normalized = normalizeTranscript(transcript);
      addDebugLog(`[collected transcript (normalized)] "${normalized}"`);

      const titles = parseTranscriptionToTasks(normalized);
      if (titles.length === 0) {
        setOperationModalTitle("No tasks found");
        setOperationModalMsg("Could not parse tasks from speech.");
        setOperationModalVisible(true);
        return;
      }

      // batch save
      try {
        const stored = (await getStoredTasks()) || [];
        const now = Date.now();
        const newTasks: Task[] = titles.map((title, i) => ({
          id: (now + i).toString(),
          title,
          description: undefined,
          completed: false,
          createdAt: now + i,
        }));
        const updated = [...newTasks, ...stored];
        await saveTasks(updated);
        addDebugLog(`[batch save] saved ${newTasks.length} tasks`);
        // reload UI via provided callback
        await onRefresh();
        setOperationModalTitle("Added tasks");
        setOperationModalMsg(
          `Added ${newTasks.length} task${newTasks.length > 1 ? "s" : ""}.`
        );
        setOperationModalVisible(true);
        addDebugLog(`[tasks added] ${newTasks.length}`);
      } catch (err) {
        addDebugLog(`[adding tasks error] ${String(err)}`);
        console.error("[speech] adding tasks error", err);
        setOperationModalTitle("Error");
        setOperationModalMsg("Failed to save tasks.");
        setOperationModalVisible(true);
      }
    }
  }, [
    finalText,
    interimText,
    normalizeTranscript,
    parseTranscriptionToTasks,
    onRefresh,
  ]);

  // auto-start when voice modal opens
  useEffect(() => {
    if (voiceModalVisible) {
      setRetryCount(0);
      addDebugLog("[voice modal] opened - will auto-start listening shortly");
      const t = setTimeout(() => {
        if (!listening) startListening();
      }, 150);
      return () => clearTimeout(t);
    } else {
      try {
        ExpoSpeechRecognitionModule.stop();
        addDebugLog("[voice modal] closed - stopped recognizer");
      } catch (e) {
        addDebugLog(`[stop on close] ${String(e)}`);
      }
      setListening(false);
      setInterimText("");
      setFinalText("");
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
    debugLogs,
    startListening,
    stopListening,
    operationModalVisible,
    operationModalTitle,
    operationModalMsg,
    setOperationModalVisible,
  };
}
