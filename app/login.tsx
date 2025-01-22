import images from "@/constants/images";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login } from "@/lib/appwrite";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { Redirect } from "expo-router";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { refetch, loading, isLogged } = useGlobalContext();

  const handleLogin = () => {
    // onLogin(email, password);
  };

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLoginGoogle = async () => {
    const res = await login();

    if (res) {
      refetch();
      console.log("login Success");
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
        </View>
        {/* Logo */}

        {/* Input Fields */}
        <View>
          <TextInput
            className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View className="relative mb-4">
            <TextInput
              className="h-12 px-4 border border-gray-300 rounded-md"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setShowPassword(!showPassword)}
            >
              <Image
                source={showPassword ? images.noResult : images.noResult}
                className="w-6 h-6"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity className="items-end mt-2">
          <Text className="text-blue-600">Forgot Password?</Text>
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
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
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
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Apple
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Don't have an Account? </Text>
          <TouchableOpacity>
            <Text className="text-emerald-500">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignIn;
