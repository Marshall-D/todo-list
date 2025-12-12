// app/screens/TaskListScreen.tsx
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, Task } from "../../App";
import { useTasks } from "../hooks/useTasks";
import { TaskItem } from "../components/TaskItem";
import { useFocusEffect } from "@react-navigation/native";
import AppModal from "../components/AppModal";

// expo-speech-recognition
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

// storage helpers for batch save
import { getStoredTasks, saveTasks } from "../utils/taskStorage";

type Props = NativeStackScreenProps<RootStackParamList, "TaskList">;

export function TaskListScreen({ navigation }: Props) {
  // useTasks provides methods/state
  const {
    loading,
    refreshing,
    filter,
    setFilter,
    loadTasks,
    onRefresh,
    filteredTasks,
    completedCount,
    activeCount,
    deleteTask,
    toggleComplete,
    tasks,
    addOrUpdateTask, // kept, but not used for multi-add to avoid closure bugs
  } = useTasks();

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleEdit = (task: Task) => {
    navigation.navigate("AddTask", { taskToEdit: task });
  };

  const handleAdd = () => navigation.navigate("AddTask");

  return (
    <TaskListView
      loading={loading}
      tasks={tasks}
      filteredTasks={filteredTasks}
      refreshing={refreshing}
      filter={filter}
      setFilter={setFilter}
      onRefresh={onRefresh}
      onToggle={toggleComplete}
      onDelete={deleteTask}
      onEdit={handleEdit}
      onAdd={handleAdd}
      completedCount={completedCount}
      activeCount={activeCount}
      // note: we won't call addOrUpdateTask repeatedly for multi-add to avoid race/closure problems
    />
  );
}

/* ---------- Presentational view (pure UI + voice logic + diagnostics) ---------- */

type TaskListViewProps = {
  loading: boolean;
  tasks: Task[];
  filteredTasks: Task[];
  refreshing: boolean;
  filter: "all" | "active" | "completed";
  setFilter: (f: "all" | "active" | "completed") => void;
  onRefresh: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onAdd: () => void;
  completedCount: number;
  activeCount: number;
};

function TaskListView({
  loading,
  tasks,
  filteredTasks,
  refreshing,
  filter,
  setFilter,
  onRefresh,
  onToggle,
  onDelete,
  onEdit,
  onAdd,
  completedCount,
  activeCount,
}: TaskListViewProps) {
  // UI state for FAB options modal
  const [fabOptionsVisible, setFabOptionsVisible] = useState(false);

  // Voice modal state + flags
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
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

  // debug logs visible in modal
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addDebugLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs((prev) => {
      const next = [`${ts} ${msg}`, ...prev].slice(0, 80);
      return next;
    });
    console.debug(msg);
  };

  // retry counter and refs (used by event handler)
  const MAX_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);
  const retryCountRef = useRef<number>(retryCount);
  retryCountRef.current = retryCount;

  // ref for modal visibility used inside callbacks
  const voiceModalVisibleRef = useRef<boolean>(voiceModalVisible);
  useEffect(() => {
    voiceModalVisibleRef.current = voiceModalVisible;
  }, [voiceModalVisible]);

  // watchdog timer ref
  const watchdogRef = useRef<number | null>(null);

  // separate animated values for the two modals
  const fabFadeValue = useRef(new Animated.Value(0)).current;
  const voiceFadeValue = useRef(new Animated.Value(0)).current;

  // animate FAB options modal when its visibility changes
  useEffect(() => {
    if (fabOptionsVisible) {
      Animated.timing(fabFadeValue, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      fabFadeValue.setValue(0);
    }
  }, [fabOptionsVisible, fabFadeValue]);

  // animate voice modal when its visibility changes
  useEffect(() => {
    if (voiceModalVisible) {
      Animated.timing(voiceFadeValue, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      voiceFadeValue.setValue(0);
    }
  }, [voiceModalVisible, voiceFadeValue]);

  // Utility: safely stringify event objects for debug logs
  const dumpEvent = (ev: any) => {
    try {
      return JSON.stringify(
        ev,
        (_, v) => {
          if (typeof v === "bigint") return String(v);
          return v;
        },
        2
      );
    } catch (e) {
      return String(ev);
    }
  };

  // Helper: choose best alternative from an array of alternatives
  const chooseBestAlternative = (alternatives: any[]) => {
    if (!Array.isArray(alternatives) || alternatives.length === 0)
      return undefined;
    // map confidences (if present)
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
    // if confidences missing/identical, pick a random alternative (per your request)
    const pickIdx = Math.floor(Math.random() * alternatives.length);
    return (
      alternatives[pickIdx].transcript ??
      alternatives[pickIdx].text ??
      undefined
    );
  };

  // Try to extract transcript from various event shapes — choose one alternative per result
  const extractTranscriptFromEvent = (ev: any): string | undefined => {
    if (!ev) return undefined;

    // If event has a direct transcript string, use it
    if (typeof ev.transcript === "string" && ev.transcript.trim()) {
      return ev.transcript.trim();
    }

    // If event has alternatives array at the top level, choose best
    if (Array.isArray(ev.alternatives) && ev.alternatives.length > 0) {
      const best = chooseBestAlternative(ev.alternatives);
      if (best) return best.trim();
    }

    // If there's results array (common shape), pick one best alt per result and join
    if (Array.isArray(ev.results) && ev.results.length > 0) {
      const parts: string[] = [];
      for (const r of ev.results) {
        if (!r) continue;
        // some shapes: r.alternatives = [{transcript,confidence}, ...]
        if (Array.isArray(r.alternatives) && r.alternatives.length > 0) {
          const best = chooseBestAlternative(r.alternatives);
          if (best) parts.push(String(best).trim());
          continue;
        }
        // fallback: r.transcript
        if (typeof r.transcript === "string" && r.transcript.trim()) {
          parts.push(r.transcript.trim());
          continue;
        }
      }
      const collected = parts.join(" ").trim();
      if (collected) return collected;
    }

    // other possible shapes
    if (typeof ev.text === "string" && ev.text.trim()) return ev.text.trim();
    if (typeof ev.value === "string" && ev.value.trim()) return ev.value.trim();

    return undefined;
  };

  // normalization: remove repeated adjacent words and small repeated phrases
  const normalizeTranscript = (txt: string) => {
    if (!txt) return "";
    let s = txt.trim();

    // collapse multiple spaces
    s = s.replace(/\s+/g, " ");

    // split words for dedupe logic
    const words = s.split(" ");
    const dedupedWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
        continue;
      }
      dedupedWords.push(words[i]);
    }

    // remove small consecutive repeated phrases (bigrams/trigrams)
    const phrases = dedupedWords;
    const cleaned: string[] = [];
    let i = 0;
    while (i < phrases.length) {
      // try trigram repeat then bigram
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
            // skip the repeated second phrase
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

    // final cleanup: remove stray duplicated short words again
    result = result.replace(/\b(\w+)(?: \1\b)+/gi, "$1");

    // trim punctuation spaces
    result = result.replace(/\s+([,.;?!])/g, "$1");

    return result;
  };

  // Subscribe to interim results
  useSpeechRecognitionEvent("interim", (event) => {
    addDebugLog(`[event interim] ${dumpEvent(event)}`);
    const t = extractTranscriptFromEvent(event);
    if (t) {
      addDebugLog(`[interim extracted] "${t}"`);
      setInterimText(t);
    } else {
      // fallback to event.transcript if present
      setInterimText(event.transcript ?? "");
    }
  });

  // Subscribe to final result(s)
  useSpeechRecognitionEvent("result", (event) => {
    addDebugLog(`[event result] ${dumpEvent(event)}`);
    const t = extractTranscriptFromEvent(event);
    const prev = finalText;
    if (t) {
      addDebugLog(`[result extracted] "${t}"`);
      // If provider sends cumulative transcripts ("iron" -> "iron the" -> "iron the clothes"),
      // prefer replacing the previous transcript with newer (longer) value when appropriate.
      let updated = "";
      if (!prev) {
        updated = t;
      } else if (t.startsWith(prev)) {
        // cumulative growth: replace
        updated = t;
      } else if (prev.endsWith(t)) {
        // nothing new: keep prev
        updated = prev;
      } else {
        // genuinely new chunk -> append
        updated = `${prev} ${t}`;
      }

      // normalize to remove repeated words/phrases produced by partials
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

  // improved error handler: auto-retry on no-speech (code 7) and provide clear message on network (code 2)
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

  // Helper: start watchdog (auto-stop) to avoid long silent listens
  const startWatchdog = (timeoutMs = 20000) => {
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
  };

  // Helper: request permissions + start listening
  const startListening = async () => {
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
  };

  // Helper: stop listening and process finalText
  const stopListening = async () => {
    addDebugLog("[action] stopListening invoked");
    try {
      await ExpoSpeechRecognitionModule.stop();
      addDebugLog("[speech] stop() called");
    } catch (err) {
      addDebugLog(`[stop error] ${String(err)}`);
      console.warn("[speech] stop error", err);
    } finally {
      setListening(false);

      // Use finalText (which our result handler normalizes and keeps up-to-date)
      const transcript = (finalText || interimText || "").trim();
      addDebugLog(`[collected transcript (pre-normalize)] "${transcript}"`);

      // reset texts early
      setInterimText("");
      setFinalText("");

      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
        addDebugLog("[watchdog] cleared on stop");
      }

      // close voice options modal
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

      // **BATCH SAVE**: read stored tasks, prepend all new tasks, then save once.
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
        // reload UI
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
  };

  // Auto-start when voice modal opens; reset retries
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

  // simple parser (same as yours)
  function parseTranscriptionToTasks(text: string): string[] {
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
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-white">
        <ActivityIndicator size="large" color="#0056B3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-white">
      {/* Header Stats */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row justify-around mb-5 gap-2">
          <View className="flex-1 bg-brand-primaryLight rounded-2xl p-4">
            <Text className="font-JakartaMedium text-sm text-brand-white mb-1">
              Total Tasks
            </Text>
            <Text className="font-JakartaBold text-2xl text-brand-white">
              {tasks.length}
            </Text>
          </View>
          <View className="flex-1 bg-brand-success rounded-2xl p-4">
            <Text className="font-JakartaMedium text-sm text-brand-white mb-1">
              Completed
            </Text>
            <Text className="font-JakartaBold text-2xl text-brand-white">
              {completedCount}
            </Text>
          </View>
          <View className="flex-1 bg-brand-yellow rounded-2xl p-4">
            <Text className="font-JakartaMedium text-sm text-brand-textDark mb-1">
              Active
            </Text>
            <Text className="font-JakartaBold text-2xl text-brand-textDark">
              {activeCount}
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row gap-2">
          {(["all", "active", "completed"] as const).map((filterType) => (
            <Pressable
              key={filterType}
              onPress={() => setFilter(filterType)}
              className={`flex-1 py-2 rounded-lg border ${
                filter === filterType
                  ? "bg-brand-primary border-brand-primary"
                  : "bg-brand-white border-brand-border"
              }`}
            >
              <Text
                className={`text-center font-JakartaMedium text-sm capitalize ${
                  filter === filterType
                    ? "text-brand-white"
                    : "text-brand-textGray"
                }`}
              >
                {filterType}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Feather name="inbox" size={48} color="#CBD5E1" />
          <Text className="font-JakartaSemiBold text-brand-textGray mt-3">
            {filter === "all"
              ? "No tasks yet"
              : filter === "active"
                ? "All done! Great job"
                : "No completed tasks"}
          </Text>
          <Text className="font-Jakarta text-brand-placeholder text-sm mt-1">
            {filter === "all"
              ? "Create your first task to get started"
              : "Stay productive and add more tasks"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onDelete={onDelete}
              onToggle={onToggle}
              onEdit={() => onEdit(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          setFabOptionsVisible(true);
        }}
        className="absolute bottom-32 right-6 w-20 h-20 bg-brand-primary rounded-full justify-center items-center"
        style={{
          shadowColor: "#0056B3",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialIcons name="add" size={28} color="white" />
      </Pressable>

      {/* FAB Options Modal */}
      <Modal
        visible={fabOptionsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFabOptionsVisible(false)}
      >
        {/* tappable backdrop to dismiss */}
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setFabOptionsVisible(false)}
        >
          <View className="flex-1 bg-black/50 items-end justify-end p-6 mb-20">
            <Animated.View
              style={{ opacity: fabFadeValue }}
              className="w-full bg-white rounded-2xl p-4"
            >
              <Text className="font-JakartaSemiBold text-lg text-brand-textDark mb-3">
                Add Task
              </Text>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setFabOptionsVisible(false);
                    onAdd();
                  }}
                  className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-textDark">
                    Add by Text
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setFabOptionsVisible(false);
                    setTimeout(() => setVoiceModalVisible(true), 80);
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand-primary items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-white">
                    Add by Voice
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setFabOptionsVisible(false)}
                className="mt-4 items-center"
              >
                <Text className="text-sm text-brand-textGray">Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>

      {/* Voice Modal */}
      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch (e) {}
          setVoiceModalVisible(false);
        }}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <Animated.View
            style={{ opacity: voiceFadeValue }}
            className="w-full bg-white rounded-2xl p-6 items-center"
          >
            <Text className="text-lg font-JakartaSemiBold text-brand-textDark mb-2">
              Voice Input
            </Text>
            <Text className="text-sm text-brand-textGray mb-4 text-center">
              Speak naturally — the app will try to create tasks from what you
              say.
            </Text>

            <View className="w-full mb-2 items-center">
              <Text className="font-Jakarta text-sm text-brand-textGray mb-2">
                Interim
              </Text>
              <Text className="text-center text-base text-brand-textDark">
                {interimText || (listening ? "Listening..." : "Tap Start")}
              </Text>
            </View>

            <View className="w-full mb-2 items-center">
              <Text className="font-Jakarta text-sm text-brand-textGray mb-2">
                Final
              </Text>
              <Text className="text-center text-base text-brand-textDark">
                {finalText || "-"}
              </Text>
            </View>

            {/* Retry counter + small debug area */}
            <View className="w-full mb-4 items-center">
              <Text className="text-xs text-brand-textGray mb-1">
                Retries: {retryCount}/{MAX_RETRIES}
              </Text>
              <Text className="text-xs text-brand-placeholder text-center mb-2">
                {listening ? "Listening — speak now" : "Not listening"}
              </Text>

              {/* Debug log preview (top entries) */}
              <View className="w-full border-2 border-brand-border rounded-lg p-2 bg-brand-white">
                <ScrollView style={{ maxHeight: 120 }}>
                  {debugLogs.length === 0 ? (
                    <Text className="text-xs text-brand-placeholder">
                      No logs yet
                    </Text>
                  ) : (
                    debugLogs.slice(0, 12).map((l, i) => (
                      <Text key={i} className="text-xs text-brand-textGray">
                        {l}
                      </Text>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>

            <View className="flex-row gap-3 w-full">
              {!listening ? (
                <Pressable
                  onPress={() => {
                    setRetryCount(0);
                    setDebugLogs([]);
                    startListening();
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand-primary items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-white">
                    Start
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={stopListening}
                  className="flex-1 py-3 rounded-xl bg-brand-yellow items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-textDark">
                    Stop
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  try {
                    ExpoSpeechRecognitionModule.stop();
                  } catch (e) {}
                  setVoiceModalVisible(false);
                }}
                className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white items-center justify-center"
              >
                <Text className="font-JakartaSemiBold text-brand-textDark">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* operation result modal */}
      <AppModal
        visible={operationModalVisible}
        type="info"
        title={operationModalTitle}
        message={operationModalMsg}
        onClose={() => setOperationModalVisible(false)}
        continueLabel="OK"
      />
    </View>
  );
}

export default TaskListScreen;
