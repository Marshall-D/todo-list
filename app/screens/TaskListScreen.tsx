import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useTasks } from "../hooks/useTasks";
import TaskItem from "../components/TaskItem";
import { MaterialIcons } from "@expo/vector-icons";
import { TaskListProps } from "../types/types";

export default function TaskListScreen({ navigation }: TaskListProps) {
  const { tasks, loading, toggleTask, deleteTask, clearAll } = useTasks();

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-10">
      <Text className="text-lg text-brand-textGray mb-2 font-JakartaMedium">
        No tasks yet
      </Text>
      <Text className="text-sm text-brand-textGray3 px-8 text-center ">
        Add your first task with the plus button. Tasks persist locally on your
        device.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 px pt-16">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-16">
        <View>
          <Text className="text-3xl text-brand-primary font-JakartaExtraBold">
            My Tasks
          </Text>
          <Text className="text-3xl text-brand-textGray mt-16">
            Organize your day — simple & focused
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            // quick clear for debugging / demo (confirm step omitted for brevity)
            clearAll();
          }}
          className="p-2 rounded-lg bg-brand-primaryLight"
          accessibilityLabel="Clear all tasks"
        >
          <MaterialIcons
            name="delete-sweep"
            size={22}
            className="text-brand-primary"
          />
        </TouchableOpacity>
      </View>

      {/* List */}
      <View className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-brand-textGray">Loading…</Text>
          </View>
        ) : tasks.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskItem
                task={item}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            )}
            contentContainerStyle={{ paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <TouchableOpacity
          onPress={() => navigation.navigate("AddTask")}
          className="w-16 h-16 rounded-full items-center justify-center shadow-lg bg-brand-primary"
          accessibilityLabel="Add task"
        >
          <MaterialIcons name="add" size={28} className="text-white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
