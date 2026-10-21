import { useNotificationResponse } from "../services/useNotificationResponse";
import { useEffect } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useDispatch, useSelector } from "react-redux";
import { addNotification, replaceNotifications } from "../store/slices/notificationSlice";
import { hydrateNotificationsFromStorage } from "../store/store";
import {
    primePushNotificationsAsync,
    registerPushNotificationsAsync,
} from "../services/pushNotifications";
import { getRouteFromNotificationData, routeNotificationResponse } from "../services/notificationRouting";
import {
    buildProjectPanelNotificationContent,
    getNotificationEventKeyFromData,
} from "../services/projectPanelNotificationCatalog";
import { notificationApi } from "../services/notificationApi";

const getUserId = (user) => user?.id || user?.user_id || user?._id || user?.uuid || null;

const mapApiNotification = (notification) => ({
    id: notification.id,
    title: notification.title,
    description: notification.body,
    message: notification.body,
    watched: Boolean(notification.is_read),
    target: getRouteFromNotificationData(notification.metadata || {}),
    type: notification.type || "default",
    time: notification.sent_at ? new Date(notification.sent_at).toLocaleDateString() : "Recently",
});

const toStoreNotification = (notification) => {
    const content = notification?.request?.content || {};
    const data = content.data || {};
    const eventKey = getNotificationEventKeyFromData(data);
    const catalogContent = buildProjectPanelNotificationContent(eventKey, data);

    return {
        title: content.title || catalogContent?.title || "New notification",
        message: content.body || catalogContent?.message || data.message || "",
        type: eventKey || data.type || "default",
        data,
    };
};

export default function PushNotificationRegistrar() {
    const dispatch = useDispatch();
    const { isLoggedIn, user, token } = useSelector((state) => state.auth);
    const notificationsHydrated = useSelector((state) => state.notifications.hydrated);
    useNotificationResponse(routeNotificationResponse);

    useEffect(() => {
        hydrateNotificationsFromStorage();
    }, []);

    useEffect(() => {
        primePushNotificationsAsync().catch((error) => {
            console.warn("[PUSH] Token priming failed:", error.message);
        });
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !token) return;

        registerPushNotificationsAsync({ userId: getUserId(user) }).catch((error) => {
            console.warn("[PUSH] Registration failed:", error.message);
        });
    }, [isLoggedIn, token, user]);

    useEffect(() => {
        if (!isLoggedIn || !token || !notificationsHydrated) return;

        const syncNotificationBadge = () => notificationApi.list(1, 100)
            .then((response) => {
                const list = response.data?.data || [];
                dispatch(replaceNotifications(list.map(mapApiNotification)));
            })
            .catch((error) => {
                console.warn("[PUSH] Notification badge sync failed:", error.message);
            });
        syncNotificationBadge();
        const appState = AppState.addEventListener("change", (state) => {
            if (state === "active") syncNotificationBadge();
        });
        return () => appState.remove();
    }, [dispatch, isLoggedIn, notificationsHydrated, token]);

    useEffect(() => {
        const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
            dispatch(addNotification(toStoreNotification(notification)));
        });

        return () => {
            receivedSubscription.remove();
        };
    }, [dispatch]);

    return null;
}
