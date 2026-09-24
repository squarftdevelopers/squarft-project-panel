import { Redirect, Stack } from "expo-router";
import { useSelector } from "react-redux";

export default function TabsLayout() {
    const { isLoggedIn, authChecked } = useSelector((state) => state.auth);

    if (authChecked && !isLoggedIn) {
        return <Redirect href="/(auth)/login" />;
    }

    // KycModal is mounted at the root and owns the upload/review action. Keep
    // the tabs hidden underneath it until the canonical KYC status is loaded
    // and verified, without navigating directly to the document form.
    return (
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="home" />
            <Stack.Screen name="add-project" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
