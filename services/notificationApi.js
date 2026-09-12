import { Platform } from "react-native";
import Constants from "expo-constants";
import api from "./api";
import {
    PUSH_NOTIFICATION_ANDROID_CHANNEL_ID,
    PUSH_NOTIFICATION_ANDROID_PACKAGE,
    PUSH_NOTIFICATION_APP_KEY,
    PUSH_TOKEN_ENDPOINT,
    PUSH_TOKEN_UNREGISTER_ENDPOINT,
    getConfiguredProjectId,
} from "./pushNotificationConfig";

const buildDevicePayload = ({ expoPushToken, devicePushToken, userId }) => ({
    appKey: PUSH_NOTIFICATION_APP_KEY,
    app_key: PUSH_NOTIFICATION_APP_KEY,
    androidChannelId: PUSH_NOTIFICATION_ANDROID_CHANNEL_ID,
    android_channel_id: PUSH_NOTIFICATION_ANDROID_CHANNEL_ID,
    androidPackage: PUSH_NOTIFICATION_ANDROID_PACKAGE,
    android_package: PUSH_NOTIFICATION_ANDROID_PACKAGE,
    expoPushToken,
    expo_push_token: expoPushToken,
    devicePushToken,
    device_push_token: devicePushToken,
    userId,
    user_id: userId,
    platform: Platform.OS,
    projectId: getConfiguredProjectId(Constants),
    appVersion: Constants.expoConfig?.version,
    deviceName: Constants.deviceName,
});

export const notificationApi = {
    registerDevice: ({ expoPushToken, devicePushToken, userId }) =>
        api.post(PUSH_TOKEN_ENDPOINT, buildDevicePayload({ expoPushToken, devicePushToken, userId })),

    unregisterDevice: ({ expoPushToken, userId }) =>
        api.delete(PUSH_TOKEN_UNREGISTER_ENDPOINT, { data: buildDevicePayload({ expoPushToken, userId }) }),

    list: (page = 1, limit = 20) =>
        api.get(`/api/v1/project-panel/notifications?page=${page}&limit=${limit}`),

    markRead: (id) =>
        api.patch(`/api/v1/project-panel/notifications/${encodeURIComponent(id)}/read`),

    markAllRead: () =>
        api.patch("/api/v1/project-panel/notifications/read-all"),
};
