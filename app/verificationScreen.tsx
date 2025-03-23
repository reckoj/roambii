import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useGlobalContext } from "@/lib/global-provider";
import { resendVerificationEmail } from "@/lib/auth-service";
import images from "@/constants/images";
import { router } from "expo-router";
// Define the route params type
type VerificationScreenParams = {
  email: string;
  userId: string;
};

// Create a route prop type for this screen
type VerificationRouteProp = RouteProp<
  { VerificationScreen: VerificationScreenParams },
  "VerificationScreen"
>;

const VerificationScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigation = useNavigation<any>();
  const route = useRoute<VerificationRouteProp>();
  const { email, userId } = route.params || { email: "", userId: "" };
  const { refetch } = useGlobalContext();

  useEffect(() => {
    // Reset countdown when timer reaches zero
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return; // Prevent resending during cooldown

    setLoading(true);
    try {
      const result = await resendVerificationEmail();

      if (result.success) {
        setCountdown(60); // Set 60-second cooldown
        Alert.alert(
          "Verification Email Sent",
          "Please check your email inbox and click the verification link."
        );
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to resend verification email"
      );
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={images.email}
          style={styles.image}
          // Add a default image or use a local placeholder
          // If you don't have this specific image, replace with your app logo
        />

        <Text style={styles.title}>Verify Your Email</Text>

        <Text style={styles.description}>
          We've sent a verification email to:
        </Text>

        <Text style={styles.email}>{email}</Text>

        <Text style={styles.instruction}>
          Please check your inbox and click the verification link to complete
          your registration.
        </Text>

        <TouchableOpacity
          style={[
            styles.resendButton,
            countdown > 0 && styles.resendButtonDisabled,
          ]}
          onPress={handleResendEmail}
          disabled={loading || countdown > 0}
        >
          {loading ? (
            <ActivityIndicator color="#1ABC9C" size="small" />
          ) : (
            <Text style={styles.resendButtonText}>
              {countdown > 0
                ? `Resend Email (${countdown}s)`
                : "Resend Verification Email"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={goToLogin}>
          <Text style={styles.loginButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 30,
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
  },
  instruction: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 20,
  },
  resendButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  resendButtonDisabled: {
    backgroundColor: "#A0C3FF",
  },
  resendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1ABC9C",
  },
  loginButtonText: {
    color: "#1ABC9C",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VerificationScreen;
