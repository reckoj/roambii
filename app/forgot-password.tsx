import AuthButton from "@/components/AuthButton";
import CustomInput from "@/components/CustomInput";
import images from "@/constants/images";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      // Implement your password reset logic here
      // await resetPassword(email);

      Alert.alert(
        "Success",
        "Password reset instructions have been sent to your email",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to send reset instructions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6">
      <View className="items-center mb-8">
        <Image
          source={images.forgot} // Add your image path
          className="w-96 h-96"
          resizeMode="contain"
        />
      </View>

      <View className="">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          Forgot Password?
        </Text>
        <Text className="text-gray-600 mb-4">
          Don't worry! It happens. Please enter the email address associated
          with your account.
        </Text>
      </View>

      <View className="mb-6">
        <CustomInput onChangeText={setEmail} value={email} />
      </View>

      {/* <TouchableOpacity
        className={`w-full rounded-lg py-4 ${
          isLoading ? "bg-blue-300" : "bg-blue-500"
        }`}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center font-semibold text-lg">
            Reset Password
          </Text>
        )}
      </TouchableOpacity> */}

      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <AuthButton onPress={handleResetPassword} title="Reset Password" />
      )}

      <TouchableOpacity className="mt-6" onPress={() => router.back()}>
        <Text className="text-primary-300 text-center font-rubik-medium">
          Back to Login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ForgotPasswordScreen;
