// app/update-password.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/redux/store/store";
import {
  clearAuthError,
  updatePasswordAsync,
} from "@/lib/redux/slices/authSlice";
import CustomHeader from "@/components/HeaderComponent";

const UpdatePassword = () => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  // Global context for user
  const { rawUser } = useGlobalContext();

  // Local state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Form validation
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Password requirements
  const passwordRequirements = [
    { label: "At least 8 characters", valid: newPassword.length >= 8 },
    { label: "Maximum 20 characters", valid: newPassword.length <= 20 },
    {
      label: "Passwords match",
      valid: newPassword === confirmPassword && confirmPassword !== "",
    },
  ];

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    // Validate current password
    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
      isValid = false;
    }

    // Validate new password
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
      isValid = false;
    } else if (newPassword.length > 20) {
      newErrors.newPassword = "Password must be less than 20 characters";
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdatePassword = async () => {
    // Clear any previous errors
    dispatch(clearAuthError());
    setUpdateSuccess(false);

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      const resultAction = await dispatch(
        updatePasswordAsync({
          currentPassword,
          newPassword,
        })
      );

      if (updatePasswordAsync.fulfilled.match(resultAction)) {
        setUpdateSuccess(true);
        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Show success alert
        Alert.alert(
          "Password Updated",
          "Your password has been updated successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate back after success
                setTimeout(() => {
                  router.back();
                }, 500);
              },
            },
          ]
        );
      } else if (updatePasswordAsync.rejected.match(resultAction)) {
        // Error is handled by the reducer and shown below
        console.log("Password update failed:", resultAction.payload);
      }
    } catch (err) {
      console.error("Error updating password:", err);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Update Password" showBackButton />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}

          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Choose a strong, unique password to keep your account secure.
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {updateSuccess && (
              <View style={styles.successContainer}>
                <CheckCircle size={20} color="#00D27A" />
                <Text style={styles.successText}>
                  Password updated successfully!
                </Text>
              </View>
            )}

            {/* Current Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#95A5A6" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#95A5A6"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIcon}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} color="#95A5A6" />
                  ) : (
                    <Eye size={20} color="#95A5A6" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.currentPassword ? (
                <Text style={styles.errorText}>{errors.currentPassword}</Text>
              ) : null}
            </View>

            {/* New Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#95A5A6" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#95A5A6"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter your new password"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color="#95A5A6" />
                  ) : (
                    <Eye size={20} color="#95A5A6" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.newPassword ? (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              ) : null}
            </View>

            {/* Confirm New Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#95A5A6" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#95A5A6"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your new password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#95A5A6" />
                  ) : (
                    <Eye size={20} color="#95A5A6" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>
                Password Requirements:
              </Text>
              {passwordRequirements.map((req, index) => (
                <View key={index} style={styles.requirementRow}>
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: req.valid ? "#1ABC9C" : "#E0E0E0" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      { color: req.valid ? "#1ABC9C" : "#95A5A6" },
                    ]}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.updateButton,
                (!newPassword || !confirmPassword || !currentPassword) &&
                  styles.updateButtonDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={
                isLoading ||
                !newPassword ||
                !confirmPassword ||
                !currentPassword
              }
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.updateButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333333",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    color: "#666666",
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
    color: "#333333",
  },
  inputIcon: {
    marginHorizontal: 12,
  },
  eyeIcon: {
    padding: 12,
    position: "absolute",
    right: 0,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 13,
    marginTop: 5,
  },
  errorContainer: {
    backgroundColor: "#FADBD8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successContainer: {
    backgroundColor: "#D4EDDA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  successText: {
    color: "#155724",
    marginLeft: 8,
    fontSize: 14,
  },
  requirementsContainer: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  requirementText: {
    fontSize: 13,
  },
  updateButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonDisabled: {
    backgroundColor: "#C8E6E1",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default UpdatePassword;
