export const PUSH_NOTIFICATION_APP_KEY = "project_panel_app";
export const PUSH_NOTIFICATION_ANDROID_CHANNEL_ID = "project-panel-alerts";
export const PUSH_NOTIFICATION_ANDROID_PACKAGE = "com.squarft.projectpanel";
export const PUSH_NOTIFICATION_URL_SCHEME = "squarftprojectpanel";

const DEFAULT_PUSH_TOKEN_ENDPOINT = "/api/v1/push-tokens/register";

const normalizePushTokenEndpoint = (configuredEndpoint) => {
    const endpoint = String(configuredEndpoint || "").trim();
    if (!endpoint) return DEFAULT_PUSH_TOKEN_ENDPOINT;

    // Protect against the obsolete route that previously caused registration
    // to POST to /push-tokens and receive an Express 404 page.
    if (/^(https?:\/\/[^/]+)?\/push-tokens\/?$/i.test(endpoint)) {
        return DEFAULT_PUSH_TOKEN_ENDPOINT;
    }

    return endpoint;
};

export const PUSH_TOKEN_ENDPOINT = normalizePushTokenEndpoint(
    process.env.EXPO_PUBLIC_PUSH_TOKEN_ENDPOINT
);

export const PUSH_TOKEN_UNREGISTER_ENDPOINT = normalizePushTokenEndpoint(
    process.env.EXPO_PUBLIC_PUSH_TOKEN_UNREGISTER_ENDPOINT
);

export const PUSH_TOKEN_SYNC_ENABLED =
    process.env.EXPO_PUBLIC_PUSH_TOKEN_SYNC_ENABLED !== "false";

export const getConfiguredProjectId = (constants) =>
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    constants?.expoConfig?.extra?.eas?.projectId ||
    constants?.easConfig?.projectId;
