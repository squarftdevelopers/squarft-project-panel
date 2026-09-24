import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";

export default function Index() {
    const router = useRouter();
    const { authChecked, isLoggedIn, user, branchId } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!authChecked) return;

        if (!isLoggedIn) {
            router.replace("/(auth)/onboarding1");
            return;
        }

        const hasBranch = Boolean(user?.branch_id || branchId);
        if (!hasBranch) {
            router.replace("/(auth)/location-permission");
            return;
        }

        router.replace("/(tabs)/home");
    }, [authChecked, branchId, isLoggedIn, router, user?.branch_id]);

    return null;
}
