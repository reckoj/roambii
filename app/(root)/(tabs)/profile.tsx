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
} from "react-native";
import { logout, storage, databases, account } from "@/lib/appwrite";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system"; // ✅ Import to get file info
import { useGlobalContext } from "@/lib/global-provider";
import { ID, Query } from "react-native-appwrite";
import images from "@/constants/images";
import { Bell, LucideShare2, User2 } from "lucide-react-native";
import icons from "@/constants/icons";
import { InviteFriends } from "@/lib/invite-friends";
import { router } from "expo-router";

const AVATAR_BUCKET = process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID!;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const USERS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

interface User {
  $id: string;
  name: string;
  avatar?: string;
}

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
  const { rawUser, refetch } = useGlobalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    rawUser?.avatar || null
  );

  useEffect(() => {
    if (rawUser?.avatar) {
      fetchAvatar(rawUser.avatar);
    }
  }, [rawUser?.avatar]);

  /**
   * Fetch the avatar URL from Appwrite storage
   */
  const fetchAvatar = async (fileId: string) => {
    try {
      if (!fileId) return;
      const fileUrl = storage.getFileView(AVATAR_BUCKET, fileId).toString(); // ✅ Convert URL to string
      setAvatarUrl(fileUrl);
    } catch (error) {
      console.error("Failed to fetch avatar:", error);
      throw new Error("Failed to  fetch avatar:");
    }
  };

  /**
   * Uploads an image to Appwrite storage
   */
  const uploadImageAsync = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<string> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri); // ✅ Get file size
      if (!fileInfo.exists) throw new Error("File does not exist");

      const fileData = {
        name: `avatar_${rawUser?.$id}_${Date.now()}.jpg`,
        type: "image/jpeg",
        uri: asset.uri,
        size: fileInfo.size, // ✅ Ensure size is included
      };

      // Upload file to Appwrite
      const response = await storage.createFile(
        AVATAR_BUCKET,
        ID.unique(),
        fileData
      );

      return response.$id; // ✅ Return file ID
    } catch (error) {
      throw new Error("Failed to upload image.");
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
      await handleImagePicked(pickerResult.assets[0]);
    }
  };

  /**
   * Uploads selected image and updates the user's profile in the database
   */
  const handleImagePicked = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setLoading(true);

      // Step 1: Upload Image and Get File ID
      const fileId = await uploadImageAsync(asset);
      if (!fileId) throw new Error("File upload failed.");

      // Step 2: Generate Correct Appwrite File URL
      const fileUrl = storage.getFileView(AVATAR_BUCKET, fileId).toString();

      // 🔍 Step 3: Fetch Authenticated User
      const userAuth = await account.get();

      // 🔍 Step 4: Check if the user exists in the database using `userId`

      const userExists = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal("userId", userAuth.$id)]
      );

      if (userExists.total === 0) {
        alert("User profile not found in the database.");
        return;
      }

      const userDocId = userExists.documents[0].$id; // ✅ Get the actual document ID

      // ✅ Step 5: Store ONLY the Correct File URL in the Database
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userDocId,
        {
          avatar: fileUrl, // ✅ Ensure only a valid URL is stored
        }
      );

      // ✅ Step 6: Update State to Reflect New Avatar
      setAvatarUrl(fileUrl); // ✅ Use the correct URL
      alert("Profile picture updated successfully! 🎉");
      refetch();
    } catch (error) {
      alert("Upload failed, sorry :(");
    } finally {
      setLoading(false);
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

        <View className="flex flex-col mt-10">
          <SettingsItem icon={icons.calendar} title="Bookings" />
          {/* <SettingsItem
            onPress={() => router.push("/create-package")}
            icon={icons.wallet}
            title="Payments"
          /> */}
        </View>

        <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
          {/* <Text className="text-text text-xl font-rubik">Settings</Text> */}
          {/* <SettingsItem icon={Bell} title="Notification" />
          <SettingsItem icon={HelpCircle} title="Help Center" /> */}
          <SettingsItem
            icon={LucideShare2}
            title="Invite Friends"
            onPress={InviteFriends}
          />
        </View>

        <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
          {/* <Text className="text-text text-xl font-rubik">Settings</Text> */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
