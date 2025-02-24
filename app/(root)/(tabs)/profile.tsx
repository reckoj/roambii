import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ImageSourcePropType,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { logout, storage } from "@/lib/appwrite";
import { updateUserAvatar, uploadImage } from "@/lib/storage";
// import { useGlobalContext } from "@/lib/global-provider";
import * as ImagePicker from "expo-image-picker";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import {
  ChevronDown,
  ChevronUp,
  ArrowRightFromLineIcon,
  Bell,
  HelpCircle,
  LucideShare2,
  Edit2Icon,
} from "lucide-react-native";
import { router } from "expo-router";
import { InviteFriends } from "@/lib/invite-friends";
import { useState } from "react";
import { ID } from "react-native-appwrite";

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
const AVATAR_BUCKET = process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID;

const Profile = () => {
  const { rawUser, refetch } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  /**
   * Prepares the selected image for upload
   * @param asset - The image asset from ImagePicker
   */
  const prepareNativeFile = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<{ name: string; type: string; size: number; uri: string }> => {
    console.log("[prepareNativeFile] asset ==>", asset);

    return {
      name: asset.fileName || `image_${Date.now()}.jpg`, // Fallback name
      size: asset.fileSize || 0, // Default to 0 if undefined
      type: asset.mimeType || "image/jpeg", // Default to JPEG if undefined
      uri: asset.uri, // Use directly in React Native
    };
  };

  /**
   * Uploads an image to Appwrite storage and returns its URL
   * @param asset - The image asset from ImagePicker
   */
  async function uploadImageAsync(asset: ImagePicker.ImagePickerAsset) {
    try {
      const fileData = await prepareNativeFile(asset);

      // Upload file to Appwrite
      const response = await storage.createFile(
        AVATAR_BUCKET!.toString(),
        ID.unique(),
        fileData
      );

      console.log("[File uploaded] ==>", response);

      // Get file URL
      const fileUrl = storage.getFileView(
        AVATAR_BUCKET!.toString(),
        response.$id
      );
      console.log("[File URL] ==>", fileUrl);

      return fileUrl;
    } catch (error) {
      console.error("[uploadImageAsync] error ==>", error);
      throw new Error("Failed to upload image.");
    }
  }

  /**
   * Opens the image picker
   */
  const pickImage = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    console.log("[Picker Result] ==>", pickerResult);

    if (!pickerResult.canceled) {
      await handleImagePicked(pickerResult.assets[0]);
    }
  };

  /**
   * Handles the selected image
   * @param asset - The image asset from ImagePicker
   */
  const handleImagePicked = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      console.log("[Uploading Image]...");
      const fileUrl = await uploadImageAsync(asset);
      alert("Upload successful! 🎉");
      return fileUrl;
    } catch (error) {
      console.error("[handleImagePicked] error ==>", error);
      alert("Upload failed, sorry :(");
    }
  };

  // const handlePickImage = async () => {
  //   try {
  //     const permissionResult =
  //       await ImagePicker.requestMediaLibraryPermissionsAsync();
  //     if (!permissionResult.granted) {
  //       Alert.alert(
  //         "Permission Denied",
  //         "You need to allow access to the gallery."
  //       );
  //       return;
  //     }

  //     const result = await ImagePicker.launchImageLibraryAsync({
  //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //       allowsEditing: true,
  //       aspect: [1, 1],
  //       quality: 0.7,
  //     });

  //     if (!result.canceled) {
  //       setLoading(true); // ✅ Start loading

  //       const fileUri = result.assets[0].uri;
  //       const uploadedUrl = await uploadImage(
  //         fileUri,
  //         AVATAR_BUCKET!.toString()
  //       );

  //       await updateUserAvatar(rawUser?.$id!, uploadedUrl.href);
  //       await refetch(); // Refresh user data

  //       Alert.alert("Success", "Avatar updated successfully!");
  //     }
  //   } catch (error: any) {
  //     Alert.alert("Upload Failed", error.message);
  //   } finally {
  //     setLoading(false); // ✅ Stop loading after upload
  //   }
  // };

  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      // Alert.alert("Success", "Logged out successfully");
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
            <Image
              source={{ uri: rawUser?.avatar }}
              className="size-44 relative rounded-full"
            />
            {/* <View className="bg-primary-300 rounded-full absolute bottom-6  right-6 w-20 h-20">
              <TouchableOpacity className="absolute bottom-6 right-6 z-50">
                <Edit2Icon size={24} color={"#FFFFFF"} />
                
              </TouchableOpacity>
            </View> */}
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
