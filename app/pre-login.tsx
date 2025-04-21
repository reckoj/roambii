import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";

import { loginWithGoogleAsync } from "@/lib/redux/slices/authSlice";
import { RootState, AppDispatch } from "@/lib/redux/store/store";
import icons from "@/constants/icons";
import images from "@/constants/images";

const PreAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Use useEffect for navigation instead of conditional rendering with Redirect
  useEffect(() => {
    // Only redirect if authenticated and not already loading
    if (isAuthenticated && user && !isLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, user, isLoading, router]);

  const handleGoogleLogin = async () => {
    try {
      await dispatch(loginWithGoogleAsync());
      // Navigation will be handled by the useEffect
    } catch (error) {
      console.error("Google login error:", error);
      Alert.alert("Error", "Failed to login with Google");
    }
  };

  // Show loading indicator if still checking auth
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text className="mt-4 text-gray-600">Checking login status...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView
        contentContainerStyle={{
          height: "100%",
          paddingBottom: 45,
        }}
      >
        <Image
          source={images.onboarding}
          className="w-full h-4/6"
          resizeMode="contain"
        />

        <View className="px-10">
          <Text className="text-3xl text-center font-rubik text-black-200">
            roamb
            <Text className="text-3xl text-center font-rubik text-primary-300">
              ii
            </Text>
          </Text>

          <Text className="text-base font-rubik-bold text-gray-500 text-center mt-2">
            Find Your Perfect Travel Agent
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/login")}
            className="border border-gray-300 rounded-md w-full py-4 mt-5"
            disabled={isLoading}
          >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.email1}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Email
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoogleLogin}
            className="border border-gray-300 rounded-md w-full py-4 mt-5"
            disabled={isLoading}
          >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.google}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-gray-300 rounded-md w-full py-4 mt-5"
            disabled={isLoading}
          >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.apple}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Apple
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PreAuth;
