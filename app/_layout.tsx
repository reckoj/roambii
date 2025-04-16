// app/_layout.tsx
import { SplashScreen, Stack } from "expo-router";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import GlobalProvider from "@/lib/global-provider";
import StripeProvider from "@/app/StripeProvider";
import ReduxProvider from "@/lib/redux/provider";
import { AppDispatch } from "@/lib/store/store";
import { fetchCurrentUserAsync } from "@/lib/redux/slices/authSlice";

// Prevent auto-hiding of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore if already prevented */
});

function AppInitializer() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Fetch the current user if available
        await dispatch(fetchCurrentUserAsync());
      } catch (error) {
        console.log("Not authenticated:", error);
      } finally {
        // Hide splash screen once authentication check is done
        SplashScreen.hideAsync().catch(console.error);
      }
    };

    initialize();
  }, [dispatch]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Don't hide splash screen here - we'll hide it after auth check
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GlobalProvider>
      <ReduxProvider>
        <AppInitializer />
        <StripeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </StripeProvider>
      </ReduxProvider>
    </GlobalProvider>
  );
}
