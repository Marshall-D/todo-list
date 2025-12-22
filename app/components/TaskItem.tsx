// app/components/TaskItem.tsx

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  GestureResponderEvent,
  StyleSheet,
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

/**
 * TaskItem - visual representation of a single task in the list.
 *
 * Responsibilities:
 * - Render title, optional description and due date.
 * - Show completion state and allow toggling it by pressing the item.
 * - Provide edit and delete affordances.
 * - Confirm deletion with AppModal.
 *
 * Notes:
 * - Uses Animated spring on press for subtle tactile feedback.
 * - Colors adapt to theme tokens for consistent styling.
 */
export function TaskItem({ task, onDelete, onToggle, onEdit }: TaskItemProps) {
  // scaleValue used to animate the entire item when the user presses it
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { resolved } = useTheme();

  // Press in: slightly shrink the card
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  // Press out: restore scale
  const handlePressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }).start();
  };

  // Toggle complete state when user taps the main card area
  const handleToggle = (_e?: GestureResponderEvent) => onToggle(task.id);

  // Confirm deletion modal controls
  const openConfirm = () => setConfirmVisible(true);
  const closeConfirm = () => setConfirmVisible(false);
  const handleConfirmDelete = () => {
    onDelete(task.id);
    closeConfirm();
  };

  // Utility: format a timestamp to local date string (used for due date)
  const formatDue = (ts?: number) => {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString();
  };

  // Compute whether the task is overdue
  const overdue =
    typeof task.dueDate === "number" &&
    task.dueDate < Date.now() &&
    !task.completed;

  // Colors for action icons (theme-aware)
  const editColor =
    resolved === "dark" ? colors.brandDark.primary : colors.brand.primary;
  const trashColor =
    resolved === "dark" ? colors.brandDark.error : colors.brand.error;

  // Card background and left border color adapt to completion + theme
  const containerBg = task.completed
    ? resolved === "dark"
      ? colors.brandDark.surface
      : colors.brand.successLight
    : resolved === "dark"
      ? colors.brandDark.surface
      : colors.brand.grayBlue;

  const leftBorderColor = task.completed
    ? resolved === "dark"
      ? colors.brandDark.success
      : colors.brand.success
    : resolved === "dark"
      ? colors.brandDark.primary
      : colors.brand.primary;

  // Text color choices depend on completion + theme
  const titleColor = task.completed
    ? resolved === "dark"
      ? colors.brandDark.textMuted
      : colors.brand.placeholder
    : resolved === "dark"
      ? colors.brandDark.text
      : colors.brand.textDark;

  const descColor = task.completed
    ? resolved === "dark"
      ? colors.brandDark.textMuted
      : colors.brand.placeholder
    : resolved === "dark"
      ? colors.brandDark.textMuted
      : colors.brand.textGray;

  const dueColor = task.completed
    ? resolved === "dark"
      ? colors.brandDark.textMuted
      : colors.brand.placeholder
    : overdue
      ? "#EF4444"
      : resolved === "dark"
        ? colors.brandDark.textMuted
        : colors.brand.textGray;

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleToggle}
          className="mb-3 rounded-xl p-4 flex-row items-center justify-between"
          style={[
            styles.shadow,
            {
              backgroundColor: containerBg,
              borderLeftWidth: 6,
              borderLeftColor: leftBorderColor,
            },
          ]}
        >
          <View className="flex-1 flex-row items-center">
            {/* Checkbox / status indicator */}
            <Animated.View
              className="w-5 h-5 rounded-full mr-3 items-center justify-center"
              style={{
                backgroundColor: task.completed
                  ? resolved === "dark"
                    ? colors.brandDark.success
                    : colors.brand.success
                  : "transparent",
                borderWidth: 2,
                borderColor: task.completed
                  ? resolved === "dark"
                    ? colors.brandDark.success
                    : colors.brand.success
                  : resolved === "dark"
                    ? colors.brandDark.primary
                    : colors.brand.primary,
              }}
            >
              {/* show check when completed */}
              {task.completed && (
                <MaterialIcons name="check" size={14} color="white" />
              )}
            </Animated.View>

            <View className="flex-1">
              {/* Title - allow two lines */}
              <Text
                style={[styles.title, { color: titleColor }]}
                numberOfLines={2}
              >
                {task.title}
              </Text>

              {/* Optional description */}
              {task.description && (
                <Text
                  style={[styles.desc, { color: descColor }]}
                  numberOfLines={1}
                >
                  {task.description}
                </Text>
              )}

              {/* Optional due date */}
              {typeof task.dueDate === "number" && (
                <Text style={[styles.due, { color: dueColor }]}>
                  Due: {formatDue(task.dueDate)} {overdue ? " • overdue" : ""}
                </Text>
              )}
            </View>
          </View>

          {/* Action buttons: Edit, Delete */}
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

      {/* Confirmation dialog for delete */}
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

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontFamily: "Jakarta-SemiBold",
    fontSize: 16,
  },
  desc: {
    fontFamily: "Jakarta",
    fontSize: 14,
    marginTop: 4,
  },
  due: {
    fontFamily: "Jakarta",
    fontSize: 12,
    marginTop: 8,
  },
});
