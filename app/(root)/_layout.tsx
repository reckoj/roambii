// app/(root)/_layout.tsx
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { RootState, AppDispatch } from "@/lib/redux/store/store";
import { fetchCurrentUserAsync } from "@/lib/redux/slices/authSlice";

export default function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Check authentication on mount - just once
  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchCurrentUserAsync());
    }
  }, [dispatch, isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Only show loading if we're actively loading AND we don't have user data yet
  if (isLoading && !user) {
    return (
      <SafeAreaView className="bg-white h-full flex justify-center items-center">
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text className="mt-4 text-gray-600">Loading your account...</Text>
      </SafeAreaView>
    );
  }

  return <Slot />;
}
