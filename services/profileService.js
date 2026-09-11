import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const profileService = {
  getMyProfile: async () => {
    try {
      const response = await api.get('/api/v1/profile/me');
      const user = response.data?.data?.user || null;
      if (!user) return null;

      // `avatar_url` is the permanent private S3 key. The API separately
      // returns a short-lived, display-ready signed URL.
      return {
        ...user,
        avatar_storage_key: user.avatar_url || null,
        avatar_url: user.profilePictureUrl || (/^https?:\/\//i.test(user.avatar_url || '') ? user.avatar_url : null),
      };
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Unable to fetch profile',
        status: error.response?.status,
      };
    }
  },

  updateProfilePicture: async (asset) => {
    try {
      const formData = new FormData();
      const extension = asset?.uri?.split('.').pop()?.split('?')[0] || 'jpg';
      formData.append('profilePicture', {
        uri: asset.uri,
        name: asset.fileName || `profile-picture.${extension}`,
        type: asset.mimeType || 'image/jpeg',
      });

      // React Native's Axios adapter can report ERR_NETWORK for PATCH requests
      // containing its native FormData object. Native fetch handles the file
      // URI and multipart boundary reliably; do not set Content-Type manually,
      // because fetch must generate the matching boundary itself.
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${api.defaults.baseURL}/api/v1/profile/me/profile-picture`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw {
          message: payload?.message || `Profile picture upload failed (${response.status})`,
          status: response.status,
        };
      }

      return payload?.data || null;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Unable to update profile picture',
        status: error.status || error.response?.status,
      };
    }
  },

  deleteAccount: async () => {
    try {
      const response = await api.delete('/api/v1/profile/me');
      return response.data;
    } catch (error) {
      throw {
        message: error.response?.data?.message || error.message || 'Unable to delete account',
        status: error.response?.status,
      };
    }
  },
};
