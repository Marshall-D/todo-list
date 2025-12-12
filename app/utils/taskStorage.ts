// app/taskStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task } from "../../App";

const STORAGE_KEY = "tasks";

export async function getStoredTasks(): Promise<Task[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
