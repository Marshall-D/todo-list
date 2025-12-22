// app/hooks/useTasks.ts

import { useCallback, useMemo, useState } from "react";
import type { Task } from "../../App";
import { getStoredTasks, saveTasks } from "../utils/taskStorage";

export type FilterMode = "all" | "active" | "completed";
export type SortMode = "created" | "dueAsc" | "dueDesc";

/**
 * useTasks - small stateful hook that manages the in-memory task list + persistence.
 *
 * Responsibilities:
 * - Load tasks from local storage (getStoredTasks) and expose CRUD operations that persist changes.
 * - Provide derived data: filteredTasks, counts, loading/refreshing states.
 *
 * Notes:
 * - All persistence methods are async and update local state before persisting.
 * - Sorting and filtering are applied in a deterministic order:
 *    1) Search (title | description)
 *    2) Filter (all | active | completed)
 *    3) Sort (created / due ascending / due descending)
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("created");

  const [searchQuery, setSearchQuery] = useState<string>("");

  /**
   * loadTasks - load saved tasks from storage and sort newest-first.
   * Keeps UI responsive by setting loading state while running.
   */
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const parsed = await getStoredTasks();
      const arr = (parsed || []).slice();
      // sort descending by createdAt (newest first)
      arr.sort((a: Task, b: Task) => b.createdAt - a.createdAt);
      setTasks(arr);
    } catch (error) {
      // keep consistent behaviour on failure
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * onRefresh - used by pull-to-refresh UI. Calls loadTasks and flips refreshing flag.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    return loadTasks().then(() => setRefreshing(false));
  }, [loadTasks]);

  /**
   * deleteTask - remove a task by id and persist updated list.
   */
  const deleteTask = useCallback(
    async (id: string) => {
      const updated = tasks.filter((t) => t.id !== id);
      setTasks(updated);
      await saveTasks(updated);
    },
    [tasks]
  );

  /**
   * toggleComplete - flip completed flag on a task and persist updated list.
   */
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

  /**
   * addOrUpdateTask - insert new task to top or update existing by id.
   * Ensures persisted store and returned in-memory state are aligned.
   */
  const addOrUpdateTask = useCallback(
    async (task: Task) => {
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

  /**
   * filteredTasks - derived list that applies search, filter and sorting.
   *
   * Order of operations:
   * 1) Make a copy of tasks (avoid mutation).
   * 2) Apply search (title|description).
   * 3) Apply active/completed filter.
   * 4) Apply selected sort mode.
   */
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // start with a copy to avoid mutating original tasks
    let base: Task[] = tasks.slice();

    // search first
    if (q) {
      base = base.filter((t) => {
        const title = (t.title || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // then filter by active/completed
    if (filter === "active") base = base.filter((t) => !t.completed);
    else if (filter === "completed") base = base.filter((t) => t.completed);

    // then sort
    if (sortMode === "created") {
      base.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === "dueAsc") {
      base.sort((a, b) => {
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
  }, [tasks, searchQuery, filter, sortMode]);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const activeCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  // public API of the hook
  return {
    tasks,
    loading,
    refreshing,
    filter,
    setFilter,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
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
