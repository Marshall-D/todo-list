// App.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TaskListScreen } from "./app/screens/TaskListScreen";
import { AddTaskScreen } from "./app/screens/AddTaskScreen";
import { ThemeProvider, useTheme } from "./app/providers/ThemeProvider";
import { View } from "react-native";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number;
}

export type RootStackParamList = {
  TaskList: undefined;
  AddTask: { taskToEdit?: Task } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function ThemedNavigator() {
  const { resolved } = useTheme();

  // set header / content background based on resolved theme
  const headerBg = resolved === "dark" ? "#0F1724" : "#FFFFFF"; // dark vs light
  const headerTint = resolved === "dark" ? "#E6EEF8" : "#0056B3";
  const headerTitleColor = resolved === "dark" ? "#E6EEF8" : "#334155";
  const contentBg = resolved === "dark" ? "#0B1220" : "#FFFFFF";

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: headerBg,
          },
          headerTintColor: headerTint,
          headerTitleStyle: {
            fontFamily: "Jakarta-Bold",
            fontSize: 18,
            color: headerTitleColor,
          },
          contentStyle: {
            backgroundColor: contentBg,
          },
        }}
      >
        <Stack.Screen
          name="TaskList"
          component={TaskListScreen}
          options={{
            headerTitle: "My Tasks",
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="AddTask"
          component={AddTaskScreen}
          options={{
            headerTitle: "Add Task",
            headerShadowVisible: false,
            headerBackTitle: "Back",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedNavigator />
    </ThemeProvider>
  );
}
