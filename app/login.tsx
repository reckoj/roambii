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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginUser, loginWGoogle } from "@/lib/appwrite";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { Redirect, router } from "expo-router";
import { EyeClosedIcon, EyeIcon } from "lucide-react-native";

const SignIn = () => {
  const { refetch, loading, isLogged } = useGlobalContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && isLogged) {
      router.replace("/");
    }
  }, [loading, isLogged, router]);

  const handleLogin = async () => {
    try {
      const res = await loginUser(email, password);
      if (res.success) {
        await refetch(); // Wait for the refetch to complete
      } else {
        Alert.alert("Login Failed", "Invalid credentials");
      }
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    }
  };

  const handleLoginGoogle = async () => {
    const res = await loginWGoogle();

    if (res) {
      refetch();
    } else {
      Alert.alert("Error", "Failed to log in");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-10">
        <View className="items-center mb-10">
          <Image
            source={images.roamiiLogo}
            className="w-full h-40 resize-contain"
          />
          {/* <View><Text className="text-xl font-rubik text-text ml-2 mb-6" >Sign In</Text></View> */}
        </View>
        {/* Logo */}

        {/* Input Fields */}
        <View>
          <Text className="text-text font-rubik-medium">Email</Text>
          <TextInput
            className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View className="relative mb-4">
            <Text className="text-text font-rubik-medium">Password</Text>
            <TextInput
              className="h-12 px-4 border border-gray-300 rounded-md"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
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
          className="items-end "
          onPress={() => router.push("/forgot-password")}
        >
          <Text className="text-text font-rubik-medium">Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          className="h-12 mt-6 mb-4 bg-primary-300 rounded-md items-center justify-center"
          onPress={handleLogin}
        >
          <Text className="text-lg font-rubik-bold text-white ml-2">
            Log In
          </Text>
        </TouchableOpacity>

        {/* Social Login */}
        <View className="mt-6 space-y-4">
          <TouchableOpacity
            onPress={handleLoginGoogle}
            className=" border border-gray-300 rounded-md w-full py-4 mt-5"
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

          <TouchableOpacity className=" border border-gray-300 rounded-md w-full py-4 mt-5">
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.apple}
                className="w-5 h-5 "
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
  );
};

export default SignIn;
