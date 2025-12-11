// src/screens/AddTaskScreen.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useTasks } from "../hooks/useTasks";
import { MaterialIcons } from "@expo/vector-icons";
import { AddTaskProps } from "../types/types";

export default function AddTaskScreen({ navigation }: AddTaskProps) {
  const { addTask } = useTasks();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const onSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert("Validation", "Task title cannot be empty.");
      return;
    }
    addTask(trimmed, description.trim());
    Keyboard.dismiss();
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-primaryLight">
      {/* Header: back button top-left + centered title */}
      <View className="relative h-20 px-6">
        {/* Back button pinned to top-left */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute left-4 top-4 w-11 h-11 items-center justify-center rounded-lg bg-white shadow-sm"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={18}
            className="text-brand-primary"
          />
        </TouchableOpacity>

        {/* Centered title */}
        <View className="absolute left-0 right-0 top-4 items-center">
          <Text className="text-lg text-brand-primary font-JakartaExtraBold">
            Add Task
          </Text>
        </View>
      </View>

      {/* Form area (centred) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-3xl p-6 shadow-md border border-brand-grayBlue">
            {/* Title field */}
            <Text className="text-sm text-brand-textGray mb-2">Title</Text>
            <TextInput
              placeholder="e.g., Buy groceries"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
              className="text-base text-brand-textDark font-JakartaMedium p-3 bg-brand-primaryLight rounded-lg mb-4"
              accessibilityLabel="Task title input"
              returnKeyType="next"
              onSubmitEditing={() => {
                // move focus to description if you add refs later
              }}
            />

            {/* Description field */}
            <Text className="text-sm text-brand-textGray mb-2">
              Description (optional)
            </Text>
            <TextInput
              placeholder="Add notes, context or subtasks"
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              className="text-sm text-brand-textGray3 font-JakartaLight p-3 bg-brand-primaryLight rounded-lg min-h-[110px]"
              accessibilityLabel="Task description input"
              textAlignVertical="top"
            />

            {/* Actions */}
            <View className="flex-row justify-between items-center mt-6">
              <TouchableOpacity
                onPress={() => {
                  setTitle("");
                  setDescription("");
                }}
                className="px-4 py-3 rounded-lg items-center justify-center bg-brand-primaryLight"
                accessibilityRole="button"
                accessibilityLabel="Clear fields"
              >
                <Text className="text-sm text-brand-primary">Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onSave}
                className="px-5 py-3 rounded-lg items-center justify-center bg-brand-primary shadow"
                accessibilityRole="button"
                accessibilityLabel="Save task"
                activeOpacity={0.9}
              >
                <Text className="text-sm text-white font-JakartaMedium">
                  Add Task
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Extra spacing so form feels centered on taller screens */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
