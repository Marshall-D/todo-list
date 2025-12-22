// App.tsx

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TaskListScreen } from "./app/screens/TaskListScreen";
import { AddTaskScreen } from "./app/screens/AddTaskScreen";
import { ThemeProvider, useTheme } from "./app/providers/ThemeProvider";
import colors from "./app/utils/themes/colors";

/**
 * App.tsx - top-level app container
 *
 * - Defines Task type and navigation param types used across the app.
 * - Wraps the navigator in ThemeProvider so all screens can access theme context.
 * - ThemedNavigator uses useTheme() to apply header/content styling based on the resolved theme.
 */

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

/**
 * ThemedNavigator - separate function using useTheme so hooks can be used inside.
 * Applies consistent header and content styles according to the resolved theme.
 */
function ThemedNavigator() {
  const { resolved } = useTheme();

  // theme-aware header/background colors
  const headerBg =
    resolved === "dark" ? colors.brandDark.surface : colors.brand.white;
  const headerTint =
    resolved === "dark" ? colors.brandDark.text : colors.brand.primary;
  const headerTitleColor =
    resolved === "dark" ? colors.brandDark.text : colors.brand.textDark;
  const contentBg =
    resolved === "dark" ? colors.brand.black : colors.brand.white;

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

/**
 * RootLayout - top-level app entrypoint.
 * ThemeProvider must wrap the navigator so the entire UI has theme tokens available.
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedNavigator />
    </ThemeProvider>
  );
}
