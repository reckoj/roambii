import images from "@/constants/images";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {  registerUser } from "@/lib/appwrite";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { Redirect, router } from "expo-router";
import { EyeClosedIcon, EyeIcon } from "lucide-react-native";

const Register = () => {
  const [email, setEmail] = useState("");
  const [fname, setFName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const { refetch, loading, isLogged } = useGlobalContext();

 


  const handleRegister = async () => {
    const trimmedName = fname.trim()

    if (!trimmedName.includes(" ")) {
      Alert.alert("Invalid Name", "Please enter your full name (first and last).");
      return;
    }
    try {
      const user = await registerUser(fname, email, password, isAgent);
      Alert.alert("Registration Successful", "You can now log in!");
      console.log(user);
     router.push("/login")
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    }
  };



  if (!loading && isLogged) return <Redirect href="/" />;


  const [isAgent, setIsAgent] = useState(false);

  const toggleSwitch = () => {
    setIsAgent((previousState) => !previousState);
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
            
            value={fname}
            onChangeText={setFName}
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
          {  showPassword ? <EyeClosedIcon color="#1ABC9C" size={22}/> : <EyeIcon color="#1ABC9C" size={22}/>}
               
            
            </TouchableOpacity>
          </View>
          <View className="relative mb-4">
            <Text className="text-text font-rubik-medium">Confirm Password</Text>
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

           <View >
                  <Text className="mb-2" >
                    {!isAgent ? "Register as an agent" : <Text className="text-danger">You will be required to verify your agent status</Text>} </Text>
                  <Switch
                 value={isAgent} onValueChange={setIsAgent}
                  />
                </View>
        </View>

       
        {/* Login Button */}
        <TouchableOpacity
          className="h-12 mt-6 mb-4 bg-primary-300 rounded-md items-center justify-center"
          onPress={handleRegister}
        >
          <Text className="text-lg font-rubik-bold text-white ml-2">
            Sign up
          </Text>
        </TouchableOpacity>

        {/* Social Login */}
        {/* <View className="mt-6 space-y-4">
          <TouchableOpacity
            onPress={handleRegister}
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
        </View> */}

        {/* Sign Up Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={ () => router.back()}>
            <Text className="text-emerald-500">Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Register;
