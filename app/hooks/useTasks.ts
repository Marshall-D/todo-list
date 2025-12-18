// app/hooks/useTasks.ts
import { useCallback, useMemo, useState } from "react";
import type { Task } from "../../App";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";

export type FilterMode = "all" | "active" | "completed";
export type SortMode = "created" | "dueAsc" | "dueDesc";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("created");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const parsed = await getStoredTasks();
      // Keep same ordering as original (createdAt desc) before applying sortMode
      const arr = (parsed || []).slice();
      arr.sort((a: Task, b: Task) => b.createdAt - a.createdAt);
      setTasks(arr);
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
    let base: Task[] = tasks;
    if (filter === "active") base = tasks.filter((t) => !t.completed);
    else if (filter === "completed") base = tasks.filter((t) => t.completed);
    else base = tasks.slice();

    // Apply sorting
    if (sortMode === "created") {
      base.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === "dueAsc") {
      base.sort((a, b) => {
        // tasks with no dueDate should be placed after tasks with a due date
        const aDue = typeof a.dueDate === "number" ? a.dueDate : Infinity;
        const bDue = typeof b.dueDate === "number" ? b.dueDate : Infinity;
        return aDue - bDue;
      });
    } else if (sortMode === "dueDesc") {
      base.sort((a, b) => {
        const aDue = typeof a.dueDate === "number" ? a.dueDate : -Infinity;
        const bDue = typeof b.dueDate === "number" ? b.dueDate : -Infinity;
        return bDue - aDue;
      });
    }

    return base;
  }, [tasks, filter, sortMode]);

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
    sortMode,
    setSortMode,
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
