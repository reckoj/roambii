// app/_layout.tsx
import { router, SplashScreen, Stack } from "expo-router";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import GlobalProvider from "@/lib/global-provider";
import StripeProvider from "@/app/StripeProvider";
import ReduxProvider from "@/lib/redux/provider";
import { AppDispatch } from "@/lib/redux/store/store";
import { fetchCurrentUserAsync } from "@/lib/redux/slices/authSlice";
import { verifyEmail } from "@/lib/auth-service";
import { Alert } from "react-native";

// Prevent auto-hiding of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore if already prevented */
});

function AppInitializer() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Add a small delay to ensure services are initialized
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Attempt to fetch current user
        const result = await dispatch(fetchCurrentUserAsync()).unwrap();
        console.log("User session restored:", !!result);
      } catch (error) {
        console.log("No active session:", error);
      } finally {
        // Always hide splash screen
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
    <ReduxProvider>
      <GlobalProvider>
        <AppInitializer />
        <StripeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </StripeProvider>
      </GlobalProvider>
    </ReduxProvider>
  );
}

/**
 * Handles deep links for password reset and other functionality
 */
const handleDeepLink = (url: string) => {
  console.log("Deep link received:", url);

  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Check for password reset links - typical format: /reset-password?oobCode=xyz
    if (path.includes("reset-password") || path.includes("resetPassword")) {
      const oobCode = searchParams.get("oobCode") || searchParams.get("code");

      if (oobCode) {
        console.log("Password reset code detected:", oobCode);
        // Navigate to the reset password screen with the code
        router.push({
          pathname: "/reset-password",
          params: { oobCode },
        });
        return;
      }
    }

    // Check for email verification links
    if (path.includes("verify-email") || path.includes("verifyEmail")) {
      const oobCode = searchParams.get("oobCode") || searchParams.get("code");

      // if (oobCode) {
      //   console.log("Email verification code detected:", oobCode);
      //   // Navigate to the email verification screen with the code
      //   router.push({
      //     pathname: "/verify-email",
      //     params: { oobCode },
      //   });
      //   return;
      // }

      verifyEmail(oobCode!).then((response) => {
        if (response.success) {
          Alert.alert(
            "Success",
            "Email verified successfully. You can now log in."
          );
        } else {
          Alert.alert("Error", response.message);
        }
        router.replace("/login");
      });
    }

    // Handle other types of deep links here
    console.log("Unhandled deep link path:", path);
  } catch (error) {
    console.error("Error handling deep link:", error);
  }
};
