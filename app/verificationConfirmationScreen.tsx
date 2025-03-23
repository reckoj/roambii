import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useGlobalContext } from "@/lib/global-provider";
import {
  handleVerificationDeepLink,
  VerificationStatus,
} from "@/lib/auth-service";
import images from "@/constants/images";

// Define the params this screen expects from the deep link
type VerificationConfirmationParams = {
  url: string;
};

type VerificationConfirmationRouteProp = RouteProp<
  { VerificationConfirmation: VerificationConfirmationParams },
  "VerificationConfirmation"
>;

const VerificationConfirmationScreen: React.FC = () => {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying your email...");
  const navigation = useNavigation<any>();
  const route = useRoute<VerificationConfirmationRouteProp>();
  const { url } = route.params;
  const { refetch } = useGlobalContext();

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      setLoading(true);
      const result = await handleVerificationDeepLink(url);

      setStatus(result.status || null);
      setMessage(result.message);

      // If verification was successful, refresh global context (user data)
      if (result.success) {
        refetch();
      }
    } catch (error: any) {
      setStatus(VerificationStatus.FAILED);
      setMessage(error.message || "Failed to verify email");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate("Login");
  };

  const goToHome = () => {
    navigation.navigate("Home");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1ABC9C"
            style={styles.loader}
          />
        ) : (
          <>
            <Image
              source={
                status === VerificationStatus.VERIFIED
                  ? images.email
                  : images.fail
              }
              style={styles.image}
              // If you don't have these specific images, replace with your app logo
            />

            <Text style={styles.title}>
              {status === VerificationStatus.VERIFIED
                ? "Email Verified!"
                : "Verification Failed"}
            </Text>

            <Text style={styles.message}>{message}</Text>

            {status === VerificationStatus.VERIFIED ? (
              <TouchableOpacity style={styles.primaryButton} onPress={goToHome}>
                <Text style={styles.primaryButtonText}>Continue to App</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={goToLogin}
              >
                <Text style={styles.primaryButtonText}>Back to Login</Text>
              </TouchableOpacity>
            )}
          </>
        )}
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
  loader: {
    marginBottom: 20,
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
  message: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VerificationConfirmationScreen;
