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
import { useDispatch, useSelector } from "react-redux";
import {
  registerUserAsync,
  clearAuthError,
} from "@/lib/redux/slices/authSlice";
import { AppDispatch, RootState } from "@/lib/store/store";

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
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Clear any auth errors when component mounts or unmounts
  React.useEffect(() => {
    dispatch(clearAuthError());
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

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
      // Register using Redux thunk
      const resultAction = await dispatch(
        registerUserAsync({
          name,
          email,
          password,
          isAgent,
          cPassword: confirmPassword,
          niche: selectedNiche,
        })
      )
        .unwrap()
        .catch((error) => {
          Alert.alert(
            "Registration Failed",
            error || "An unknown error occurred."
          );
          return null;
        });

      if (resultAction) {
        // Registration was successful, navigate to verification screen
        router.push({
          pathname: "/verificationScreen",
          params: {
            email: email,
          },
        });
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
                  autoCapitalize="words" // Changed to capitalize words
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
                  <TouchableOpacity
                    className="absolute right-4 top-8"
                    onPress={() => setShowCPassword(!showCPassword)}
                  >
                    {showCPassword ? (
                      <EyeClosedIcon color="#1ABC9C" size={22} />
                    ) : (
                      <EyeIcon color="#1ABC9C" size={22} />
                    )}
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="mb-2">
                    {!isAgent ? (
                      "Register as an agent"
                    ) : (
                      <View className="w-full">
                        <Text className="text-text font-rubik-medium">
                          License Number
                        </Text>
                        <TextInput
                          className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
                          value={licenseNumber}
                          onChangeText={setLicenseNumber}
                          keyboardType="default"
                          autoCapitalize="characters"
                        />
                        <Text className="text-danger">
                          You will be required to verify your agent status
                        </Text>
                      </View>
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

              {isAgent && (
                <View style={styles.container}>
                  <Text style={styles.title}>Select Your Travel Niche</Text>

                  <Text style={styles.subtitle}>
                    Choose the travel category you specialize in
                  </Text>
                  <View style={styles.pillsContainer}>
                    {NICHE_OPTIONS.map((niche) => (
                      <TouchableOpacity
                        key={niche}
                        style={[
                          styles.pill,
                          selectedNiche === niche && styles.selectedPill,
                        ]}
                        onPress={() => handleSelectNiche(niche)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            selectedNiche === niche && styles.selectedPillText,
                          ]}
                        >
                          {niche}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Display error from Redux state if any */}
              {error && (
                <Text className="text-red-500 mb-4 text-center">{error}</Text>
              )}

              {/* Register Button */}
              <TouchableOpacity
                className="h-12 mb-4 bg-primary-300 rounded-md items-center justify-center"
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-lg font-rubik-bold text-white">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              {/* Sign In Link */}
              <View className="flex-row justify-center my-6">
                <Text className="text-gray-600">Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text className="text-emerald-500">Log In</Text>
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
