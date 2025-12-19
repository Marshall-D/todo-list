// app/components/TaskItem.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  GestureResponderEvent,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { Task } from "../../App";
import AppModal from "./AppModal";
import { useTheme } from "../providers/ThemeProvider";
import colors from "../utils/themes/colors";

export interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: () => void;
}

export function TaskItem({ task, onDelete, onToggle, onEdit }: TaskItemProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { resolved } = useTheme();

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

  const handleToggle = (_e?: GestureResponderEvent) => onToggle(task.id);

  const openConfirm = () => setConfirmVisible(true);
  const closeConfirm = () => setConfirmVisible(false);
  const handleConfirmDelete = () => {
    onDelete(task.id);
    closeConfirm();
  };

  const formatDue = (ts?: number) => {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString();
  };

  const overdue =
    typeof task.dueDate === "number" &&
    task.dueDate < Date.now() &&
    !task.completed;

  // icon colors respect theme
  const editColor =
    resolved === "dark" ? colors.brandDark.primary : colors.brand.primary;
  const trashColor =
    resolved === "dark" ? colors.brandDark.error : colors.brand.error;

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleToggle}
          className={`mb-3 rounded-xl p-4 border-l-4 flex-row items-center justify-between ${
            task.completed
              ? "bg-brand-successLight border-brand-success dark:bg-brandDark-surface"
              : "bg-brand-grayBlue border-brand-primary dark:bg-brandDark-surface dark:border-brandDark-primary"
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
                  ? "bg-brand-success border-brand-success dark:bg-brandDark-success"
                  : "border-brand-primary dark:border-brandDark-primary"
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
                    ? "line-through text-brand-placeholder dark:text-brandDark-textMuted"
                    : "text-brand-textDark dark:text-brandDark-text"
                }`}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              {task.description && (
                <Text
                  className={`font-Jakarta text-sm mt-1 ${
                    task.completed
                      ? "text-brand-placeholder dark:text-brandDark-textMuted"
                      : "text-brand-textGray dark:text-brandDark-textMuted"
                  }`}
                  numberOfLines={1}
                >
                  {task.description}
                </Text>
              )}

              {typeof task.dueDate === "number" && (
                <Text
                  className={`font-Jakarta text-xs mt-2 ${
                    task.completed
                      ? "text-brand-placeholder dark:text-brandDark-textMuted"
                      : overdue
                        ? "text-red-500"
                        : "text-brand-textGray dark:text-brandDark-textMuted"
                  }`}
                >
                  Due: {formatDue(task.dueDate)} {overdue ? " • overdue" : ""}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-2 ml-3">
            <Pressable
              onPress={onEdit}
              className="p-2 rounded-lg"
              style={{ opacity: 0.9 }}
            >
              <Feather name="edit-2" size={18} color={editColor} />
            </Pressable>
            <Pressable
              onPress={openConfirm}
              className="p-2 rounded-lg"
              style={{ opacity: 0.9 }}
            >
              <Feather name="trash-2" size={18} color={trashColor} />
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>

      <AppModal
        visible={confirmVisible}
        type="confirm"
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        onCancel={closeConfirm}
        onConfirm={handleConfirmDelete}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
