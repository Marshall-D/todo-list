import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/** Navigation types */
export type RootStackParamList = {
  TaskList: undefined;
  AddTask: undefined;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
};

export type TaskListProps = NativeStackScreenProps<
  RootStackParamList,
  "TaskList"
>;
export type AddTaskProps = NativeStackScreenProps<
  RootStackParamList,
  "AddTask"
>;
