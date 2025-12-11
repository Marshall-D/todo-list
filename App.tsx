// App.tsx

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TaskListScreen } from "./app/screens/TaskListScreen";
import { AddTaskScreen } from "./app/screens/AddTaskScreen";
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
}

export type RootStackParamList = {
  TaskList: undefined;
  AddTask: { taskToEdit?: Task } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootLayout() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
          },
          headerTintColor: "#0056B3",
          headerTitleStyle: {
            fontFamily: "Jakarta-Bold",
            fontSize: 18,
            color: "#334155",
          },
          cardStyle: {
            backgroundColor: "#FFFFFF",
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
