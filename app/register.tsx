import images from "@/constants/images";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { registerUser } from "@/lib/appwrite";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { Redirect, router } from "expo-router";
import { EyeClosedIcon, EyeIcon } from "lucide-react-native";

const Register = () => {
  const { isLogged, loading } = useGlobalContext();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [loading1, setLoading] = useState(false);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    if (!loading && isLogged) {
      router.replace("/login");
    }
  }, [loading, isLogged, router]);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await registerUser(
        name,
        email,
        password,
        isAgent,
        confirmPassword
      );

      if (!response.success) {
        Alert.alert("Registration Failed", response.message);
        return;
      }

      Alert.alert("Registration Successful", "You can now log in!");
      router.replace("/login");
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        error.message || "An unknown error occurred."
      );
    } finally {
      setLoading(false);
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
          <Text className="text-text font-rubik-medium">Full Name</Text>
          <TextInput
            className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
            value={name}
            onChangeText={setName}
            keyboardType="default"
            autoCapitalize="none"
          />

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
          <View className="relative mb-4">
            <Text className="text-text font-rubik-medium">
              Confirm Password
            </Text>
            <TextInput
              className="h-12 px-4 border border-gray-300 rounded-md"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showCPassword}
            />
            {/* <TouchableOpacity
              className="absolute right-4 top-8"
              onPress={() => setShowPassword(!showPassword)}
            >
          {  showPassword ? <EyeClosedIcon color="#1ABC9C" size={22}/> : <EyeIcon color="#1ABC9C" size={22}/>}
               
            
            </TouchableOpacity> */}
          </View>

          <View className="mb-4">
            <Text className="mb-2">
              {!isAgent ? (
                "Register as an agent"
              ) : (
                <Text className="text-danger">
                  You will be required to verify your agent status
                </Text>
              )}{" "}
            </Text>
            <Switch
              trackColor={{ false: "#95A5A6", true: "#1ABC9C" }}
              thumbColor={isAgent ? "#FFFFFF" : "#FFFFFF"}
              value={isAgent}
              onValueChange={setIsAgent}
            />
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className="h-12 mt-6 mb-4 bg-primary-300 rounded-md items-center justify-center"
          onPress={handleRegister}
          disabled={loading}
        >
          <Text className="text-lg font-rubik-bold text-white ml-2">
            {loading ? (
              <ActivityIndicator className="text-white" size={8} />
            ) : (
              "Sign up"
            )}
          </Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-emerald-500">Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Register;
