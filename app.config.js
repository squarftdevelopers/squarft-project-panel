import 'dotenv/config';

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// react-native-maps reads this value from AndroidManifest.xml at native build
// time. Failing here prevents Expo from producing a development build that can
// only crash later when the map screen is opened.
if (!googleMapsApiKey) {
  throw new Error(
    'Google Maps API key is missing. Set GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY before building the app.'
  );
}

export default {
  name: 'SquarFT Project Panel',
  slug: 'squarft-project-panel',
  version: '1.0.0',
  orientation: 'portrait',

  icon: './assets/icons/app-icon.png',

  scheme: 'squarftprojectpanel',

  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  owner: 'squarft-team',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.squarft.projectpanel',

    config: {
      googleMapsApiKey,
    },

    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'com.squarft.projectpanel',

    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
    },

    googleServicesFile: './google-services.json',

    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: 'resize',
    predictiveBackGestureEnabled: false,

    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },

  plugins: [
    'expo-router',
    'expo-font',
    'expo-web-browser',

    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow SquarFT Project Panel to use your location to auto-fill the project address.',

        locationWhenInUsePermission:
          'Allow SquarFT Project Panel to use your location to auto-fill the project address.',
      },
    ],

    [
      'expo-splash-screen',
      {
        image: './assets/icons/icon.png',
        resizeMode: 'cover',
        imageWidth: 200,
        backgroundColor: '#4A43EC',

        dark: {
          backgroundColor: '#4A43EC',
        },
      },
    ],

    [
      'expo-notifications',
      {
        color: '#4A43EC',
        defaultChannel: 'project-panel-alerts',
      },
    ],

    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow SquarFT Project Panel to access your photos to upload KYC documents.',

        cameraPermission:
          'Allow SquarFT Project Panel to access your camera to take a KYC selfie.',
      },
    ],
  ],

  splash: {
    image: './assets/icons/icon.png',
    resizeMode: 'cover',
    imageWidth: 200,
    backgroundColor: '#4A43EC',

    dark: {
      backgroundColor: '#4A43EC',
    },
  },

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    router: {},

    "eas": {
      "projectId": "d658f5e1-f76c-46a8-98d5-ce9cb73f0a38"
    },

    googleMapsApiKey,
  },

  updates: {
    url: 'https://u.expo.dev/d658f5e1-f76c-46a8-98d5-ce9cb73f0a38',
  },

  runtimeVersion: {
    policy: 'appVersion',
  },
  owner: 'squarft-team',
};
