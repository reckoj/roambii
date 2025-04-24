import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  StatusBar,
  ScrollView,
} from "react-native";
import {
  PlusCircle,
  Trash2,
  Edit,
  MapPin,
  Star,
  Bed,
  Bath,
  Users,
  ChevronRight,
  Calendar,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { getAgentPackages, deletePackage } from "@/lib/agent-service";
import { auth } from "@/lib/firebase/firebase-config";
import images from "@/constants/images";
import { SwipeListView } from "react-native-swipe-list-view";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import CustomHeader from "@/components/HeaderComponent";

const { width } = Dimensions.get("window");

// Format date helper
const formatDate = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Bookings = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Get current user
  const user = auth.currentUser;

  /** Fetch packages function that can be reused */
  const fetchPackages = async () => {
    if (!user?.uid) {
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log("Fetching packages for user:", user.uid);
      const data = await getAgentPackages(user.uid);
      console.log("Packages fetched:", data.length);
      setPackages(data);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  /** Initial fetch when screen loads */
  useEffect(() => {
    fetchPackages();
  }, [user?.uid]);

  /** Refresh when screen comes into focus */
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing packages");
      fetchPackages();
      return () => {
        // Cleanup function when screen is unfocused
        console.log("Screen unfocused");
      };
    }, [user?.uid])
  );

  /** Handle pull to refresh */
  const onRefresh = useCallback(() => {
    console.log("Pull-to-refresh triggered");
    setRefreshing(true);
    fetchPackages();
  }, [user?.uid]);

  /** Handle deleting a package */
  const handleDelete = async (packageId: string) => {
    Alert.alert(
      "Delete Package",
      "Are you sure you want to delete this package?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deletePackage(packageId);
            if (success) {
              setPackages(packages.filter((pkg) => pkg.$id !== packageId));
            } else {
              Alert.alert("Error", "Failed to delete package.");
            }
          },
        },
      ]
    );
  };

  /** Handle editing a package */
  const handleEdit = (packageId: string) => {
    router.push({
      pathname: "/editPackage",
      params: { id: packageId },
    });
  };

  /** Navigate to create package screen */
  const handleCreatePackage = () => {
    router.push("/create-package");
  };

  // Show loader only on initial load
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </View>
    );
  }

  // Render hidden row item (for actions like edit/delete)
  const renderHiddenItem = (data: any) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={() => handleEdit(data.item.$id)}
      >
        <Edit size={20} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDelete(data.item.$id)}
      >
        <Trash2 size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  // Render visible row item (package card)
  const renderItem = (data: any) => {
    const pkg = data.item;

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(data.index * 100)}
        exiting={FadeOut.duration(300)}
      >
        <TouchableOpacity
          style={styles.packageCard}
          activeOpacity={0.9}
          onPress={() => handleEdit(pkg.$id)}
        >
          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Image */}
            <Image
              source={{
                uri: pkg.image || "https://via.placeholder.com/150",
              }}
              style={styles.packageImage}
            />

            {/* Package details */}
            <View style={styles.packageDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.packageName} numberOfLines={1}>
                  {pkg.name}
                </Text>
                <View style={styles.ratingContainer}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.ratingText}>
                    {pkg.rating?.toFixed(1) || "4.5"}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.locationRow}>
                <MapPin size={14} color="#95A5A6" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {pkg.type || "Accommodation"}
                </Text>
              </View>

              {/* Features */}
              <View style={styles.featuresRow}>
                {pkg.bedrooms && (
                  <View style={styles.feature}>
                    <Bed size={12} color="#7F8C8D" />
                    <Text style={styles.featureText}>{pkg.bedrooms}</Text>
                  </View>
                )}

                {pkg.bathrooms && (
                  <View style={styles.feature}>
                    <Bath size={12} color="#7F8C8D" />
                    <Text style={styles.featureText}>{pkg.bathrooms}</Text>
                  </View>
                )}

                {pkg.guestAmount && (
                  <View style={styles.feature}>
                    <Users size={12} color="#7F8C8D" />
                    <Text style={styles.featureText}>{pkg.guestAmount}</Text>
                  </View>
                )}
              </View>

              {/* Dates */}
              {pkg.checkInDate && pkg.checkOutDate && (
                <View style={styles.dateRow}>
                  <Calendar size={12} color="#95A5A6" />
                  <Text style={styles.dateText}>
                    {formatDate(pkg.checkInDate)} -{" "}
                    {formatDate(pkg.checkOutDate)}
                  </Text>
                </View>
              )}
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>${pkg.price}</Text>
              <ChevronRight size={16} color="#95A5A6" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Empty state with pull to refresh
  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.emptyScrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#1ABC9C"]}
          tintColor="#1ABC9C"
        />
      }
    >
      <Animated.View
        style={styles.emptyContainer}
        entering={FadeIn.duration(400)}
      >
        <Image
          source={images.blank}
          style={styles.emptyImage}
          resizeMode="contain"
        />

        <Text style={styles.emptyTitle}>No Packages Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first package listing to get started
        </Text>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePackage}
          activeOpacity={0.8}
        >
          <PlusCircle color="white" size={20} style={styles.buttonIcon} />
          <Text style={styles.createButtonText}>Create Package</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <CustomHeader
        title="Active Packages"
        showBackButton={false}
        rightIcon={<PlusCircle color="white" size={28} />}
        onRightIconPress={handleCreatePackage}
      />

      {/* Main content */}
      {packages.length === 0 ? (
        renderEmptyState()
      ) : (
        // Package list with swipe functionality
        <View style={{ flex: 1 }}>
          {/* Package count summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              You have <Text style={styles.countText}>{packages.length}</Text>{" "}
              active {packages.length === 1 ? "package" : "packages"}
            </Text>
          </View>

          <SwipeListView
            data={packages}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-144} // negative value to open from right side
            disableRightSwipe // disable swiping from left to right
            keyExtractor={(item) => item.$id}
            friction={20} // controls how fast swiping up/down can disable the swipe
            tension={40} // higher = swiping items faster
            useNativeDriver={false}
            swipeToOpenPercent={30} // % of item width needed to trigger swipe
            closeOnRowBeginSwipe={true} // close other rows when one starts swiping
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#1ABC9C"]}
                tintColor="#1ABC9C"
              />
            }
            contentContainerStyle={styles.scrollContent}
          />
        </View>
      )}

      {/* Floating action button */}
      {packages.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleCreatePackage}
          activeOpacity={0.8}
        >
          <PlusCircle color="white" size={26} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#95A5A6",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100, // Extra padding at bottom for FAB
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 40,
  },
  summaryContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 16,
    color: "#34495E",
  },
  countText: {
    fontWeight: "600",
    color: "#1ABC9C",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyImage: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#34495E",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 30,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  packageCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
  },
  packageImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  packageDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495E",
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFB100",
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#95A5A6",
    marginLeft: 4,
  },
  featuresRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 12,
    color: "#7F8C8D",
    marginLeft: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#95A5A6",
    marginLeft: 4,
  },
  priceContainer: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 8,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1ABC9C",
    marginBottom: 8,
  },
  // Swipe list view styles
  rowBack: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: 16,
    height: "100%",
    marginBottom: 16,
  },
  actionButton: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    top: 0,
    width: 72,
    height: 114,
  },
  editButton: {
    backgroundColor: "#3498DB",
    right: 72,
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
    right: 0,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1ABC9C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default Bookings;
