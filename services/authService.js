import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredExpoPushTokenAsync } from './pushNotifications';
import { PUSH_NOTIFICATION_APP_KEY } from './pushNotificationConfig';

const ROLE = 'project_developer';

const getPushContextAsync = async () => {
  const expoPushToken = await getStoredExpoPushTokenAsync();

  return {
    app_key: PUSH_NOTIFICATION_APP_KEY,
    appKey: PUSH_NOTIFICATION_APP_KEY,
    expo_push_token: expoPushToken,
    expoPushToken,
  };
};

const persistSession = async (token, user) => {
  if (!token) return;
  try {
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(user));
  } catch (storageError) {
    console.warn('⚠️ [AUTH SERVICE] Could not store session:', storageError.message);
  }
};

const toAuthError = (error, fallback) => ({
  message: error.response?.data?.message || error.message || fallback,
  status: error.response?.status,
});

export const authService = {
  // Send an OTP to a phone number for registration or login.
  sendOtp: async (phone, purpose) => {
    try {
      const response = await api.post('/auth/send-otp', { phone, purpose, role: ROLE });
      return response.data;
    } catch (error) {
      console.log(' [AUTH SERVICE] Send OTP error:', error.response?.status, error.response?.data?.message);
      throw toAuthError(error, 'Failed to send OTP');
    }
  },

  // Verify the OTP entered by the user, returns a short-lived verified_token
  verifyOtp: async (otpToken, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { otp_token: otpToken, otp });
      return response.data;
    } catch (error) {
      console.log(' [AUTH SERVICE] Verify OTP error:', error.response?.status, error.response?.data?.message);
      throw toAuthError(error, 'OTP verification failed');
    }
  },

  // Register a new project developer account using a verified_token from verifyOtp
  register: async (userData) => {
    try {
      const pushContext = await getPushContextAsync();

      const response = await api.post('/auth/register', {
        verified_token: userData.verified_token,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: ROLE,
        company_name: userData.company_name,
        company_type: userData.company_type,
        rera_number: userData.rera_number,
        location: userData.location,
        branch_id: userData.branch_id,
        ...pushContext,
      });

      await persistSession(response.data.token, response.data.user);
      return response.data;
    } catch (error) {
      console.log(' [AUTH SERVICE] Register error:', error.response?.status, error.response?.data?.message);
      throw toAuthError(error, 'Registration failed');
    }
  },

  // Log in an existing project developer using a verified_token from verifyOtp
  login: async (verifiedToken) => {
    try {
      const pushContext = await getPushContextAsync();

      const response = await api.post('/auth/login', {
        verified_token: verifiedToken,
        role: ROLE,
        ...pushContext,
      });

      await persistSession(response.data.token, response.data.user);
      return response.data;
    } catch (error) {
      console.log(' [AUTH SERVICE] Login error:', error.response?.status, error.response?.data?.message);
      throw toAuthError(error, 'Login failed');
    }
  },

  // Logout
  logout: async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.log('⚠️ [AUTH SERVICE] Logout error:', error.message);
    }
  },

  // Get stored token
  getToken: async () => {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.log('⚠️ [AUTH SERVICE] Get token error:', error.message);
      return null;
    }
  },

  // Get stored user data
  getUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.log('⚠️ [AUTH SERVICE] Get user data error:', error.message);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      console.log('⚠️ [AUTH SERVICE] isAuthenticated error:', error.message);
      return false;
    }
  },
};
