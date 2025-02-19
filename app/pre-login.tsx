import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { loginWGoogle } from "@/lib/appwrite";
import { Redirect, router } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import icons from "@/constants/icons";
import images from "@/constants/images";

const PreAuth = () => {
  const { refetch, loading, isLogged } = useGlobalContext();

  //   if (!loading && !isLogged) return <Redirect href="/login" />;
  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLogin = async () => {
    const result = await loginWGoogle();
    if (result) {
      refetch();
    } else {
      Alert.alert("Error", "Failed to login");
    }
  };

  //   const handlePress = () => {
  //     router.push("/login"); // Navigate to the Login screen
  //   };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView
        contentContainerStyle={{
          height: "100%",
          paddingBottom: 45
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
            <Text className="text-3xl text-center font-rubik  text-primary-300">
              ii
            </Text>
          </Text>

          <Text className="text-base font-rubik-bold text-gray-500 text-center mt-2">
            Find Your Perfect Travel Agent
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/login")}
            className="border border-gray-300 rounded-md w-full py-4 mt-5"
          >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.email1}
                className="w-5 h-5 "
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Email
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            className="border border-gray-300 rounded-md w-full py-4 mt-5"
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

          <TouchableOpacity className="border border-gray-300 rounded-md w-full py-4 mt-5">
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default PreAuth;
