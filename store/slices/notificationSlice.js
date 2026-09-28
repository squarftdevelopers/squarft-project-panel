import { createSlice } from '@reduxjs/toolkit';
import { initialNotifications } from '../../data/notifications';

// This slice is otherwise pure in-memory (the whole store has no
// persistence), so `watched` reset to false — and the two seed "Welcome"
// notifications reappeared — on every fresh app launch/login. `hydrated`
// tracks whether AsyncStorage has been checked yet, so the app-level loader
// (see NotificationHydrator) knows whether to seed the welcome notifications
// (true first-ever launch, nothing persisted) or load what's actually there.
const notificationSlice = createSlice({
    name: 'notifications',
    initialState: {
        list: [],
        hydrated: false,
    },
    reducers: {
        markAsWatched: (state, action) => {
            const notification = state.list.find(item => item.id === action.payload);
            if (notification) {
                notification.watched = true;
            }
        },
        markAllAsWatched: (state) => {
            state.list.forEach(item => {
                item.watched = true;
            });
        },
        addNotification: (state, action) => {
            state.list.unshift({
                id: Date.now(),
                watched: false,
                time: 'Just now',
                type: 'default',
                ...action.payload,
            });
        },
        clearNotifications: (state) => {
            state.list = [];
        },
        replaceNotifications: (state, action) => {
            state.list = Array.isArray(action.payload) ? action.payload : [];
            state.hydrated = true;
        },
        // payload is `null` specifically when AsyncStorage has never stored
        // anything for this device (a true first launch, so the welcome
        // notifications are seeded) — as opposed to an intentionally empty
        // array (the user cleared their notifications), which must stay empty.
        hydrateNotifications: (state, action) => {
            state.list = action.payload === null ? initialNotifications : action.payload;
            state.hydrated = true;
        },
    },
});

export const {
    markAsWatched,
    markAllAsWatched,
    addNotification,
    clearNotifications,
    replaceNotifications,
    hydrateNotifications,
} = notificationSlice.actions;
export default notificationSlice.reducer;
