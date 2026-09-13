import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import "../global.css";
import { store } from '../store/store';
import { hydrateAuthThunk, fetchDeveloperKyc } from '../store/slices/authSlice';

import PushNotificationRegistrar from "../components/PushNotificationRegistrar";

import KycModal from "../components/KycModal";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";

import {
    useFonts,
    Lato_400Regular,
    Lato_700Bold,
    Lato_300Light,
    Lato_900Black,
} from "@expo-google-fonts/lato";

SplashScreen.preventAutoHideAsync();

function AppInit() {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(hydrateAuthThunk()).then((result) => {
            if (result.payload?.token) {
                dispatch(fetchDeveloperKyc());
            }
        });
    }, [dispatch]);

    return null;
}

export default function RootLayout() {
    const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
    const [fontsLoaded] = useFonts({
        Lato_400Regular,
        Lato_700Bold,
        Lato_300Light,
        Lato_900Black,
    });

    useEffect(() => {
        if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Provider store={store}>
                <BottomSheetModalProvider>
                    <SafeAreaProvider>
                        <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
                        <AppInit />
                        <PushNotificationRegistrar />
                        <Stack>
                            <Stack.Screen name="index" options={{ headerShown: false }} />
                            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: "none" }} />
                            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
                            <Stack.Screen name="(screens)" options={{ headerShown: false, animation: "none" }} />
                        </Stack>
                        {showAnimatedSplash && (
                            <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} />
                        )}
                        <KycModal />
                    </SafeAreaProvider>
                </BottomSheetModalProvider>
            </Provider>
        </GestureHandlerRootView>
    );
}
