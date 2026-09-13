import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import * as Location from "expo-location";

export default function Index() {
    const router = useRouter();
    const { authChecked, isLoggedIn, user, branchId } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!authChecked) return;

        if (!isLoggedIn) {
            router.replace("/(auth)/onboarding1");
            return;
        }

        (async () => {
            try {
                const hasBranch = Boolean(user?.branch_id || branchId);
                const perm = await Location.getForegroundPermissionsAsync();
                if (!hasBranch || perm.status !== "granted") {
                    router.replace("/(auth)/location-permission");
                } else {
                    router.replace("/(tabs)/home");
                }
            } catch {
                router.replace("/(auth)/location-permission");
            }
        })();
    }, [authChecked, isLoggedIn, user?.branch_id, branchId, router]);

    return null;
}
