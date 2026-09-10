import { Stack } from "expo-router";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchDeveloperKyc } from "../../store/slices/authSlice";

export default function TabsLayout() {
    const dispatch = useDispatch();
    const { isLoggedIn, kycInitialized, kycLoading, kycError } = useSelector((state) => state.auth);

    // Never classify an account as incomplete while its authoritative KYC
    // record is still loading after login.
    if (isLoggedIn && (!kycInitialized || kycLoading)) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#4A43EC" />
            </View>
        );
    }

    // A failed status request is an unknown state, not an incomplete KYC. Do
    // not incorrectly send an already-verified developer to the KYC form.
    if (isLoggedIn && kycError) {
        return (
            <View className="flex-1 items-center justify-center bg-white px-8">
                <Text className="text-center text-base font-lato-bold text-gray-900">Unable to verify KYC status</Text>
                <Text className="mt-2 text-center text-sm font-lato text-gray-500">Please retry to continue.</Text>
                <TouchableOpacity
                    className="mt-5 rounded-xl bg-[#4A43EC] px-6 py-3"
                    onPress={() => dispatch(fetchDeveloperKyc())}
                >
                    <Text className="font-lato-bold text-white">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="home" />
            <Stack.Screen name="add-project" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
