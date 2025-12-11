import React from "react";
import { SafeAreaView, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./app/types/types";
import TaskListScreen from "./app/screens/TaskListScreen";
import AddTaskScreen from "./app/screens/AddTaskScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <View className="flex-1 bg-brand-primaryLight">
        <Stack.Navigator
          initialRouteName="TaskList"
          screenOptions={{
            headerShown: true,
          }}
        >
          <Stack.Screen name="TaskList" component={TaskListScreen} />
          <Stack.Screen name="AddTask" component={AddTaskScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}
