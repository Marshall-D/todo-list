// app/screens/TaskListScreen.tsx
"use client";
import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, Task } from "../../App";
import { useTasks } from "../hooks/useTasks";
import { TaskItem } from "../components/TaskItem";
import { useFocusEffect } from "@react-navigation/native";

type Props = NativeStackScreenProps<RootStackParamList, "TaskList">;

export function TaskListScreen({ navigation }: Props) {
  // container: uses hook & passes props to the presentational view below
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
        onPress={onAdd}
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
    </View>
  );
}
