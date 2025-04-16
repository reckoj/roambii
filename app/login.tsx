// app/login.tsx
import images from "@/constants/images";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, Redirect } from "expo-router";
import { EyeClosedIcon, EyeIcon } from "lucide-react-native";

import icons from "@/constants/icons";
import {
  loginUserAsync,
  loginWithGoogleAsync,
  clearAuthError,
} from "@/lib/redux/slices/authSlice";
import { RootState, AppDispatch } from "@/lib/store/store";

export default function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isLoading, isAuthenticated, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    // Use useEffect for imperative navigation instead of Redirect
    useEffect(() => {
      if (isAuthenticated) {
        router.replace("/(root)/(tabs)");
      }
    }, [isAuthenticated, router]);

    // Return a loading screen while redirecting
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text className="mt-4 text-gray-600">Redirecting...</Text>
      </View>
    );
  }

  // Show error alerts when they occur
  useEffect(() => {
    if (error) {
      Alert.alert("Login Failed", error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      const resultAction = await dispatch(loginUserAsync({ email, password }));

      // Check if we have a rejected action with verification requirement
      if (
        loginUserAsync.rejected.match(resultAction) &&
        resultAction.payload &&
        typeof resultAction.payload === "string" &&
        resultAction.payload.includes("verify your email")
      ) {
        // Extract userId if available in the error message
        const userId = extractUserIdFromError(resultAction.payload);

        if (userId) {
          router.push({
            pathname: "/verificationScreen",
            params: {
              email: email,
              userId: userId,
            },
          });
        } else {
          Alert.alert(
            "Verification Required",
            "Please verify your email before logging in. Check your inbox for the verification link."
          );
        }
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLoginGoogle = async () => {
    try {
      await dispatch(loginWithGoogleAsync());
      // Redirect will handle navigation
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  // Helper function to extract userId from error messages
  const extractUserIdFromError = (errorMsg: string): string | null => {
    const match = errorMsg.match(/userId:\s*([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 px-6 pt-10">
            <View className="items-center mb-10">
              <Image
                source={images.roambiiLogo}
                className="w-full h-40 resize-contain"
              />
            </View>

            {/* Input Fields */}
            <View>
              <Text className="text-text font-rubik-medium">Email</Text>
              <TextInput
                className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your email"
              />

              <View className="relative mb-4">
                <Text className="text-text font-rubik-medium">Password</Text>
                <TextInput
                  className="h-12 px-4 border border-gray-300 rounded-md"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                />
                <TouchableOpacity
                  className="absolute right-4 top-8"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeClosedIcon color="#1ABC9C" size={22} />
                  ) : (
                    <EyeIcon color="#1ABC9C" size={22} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              className="items-end"
              onPress={() => router.push("/forgot-password")}
            >
              <Text className="text-text font-rubik-medium">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              className="h-12 mt-6 mb-4 bg-primary-300 rounded-md items-center justify-center"
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-lg font-rubik-bold text-white">
                  Log In
                </Text>
              )}
            </TouchableOpacity>

            {/* Social Login */}
            <View className="mt-6 space-y-4">
              <TouchableOpacity
                onPress={handleLoginGoogle}
                disabled={isLoading}
                className="border border-gray-300 rounded-md w-full py-4 mt-5"
              >
                <View className="flex flex-row items-center justify-center">
                  <Image
                    source={icons.google}
                    className="w-5 h-5"
                    resizeMode="contain"
                  />
                  <Text className="text-lg font-rubik-medium text-text ml-2">
                    Continue with Google
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="border border-gray-300 rounded-md w-full py-4 mt-5">
                <View className="flex flex-row items-center justify-center">
                  <Image
                    source={icons.apple}
                    className="w-5 h-5"
                    resizeMode="contain"
                  />
                  <Text className="text-lg font-rubik-medium text-text ml-2">
                    Continue with Apple
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text className="text-emerald-500">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
