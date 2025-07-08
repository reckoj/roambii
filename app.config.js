export default ({ config }) => ({
  ...config,
  name: "roambii",
  slug: "roambii",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "roambii",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  updates: {
    enabled: false,
    fallbackToCacheTimeout: 0,
    checkAutomatically: "NEVER",
  },
  runtimeVersion: {
    policy: "sdkVersion",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.roambii",
    associatedDomains: ["applinks:roambii.com"],
    infoPlist: {
      LSApplicationQueriesSchemes: ["roambii"],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.roambii",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "roambii",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "cover",
        backgroundColor: "#ffffff",
        enableFullScreenImage_legacy: true,
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Rubik-Bold.ttf",
          "./assets/fonts/Rubik-ExtraBold.ttf",
          "./assets/fonts/Rubik-SemiBold.ttf",
          "./assets/fonts/Rubik-Medium.ttf",
          "./assets/fonts/Rubik-Regular.ttf",
          "./assets/fonts/Rubik-Light.ttf",
        ],
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.roambii",
        enableGooglePay: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Firebase Configuration - Using environment variables from .env.local
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,

    // Backend API Configuration
    EXPO_PUBLIC_BACKEND_API: process.env.EXPO_PUBLIC_BACKEND_API,

    // EAS Build Configuration
    router: {
      origin: false,
    },
    eas: {
      projectId: "c37f1f63-af38-4ea3-a2d4-9507a9f51233",
    },
  },
}); 