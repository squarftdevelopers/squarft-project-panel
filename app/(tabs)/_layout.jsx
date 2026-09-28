import { Redirect, Stack } from "expo-router";
import { useSelector } from "react-redux";
import KycModal from "../../components/KycModal";

export default function TabsLayout() {
    const { isLoggedIn, authChecked } = useSelector((state) => state.auth);

    if (authChecked && !isLoggedIn) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                <Stack.Screen name="home" />
                <Stack.Screen name="add-project" />
                <Stack.Screen name="settings" />
            </Stack>
            <KycModal />
        </>
    );
}
