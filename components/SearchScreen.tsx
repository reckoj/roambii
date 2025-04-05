import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { router, useRouter } from "expo-router";
import {
  X,
  ChevronDown,
  Search as SearchIcon,
  ArrowLeft,
} from "lucide-react-native";
import { useDebouncedCallback } from "use-debounce";

// Import types from searchFunctions
import { searchPackages, PackageWithAgent } from "@/lib/searchFunctions";

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

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, selectedType]);

  const performSearch = async (query: string, type: string) => {
    if (!query && type === "All") {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Use "All" for region since we're not using regions now
      const results = await searchPackages(query, "All", type, 20);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    performSearch(searchQuery, selectedType);
  };

  const handlePackagePress = (packageId: string) => {
    router.push(`/properties/${packageId}`);
  };

  const handleAgentPress = (agentId: string | null) => {
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

  const renderPackageItem = ({ item }: { item: PackageItem }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handlePackagePress(item.$id)}
    >
      <View style={styles.resultContent}>
        <View style={styles.imageContainer}>
          {item.image || item.imageUrl ? (
            <Image
              source={{ uri: (item.image || item.imageUrl) as string }}
              style={styles.packageImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.packageImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.packageName}>
            {item.name || "Unnamed Package"}
          </Text>
          <Text style={styles.packagePrice}>
            ${item.price?.toLocaleString() || "0"}
          </Text>
          <Text style={styles.packageType}>{item.type || "Unknown Type"}</Text>

          <TouchableOpacity
            style={styles.agentButton}
            onPress={() => handleAgentPress(item.agent.id)}
          >
            <Text style={styles.agentName}>By: {item.agent.name}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color="#1ABC9C" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Search</Text>
            </View>

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
                    keyExtractor={(item) => item.$id}
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16,
    color: "#333",
  },
  searchInputContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
  },
  placeholderText: {
    color: "#999",
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
