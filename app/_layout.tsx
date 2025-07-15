// app/_layout.tsx
import "./global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { GlobalProvider } from "../lib/global-provider";
import { AuthProvider } from "../lib/context/auth-context";
import ReduxProvider from "../lib/redux/provider";
import StripeProvider from "./StripeProvider";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { app } from "../lib/firebase/firebase-config";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(console.error);

// Error Boundary Component
class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong!</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    async function prepare() {
      try {
        console.log("🚀 App initialization started");
        
        // Verify Firebase is initialized
        if (!app) {
          throw new Error("Firebase app not initialized");
        }
        console.log("✅ Firebase verified");

        // Check font loading status
        if (fontError) {
          throw new Error("Font loading error");
        }

        // Wait for fonts
        if (!fontsLoaded) {
          console.log("⏳ Waiting for fonts...");
          return;
        }
        console.log("✅ Fonts loaded");

        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mark app as ready
        setAppIsReady(true);
        console.log("✅ App is ready!");
      } catch (error) {
        console.error("❌ App initialization error:", error);
        setInitError(error instanceof Error ? error.message : "Unknown error");
      }
    }

    prepare();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (appIsReady || initError) {
      // Hide splash screen when app is ready or has error
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [appIsReady, initError]);

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <Text style={styles.errorHint}>Please restart the app</Text>
      </View>
    );
  }

  // Show nothing while loading
  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ReduxProvider>
        <AuthProvider>
          <GlobalProvider>
            <StripeProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="debug-info" />
                <Stack.Screen name="(root)" />
                <Stack.Screen name="pre-login" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="verificationScreen" />
                <Stack.Screen name="verificationConfirmationScreen" />
              </Stack>
            </StripeProvider>
          </GlobalProvider>
        </AuthProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF0000",
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  errorButton: {
    backgroundColor: "#1ABC9C",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  errorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
