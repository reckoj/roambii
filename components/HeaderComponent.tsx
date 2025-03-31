import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { router } from "expo-router";

interface HeaderProps {
  /** Header title text */
  title: string;
  /** Optional right icon component */
  rightIcon?: React.ReactNode;
  /** Optional function to call when right icon is pressed */
  onRightIconPress?: () => void;
  /** Optional custom back button handler (defaults to router.back) */
  onBackPress?: () => void;
  /** Whether to show the back button (defaults to true) */
  showBackButton?: boolean;
  /** Whether to handle safe area insets manually (default: true) */
  handleSafeArea?: boolean;
}

/**
 * Flexible Header Component that can be used across different screens
 * Automatically handles safe area insets when not wrapped in SafeAreaView
 */
const CustomHeader: React.FC<HeaderProps> = ({
  title,
  rightIcon,
  onRightIconPress,
  onBackPress = () => router.back(),
  showBackButton = true,
  handleSafeArea = true,
}) => {
  // Get safe area insets
  const insets = useSafeAreaInsets();

  // Calculate top padding based on whether we need to handle safe area
  const topPadding = handleSafeArea ? insets.top : 0;

  return (
    <View
      className="bg-primary-200"
      style={{
        paddingTop: topPadding,
      }}
    >
      {/* Status Bar - set to match header background */}
      <StatusBar
        backgroundColor="#f8f9fa"
        barStyle="dark-content"
        translucent={handleSafeArea}
      />

      {/* Header content */}
      <View className="px-2 py-2">
        <View className="flex flex-row justify-between items-center">
          {showBackButton ? (
            <TouchableOpacity
              onPress={onBackPress}
              className="rounded-full size-10 items-center justify-center"
            >
              <ArrowLeft size={28} color="#34495E" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} /> // Empty placeholder with same width as button
          )}

          <Text className="text-2xl font-rubik text-text">{title}</Text>

          {rightIcon ? (
            <TouchableOpacity
              onPress={onRightIconPress}
              className="rounded-full size-10 items-center justify-center"
              disabled={!onRightIconPress}
            >
              {rightIcon}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} /> // Empty placeholder for balance
          )}
        </View>
      </View>
    </View>
  );
};

export default CustomHeader;
