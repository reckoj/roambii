import {
  Alert,
  Image,
  ImageSourcePropType,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { logout } from "@/lib/appwrite";
// import { useGlobalContext } from "@/lib/global-provider";

import icons from "@/constants/icons";
import { settings } from "@/constants/data";
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

const Profile = () => {
  const { rawUser, refetch } = useGlobalContext();

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
            <TouchableOpacity className="p-2">
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
