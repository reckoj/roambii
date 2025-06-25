import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  Alert,
} from "react-native";
import { router, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  ChevronDown,
  Search as SearchIcon,
  ArrowLeft,
} from "lucide-react-native";
import { useDebouncedCallback } from "use-debounce";

// Import types from searchFunctions
import { searchPackages, PackageWithAgent } from "@/lib/searchFunctions";
import CustomHeader from "./HeaderComponent";

// Local interface for component UI structure
interface PackageItem extends PackageWithAgent {}

const PACKAGE_TYPES: string[] = [
  "All",
  "Hotel",
  "Resort",
  "Villa",
  "Apartment",
];

const SearchScreen: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [showTypes, setShowTypes] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);

  // Create a map to track image loading errors by package ID
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Set up keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    // Clean up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Debounce search to prevent too many API calls
  const debouncedSearch = useDebouncedCallback((query: string) => {
    performSearch(query, selectedType);
  }, 500);

  // Trigger search when type changes and on initial component mount
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, selectedType]);

  // Run an initial search on component mount
  useEffect(() => {
    console.log("Initial search on component mount");
    performSearch("", "All");
  }, []);

  const performSearch = async (query: string, type: string) => {
    // Add logging to debug search issues
    console.log("Searching with query:", query, "and type:", type);

    setLoading(true);
    try {
      // Always perform search even if query is empty
      console.log("Calling searchPackages with:", {
        query,
        region: "All",
        type,
        limit: 20,
      });
      const results = await searchPackages(query, "All", type, 20);
      console.log(
        "Search results received:",
        results ? results.length : 0,
        "items"
      );

      // Check if results have valid structure
      if (results && Array.isArray(results)) {
        console.log(
          "First result (if any):",
          results.length > 0
            ? JSON.stringify(results[0]).substring(0, 100) + "..."
            : "No results"
        );
        setSearchResults(results);
      } else {
        console.error("Unexpected results format:", results);
        setSearchResults([]);
        Alert.alert(
          "Search Error",
          "Received unexpected data format from search"
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      Alert.alert(
        "Search Error",
        "An error occurred while searching. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    performSearch(searchQuery, selectedType);
  };

  const handlePackagePress = (packageId: string) => {
    console.log("Package pressed:", packageId);
    // Navigate only if we have a valid ID
    if (packageId) {
      router.push(`/properties/${packageId}`);
    } else {
      console.error("Invalid package ID");
    }
  };

  const handleAgentPress = (agentId: string | null) => {
    console.log("Agent pressed:", agentId);
    if (agentId) {
      router.push(`/agents/${agentId}`);
    }
  };

  const closeFilter = () => {
    setShowTypes(false);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Handle image loading error
  const handleImageError = (packageId: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [packageId]: true,
    }));
  };

  // Render package item with better error checking
  const renderPackageItem = ({ item }: { item: PackageItem }) => {
    console.log("Rendering package:", item.id, item.name);
    console.log("Image sources:", {
      image: item.image,
      imageUrl: item.imageUrl,
    });

    // Determine the image source, with fallback
    const imageSource = item?.image || item?.imageUrl || null;
    console.log("Using image source:", imageSource);

    // Check if this image has errored
    const hasError = imageErrors[item.id] || false;

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handlePackagePress(item.id)}
      >
        <View style={styles.resultContent}>
          <View style={styles.imageContainer}>
            {imageSource && !hasError ? (
              <Image
                source={{ uri: imageSource }}
                style={styles.packageImage}
                resizeMode="cover"
                onError={() => {
                  console.error(
                    "Image loading error for image URL:",
                    imageSource
                  );
                  handleImageError(item.id);
                }}
              />
            ) : (
              <View style={[styles.packageImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.packageName} numberOfLines={2}>
              {item.name || "Unnamed Package"}
            </Text>
            <Text style={styles.packagePrice}>
              ${item.price?.toLocaleString() || "0"}
            </Text>
            <Text style={styles.packageType}>
              {item.type || "Unknown Type"}
            </Text>

            <TouchableOpacity
              style={styles.agentButton}
              onPress={() => handleAgentPress(item.agent?.id)}
            >
              <Text style={styles.agentName}>
                By: {item.agent?.name || "Unknown Agent"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      {/* <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={true}
      /> */}
      <CustomHeader title="Search" showBackButton={true} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.container}>
            {/* Header */}
            {/* <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View style={styles.backButtonContainer}>
                  <ArrowLeft size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Search</Text>
            </View> */}

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <View style={styles.searchBar}>
                <SearchIcon size={20} color="#1ABC9C" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search packages by name, type or agent..."
                  placeholderTextColor="#D9D9D9"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  blurOnSubmit={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {
                  dismissKeyboard();
                  setShowTypes(!showTypes);
                }}
              >
                <Text style={styles.filterButtonText}>{selectedType}</Text>
                <ChevronDown size={16} color="#1ABC9C" />
              </TouchableOpacity>
            </View>

            {/* Type Dropdown */}
            {showTypes && (
              <View style={styles.dropdown}>
                <FlatList
                  data={PACKAGE_TYPES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        selectedType === item && styles.selectedDropdownItem,
                      ]}
                      onPress={() => {
                        setSelectedType(item);
                        setShowTypes(false);
                        // Trigger search when selecting a type
                        debouncedSearch(searchQuery);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Search Results */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1ABC9C" />
              </View>
            ) : (
              <>
                {searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={renderPackageItem}
                    contentContainerStyle={styles.resultsList}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={dismissKeyboard}
                  />
                ) : (
                  <View style={styles.noResultsContainer}>
                    {searchQuery || selectedType !== "All" ? (
                      <Text style={styles.noResultsText}>
                        No packages found. Try different search terms or
                        filters.
                        {"\n\n"}
                        You can search by package name, type, or agent name.
                      </Text>
                    ) : (
                      <Text style={styles.noResultsText}>
                        Enter search terms to find packages.
                        {"\n\n"}
                        You can search by package name, type, or agent name.
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Backdrop for closing filters */}
            {showTypes && (
              <TouchableOpacity
                style={styles.backdrop}
                onPress={closeFilter}
                activeOpacity={1}
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 50 : 8,
    paddingBottom: 20,
    height: Platform.OS === "android" ? 90 : 56,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  backButton: {
    padding: 5,
  },
  backButtonContainer: {
    backgroundColor: "#1ABC9C",
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16,
    color: "#333",
  },
  searchInputContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1ABC9C",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1ABC9C",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  filterButtonText: {
    fontSize: 14,
    marginRight: 8,
    color: "#333",
  },
  dropdown: {
    position: "absolute",
    top: 136,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedDropdownItem: {
    backgroundColor: "#f0fff9",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultContent: {
    flexDirection: "row",
  },
  imageContainer: {
    width: 120,
    height: 120,
  },
  packageImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  placeholderText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "bold",
  },
  detailsContainer: {
    flex: 1,
    padding: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1ABC9C",
    marginBottom: 4,
  },
  packageType: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  agentButton: {
    marginTop: "auto",
  },
  agentName: {
    fontSize: 14,
    color: "#1ABC9C",
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 999,
  },
});

export default SearchScreen;
