"use client";
// app/screens/TaskListScreen.tsx

import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { RootStackParamList, Task } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "TaskList">;

export function TaskListScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const loadTasks = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("tasks");
      const parsed = stored ? JSON.parse(stored) : [];
      setTasks(parsed.sort((a: Task, b: Task) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks().then(() => setRefreshing(false));
  }, [loadTasks]);

  const deleteTask = async (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    await AsyncStorage.setItem("tasks", JSON.stringify(updated));
  };

  const toggleComplete = async (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    await AsyncStorage.setItem("tasks", JSON.stringify(updated));
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = tasks.filter((t) => !t.completed).length;

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
              onDelete={deleteTask}
              onToggle={toggleComplete}
              onEdit={() =>
                navigation.navigate("AddTask", { taskToEdit: item })
              }
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
        onPress={() => navigation.navigate("AddTask")}
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

interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: () => void;
}
function TaskItem({ task, onDelete, onToggle, onEdit }: TaskItemProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const confirmDelete = () => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: () => onDelete(task.id),
        style: "destructive",
      },
    ]);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // <-- wrap onToggle so it receives the task id (not the event)
        onPress={() => onToggle(task.id)}
        className={`mb-3 rounded-xl p-4 border-l-4 flex-row items-center justify-between ${
          task.completed
            ? "bg-brand-successLight border-brand-success"
            : "bg-brand-grayBlue border-brand-primary"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <View className="flex-1 flex-row items-center">
          <Animated.View
            className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
              task.completed
                ? "bg-brand-success border-brand-success"
                : "border-brand-primary"
            }`}
          >
            {task.completed && (
              <MaterialIcons name="check" size={14} color="white" />
            )}
          </Animated.View>
          <View className="flex-1">
            <Text
              className={`font-JakartaSemiBold text-base ${
                task.completed
                  ? "line-through text-brand-placeholder"
                  : "text-brand-textDark"
              }`}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            {task.description && (
              <Text
                className={`font-Jakarta text-sm mt-1 ${
                  task.completed
                    ? "text-brand-placeholder"
                    : "text-brand-textGray"
                }`}
                numberOfLines={1}
              >
                {task.description}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2 ml-3">
          <Pressable
            onPress={onEdit}
            className="p-2 rounded-lg"
            style={{ opacity: 0.7 }}
          >
            <Feather name="edit-2" size={18} color="#0056B3" />
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            className="p-2 rounded-lg"
            style={{ opacity: 0.7 }}
          >
            <Feather name="trash-2" size={18} color="#E11D48" />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}
