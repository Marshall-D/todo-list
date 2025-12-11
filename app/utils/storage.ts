import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageKeys } from "../enum/enum";
import { Task } from "../types/types";
export const loadTasks = async (): Promise<Task[]> => {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.TASKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Task[];
    // defensive: ensure createdAt and completed exist
    return parsed.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      completed: typeof t.completed === "boolean" ? t.completed : false,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    }));
  } catch (err) {
    console.warn("Failed to load tasks:", err);
    return [];
  }
};

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(StorageKeys.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.warn("Failed to save tasks:", err);
    // swallow; UI will remain usable
  }
};
