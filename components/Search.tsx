import React from "react";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SearchIcon } from "lucide-react-native";

interface SearchProps {
  size?: number;
  color?: string;
}

/**
 * Search component for Home screen
 * Simple search icon that navigates to search screen when pressed
 */
const Search: React.FC<SearchProps> = ({ size = 24, color = "#1ABC9C" }) => {
  const router = useRouter();

  // Navigate to search screen on press
  const handleSearchPress = () => {
    router.push("/search");
  };

  return (
    <TouchableOpacity
      onPress={handleSearchPress}
      activeOpacity={0.7}
      className="p-2"
    >
      <SearchIcon color={color} size={size} />
    </TouchableOpacity>
  );
};

export default Search;
