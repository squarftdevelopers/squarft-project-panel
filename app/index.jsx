import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";

export default function Index() {
    const router = useRouter();
    const { authChecked, isLoggedIn, user } = useSelector((state) => state.auth);

    useEffect(() => {
        if (authChecked) {
            if (!isLoggedIn) {
                router.replace("/(auth)/onboarding1");
            } else if (!user?.branch_id) {
                router.replace("/(auth)/location-permission");
            } else {
                router.replace("/(tabs)/home");
            }
        }
    }, [authChecked, isLoggedIn, user, router]);

    return null;
}
