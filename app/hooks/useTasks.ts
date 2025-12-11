import { useCallback, useEffect, useState } from "react";
import { loadTasks, saveTasks } from "../utils/storage";
import { Task } from "../types/types";

/**
 * useTasks - central hook for managing task state.
 * Exposes pure functions so logic is easy to unit-test.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await loadTasks();
      if (!mounted) return;
      // sort by createdAt desc (newest first)
      t.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(t);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // persist every time tasks change
  useEffect(() => {
    // avoid saving on initial load
    if (loading) return;
    saveTasks(tasks);
  }, [tasks, loading]);

  const addTask = useCallback((title: string, description?: string) => {
    const t: Task = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [t, ...prev]);
    return t;
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setTasks([]);
  }, []);

  return {
    tasks,
    loading,
    addTask,
    toggleTask,
    deleteTask,
    clearAll,
  };
}
