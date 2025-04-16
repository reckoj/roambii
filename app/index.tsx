// app/index.tsx
import { useRouter } from "expo-router";
import { View, ActivityIndicator, Text, SafeAreaView } from "react-native";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { RootState } from "@/lib/store/store";

export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Use useEffect with a timeout to ensure navigation happens after mounting
  useEffect(() => {
    // Create a small delay to ensure the layout is fully mounted
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          router.replace("/(root)/(tabs)");
        } else {
          router.replace("/login");
        }
      }
    }, 50); // Small delay of 100ms

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, router]);

  // Return a loading view while checking auth status or redirecting
  return <SafeAreaView className="flex-1 bg-white"></SafeAreaView>;
}
