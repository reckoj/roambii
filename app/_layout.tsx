// app/_layout.tsx
import { router, SplashScreen, Stack } from "expo-router";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/context/auth-context";
import StripeProvider from "@/app/StripeProvider";
import { setupUnreadMessageTracker } from "@/lib/firebase/chat-notifications";
import { handleDeepLink } from "@/lib/deep-link-handler";
import * as Linking from "expo-linking";
import ReduxProvider from "@/lib/redux/provider";
import { GlobalProvider } from "@/lib/global-provider";
import { PaperProvider, MD3LightTheme } from "react-native-paper";

// Custom theme that matches app's color scheme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#1ABC9C",
    secondary: "#3498DB",
    error: "#FF4C69",
    background: "#F9FAFC",
    surface: "#FFFFFF",
    text: "#333333",
    onSurface: "#333333",
  },
};

// Prevent auto-hiding of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore if already prevented */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Handle deep links
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ReduxProvider>
      <AuthProvider>
        <GlobalProvider>
          <PaperProvider theme={theme}>
            <StripeProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              />
            </StripeProvider>
          </PaperProvider>
        </GlobalProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}
