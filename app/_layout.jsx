import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Provider, useDispatch, useSelector } from 'react-redux';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, AppState, BackHandler, Platform } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import "../global.css";
import { store } from '../store/store';
import { hydrateAuthThunk, logout } from '../store/slices/authSlice';
import { authService } from '../services/authService';
import { getJwtExpiryMs, isJwtExpired } from '../utils/tokenExpiry';
import { setUnauthorizedHandler } from '../utils/unauthorizedSession';

import PushNotificationRegistrar from "../components/PushNotificationRegistrar";

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
        dispatch(hydrateAuthThunk());
    }, [dispatch]);

    return null;
}

function AndroidExitGuard() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (Platform.OS !== "android") return undefined;

        const onBackPress = () => {
            if (router.canGoBack()) {
                return false;
            }

            Alert.alert("Exit app", "Are you sure you want to exit the app?", [
                { text: "Cancel", style: "cancel" },
                { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
            ]);
            return true;
        };

        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
    }, [pathname, router]);

    return null;
}

function SessionExpiryGuard() {
    const dispatch = useDispatch();
    const router = useRouter();
    const token = useSelector((state) => state.auth.token);
    const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

    useEffect(() => {
        const signOut = () => {
            if (!isLoggedIn) return;
            dispatch(logout());
            authService.logout();
            router.replace('/(auth)/login');
        };

        return setUnauthorizedHandler(signOut);
    }, [dispatch, isLoggedIn, router]);

    useEffect(() => {
        if (!token || !isLoggedIn) return undefined;

        let expiryTimer;
        const signOutIfExpired = () => {
            if (!isJwtExpired(token)) return;
            dispatch(logout());
            authService.logout();
            router.replace('/(auth)/login');
        };

        const expiresAt = getJwtExpiryMs(token);
        if (expiresAt !== null) {
            const delay = expiresAt - Date.now();
            if (delay <= 0) signOutIfExpired();
            else expiryTimer = setTimeout(signOutIfExpired, Math.min(delay, 2147483647));
        }

        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') signOutIfExpired();
        });

        return () => {
            if (expiryTimer) clearTimeout(expiryTimer);
            subscription.remove();
        };
    }, [dispatch, isLoggedIn, router, token]);

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
        if (!fontsLoaded) return undefined;
        const timer = setTimeout(() => SplashScreen.hideAsync(), 180);
        return () => clearTimeout(timer);
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Provider store={store}>
                <BottomSheetModalProvider>
                    <SafeAreaProvider>
                        <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
                        <AppInit />
                        <AndroidExitGuard />
                        <SessionExpiryGuard />
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
                    </SafeAreaProvider>
                </BottomSheetModalProvider>
            </Provider>
        </GestureHandlerRootView>
    );
}
