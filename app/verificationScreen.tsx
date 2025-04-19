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
import { useRoute, RouteProp } from "@react-navigation/native";
import { resendVerificationEmail } from "@/lib/auth-service";
import images from "@/constants/images";
import { router } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
  const [isVerified, setIsVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const route = useRoute<VerificationRouteProp>();
  const { email, userId } = route.params || { email: "", userId: "" };

  // Check verification status on component mount and when user returns to the app
  useEffect(() => {
    const auth = getAuth();

    // Function to check verification status
    const checkVerification = async () => {
      setCheckingStatus(true);

      // Force refresh the token to get the latest emailVerified status
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setIsVerified(auth.currentUser.emailVerified || false);
      }

      setCheckingStatus(false);
    };

    // Check initially
    checkVerification();

    // Set up a listener for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsVerified(user.emailVerified || false);
      } else {
        setIsVerified(false);
      }
      setCheckingStatus(false);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  // Handle countdown timer for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0 || loading) return; // Prevent resending during cooldown or loading

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

  const handleRefreshStatus = async () => {
    setCheckingStatus(true);
    const auth = getAuth();

    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        setIsVerified(auth.currentUser.emailVerified || false);
      } catch (error) {
        console.error("Error refreshing verification status:", error);
      }
    }

    setCheckingStatus(false);
  };

  const goToLogin = () => {
    router.push("/login");
  };

  // Show loading indicator while checking verification status
  if (checkingStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.description}>
            Checking verification status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show verified screen if email is verified
  if (isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image
            source={images.email} // Fallback to email image if success not available
            style={styles.image}
          />
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.description}>
            Your email has been successfully verified.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={goToLogin}>
            <Text style={styles.loginButtonText}>Proceed to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show verification pending screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={images.email} style={styles.image} />

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
          style={styles.refreshButton}
          onPress={handleRefreshStatus}
          disabled={checkingStatus}
        >
          {checkingStatus ? (
            <ActivityIndicator color="#1ABC9C" size="small" />
          ) : (
            <Text style={styles.refreshButtonText}>
              I've verified my email - check status
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.resendButton,
            countdown > 0 && styles.resendButtonDisabled,
          ]}
          onPress={handleResendEmail}
          disabled={loading || countdown > 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
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
  refreshButton: {
    backgroundColor: "#E6F7F5",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1ABC9C",
  },
  refreshButtonText: {
    color: "#1ABC9C",
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "#A0D8D1",
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
