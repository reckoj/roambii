import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Switch,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import {
  Bell,
  Calendar,
  LucideShare2,
  User2,
  Shield,
  Lock,
  LogOut,
  Camera,
  ChevronRight,
  Edit,
} from "lucide-react-native";
import { InviteFriends } from "@/lib/invite-friends";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// Redux imports
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/redux/store/store";
import { logoutAsync, updateUserAsync } from "@/lib/redux/slices/authSlice";
import AgentProfileCard from "@/components/AgentProfileCard";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#8F70FF",
  secondary: "#D9D9D9",
  background: "#F9FAFC",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  danger: "#FF4C69",
  success: "#00D27A",
  lightGray: "#F0F2F5",
  divider: "#EEEEEE",
};

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  textStyle?: string;
  showArrow?: boolean;
  subtitle?: string;
  iconBgColor?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  onPress,
  textStyle,
  showArrow = true,
  subtitle,
  iconBgColor = COLORS.lightGray,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.settingsItemContainer}
    activeOpacity={0.7}
  >
    <View style={styles.settingsItemContent}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        {icon}
      </View>
      <View style={styles.settingsTextContainer}>
        <Text
          style={[
            styles.settingsTitle,
            textStyle
              ? {
                  color: textStyle.includes("danger")
                    ? COLORS.danger
                    : COLORS.text,
                }
              : {},
          ]}
        >
          {title}
        </Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
    </View>

    {showArrow && <ChevronRight size={18} color={COLORS.textLight} />}
  </TouchableOpacity>
);

const Profile: React.FC = () => {
  const { rawUser, refetch, isAgent } = useGlobalContext();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    rawUser?.avatar || null
  );

  useEffect(() => {
    if (rawUser?.avatar) {
      setAvatarUrl(rawUser.avatar);
    }
  }, [rawUser?.avatar]);
  useEffect(() => {
    if (rawUser?.avatar) {
      setAvatarUrl(rawUser.avatar);
      setImageError(false); // Reset error state when new avatar URL is set
    }
  }, [rawUser?.avatar]);

  const [agentView, setAgentView] = useState(
    rawUser?.isAgentTemp || rawUser?.isAgent
  );

  const switchAgentView = async () => {
    try {
      if (!rawUser?.id) {
        Alert.alert("Error", "User ID not found.");
        return;
      }

      const newAgentView = !agentView;
      setAgentView(newAgentView);

      // Use Redux to update user in Firestore
      await dispatch(
        updateUserAsync({
          userId: rawUser.id,
          updates: { isAgentTemp: newAgentView },
        })
      ).unwrap();

      console.log("[Agent View Toggled] ==> ", newAgentView);

      // Ensure the UI updates correctly
      await refetch();
    } catch (error) {
      console.error("[Error Updating User] ==> ", error);
      Alert.alert("Error", "Failed to update user.");
      // Reset UI state on error
      setAgentView(!agentView);
    }
  };

  const pickImage = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (
        !pickerResult.canceled &&
        pickerResult.assets &&
        pickerResult.assets.length > 0
      ) {
        try {
          setLoading(true);
          setImageError(false);
          const imageUri = pickerResult.assets[0].uri;

          console.log("Selected image URI:", imageUri);

          // Use Redux to handle the upload and update
          const result = await dispatch(
            updateUserAsync({
              userId: rawUser!.id,
              updates: {}, // Avatar will be added by the thunk after upload
              imageUri: imageUri,
            })
          ).unwrap();

          console.log("Update result:", result);

          if (result && result.avatar) {
            // Success! Update local state with the new avatar URL
            setAvatarUrl(result.avatar);
            // Alert.alert("Success", "Profile picture updated successfully! 🎉");

            // Ensure global context is refreshed
            await refetch();
          } else {
            throw new Error(
              "Failed to update profile picture - no avatar URL in result"
            );
          }
        } catch (error: any) {
          console.error("Error updating profile picture:", error);
          Alert.alert(
            "Error",
            error.message ||
              "Failed to update profile picture. Please try again."
          );
          setImageError(true);
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "There was a problem opening the image picker");
      setLoading(false);
      setImageError(true);
    }
  };
  /**
   * Handles user logout with Redux
   */
  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            // Use the Redux logout action
            await dispatch(logoutAsync()).unwrap();

            // Refresh global context
            refetch();

            // Navigate to login
            router.replace("/login");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const getInitials = (name?: string): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Profile image section */}
        <View style={styles.profileImageContainer}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : imageError || !avatarUrl ? (
            // Show initials if there's no avatar or if there was an error loading it
            <View style={styles.initialsContainer}>
              <Text style={styles.initialsText}>
                {getInitials(rawUser?.name)}
              </Text>
            </View>
          ) : (
            // Show the avatar image
            <Image
              source={{ uri: avatarUrl }}
              style={styles.profileImage}
              onError={(e) => {
                console.error("Error loading image:", e.nativeEvent.error);
                setImageError(true);
              }}
            />
          )}

          <TouchableOpacity
            style={styles.cameraButton}
            onPress={pickImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Camera size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{rawUser?.name || "User"}</Text>
        <Text style={styles.userEmail}>{rawUser?.email || ""}</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.card}>
          {/* Agent Toggle */}
          {isAgent && (
            <View style={styles.agentToggleContainer}>
              <View style={styles.agentToggleContent}>
                <Shield size={22} color={COLORS.primary} />
                <Text style={styles.agentToggleText}>Agent View</Text>
              </View>
              <Switch
                value={agentView}
                onValueChange={switchAgentView}
                trackColor={{ false: "#E0E0E0", true: COLORS.primaryLight }}
                thumbColor={agentView ? COLORS.primary : "#F5F5F5"}
              />
            </View>
          )}

          <Text style={styles.sectionTitle}>Account</Text>

          {!isAgent && (
            <SettingsItem
              icon={<Calendar size={20} color={COLORS.secondary} />}
              title="My Bookings"
              subtitle="View your upcoming and past bookings"
              onPress={() => router.push("/userBookings")}
              iconBgColor="rgba(93, 109, 255, 0.1)"
            />
          )}

          {isAgent && <AgentProfileCard />}

          {isAgent && (
            <SettingsItem
              icon={<Edit size={20} color={COLORS.secondary} />}
              title="Edit Agent Profile"
              subtitle="Edit your agent info"
              onPress={() => router.push("/edit-agent-profile")}
              iconBgColor="rgba(93, 109, 255, 0.1)"
            />
          )}

          <SettingsItem
            icon={<LucideShare2 size={20} color="#00D27A" />}
            title="Invite Friends"
            subtitle="Share the app with your friends"
            onPress={InviteFriends}
            iconBgColor="rgba(0, 210, 122, 0.1)"
          />

          <SettingsItem
            icon={<Lock size={20} color="#FF9500" />}
            title="Change Password"
            subtitle="Update your security credentials"
            onPress={() => router.push("/update-password")}
            iconBgColor="rgba(255, 149, 0, 0.1)"
          />

          <SettingsItem
            icon={<LogOut size={20} color={COLORS.danger} />}
            title="Sign Out"
            textStyle="text-danger"
            showArrow={false}
            onPress={handleLogout}
            iconBgColor="rgba(255, 76, 105, 0.1)"
          />
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>App Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: "20%",
    paddingBottom: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  initialsText: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.white,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 5,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    marginTop: -25,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 15,
  },
  settingsItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingsItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  agentToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  agentToggleContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  agentToggleText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginLeft: 14,
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  loaderContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.white,
  },
});
