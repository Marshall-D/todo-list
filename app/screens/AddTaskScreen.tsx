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
  Alert,
  Animated,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import type { RootStackParamList, Task } from "../../App";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";

type Props = NativeStackScreenProps<RootStackParamList, "AddTask">;

export function AddTaskScreen({ navigation, route }: Props) {
  const taskToEdit = route.params?.taskToEdit;
  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [description, setDescription] = useState(taskToEdit?.description || "");
  const [loading, setLoading] = useState(false);
  const fadeValue = useRef(new Animated.Value(0)).current;

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

  const handleSaveTask = useCallback(async () => {
    if (title.trim().length === 0) {
      Alert.alert("Required Field", "Please enter a task title");
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
              }
            : t
        );
      } else {
        const newTask: Task = {
          id: Date.now().toString(),
          title: title.trim(),
          description: description.trim() || undefined,
          completed: false,
          createdAt: Date.now(),
        };
        tasks.unshift(newTask);
      }

      await saveTasks(tasks);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save task");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [title, description, taskToEdit, navigation]);

  return (
    <AddTaskView
      title={title}
      description={description}
      setTitle={setTitle}
      setDescription={setDescription}
      onCancel={() => navigation.goBack()}
      onSave={handleSaveTask}
      loading={loading}
      fadeValue={fadeValue}
      taskToEdit={taskToEdit}
    />
  );
}

/* ---------- Presentational view (pure UI) ---------- */

type AddTaskViewProps = {
  title: string;
  description: string;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  loading: boolean;
  fadeValue: Animated.Value;
  taskToEdit?: Task;
};

function AddTaskView({
  title,
  description,
  setTitle,
  setDescription,
  onCancel,
  onSave,
  loading,
  fadeValue,
  taskToEdit,
}: AddTaskViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-brand-white"
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
            <Text className="font-JakartaSemiBold text-lg text-brand-textDark mb-3">
              Task Title
            </Text>
            <View className="flex-row items-center border-2 border-brand-border rounded-xl px-4 py-3 bg-brand-white">
              <MaterialIcons
                name="edit-note"
                size={20}
                color="#0056B3"
                style={{ marginRight: 12 }}
              />
              <TextInput
                placeholder="What needs to be done?"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                className="flex-1 text-base text-brand-textDark"
              />
            </View>
            <Text className="text-xs text-brand-placeholder mt-2">
              {title.length}/100
            </Text>
          </View>

          {/* Description Section */}
          <View className="mb-8">
            <Text className="font-JakartaSemiBold text-lg text-brand-textDark mb-3">
              Description (Optional)
            </Text>
            <View className="border-2 border-brand-border rounded-xl px-4 py-3 bg-brand-white">
              <TextInput
                placeholder="Add more details about your task..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className="text-base text-brand-textDark"
              />
            </View>
            <Text className="text-xs text-brand-placeholder mt-2">
              {description.length}/500
            </Text>
          </View>

          {/* Info Box */}
          <View className="bg-brand-primaryLight/10 rounded-xl p-4 mb-8 flex-row items-start">
            <Feather
              name="info"
              size={18}
              color="#0056B3"
              style={{ marginRight: 12 }}
            />
            <Text className="text-sm text-brand-textDark flex-1">
              Tasks are saved automatically to your device. You can access them
              anytime without internet.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 my-16">
          <Pressable
            onPress={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white"
          >
            <Text className="font-JakartaSemiBold text-center text-brand-textDark">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={onSave}
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
    </KeyboardAvoidingView>
  );
}
