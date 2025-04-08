import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  Animated as RNAnimated,
  StatusBar,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Swipeable } from "react-native-gesture-handler";
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
import { router } from "expo-router";
import { deletePackage, getAgentPackages } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import Animated, {
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import CustomHeader from "@/components/HeaderComponent";

const { width } = Dimensions.get("window");

type FlightDetails = {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  flightNumber: string;
};

type BookedTrip = {
  id: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  amount: number;
  bookingReference: string;
  passengers: number;
  paymentMethod: string;
  flightDetails: {
    outbound: FlightDetails;
    return: FlightDetails;
  };
};

// Format date helper
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Bookings = () => {
  const { rawUser, isAgent } = useGlobalContext();
  const [packages, setPackages] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  /** Fetch packages function that can be reused */
  const fetchPackages = async () => {
    if (!isAgent || !rawUser?.$id) {
      setInitialLoading(false);
      return;
    }

    try {
      const data = await getAgentPackages(rawUser.$id);
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
  }, [rawUser?.$id]);

  /** Handle pull to refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPackages();
  }, [rawUser?.$id]);

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

  // Render right actions for Swipeable
  const renderRightActions = (packageId: string, progress: any) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [64, 0],
    });

    return (
      <View style={styles.actionButtons}>
        <RNAnimated.View style={{ transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            onPress={() => handleEdit(packageId)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Edit size={20} color="#FFF" />
          </TouchableOpacity>
        </RNAnimated.View>

        <RNAnimated.View style={{ transform: [{ translateX: trans }] }}>
          <TouchableOpacity
            onPress={() => handleDelete(packageId)}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Trash2 size={20} color="#FFF" />
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  };

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Show loader only on initial load
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <CustomHeader
        title="Active Packages"
        showBackButton={false}
        rightIcon={<PlusCircle color="white" size={28} />}
        onRightIconPress={handleCreatePackage}
      />

      {/* Main content */}
      <RNAnimated.ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1ABC9C"]}
            tintColor="#1ABC9C"
          />
        }
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Package count summary */}
        {packages.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              You have <Text style={styles.countText}>{packages.length}</Text>{" "}
              active {packages.length === 1 ? "package" : "packages"}
            </Text>
          </View>
        )}

        {/* Empty state */}
        {packages.length === 0 ? (
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
        ) : (
          // Package list
          packages.map((pkg, index) => (
            <Animated.View
              key={pkg.$id}
              entering={FadeIn.duration(400).delay(index * 100)}
              exiting={FadeOut.duration(300)}
            >
              <Swipeable
                renderRightActions={(progress) =>
                  renderRightActions(pkg.$id, progress)
                }
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
                            <Text style={styles.featureText}>
                              {pkg.bedrooms}
                            </Text>
                          </View>
                        )}

                        {pkg.bathrooms && (
                          <View style={styles.feature}>
                            <Bath size={12} color="#7F8C8D" />
                            <Text style={styles.featureText}>
                              {pkg.bathrooms}
                            </Text>
                          </View>
                        )}

                        {pkg.guestAmount && (
                          <View style={styles.feature}>
                            <Users size={12} color="#7F8C8D" />
                            <Text style={styles.featureText}>
                              {pkg.guestAmount}
                            </Text>
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
              </Swipeable>
            </Animated.View>
          ))
        )}

        {/* Bottom padding to avoid FAB overlap */}
        {packages.length > 0 && <View style={{ height: 100 }} />}
      </RNAnimated.ScrollView>

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
    </GestureHandlerRootView>
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    color: "#34495E",
  },
  countText: {
    fontWeight: "600",
    color: "#1ABC9C",
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "#FFFFFF",
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
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
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
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
  actionButtons: {
    flexDirection: "row",
    width: 144,
    height: "100%",
  },
  actionButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#3498DB",
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
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
