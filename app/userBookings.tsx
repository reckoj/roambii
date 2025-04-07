// Add this helper function at the top of your file
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
import { databases, config } from "@/lib/appwrite";
// Import Query directly from appwrite
import { Query } from "appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";
import { Calendar, MapPin } from "lucide-react-native";
import images from "@/constants/images";

// Update the Booking interface at the top of your UserBookingsScreen component
interface Booking {
  $id: string;
  userId: any; // Changed to any to handle both string and array cases
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
  isCancelled: boolean; // Add this
  statusDisplay: string;
  $collectionId?: string;
  $databaseId?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
}

const UserBookingsScreen = () => {
  const { rawUser } = useGlobalContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

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
      const response = await databases.listDocuments(
        config.databaseId!,
        "67f2a49a00243903ad7d" // users_bookings collection ID
      );

      console.log("Total documents found:", response.documents.length);
      setDebugInfo(
        (prev) => prev + `\nTotal documents found: ${response.documents.length}`
      );

      if (response.documents.length > 0) {
        console.log(
          "First document structure:",
          JSON.stringify(response.documents[0], null, 2)
        );
        setDebugInfo(
          (prev) =>
            prev +
            `\nFirst document structure: ${JSON.stringify(
              response.documents[0],
              null,
              2
            )}`
        );

        // Check which documents would pass the filter
        const matchingDocs = response.documents.filter((doc) => {
          // More flexible check for userId that handles both array and string
          let matches = false;

          // Check if userId is empty, fallback to checking document permissions
          if (Array.isArray(doc.userId) && doc.userId.length === 0) {
            // Check if the document permissions include the current user
            return doc.$permissions.some((perm) =>
              perm.includes(`user:${rawUser.$id}`)
            );
          } else if (typeof doc.userId === "string") {
            // If userId is a string, check if it equals the current user ID
            matches = doc.userId === rawUser.$id;
          } else if (doc.userId && doc.userId.hasOwnProperty(rawUser.$id)) {
            // If userId is an object with user IDs as keys
            matches = true;
          }

          console.log(
            `Document ${doc.$id} userId:`,
            doc.userId,
            "Matches current user:",
            matches
          );
          setDebugInfo(
            (prev) =>
              prev +
              `\nDocument ${doc.$id} userId: ${JSON.stringify(
                doc.userId
              )} Matches: ${matches}`
          );
          return matches;
        });

        console.log("Documents matching current user:", matchingDocs.length);
        setDebugInfo(
          (prev) =>
            prev + `\nDocuments matching current user: ${matchingDocs.length}`
        );

        // Process bookings to determine if they're active
        const now = new Date();
        const processedBookings: Booking[] = await Promise.all(
          matchingDocs.map(async (doc) => {
            // Initialize status variables
            let isActive = false;
            let isCancelled = false;
            let statusDisplay = "past";

            try {
              // Check if booking is explicitly cancelled
              isCancelled = doc.status === "cancelled";

              // Check if the checkout date is in the future
              const checkOutDate = new Date(doc.checkOutDate);

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
                `Booking ${doc.$id} - checkOutDate: ${checkOutDate}, now: ${now}, isActive: ${isActive}, statusDisplay: ${statusDisplay}`
              );
            } catch (e) {
              console.error("Error processing booking status:", e);
            }

            // Try to fetch the package details
            let packageDetails = null;
            try {
              if (doc.packageId) {
                const packageData = await databases.getDocument(
                  config.databaseId!,
                  config.packagesCollectionId!,
                  doc.packageId
                );
                packageDetails = packageData;
              }
            } catch (e) {
              console.error("Error fetching package:", e);
            }

            // Create a properly typed booking object
            const booking: Booking = {
              $id: doc.$id,
              userId: doc.userId, // Keep original format
              packageId: doc.packageId || "",
              packageInfoId: doc.packageInfoId,
              packageDetails: packageDetails,
              amount: doc.amount || 0,
              status: doc.status || "completed",
              bookingReference: doc.bookingReference || "",
              bookingDate: doc.bookingDate || new Date().toISOString(),
              checkInDate: doc.checkInDate || new Date().toISOString(),
              checkOutDate: doc.checkOutDate || new Date().toISOString(),
              guestCount: doc.guestCount || 1,
              isActive: isActive,
              transactionId: doc.transactionId || "",
              paymentMethod: doc.paymentMethod || "stripe",
              metadata: doc.metadata,
              $collectionId: doc.$collectionId,
              $databaseId: doc.$databaseId,
              $createdAt: doc.$createdAt,
              $updatedAt: doc.$updatedAt,
              $permissions: doc.$permissions,
              isCancelled: isCancelled,
              statusDisplay: statusDisplay,
            };

            return booking;
          })
        );

        setBookings(processedBookings);
        console.log("Processed bookings length:", processedBookings.length);
        setDebugInfo(
          (prev) =>
            prev + `\nProcessed bookings length: ${processedBookings.length}`
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
    // For new Expo Router:
    router.push(`/bookings/${bookingId}`);

    // For compatibility with older style if needed:
    // router.push({
    //   pathname: "/booking-details",
    //   params: { id: bookingId },
    // });
  };

  // Update the renderBookingItem function to use the formatDateTime helper:

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
        onPress={() => navigateToBookingDetails(item.$id)}
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
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image
                source={images.noResult}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>No Bookings Yet</Text>
              <Text style={styles.emptyMessage}>
                Your bookings will appear here once you make a reservation.
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push("/")}
              >
                <Text style={styles.exploreButtonText}>Explore Packages</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={bookings}
                renderItem={renderBookingItem}
                keyExtractor={(item) => item.$id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                ListHeaderComponent={
                  <View style={styles.listHeader}>
                    <Text style={styles.bookingsCount}>
                      {bookings.length}{" "}
                      {bookings.length === 1 ? "Booking" : "Bookings"}
                    </Text>
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
                  </View>
                }
              />
            </>
          )}
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
