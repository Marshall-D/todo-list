// app/screens/AddTaskScreen.tsx
"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { RootStackParamList, Task } from "../../App";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";
import AppModal from "../components/AppModal";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../providers/ThemeProvider";
import colors from "../utils/themes/colors";

type Props = NativeStackScreenProps<RootStackParamList, "AddTask">;

export function AddTaskScreen({ navigation, route }: Props) {
  const taskToEdit = route.params?.taskToEdit;
  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [description, setDescription] = useState(taskToEdit?.description || "");
  const [loading, setLoading] = useState(false);
  const fadeValue = useRef(new Animated.Value(0)).current;

  const [dueDate, setDueDate] = useState<number | undefined>(
    taskToEdit?.dueDate
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalMessage, setModalMessage] = useState<string | undefined>(
    undefined
  );

  const { resolved } = useTheme();

  useEffect(() => {
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    navigation.setOptions({
      headerTitle: taskToEdit ? "Edit Task" : "Add Task",
    });
  }, [taskToEdit, navigation, fadeValue]);

  const showModal = (
    type: "success" | "error" | "info",
    title?: string,
    msg?: string
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(msg);
    setModalVisible(true);
  };

  const handleSaveTask = useCallback(async () => {
    if (title.trim().length === 0) {
      showModal("error", "Required Field", "Please enter a task title");
      return;
    }

    setLoading(true);
    try {
      const stored = await getStoredTasks();
      let tasks: Task[] = stored ? stored : [];

      if (taskToEdit) {
        tasks = tasks.map((t) =>
          t.id === taskToEdit.id
            ? {
                ...t,
                title: title.trim(),
                description: description.trim() || undefined,
                dueDate: dueDate ?? undefined,
              }
            : t
        );
      } else {
        const now = Date.now();
        const newTask: Task = {
          id: now.toString(),
          title: title.trim(),
          description: description.trim() || undefined,
          completed: false,
          createdAt: now,
          dueDate: dueDate ?? undefined,
        };
        tasks.unshift(newTask);
      }

      await saveTasks(tasks);
      navigation.goBack();
    } catch (error) {
      showModal("error", "Error", "Failed to save task");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [title, description, taskToEdit, navigation, dueDate]);

  const onChangeDate = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDueDate(selectedDate.getTime());
    }
  };

  const clearDueDate = () => setDueDate(undefined);

  const formatDate = (ts?: number) =>
    ts ? new Date(ts).toLocaleDateString() : "No due date";

  const iconColor =
    resolved === "dark" ? colors.brandDark.primary : colors.brand.primary;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-brand-white dark:bg-brand-black"
    >
      <Animated.ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="p-4"
        style={{ opacity: fadeValue }}
      >
        <View className="flex-1">
          {/* Title Section */}
          <View className="mb-8 mt-4">
            <Text className="font-JakartaSemiBold text-lg text-brand-textDark dark:text-brandDark-text mb-3">
              Task Title
            </Text>
            <View className="flex-row items-center border-2 border-brand-border rounded-xl px-4 py-3 bg-brand-white dark:bg-brandDark-surface">
              <MaterialIcons
                name="edit-note"
                size={20}
                color={iconColor}
                style={{ marginRight: 12 }}
              />
              <TextInput
                placeholder="What needs to be done?"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                className="flex-1 text-base text-brand-textDark dark:text-brandDark-text"
              />
            </View>
            <Text className="text-xs text-brand-placeholder dark:text-brandDark-textMuted mt-2">
              {title.length}/100
            </Text>
          </View>

          {/* Description Section */}
          <View className="mb-8">
            <Text className="font-JakartaSemiBold text-lg text-brand-textDark dark:text-brandDark-text mb-3">
              Description (Optional)
            </Text>
            <View className="border-2 border-brand-border rounded-xl px-4 py-3 bg-brand-white dark:bg-brandDark-surface">
              <TextInput
                placeholder="Add more details about your task..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className="text-base text-brand-textDark dark:text-brandDark-text"
              />
            </View>
            <Text className="text-xs text-brand-placeholder dark:text-brandDark-textMuted mt-2">
              {description.length}/500
            </Text>
          </View>

          {/* Due Date */}
          <View className="mb-8">
            <Text className="font-JakartaSemiBold text-lg text-brand-textDark dark:text-brandDark-text mb-3">
              Due Date (Optional)
            </Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white dark:bg-brandDark-surface items-center justify-center"
              >
                <Text className="font-Jakarta text-brand-textDark dark:text-brandDark-text">
                  {formatDate(dueDate)}
                </Text>
              </Pressable>

              <Pressable
                onPress={clearDueDate}
                className="py-3 px-3 rounded-xl border-2 border-brand-border bg-brand-white dark:bg-brandDark-surface items-center justify-center"
              >
                <Text className="font-Jakarta text-brand-textGray dark:text-brandDark-textMuted">
                  Clear
                </Text>
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate ? new Date(dueDate) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeDate}
                minimumDate={new Date(2000, 0, 1)}
                maximumDate={new Date(2100, 11, 31)}
              />
            )}
          </View>

          {/* Info Box */}
          <View className="bg-brand-primaryLight/10 rounded-xl p-4 mb-8 flex-row items-start dark:bg-brandDark-surface">
            <Feather
              name="info"
              size={18}
              color={iconColor}
              style={{ marginRight: 12 }}
            />
            <Text className="text-sm text-brand-textDark dark:text-brandDark-text flex-1">
              Tasks are saved to your device when you click the add task button.
              You can access them anytime without internet.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 my-16">
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white dark:bg-brandDark-surface"
          >
            <Text className="font-JakartaSemiBold text-center text-brand-textDark dark:text-brandDark-text">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSaveTask}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-2 ${
              loading ? "bg-brand-primaryLight" : "bg-brand-primary"
            }`}
          >
            <MaterialIcons
              name={taskToEdit ? "check-circle" : "add-circle"}
              size={20}
              color="white"
            />
            <Text className="font-JakartaSemiBold text-center text-brand-white">
              {taskToEdit ? "Save Changes" : "Add Task"}
            </Text>
          </Pressable>
        </View>
      </Animated.ScrollView>

      <AppModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        continueLabel="OK"
      />
    </KeyboardAvoidingView>
  );
}
