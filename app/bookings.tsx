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
  UserSquare2,
  Crown,
  Lock,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { getAgentPackages, deletePackage } from "@/lib/agent-service";
import { auth } from "@/lib/firebase/firebase-config";
import { subscriptionService } from "@/lib/subscription-service";
import { SubscriptionStatus } from "@/lib/types/subscription";
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Get current user
  const user = auth.currentUser;

  /** Fetch packages and subscription status */
  const fetchData = async () => {
    if (!user?.uid) return;

    setRefreshing(true);
    try {
      console.log("Fetching packages and subscription for user:", user.uid);
      
      // Fetch both packages and subscription status
      const [fetchedPackages, subStatus] = await Promise.all([
        getAgentPackages(user.uid),
        subscriptionService.checkSubscriptionStatus(user.uid),
      ]);
      
      console.log("Fetched packages:", fetchedPackages.length);
      console.log("Subscription status:", subStatus);
      
      // Filter out duplicates based on $id or id
      const uniquePackages = fetchedPackages.filter((pkg, index, self) => {
        const currentId = pkg.$id || pkg.id;
        return currentId && self.findIndex(p => (p.$id || p.id) === currentId) === index;
      });
      
      console.log("Unique packages after filtering:", uniquePackages.length);
      setPackages(uniquePackages);
      setSubscriptionStatus(subStatus);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  /** Initial fetch when screen loads */
  useEffect(() => {
    fetchData();
  }, [user?.uid]);

  /** Refresh when screen comes into focus */
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing data");
      fetchData();
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
    fetchData();
  }, [user?.uid]);

  /** Handle package creation with subscription check */
  const handleCreatePackage = () => {
    if (!subscriptionStatus) {
      Alert.alert("Error", "Unable to check subscription status");
      return;
    }

    if (!subscriptionStatus.canCreatePackage) {
      // Show upgrade prompt
      Alert.alert(
        "Package Limit Reached",
        `You've reached your ${subscriptionStatus.planId === "basic" ? "Basic Plan" : "Premium Plan"} plan limit of ${subscriptionStatus.packageLimit} packages. Upgrade to create more packages.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade Plan",
            onPress: () => router.push("/subscription-plans"),
          },
        ]
      );
      return;
    }

    router.push("/create-package");
  };

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
            try {
              console.log(`Attempting to delete package: ${packageId}`);
              const success = await deletePackage(packageId);
              
              if (success) {
                console.log(`Successfully deleted package: ${packageId}`);
                
                // Filter out the deleted package from the packages list
                // Handle both $id and id formats
                setPackages(packages.filter((pkg) => {
                  const pkgId = pkg.$id || pkg.id;
                  return pkgId !== packageId;
                }));
                
                // Refresh subscription status after deletion
                if (user?.uid) {
                  const newStatus = await subscriptionService.checkSubscriptionStatus(user.uid);
                  setSubscriptionStatus(newStatus);
                }
                
                // Show success message
                Alert.alert("Success", "Package deleted successfully.");
              } else {
                console.error(`Failed to delete package: ${packageId}`);
                Alert.alert(
                  "Delete Failed", 
                  "Failed to delete package. You may not have permission or the package doesn't exist."
                );
              }
            } catch (error) {
              console.error("Error in package deletion:", error);
              Alert.alert("Error", "An error occurred while deleting the package.");
            }
          },
        },
      ]
    );
  };

  /** Handle editing a package */
  const handleEdit = (packageId: string) => {
    console.log(`Navigating to edit package: ${packageId}`);
    router.push({
      pathname: "/editPackage",
      params: { id: packageId },
    });
  };

  /** Navigate to client relationships screen */
  const handleViewClients = () => {
    router.push("/(root)/clients");
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

  // Render subscription status card
  const renderSubscriptionStatus = () => {
    if (!subscriptionStatus) return null;

    const isPremium = subscriptionStatus.planId === "premium";
    const isNearLimit = (subscriptionStatus.currentPackageCount || 0) >= subscriptionStatus.packageLimit * 0.8;

    return (
      <View style={[styles.subscriptionCard, isPremium && styles.premiumSubscriptionCard]}>
        <View style={styles.subscriptionHeader}>
          <View style={styles.subscriptionTitleRow}>
            {isPremium ? (
              <Crown size={20} color="#1ABC9C" />
            ) : (
              <Lock size={20} color="#95A5A6" />
            )}
            <Text style={styles.subscriptionTitle}>
              {isPremium ? "Premium Plan" : "Basic Plan"}
            </Text>
          </View>
          {!isPremium && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push("/subscription-plans")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.packageLimitRow}>
          <Text style={styles.packageLimitText}>
            {subscriptionStatus.currentPackageCount || 0} / {subscriptionStatus.packageLimit} packages used
          </Text>
          <View style={[
            styles.progressBar,
            isNearLimit && styles.progressBarWarning,
            !subscriptionStatus.canCreatePackage && styles.progressBarFull,
          ]}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${Math.min(((subscriptionStatus.currentPackageCount || 0) / subscriptionStatus.packageLimit) * 100, 100)}%`,
                },
                isPremium && styles.premiumProgressFill,
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  // Render hidden row item (for actions like edit/delete)
  const renderHiddenItem = (data: any) => {
    const packageId = data.item.$id || data.item.id;
    
    return (
      <View style={styles.rowBack}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(packageId)}
        >
          <Edit size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(packageId)}
        >
          <Trash2 size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render visible row item (package card)
  const renderItem = (data: any) => {
    const pkg = data.item;
    const packageId = pkg.$id || pkg.id;

    return (
      <View>
        <TouchableOpacity
          style={styles.packageCard}
          activeOpacity={0.9}
          onPress={() => handleEdit(packageId)}
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
      </View>
    );
  };

  // Render header with client relationships button
  const renderHeader = () => (
    <View>
      <CustomHeader title="My Packages" showBackButton={false} />
      <View style={styles.headerContainer}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.clientButton}
            onPress={handleViewClients}
          >
            <UserSquare2 size={20} color="#FFF" />
            <Text style={styles.clientButtonText}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.createButton,
              !subscriptionStatus?.canCreatePackage && styles.disabledButton,
            ]}
            onPress={handleCreatePackage}
          >
            <PlusCircle size={20} color="#FFF" />
            <Text style={styles.createButtonText}>New Package</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
      <View style={styles.emptyContainer}>
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
          style={[
            styles.createButton,
            !subscriptionStatus?.canCreatePackage && styles.disabledButton,
          ]}
          onPress={handleCreatePackage}
          activeOpacity={0.8}
        >
          <PlusCircle color="white" size={20} />
          <Text style={styles.createButtonText}>Create Package</Text>
        </TouchableOpacity>

        {subscriptionStatus && !subscriptionStatus.canCreatePackage && (
          <TouchableOpacity
            style={styles.upgradePrompt}
            onPress={() => router.push("/subscription-plans")}
          >
            <Crown size={16} color="#1ABC9C" />
            <Text style={styles.upgradePromptText}>
              Upgrade to create more packages
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar />

      {renderHeader()}

      {packages.length === 0 && !refreshing ? (
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

          {renderSubscriptionStatus()}

          <SwipeListView
            data={packages}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-144} // negative value to open from right side
            disableRightSwipe // disable swiping from left to right
            keyExtractor={(item, index) => {
              const id = item.$id || item.id || `package_${index}`;
              return `${id}_${index}`; // Add index to ensure uniqueness
            }}
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
          style={[
            styles.floatingButton,
            !subscriptionStatus?.canCreatePackage && styles.disabledFloatingButton,
          ]}
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
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    marginLeft: 6,
    fontWeight: "600",
  },
  clientButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498DB",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: "center",
  },
  clientButtonText: {
    color: "#FFFFFF",
    marginLeft: 6,
    fontWeight: "600",
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
  headerContainer: {
    paddingHorizontal: 16,

    paddingBottom: 6,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  subscriptionCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  premiumSubscriptionCard: {
    backgroundColor: "#FFF9E6",
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  subscriptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495E",
    marginLeft: 8,
  },
  upgradeButton: {
    backgroundColor: "#3498DB",
    padding: 10,
    borderRadius: 6,
    marginLeft: 12,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  packageLimitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  packageLimitText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginRight: 12,
  },
  progressBar: {
    flex: 1,
    height: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
  },
  progressBarWarning: {
    backgroundColor: "#FFD700",
  },
  progressBarFull: {
    backgroundColor: "#E74C3C",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#1ABC9C",
  },
  premiumProgressFill: {
    backgroundColor: "#FFB100",
  },
  disabledButton: {
    backgroundColor: "#95A5A6",
  },
  disabledFloatingButton: {
    backgroundColor: "#95A5A6",
  },
  upgradePrompt: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  upgradePromptText: {
    color: "#FFFFFF",
    marginLeft: 6,
    fontWeight: "600",
  },
});

export default Bookings;
