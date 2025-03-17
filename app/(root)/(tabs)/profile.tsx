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
} from "react-native";
import {
  logout,
  storage,
  config,
  databases,
  updateUser,
  deleteUserAccount,
} from "@/lib/appwrite";
import * as ImagePicker from "expo-image-picker";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import { Bell, LucideShare2, User2 } from "lucide-react-native";
import icons from "@/constants/icons";
import { InviteFriends } from "@/lib/invite-friends";
import { router } from "expo-router";
import { handleAvtarImagePicked } from "@/lib/storage";
import { Query } from "react-native-appwrite";

interface SettingsItemProp {
  icon: typeof Bell;
  title: string;
  onPress?: () => void;
  textStyle?: string;
  showArrow?: boolean;
}

const SettingsItem = ({
  icon,
  title,
  onPress,
  textStyle,
  showArrow = true,
}: SettingsItemProp) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-row items-center justify-between py-3"
  >
    <View className="flex flex-row items-center gap-3">
      <Text className={`text-lg font-rubik-medium text-black-300 ${textStyle}`}>
        {title}
      </Text>
    </View>

    {showArrow && <Image source={icons.rightArrow} className="size-5" />}
  </TouchableOpacity>
);

const Profile: React.FC = () => {
  const { rawUser, refetch, isAgent, toggleAgentView } = useGlobalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    rawUser?.avatar || null
  );

  useEffect(() => {
    if (rawUser?.avatar) {
      fetchAvatar(rawUser.avatar);
    }
  }, [rawUser?.avatar]);

  const [agentView, setAgentView] = useState(
    rawUser?.isAgentTemp || rawUser?.isAgent
  );

  const switchAgentView = async () => {
    try {
      if (!rawUser?.$id) {
        Alert.alert("Error", "User ID not found.");
        return;
      }

      // ✅ Find user document
      const userDocs = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.equal("userId", rawUser.$id)]
      );

      if (userDocs.total === 0) {
        console.error("Error: User document not found.");
        Alert.alert("Error", "User profile not found in the database.");
        return;
      }

      const userDocId = userDocs.documents[0].$id;
      const newAgentView = !rawUser.isAgentTemp; // ✅ Toggle current value

      // ✅ Update user document
      await databases.updateDocument(
        config.databaseId!,
        config.usersCollectionId!,
        userDocId,
        { isAgentTemp: newAgentView }
      );

      console.log("[Agent View Toggled] ==> ", newAgentView);

      // ✅ Ensure the UI updates correctly
      await refetch(); // ✅ Call refetch immediately to update the global context
    } catch (error) {
      console.error("[Error Updating User] ==> ", error);
      Alert.alert("Error", "Failed to update user.");
    }
  };

  /**
   * Fetch the avatar URL from Appwrite storage
   */
  const fetchAvatar = async (fileId: string) => {
    try {
      if (!fileId) return;
      const fileUrl = storage
        .getFileView(config.avatarBucket!, fileId)
        .toString(); // ✅ Convert URL to string
      setAvatarUrl(fileUrl);
    } catch (error) {
      console.error("Failed to fetch avatar:", error);
      throw new Error("Failed to fetch avatar:");
    }
  };

  /**
   * Handles image selection and upload
   */
  const pickImage = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!pickerResult.canceled) {
      setLoading(true);
      await handleAvtarImagePicked(pickerResult.assets[0].uri, rawUser!.$id);
      alert("Profile picture updated successfully! 🎉");
      refetch();
    }
  };

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      refetch();
    } else {
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView className="h-full bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 px-7"
      >
        <View className="flex flex-row justify-center mt-5">
          <View className="flex flex-col items-center relative mt-5">
            {loading ? (
              <ActivityIndicator size="large" color="#1E90FF" />
            ) : rawUser?.avatar ? ( // ✅ Display uploaded image if available
              <Image
                source={{ uri: rawUser.avatar }}
                className="size-44 rounded-full border-2 border-slate-300"
                onLoadEnd={() => setLoading(false)}
              />
            ) : (
              <View className="border-2 rounded-full p-10 border-slate-300">
                <User2 size={60} color={"#95A5A6"} />
              </View>
            )}

            <TouchableOpacity className="p-2" onPress={pickImage}>
              <Text className="text-blue-600">Change photo</Text>
            </TouchableOpacity>

            <Text className="text-2xl font-rubik-bold">{rawUser?.name}</Text>
          </View>
        </View>

        {/* ✅ Agent Toggle */}
        {isAgent && ( // ✅ Only show toggle switch to agents
          <View className="flex flex-row justify-between items-center px-4 py-3 rounded-lg mt-6">
            <Text className="text-lg font-semibold text-gray-800">
              Agent View
            </Text>
            <Switch value={agentView} onValueChange={switchAgentView} />
          </View>
        )}

        <View className="flex flex-col mt-10">
          <SettingsItem icon={icons.calendar} title="Bookings" />
        </View>

        <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
          <SettingsItem
            icon={LucideShare2}
            title="Invite Friends"
            onPress={InviteFriends}
          />
        </View>

        <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
          <SettingsItem
            onPress={() => router.push("/update-password")}
            icon={Bell}
            title="Change Password"
          />
        </View>

        <View className="flex flex-col border-t mt-5 pt-5 border-primary-200">
          <SettingsItem
            icon={icons.logout}
            title="Sign Out"
            textStyle="text-danger font-bold"
            showArrow={false}
            onPress={handleLogout}
          />
        </View>
        <View className="flex flex-col border-t mt-5 pt-5 border-primary-200">
          <SettingsItem
            icon={icons.logout}
            title="Delete Account"
            textStyle="text-danger font-bold"
            showArrow={false}
            onPress={() => deleteUserAccount(rawUser?.$id!)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
