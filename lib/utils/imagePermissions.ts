import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

/**
 * Helper function to request gallery permissions only when needed
 * @returns Object with the image picker result or null if canceled/error
 */
export const pickImageWithPermissions = async (options = {}) => {
  try {
    // Permission is automatically requested by launchImageLibraryAsync on first use
    // We don't need to call requestMediaLibraryPermissionsAsync() separately
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      ...options
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result;
    }
    
    return null;
  } catch (error) {
    console.error("Image picker error:", error);
    Alert.alert(
      "Error",
      "There was a problem accessing your photo library. Please check your permissions in settings."
    );
    return null;
  }
}; 