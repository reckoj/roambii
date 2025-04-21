import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { Eye, EyeOff, ChevronLeft } from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  confirmPasswordResetAsync,
  clearPasswordResetState,
} from "@/lib/redux/slices/authSlice";
import images from "@/constants/images";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  secondary: "#D9D9D9",
  background: "#F9FAFC",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  error: "#FF4C69",
  success: "#00D27A",
};

const ResetPasswordScreen = () => {
  const params = useLocalSearchParams<{ oobCode?: string }>();
  const oobCode = params.oobCode;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useAppDispatch();

  // Get password reset state from Redux
  const { passwordResetLoading, passwordResetSuccess, passwordResetError } =
    useAppSelector((state) => state.auth);

  // Clear password reset state when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearPasswordResetState());
    };
  }, [dispatch]);

  // Check if oobCode is provided
  useEffect(() => {
    if (!oobCode) {
      Alert.alert(
        "Invalid Link",
        "The password reset link is invalid or has expired. Please request a new one.",
        [{ text: "OK", onPress: () => router.replace("/forgot-password") }]
      );
    }
  }, [oobCode]);

  // Show success message if password was reset successfully
  useEffect(() => {
    if (passwordResetSuccess) {
      Alert.alert(
        "Password Reset Successful",
        "Your password has been reset successfully. You can now log in with your new password.",
        [{ text: "Log In", onPress: () => router.replace("/login") }]
      );
    }
  }, [passwordResetSuccess]);

  // Show error message if there was an error
  useEffect(() => {
    if (passwordResetError) {
      Alert.alert("Error", passwordResetError);
    }
  }, [passwordResetError]);

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleResetPassword = () => {
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (isPasswordValid && isConfirmPasswordValid && oobCode) {
      dispatch(
        confirmPasswordResetAsync({ code: oobCode, newPassword: password })
      );
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <Image
          source={images.forgot}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>
          Your new password must be different from previously used passwords.
        </Text>

        {/* Password input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View
            style={[
              styles.passwordInputContainer,
              passwordError ? styles.inputError : {},
            ]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (text) validatePassword(text);
              }}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity
              onPress={toggleShowPassword}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color={COLORS.textLight} />
              ) : (
                <Eye size={20} color={COLORS.textLight} />
              )}
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}
        </View>

        {/* Confirm Password input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View
            style={[
              styles.passwordInputContainer,
              confirmPasswordError ? styles.inputError : {},
            ]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (text) validateConfirmPassword(text);
              }}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity
              onPress={toggleShowConfirmPassword}
              style={styles.eyeIcon}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={COLORS.textLight} />
              ) : (
                <Eye size={20} color={COLORS.textLight} />
              )}
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            !password || !confirmPassword ? styles.buttonDisabled : {},
          ]}
          onPress={handleResetPassword}
          disabled={!password || !confirmPassword || passwordResetLoading}
        >
          {passwordResetLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/login")}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  formContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  image: {
    width: 200,
    height: 160,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: "rgba(26, 188, 156, 0.5)",
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 15,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ResetPasswordScreen;
