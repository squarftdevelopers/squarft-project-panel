import { Stack } from "expo-router";

export default function TabsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="home" />
            <Stack.Screen name="add-project" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
