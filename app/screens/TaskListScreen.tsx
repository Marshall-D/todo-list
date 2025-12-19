// app/screens/TaskListScreen.tsx
"use client";
import React, { useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  ScrollView,
  TextInput,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, Task } from "../../App";
import { useTasks, SortMode } from "../hooks/useTasks";
import { TaskItem } from "../components/TaskItem";
import { useFocusEffect } from "@react-navigation/native";
import AppModal from "../components/AppModal";
import { useVoice } from "../hooks/useVoice";
import { useTheme } from "../providers/ThemeProvider";
import colors from "../utils/themes/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TaskList">;

export function TaskListScreen({ navigation }: Props) {
  const {
    tasks,
    loading,
    refreshing,
    filter,
    setFilter,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
    loadTasks,
    onRefresh,
    deleteTask,
    toggleComplete,
    filteredTasks,
    completedCount,
    activeCount,
  } = useTasks();

  const voice = useVoice(onRefresh);
  const { resolved, mode, setMode } = useTheme();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            const next = resolved === "dark" ? "light" : "dark";
            setMode(next);
          }}
          style={{ marginRight: 12, padding: 6, borderRadius: 8 }}
          accessibilityLabel="Toggle theme"
          accessibilityHint="Switch between light and dark themes"
        >
          <MaterialIcons
            name={resolved === "dark" ? "nightlight-round" : "wb-sunny"}
            size={22}
            color={
              resolved === "dark" ? colors.brandDark.text : colors.brand.primary
            }
          />
        </Pressable>
      ),
    });
  }, [navigation, resolved, setMode]);

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
      voice={voice}
      sortMode={sortMode}
      setSortMode={setSortMode}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

/* ---------- Presentational view (pure UI) ---------- */

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
  voice: ReturnType<typeof useVoice>;
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
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
  voice,
  sortMode,
  setSortMode,
  searchQuery,
  setSearchQuery,
}: TaskListViewProps) {
  const fabFadeValue = useRef(new Animated.Value(0)).current;
  const voiceFadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (voice.fabOptionsVisible) {
      Animated.timing(fabFadeValue, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      fabFadeValue.setValue(0);
    }
  }, [voice.fabOptionsVisible, fabFadeValue]);

  useEffect(() => {
    if (voice.voiceModalVisible) {
      Animated.timing(voiceFadeValue, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      voiceFadeValue.setValue(0);
    }
  }, [voice.voiceModalVisible, voiceFadeValue]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-white dark:bg-brand-black">
        <ActivityIndicator size="large" color="#0056B3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-white dark:bg-brand-black">
      {/* Header Stats */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row justify-around mb-5 gap-2">
          <View className="flex-1 bg-brand-primaryLight rounded-2xl p-4 dark:bg-brandDark-surface">
            <Text className="font-JakartaMedium text-sm text-brand-white">
              Total Tasks
            </Text>
            <Text className="font-JakartaBold text-2xl text-brand-white">
              {tasks.length}
            </Text>
          </View>
          <View className="flex-1 bg-brand-success rounded-2xl p-4 dark:bg-brandDark-surface">
            <Text className="font-JakartaMedium text-sm text-brand-white">
              Completed
            </Text>
            <Text className="font-JakartaBold text-2xl text-brand-white">
              {completedCount}
            </Text>
          </View>
          <View className="flex-1 bg-brand-yellow rounded-2xl p-4 dark:bg-brandDark-surface">
            <Text className="font-JakartaMedium text-sm text-brand-textDark dark:text-brandDark-text">
              Active
            </Text>
            <Text className="font-JakartaBold text-2xl text-brand-textDark dark:text-brandDark-text">
              {activeCount}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View className="mb-3">
          <View className="flex-row items-center border-2 border-brand-border rounded-xl px-3 py-2 bg-brand-white dark:bg-brandDark-surface">
            <TextInput
              placeholder="Search tasks..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              className="flex-1 text-base text-brand-textDark dark:text-brandDark-text"
              underlineColorAndroid="transparent"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                className="p-2 rounded-full"
              >
                <MaterialIcons name="close" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row gap-2 mb-2">
          {(["all", "active", "completed"] as const).map((filterType) => (
            <Pressable
              key={filterType}
              onPress={() => setFilter(filterType)}
              className={`flex-1 py-2 rounded-lg border ${
                filter === filterType
                  ? "bg-brand-primary border-brand-primary"
                  : "bg-brand-white border-brand-border dark:bg-brandDark-surface dark:border-brandDark-border"
              }`}
            >
              <Text
                className={`text-center font-JakartaMedium text-sm capitalize ${
                  filter === filterType
                    ? "text-brand-white"
                    : "text-brand-textGray dark:text-brandDark-textMuted"
                }`}
              >
                {filterType}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Sort Buttons */}
        <View className="flex-row gap-2">
          {(
            [
              { key: "created", label: "Newest" },
              { key: "dueAsc", label: "Due soon" },
              { key: "dueDesc", label: "Due latest" },
            ] as { key: SortMode; label: string }[]
          ).map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSortMode(s.key)}
              className={`flex-1 py-2 rounded-lg border ${
                sortMode === s.key
                  ? "bg-brand-primary border-brand-primary"
                  : "bg-brand-white border-brand-border dark:bg-brandDark-surface dark:border-brandDark-border"
              }`}
            >
              <Text
                className={`text-center font-JakartaMedium text-sm ${sortMode === s.key ? "text-brand-white" : "text-brand-textGray dark:text-brandDark-textMuted"}`}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Feather name="inbox" size={48} color="#CBD5E1" />
          <Text className="font-JakartaSemiBold text-brand-textGray mt-3 dark:text-brandDark-text">
            {filter === "all"
              ? "No tasks yet"
              : filter === "active"
                ? "All done! Great job"
                : "No completed tasks"}
          </Text>
          <Text className="font-Jakarta text-brand-placeholder text-sm mt-1 dark:text-brandDark-textMuted">
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          voice.setFabOptionsVisible(true);
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
        visible={voice.fabOptionsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => voice.setFabOptionsVisible(false)}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => voice.setFabOptionsVisible(false)}
        >
          <View className="flex-1 bg-black/50 items-end justify-end p-6 mb-20">
            <Animated.View
              style={{ opacity: fabFadeValue }}
              className="w-full bg-white rounded-2xl p-4 dark:bg-brandDark-surface"
            >
              <Text className="font-JakartaSemiBold text-lg text-brand-textDark dark:text-brandDark-text mb-3">
                Add Task
              </Text>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    voice.setFabOptionsVisible(false);
                    onAdd();
                  }}
                  className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white dark:bg-brandDark-surface items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-textDark dark:text-brandDark-text">
                    Add by Text
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    voice.setFabOptionsVisible(false);
                    setTimeout(() => voice.setVoiceModalVisible(true), 80);
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand-primary items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-white">
                    Add by Voice
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => voice.setFabOptionsVisible(false)}
                className="mt-4 items-center"
              >
                <Text className="text-sm text-brand-textGray dark:text-brandDark-textMuted">
                  Cancel
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>

      {/* Voice Modal */}
      <Modal
        visible={voice.voiceModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          try {
          } catch (e) {}
          voice.setVoiceModalVisible(false);
        }}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <Animated.View
            style={{ opacity: voiceFadeValue }}
            className="w-full bg-white rounded-2xl p-6 items-center dark:bg-brandDark-surface"
          >
            <Text className="text-lg font-JakartaSemiBold text-brand-textDark dark:text-brandDark-text mb-2">
              Voice Input
            </Text>
            <Text className="text-sm text-brand-textGray mb-4 text-center dark:text-brandDark-textMuted">
              Speak naturally — the app will try to create tasks from what you
              say.
            </Text>

            <View className="w-full mb-2 items-center">
              <Text className="font-Jakarta text-sm text-brand-textGray mb-2 dark:text-brandDark-textMuted">
                Interim
              </Text>
              <Text className="text-center text-base text-brand-textDark dark:text-brandDark-text">
                {voice.interimText ||
                  (voice.listening ? "Listening..." : "Tap Start")}
              </Text>
            </View>

            <View className="w-full mb-2 items-center">
              <Text className="font-Jakarta text-sm text-brand-textGray mb-2 dark:text-brandDark-textMuted">
                Final
              </Text>
              <Text className="text-center text-base text-brand-textDark dark:text-brandDark-text">
                {voice.finalText || "-"}
              </Text>
            </View>

            {/* Retry counter + debug area */}
            <View className="w-full mb-4 items-center">
              <Text className="text-xs text-brand-textGray mb-1 dark:text-brandDark-textMuted">
                Retries: {voice.retryCount}/{voice.MAX_RETRIES}
              </Text>
              <Text className="text-xs text-brand-placeholder text-center mb-2 dark:text-brandDark-textMuted">
                {voice.listening ? "Listening — speak now" : "Not listening"}
              </Text>

              <View className="w-full border-2 border-brand-border rounded-lg p-2 bg-brand-white dark:bg-brandDark-surface">
                <ScrollView style={{ maxHeight: 120 }}>
                  {voice.debugLogs.length === 0 ? (
                    <Text className="text-xs text-brand-placeholder dark:text-brandDark-textMuted">
                      No logs yet
                    </Text>
                  ) : (
                    voice.debugLogs.slice(0, 12).map((l, i) => (
                      <Text
                        key={i}
                        className="text-xs text-brand-textGray dark:text-brandDark-textMuted"
                      >
                        {l}
                      </Text>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>

            <View className="flex-row gap-3 w-full">
              {!voice.listening ? (
                <Pressable
                  onPress={() => {
                    voice.setOperationModalVisible(false);
                    voice.startListening();
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand-primary items-center justify-center"
                >
                  <Text className="font-JakartaSemiBold text-brand-white">
                    Start
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => voice.stopListening()}
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
                  } catch (e) {}
                  voice.setVoiceModalVisible(false);
                }}
                className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white dark:bg-brandDark-surface items-center justify-center"
              >
                <Text className="font-JakartaSemiBold text-brand-textDark dark:text-brandDark-textMuted">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* operation result modal */}
      <AppModal
        visible={voice.operationModalVisible}
        type="info"
        title={voice.operationModalTitle}
        message={voice.operationModalMsg}
        onClose={() => voice.setOperationModalVisible(false)}
        continueLabel="OK"
      />
    </View>
  );
}

export default TaskListScreen;
