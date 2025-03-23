import * as Linking from "expo-linking";
import { Platform } from "react-native";

const prefix = Linking.createURL("/");

export default {
  prefixes: [prefix],
  config: {
    screens: {
      // Your existing screens...
      Login: "login",
      Register: "register",

      // Email verification screens
      VerificationScreen: "verification",
      VerificationConfirmation: {
        path: "verify-email",
        parse: {
          url: (url: string) => url,
        },
      },

      // Other screens in your app...
      Home: "home",
      // Add any other routes your app has
    },
  },

  // Utility function to handle deep links
  async getInitialURL() {
    // First, check if the app was opened via a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }

    // On Android, handle Intent from Activity
    if (Platform.OS === "android") {
      // Handle any Android-specific linking if needed
    }

    return null;
  },

  // Subscribe to URL events
  subscribe(listener: (url: string) => void) {
    // Listen to incoming links while the app is running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      listener(url);
    });

    return () => {
      // Clean up the event listener
      subscription.remove();
    };
  },
};
