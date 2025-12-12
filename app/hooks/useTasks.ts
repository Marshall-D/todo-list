// app/hooks/useTasks.ts
import { useCallback, useMemo, useState } from "react";
import type { Task } from "../../App";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";

export type FilterMode = "all" | "active" | "completed";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const parsed = await getStoredTasks();
      // keep same ordering as original
      setTasks(parsed.sort((a: Task, b: Task) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    return loadTasks().then(() => setRefreshing(false));
  }, [loadTasks]);

  const deleteTask = useCallback(
    async (id: string) => {
      const updated = tasks.filter((t) => t.id !== id);
      setTasks(updated);
      await saveTasks(updated);
    },
    [tasks]
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const updated = tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      setTasks(updated);
      await saveTasks(updated);
    },
    [tasks]
  );

  const addOrUpdateTask = useCallback(
    async (task: Task) => {
      // if exists, update; otherwise add to front
      const exists = tasks.some((t) => t.id === task.id);
      let updated: Task[];
      if (exists) {
        updated = tasks.map((t) => (t.id === task.id ? task : t));
      } else {
        updated = [task, ...tasks];
      }
      setTasks(updated);
      await saveTasks(updated);
    },
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const activeCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  return {
    tasks,
    loading,
    refreshing,
    filter,
    setFilter,
    loadTasks,
    onRefresh,
    deleteTask,
    toggleComplete,
    addOrUpdateTask,
    filteredTasks,
    completedCount,
    activeCount,
  };
}
