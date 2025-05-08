import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase-config";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";
import { Calendar, MapPin } from "lucide-react-native";
import images from "@/constants/images";

// Format date/time helper function
const formatDateTime = (
  dateTimeString: string | number | Date,
  isTime = false
) => {
  if (!dateTimeString) return isTime ? "Not specified" : "Not specified";

  try {
    const date = new Date(dateTimeString);

    if (isNaN(date.getTime())) {
      return isTime ? "Not specified" : "Not specified";
    }

    if (isTime) {
      // Format just the time
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      // Format just the date
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch (error) {
    console.error("Error formatting date/time:", error);
    return isTime ? "Not specified" : "Not specified";
  }
};

interface Booking {
  id: string;
  userId: string;
  packageId: string;
  packageInfoId?: string;
  packageDetails?: any;
  amount: number;
  status: string;
  bookingReference: string;
  bookingDate: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  isActive: boolean;
  transactionId: string;
  paymentMethod: string;
  metadata?: string;
  isCancelled: boolean;
  statusDisplay: string;
  createdAt?: string;
  updatedAt?: string;
}

type TabType = "active" | "cancelled";

const UserBookingsScreen = () => {
  const { rawUser } = useGlobalContext();
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const fetchBookings = useCallback(async () => {
    if (!rawUser?.$id) {
      console.log("No user ID available");
      setDebugInfo((prev) => prev + "\nNo user ID available");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching bookings for user:", rawUser.$id);
      setDebugInfo(
        (prev) => prev + `\nFetching bookings for user: ${rawUser.$id}`
      );

      // Fetch all bookings without filtering at first
      const response = await getDocs(
        query(collection(db, "users_bookings"), where("userId", "array-contains", rawUser.$id))
      );

      console.log("Total documents found:", response.docs.length);
      setDebugInfo(
        (prev) => prev + `\nTotal documents found: ${response.docs.length}`
      );

      if (response.docs.length > 0) {
        console.log(
          "First document structure:",
          JSON.stringify(response.docs[0].data(), null, 2)
        );
        setDebugInfo(
          (prev) =>
            prev +
            `\nFirst document structure: ${JSON.stringify(
              response.docs[0].data(),
              null,
              2
            )}`
        );

        // Process bookings to determine if they're active
        const now = new Date();
        const processedBookings: Booking[] = await Promise.all(
          response.docs.map(async (doc) => {
            // Initialize status variables
            let isActive = false;
            let isCancelled = false;
            let statusDisplay = "past";

            try {
              // Check if booking is explicitly cancelled
              isCancelled = doc.data().status === "cancelled";

              // Check if the checkout date is in the future
              const checkOutDate = new Date(doc.data().checkOutDate);

              // A booking is active if checkout date is in the future and not cancelled
              isActive = checkOutDate >= now && !isCancelled;

              // Determine display status
              if (isCancelled) {
                statusDisplay = "cancelled";
              } else if (isActive) {
                statusDisplay = "active";
              } else {
                statusDisplay = "past";
              }

              console.log(
                `Booking ${doc.id} - checkOutDate: ${checkOutDate}, now: ${now}, isActive: ${isActive}, statusDisplay: ${statusDisplay}`
              );
            } catch (e) {
              console.error("Error processing booking status:", e);
            }

            // Try to fetch the package details
            let packageDetails = null;
            try {
              if (doc.data().packageId) {
                const packageData = await getDoc(doc(db, "packages", doc.data().packageId));
                packageDetails = packageData.data();
              }
            } catch (e) {
              console.error("Error fetching package:", e);
            }

            // Create a properly typed booking object
            const booking: Booking = {
              id: doc.id,
              userId: doc.data().userId,
              packageId: doc.data().packageId || "",
              packageInfoId: doc.data().packageInfoId,
              packageDetails: packageDetails,
              amount: doc.data().amount || 0,
              status: doc.data().status || "completed",
              bookingReference: doc.data().bookingReference || "",
              bookingDate: doc.data().bookingDate || new Date().toISOString(),
              checkInDate: doc.data().checkInDate || new Date().toISOString(),
              checkOutDate: doc.data().checkOutDate || new Date().toISOString(),
              guestCount: doc.data().guestCount || 1,
              isActive: isActive,
              transactionId: doc.data().transactionId || "",
              paymentMethod: doc.data().paymentMethod || "stripe",
              metadata: doc.data().metadata,
              isCancelled: isCancelled,
              statusDisplay: statusDisplay,
              createdAt: doc.data().createdAt,
              updatedAt: doc.data().updatedAt,
            };

            return booking;
          })
        );

        // Sort bookings by creation date (newest first)
        const sortedBookings = processedBookings.sort((a, b) => {
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        });

        setAllBookings(sortedBookings);

        // Separate active (including past) and cancelled bookings
        const active = sortedBookings.filter((booking) => !booking.isCancelled);
        const cancelled = sortedBookings.filter(
          (booking) => booking.isCancelled
        );

        setActiveBookings(active);
        setCancelledBookings(cancelled);

        console.log("Processed bookings length:", sortedBookings.length);
        console.log("Active bookings:", active.length);
        console.log("Cancelled bookings:", cancelled.length);

        setDebugInfo(
          (prev) =>
            prev +
            `\nProcessed bookings length: ${sortedBookings.length}` +
            `\nActive bookings: ${active.length}` +
            `\nCancelled bookings: ${cancelled.length}`
        );
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setDebugInfo((prev) => prev + `\nError fetching bookings: ${error}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rawUser]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    setDebugInfo(""); // Clear debug info on refresh
    fetchBookings();
  };

  const navigateToBookingDetails = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`);
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    // Format dates using the helper function for consistency
    const checkInDate = formatDateTime(item.checkInDate);
    const checkOutDate = formatDateTime(item.checkOutDate);

    const getStatusStyles = () => {
      if (item.statusDisplay === "cancelled") {
        return {
          card: styles.cancelledCard,
          badge: styles.cancelledStatusBadge,
          text: styles.cancelledStatusText,
        };
      } else if (item.statusDisplay === "active") {
        return {
          card: styles.activeCard,
          badge: styles.activeStatusBadge,
          text: styles.activeStatusText,
        };
      } else {
        return {
          card: styles.pastCard,
          badge: styles.pastStatusBadge,
          text: styles.pastStatusText,
        };
      }
    };

    const statusStyles = getStatusStyles();

    return (
      <TouchableOpacity
        style={[styles.bookingCard, statusStyles.card]}
        onPress={() => navigateToBookingDetails(item.id)}
      >
        <View style={styles.statusContainer}>
          <View style={statusStyles.badge}>
            <Text style={statusStyles.text}>
              {item.statusDisplay === "cancelled"
                ? "Cancelled"
                : item.statusDisplay === "active"
                ? "Active"
                : "Past"}
            </Text>
          </View>
        </View>

        <View style={styles.bookingContent}>
          <View style={styles.imageContainer}>
            <Image
              source={
                item.packageDetails?.image
                  ? { uri: item.packageDetails.image }
                  : images.noResult
              }
              style={styles.packageImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.packageName} numberOfLines={1}>
              {item.packageDetails?.name || "Package Booking"}
            </Text>

            <View style={styles.infoRow}>
              <Calendar size={14} color="#95A5A6" />
              <Text style={styles.infoText}>
                {checkInDate} - {checkOutDate}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <MapPin size={14} color="#95A5A6" />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.packageDetails?.type || "Accommodation"}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total:</Text>
              <Text style={styles.priceValue}>${item.amount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.referenceContainer}>
          <Text style={styles.referenceLabel}>Booking Reference:</Text>
          <Text style={styles.referenceValue}>{item.bookingReference}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={images.noResult}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "active" ? "No Bookings Yet" : "No Cancelled Bookings"}
      </Text>
      <Text style={styles.emptyMessage}>
        {activeTab === "active"
          ? "Your bookings will appear here once you make a reservation."
          : "Any cancelled bookings will appear here."}
      </Text>
      {activeTab === "active" && (
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push("/")}
        >
          <Text style={styles.exploreButtonText}>Explore Packages</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTabContent = () => {
    const currentBookings =
      activeTab === "active" ? activeBookings : cancelledBookings;

    if (currentBookings.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        data={currentBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.bookingsCount}>
              {currentBookings.length}{" "}
              {currentBookings.length === 1 ? "Booking" : "Bookings"}
            </Text>
            {activeTab === "active" && (
              <View style={styles.filterContainer}>
                <View style={styles.legendItem}>
                  <View style={styles.activeIndicator} />
                  <Text style={styles.legendText}>Active</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.pastIndicator} />
                  <Text style={styles.legendText}>Past</Text>
                </View>
              </View>
            )}
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="My Bookings" showBackButton={true} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : (
        <>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "active" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("active")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "active" && styles.activeTabButtonText,
                ]}
              >
                Active
                {activeBookings.length > 0 && (
                  <Text style={styles.tabCountBadge}>
                    {" "}
                    ({activeBookings.length})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "cancelled" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("cancelled")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "cancelled" && styles.activeTabButtonText,
                ]}
              >
                Cancelled
                {cancelledBookings.length > 0 && (
                  <Text style={styles.tabCountBadge}>
                    {" "}
                    ({cancelledBookings.length})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {renderTabContent()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ECEFF1",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#1ABC9C",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#95A5A6",
  },
  activeTabButtonText: {
    color: "#1ABC9C",
    fontWeight: "600",
  },
  tabCountBadge: {
    fontSize: 14,
    fontWeight: "400",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#95A5A6",
  },
  listContainer: {
    padding: 16,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bookingsCount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34495E",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1ABC9C",
    marginRight: 4,
  },
  pastIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#95A5A6",
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  bookingCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },

  statusContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 8,
    paddingRight: 8,
  },

  bookingContent: {
    flexDirection: "row",
    padding: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
  },
  packageImage: {
    width: "100%",
    height: "100%",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#7F8C8D",
    marginLeft: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1ABC9C",
    marginLeft: 6,
  },
  referenceContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F1F2F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  referenceLabel: {
    fontSize: 12,
    color: "#95A5A6",
  },
  referenceValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#34495E",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
  },
  exploreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Debug styles
  debugPanel: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    maxHeight: 300,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  debugButton: {
    backgroundColor: "#cccccc",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  debugToggleButton: {
    backgroundColor: "#cccccc",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  debugToggleText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#1ABC9C", // Green
  },
  pastCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#95A5A6", // Gray
    opacity: 0.9,
  },
  cancelledCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#E74C3C", // Red
    opacity: 0.9,
  },

  activeStatusBadge: {
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pastStatusBadge: {
    backgroundColor: "rgba(149, 165, 166, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  cancelledStatusBadge: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },

  activeStatusText: {
    fontSize: 12,
    color: "#1ABC9C",
    fontWeight: "500",
  },
  pastStatusText: {
    fontSize: 12,
    color: "#95A5A6",
    fontWeight: "500",
  },
  cancelledStatusText: {
    fontSize: 12,
    color: "#E74C3C",
    fontWeight: "500",
  },
});

export default UserBookingsScreen;
