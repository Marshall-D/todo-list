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
  const { resolved, setMode } = useTheme();

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

  const handleEdit = (task: Task) =>
    navigation.navigate("AddTask", { taskToEdit: task });
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
  const { resolved } = useTheme();

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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor:
            resolved === "dark" ? colors.brand.black : colors.brand.white,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const rootBg = resolved === "dark" ? colors.brand.black : colors.brand.white;
  const contentSurface =
    resolved === "dark" ? colors.brandDark.surface : colors.brand.white;

  // card backgrounds: in light mode they use brand-primaryLight / brand-success / brand-yellow
  const card1Bg =
    resolved === "dark" ? colors.brandDark.surface : colors.brand.primaryLight;
  const card2Bg =
    resolved === "dark" ? colors.brandDark.surface : colors.brand.success;
  const card3Bg =
    resolved === "dark" ? colors.brandDark.surface : colors.brand.yellow;

  const textPrimary =
    resolved === "dark" ? colors.brandDark.text : colors.brand.textDark;
  const textMuted =
    resolved === "dark" ? colors.brandDark.textMuted : colors.brand.textGray;
  const borderColor =
    resolved === "dark" ? colors.brandDark.border : colors.brand.border;

  return (
    <View style={{ flex: 1, backgroundColor: rootBg }}>
      {/* Header Stats */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row justify-around mb-5 gap-2">
          <View
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: card1Bg }}
          >
            <Text
              className="font-JakartaMedium text-sm"
              style={{ color: colors.brand.white }}
            >
              Total Tasks
            </Text>
            <Text
              className="font-JakartaBold text-2xl"
              style={{ color: colors.brand.white }}
            >
              {tasks.length}
            </Text>
          </View>

          <View
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: card2Bg }}
          >
            <Text
              className="font-JakartaMedium text-sm"
              style={{ color: colors.brand.white }}
            >
              Completed
            </Text>
            <Text
              className="font-JakartaBold text-2xl"
              style={{ color: colors.brand.white }}
            >
              {completedCount}
            </Text>
          </View>

          <View
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: card3Bg }}
          >
            <Text
              className="font-JakartaMedium text-sm"
              style={{ color: textPrimary }}
            >
              Active
            </Text>
            <Text
              className="font-JakartaBold text-2xl"
              style={{ color: textPrimary }}
            >
              {activeCount}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View className="mb-3">
          <View
            className="flex-row items-center rounded-xl px-3 py-2"
            style={{
              borderWidth: 2,
              borderColor,
              backgroundColor: contentSurface,
            }}
          >
            <TextInput
              placeholder="Search tasks..."
              placeholderTextColor={colors.brand.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              className="flex-1 text-base"
              style={{ color: textPrimary }}
              underlineColorAndroid="transparent"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                className="p-2 rounded-full"
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={colors.brand.placeholder}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row gap-2 mb-2">
          {(["all", "active", "completed"] as const).map((filterType) => {
            const isActive = filter === filterType;
            const bg = isActive ? colors.brand.primary : contentSurface;
            const txtColor = isActive ? colors.brand.white : textMuted;
            const brd = isActive ? colors.brand.primary : borderColor;

            return (
              <Pressable
                key={filterType}
                onPress={() => setFilter(filterType)}
                className="flex-1 py-2 rounded-lg"
                style={{
                  backgroundColor: bg,
                  borderWidth: 1,
                  borderColor: brd,
                }}
              >
                <Text
                  className="text-center font-JakartaMedium text-sm capitalize"
                  style={{ color: txtColor }}
                >
                  {filterType}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Sort Buttons */}
        <View className="flex-row gap-2">
          {(
            [
              { key: "created", label: "Newest" },
              { key: "dueAsc", label: "Due soon" },
              { key: "dueDesc", label: "Due latest" },
            ] as { key: SortMode; label: string }[]
          ).map((s) => {
            const isActive = sortMode === s.key;
            const bg = isActive ? colors.brand.primary : contentSurface;
            const txtColor = isActive ? colors.brand.white : textMuted;
            const brd = isActive ? colors.brand.primary : borderColor;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSortMode(s.key)}
                className="flex-1 py-2 rounded-lg"
                style={{
                  backgroundColor: bg,
                  borderWidth: 1,
                  borderColor: brd,
                }}
              >
                <Text
                  className="text-center font-JakartaMedium text-sm"
                  style={{ color: txtColor }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Feather name="inbox" size={48} color={colors.brand.border} />
          <Text
            style={{
              fontFamily: "Jakarta-SemiBold",
              color: textMuted,
              marginTop: 12,
            }}
          >
            {filter === "all"
              ? "No tasks yet"
              : filter === "active"
                ? "All done! Great job"
                : "No completed tasks"}
          </Text>
          <Text
            style={{ fontFamily: "Jakarta", color: textMuted, marginTop: 6 }}
          >
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
            paddingBottom: 70,
          }}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => voice.setFabOptionsVisible(true)}
        className="absolute bottom-32 right-6 w-20 h-20 rounded-full justify-center items-center"
        style={{
          backgroundColor: colors.brand.primary,
          shadowColor: colors.brand.primary,
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
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              padding: 24,
              marginBottom: 80,
            }}
          >
            <Animated.View
              style={{
                opacity: fabFadeValue,
                width: "100%",
                borderRadius: 16,
                padding: 16,
                backgroundColor:
                  resolved === "dark"
                    ? colors.brandDark.surface
                    : colors.brand.white,
              }}
            >
              <Text
                style={{
                  fontFamily: "Jakarta-SemiBold",
                  fontSize: 18,
                  color: textPrimary,
                  marginBottom: 12,
                }}
              >
                Add Task
              </Text>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    voice.setFabOptionsVisible(false);
                    onAdd();
                  }}
                  className="flex-1 py-3 rounded-xl items-center justify-center"
                  style={{
                    borderWidth: 2,
                    borderColor,
                    backgroundColor:
                      resolved === "dark"
                        ? colors.brandDark.surface
                        : colors.brand.white,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Jakarta-SemiBold",
                      color: textPrimary,
                    }}
                  >
                    Add by Text
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    voice.setFabOptionsVisible(false);
                    setTimeout(() => voice.setVoiceModalVisible(true), 80);
                  }}
                  className="flex-1 py-3 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  <Text
                    style={{ fontFamily: "Jakarta-SemiBold", color: "#fff" }}
                  >
                    Add by Voice
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => voice.setFabOptionsVisible(false)}
                className="mt-4 items-center"
              >
                <Text style={{ fontSize: 12, color: textMuted }}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>

      {/* Voice Modal (simplified: only title + subtitle visible) */}
      <Modal
        visible={voice.voiceModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => voice.setVoiceModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Animated.View
            style={{
              opacity: voiceFadeValue,
              width: "100%",
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
              backgroundColor:
                resolved === "dark"
                  ? colors.brandDark.surface
                  : colors.brand.white,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Jakarta-SemiBold",
                color: textPrimary,
                marginBottom: 8,
              }}
            >
              Voice Input
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: textMuted,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Speak naturally — the app will try to create tasks from what you
              say.
            </Text>

            {/* Controls: Start / Stop / Cancel */}
            <View style={{ width: "100%", flexDirection: "row", gap: 12 }}>
              {!voice.listening ? (
                <Pressable
                  onPress={() => {
                    voice.setOperationModalVisible(false);
                    voice.startListening();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: colors.brand.primary,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontFamily: "Jakarta-SemiBold" }}
                  >
                    Start
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => voice.stopListening()}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: colors.brand.yellow,
                  }}
                >
                  <Text
                    style={{
                      color: colors.brand.textDark,
                      fontFamily: "Jakarta-SemiBold",
                    }}
                  >
                    Stop
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => voice.setVoiceModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor,
                  backgroundColor:
                    resolved === "dark"
                      ? colors.brandDark.surface
                      : colors.brand.white,
                }}
              >
                <Text
                  style={{ color: textPrimary, fontFamily: "Jakarta-SemiBold" }}
                >
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
