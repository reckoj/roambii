import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { updateUserPassword } from "@/lib/appwrite";
import AuthButton from "@/components/AuthButton";
import CustomInput from "@/components/CustomInput";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

const UpdatePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
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
    } else {
      Alert.alert("Error", result.message);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <View className="flex flex-row items-center p-2 justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex rounded-full size-10 items-center  justify-center"
        >
          <ArrowLeft size={24} color={"#1ABC9C"} />
        </TouchableOpacity>
      </View>
      <View className="flex  p-5">
        <Text className="text-lg font-bold mb-4">Change Password</Text>

        <Text className="mb-2">Current Password</Text>

        <CustomInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
        />

        <Text className="mb-2">New Password</Text>

        <CustomInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
        />

        <Text className="mb-2">Confirm New Password</Text>
        <CustomInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <AuthButton title="Update Password" onPress={handleChangePassword} />
      </View>
    </SafeAreaView>
  );
};

export default UpdatePassword;
