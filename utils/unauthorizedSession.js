let unauthorizedHandler = null;
let notificationInProgress = false;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
    return () => {
        if (unauthorizedHandler === handler) unauthorizedHandler = null;
    };
};

export const notifyUnauthorized = () => {
    if (notificationInProgress) return;
    notificationInProgress = true;
    unauthorizedHandler?.();
    setTimeout(() => {
        notificationInProgress = false;
    }, 500);
};
