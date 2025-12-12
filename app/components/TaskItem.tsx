// app/components/TaskItem.tsx
import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Animated,
  GestureResponderEvent,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { Task } from "../../App";

export interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: () => void;
}

export function TaskItem({ task, onDelete, onToggle, onEdit }: TaskItemProps) {
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

  // wrapper to ensure onToggle receives id (not GestureResponderEvent)
  const handleToggle = (_e?: GestureResponderEvent) => onToggle(task.id);

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleToggle}
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
