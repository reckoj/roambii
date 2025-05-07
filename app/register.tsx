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
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/constants/icons";
import { router } from "expo-router";
import { EyeClosedIcon, EyeIcon } from "lucide-react-native";
import { useAuthOperations } from "@/lib/use-auth-operations";

// Define niche options
const NICHE_OPTIONS = [
  "All Inclusive",
  "Cruises",
  "Luxury",
  "Adventure",
  "Corporate & Business",
  "Family",
];

const Register = () => {
  const { register, loading, error } = useAuthOperations();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (isAgent && !selectedNiche) {
      Alert.alert("Error", "Please select a niche for your travel agency");
      return;
    }

    try {
      const response = await register(email, password, name, isAgent, selectedNiche);

      if (response.success) {
        // Registration was successful, navigate to verification screen
        router.push({
          pathname: "/verificationScreen",
          params: {
            email: email,
            userId: response.userId,
          },
        });
      } else {
        Alert.alert("Registration Failed", response.message);
      }
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        error.message || "An unknown error occurred."
      );
    }
  };

  const handleSelectNiche = (niche: string) => {
    setSelectedNiche(niche);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView className="flex-1 bg-white">
          <ScrollView>
            <View className="flex-1 px-6 pt-10">
              <View className="items-center mb-10">
                <Image
                  source={images.roambiiLogo}
                  className="w-full h-40 resize-contain"
                />
              </View>

              {/* Input Fields */}
              <View>
                <Text className="text-text font-rubik-medium">Full Name</Text>
                <TextInput
                  className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
                  value={name}
                  onChangeText={setName}
                  keyboardType="default"
                  autoCapitalize="words"
                  editable={!loading}
                />

                <Text className="text-text font-rubik-medium">Email</Text>
                <TextInput
                  className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />

                <View className="relative mb-4">
                  <Text className="text-text font-rubik-medium">Password</Text>
                  <TextInput
                    className="h-12 px-4 border border-gray-300 rounded-md"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-8"
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
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
                    editable={!loading}
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-8"
                    onPress={() => setShowCPassword(!showCPassword)}
                    disabled={loading}
                  >
                    {showCPassword ? (
                      <EyeClosedIcon color="#1ABC9C" size={22} />
                    ) : (
                      <EyeIcon color="#1ABC9C" size={22} />
                    )}
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="mb-2">Are you a travel agent?</Text>
                  <Switch
                    value={isAgent}
                    onValueChange={setIsAgent}
                    disabled={loading}
                  />
                </View>

                {isAgent && (
                  <View className="mb-4">
                    <Text className="mb-2">Select your niche:</Text>
                    <View className="flex-row flex-wrap">
                      {NICHE_OPTIONS.map((niche) => (
                        <TouchableOpacity
                          key={niche}
                          onPress={() => handleSelectNiche(niche)}
                          className={`mr-2 mb-2 px-3 py-2 rounded-full ${
                            selectedNiche === niche
                              ? "bg-primary-300"
                              : "bg-gray-200"
                          }`}
                          disabled={loading}
                        >
                          <Text
                            className={`${
                              selectedNiche === niche
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {niche}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleRegister}
                  className="bg-primary-300 py-4 rounded-md mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-center font-rubik-medium">
                      Register
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/login")}
                  className="mt-4"
                  disabled={loading}
                >
                  <Text className="text-center text-gray-600">
                    Already have an account?{" "}
                    <Text className="text-primary-300">Login</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Register;

// Styles equivalent to TailwindCSS classes
const styles = StyleSheet.create({
  container: {
    padding: 6,
    backgroundColor: "white",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#34495E",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 32,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: "#f3f4f6",
    margin: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedPill: {
    backgroundColor: "#1ABC9C",
    borderColor: "#1ABC9C",
  },
  pillText: {
    fontSize: 14,
    color: "#374151",
  },
  selectedPillText: {
    color: "white",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#95A5A6",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
  },
});
