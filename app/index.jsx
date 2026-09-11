import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";

export default function Index() {
    const router = useRouter();
    const { authChecked, isLoggedIn } = useSelector((state) => state.auth);

    useEffect(() => {
        if (authChecked) {
            router.replace(isLoggedIn ? "/(tabs)/home" : "/(auth)/onboarding1");
        }
    }, [authChecked, isLoggedIn, router]);

    return null;
}
