import { SetStateAction, useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { updateUserPassword } from "@/lib/appwrite";
import { router } from "expo-router";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#8F70FF",
  secondary: "#D9D9D9",
  tertiary: "#FF8F70",
  background: "#F9FAFC",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  danger: "#FF4C69",
  success: "#00D27A",
  lightGray: "#F0F2F5",
  divider: "#EEEEEE",
  messagePreview: "#666666",
  unreadBadge: "#7F5DF0",
};

const UpdatePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // States for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const [validations, setValidations] = useState({
    length: false,
    match: false,
  });

  // Update password validations on change
  const validatePassword = (
    password: any[] | SetStateAction<string>,
    confirm: any[] | SetStateAction<string>
  ) => {
    setValidations({
      length: password.length >= 8,
      match: password === confirm && password.length > 0 && confirm.length > 0,
    });
  };

  const handleChangePassword = async () => {
    // Additional client-side validation
    if (!validations.length) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    if (!validations.match) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);

    const result = await updateUserPassword(
      currentPassword,
      newPassword,
      confirmPassword
    );

    setLoading(false);

    if (result.success) {
      Alert.alert("Success", result.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setValidations({ length: false, match: false });
    } else {
      Alert.alert("Error", result.message);
    }
  };

  // Handle new password change with validation
  const handleNewPasswordChange = (text: SetStateAction<string>) => {
    setNewPassword(text);
    validatePassword(text, confirmPassword);
  };

  // Handle confirm password change with validation
  const handleConfirmPasswordChange = (text: SetStateAction<string>) => {
    setConfirmPassword(text);
    validatePassword(newPassword, text);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, "#36d6ba"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <Lock
                  size={18}
                  color={COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIcon}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} color={COLORS.textLight} />
                  ) : (
                    <Eye size={18} color={COLORS.textLight} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <Lock
                  size={18}
                  color={COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={handleNewPasswordChange}
                  placeholder="Enter new password"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  {showNewPassword ? (
                    <EyeOff size={18} color={COLORS.textLight} />
                  ) : (
                    <Eye size={18} color={COLORS.textLight} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <Lock
                  size={18}
                  color={COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Confirm new password"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={COLORS.textLight} />
                  ) : (
                    <Eye size={18} color={COLORS.textLight} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.validationContainer}>
              <View style={styles.validationItem}>
                {validations.length ? (
                  <CheckCircle2 size={16} color={COLORS.success} />
                ) : (
                  <AlertCircle size={16} color={COLORS.textLight} />
                )}
                <Text
                  style={[
                    styles.validationText,
                    validations.length && styles.validationSuccess,
                  ]}
                >
                  At least 8 characters
                </Text>
              </View>

              <View style={styles.validationItem}>
                {validations.match ? (
                  <CheckCircle2 size={16} color={COLORS.success} />
                ) : (
                  <AlertCircle size={16} color={COLORS.textLight} />
                )}
                <Text
                  style={[
                    styles.validationText,
                    validations.match && styles.validationSuccess,
                  ]}
                >
                  Passwords match
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.updateButton,
                (!validations.length || !validations.match) &&
                  styles.updateButtonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={loading || !validations.length || !validations.match}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.updateButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
          {/* 
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              For security reasons, you will be asked to log in again after
              changing your password.
            </Text>
          </View> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: "20%",
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 8,
  },
  validationContainer: {
    marginBottom: 24,
  },
  validationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  validationText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  validationSuccess: {
    color: COLORS.success,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  updateButtonDisabled: {
    backgroundColor: COLORS.secondary,
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  securityNote: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  securityNoteText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

export default UpdatePassword;
