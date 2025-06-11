import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
  StyleSheet,
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
  /** Whether this is a primary colored header (affects status bar style) */
  isPrimaryColored?: boolean;
  /** Optional background color for the header */
  backgroundColor?: string;
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
  isPrimaryColored = false,
  backgroundColor = "#FFFFFF",
}) => {
  // Get safe area insets
  const insets = useSafeAreaInsets();

  // Calculate top padding based on whether we need to handle safe area
  const topPadding = handleSafeArea ? insets.top : 0;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
          backgroundColor: backgroundColor,
        },
      ]}
    >
      <StatusBar
        backgroundColor={isPrimaryColored ? "#1ABC9C" : "transparent"}
        barStyle={isPrimaryColored ? "light-content" : "dark-content"}
        translucent={true}
      />

      {/* Header content */}
      <View style={styles.content}>
        <View style={styles.row}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
            >
              <ArrowLeft size={28} color={isPrimaryColored ? "#FFFFFF" : "#34495E"} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}

          <Text style={[
            styles.title,
            { color: isPrimaryColored ? "#FFFFFF" : "#34495E" }
          ]}>
            {title}
          </Text>

          {rightIcon ? (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightButton}
              disabled={!onRightIconPress}
            >
              {rightIcon}
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  rightButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
});

export default CustomHeader;
