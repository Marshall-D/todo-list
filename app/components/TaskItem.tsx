import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Task } from "../types/types";

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  const handleDelete = () => {
    Alert.alert("Delete task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(task.id),
      },
    ]);
  };

  return (
    <View className="flex-row items-start bg-white rounded-2xl p-4 mb-3 shadow-sm border border-brand-grayBlue">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onToggle(task.id)}
        className={`w-10 h-10 rounded-lg items-center justify-center mr-4 ${
          task.completed ? "bg-brand-successLight" : "bg-brand-primaryLight"
        }`}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${task.title}`}
      >
        {task.completed ? (
          <MaterialIcons
            name="check"
            size={20}
            className="text-brand-success"
          />
        ) : (
          <View className="w-4 h-4 rounded-sm border border-brand-border" />
        )}
      </TouchableOpacity>

      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text
            className={`text-base ${
              task.completed
                ? "text-brand-textGray line-through"
                : "text-brand-textDark"
            } font-JakartaMedium flex-shrink`}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <TouchableOpacity onPress={handleDelete} className="ml-3 p-1">
            <MaterialIcons
              name="delete-outline"
              size={20}
              className="text-brand-error"
            />
          </TouchableOpacity>
        </View>

        {task.description ? (
          <Text
            className={`mt-1 text-sm ${
              task.completed
                ? "text-brand-textGray3 line-through"
                : "text-brand-textGray3"
            }`}
            numberOfLines={3}
          >
            {task.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
