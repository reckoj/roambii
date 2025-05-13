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
  Alert,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { firestore as db, COLLECTIONS } from "@/lib/firebase/firebase-config";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";
import { Calendar, MapPin, Archive } from "lucide-react-native";
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
  isArchived: boolean;
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
    if (!rawUser?.id) {
      console.log("No user ID available:", rawUser);
      setDebugInfo(
        (prev) =>
          prev + "\nNo user ID available. User data: " + JSON.stringify(rawUser)
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching bookings for user:", rawUser.id);
      setDebugInfo(
        (prev) => prev + `\nFetching bookings for user: ${rawUser.id}`
      );

      // Fetch bookings where userId field matches
      let userIdQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where("userId", "==", rawUser.id)
      );
      
      let userIdResponse = await getDocs(userIdQuery);
      console.log("Documents found with userId:", userIdResponse.docs.length);
      
      // Fetch bookings where user reference matches
      const userRef = doc(db, COLLECTIONS.USERS, rawUser.id);
      let userQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where("user", "==", userRef)
      );
      
      let userResponse = await getDocs(userQuery);
      console.log("Documents found with user reference:", userResponse.docs.length);
      
      // Combine results (avoiding duplicates)
      const bookingDocsMap = new Map();
      
      [...userIdResponse.docs, ...userResponse.docs].forEach(doc => {
        if (!bookingDocsMap.has(doc.id)) {
          bookingDocsMap.set(doc.id, doc);
        }
      });
      
      const response = {
        docs: Array.from(bookingDocsMap.values())
      };

      console.log("Total unique documents found:", response.docs.length);
      setDebugInfo(
        (prev) => prev + `\nTotal unique documents found: ${response.docs.length}`
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

        const now = new Date();
        const processedBookings: Booking[] = await Promise.all(
          response.docs.map(async (doc) => {
            let isActive = false;
            let isCancelled = false;
            let statusDisplay = "past";
            let isArchived = doc.data().isArchived || false;

            try {
              isCancelled = doc.data().status === "cancelled";

              const checkOutDate = new Date(doc.data().checkOutDate);

              isActive = checkOutDate >= now && !isCancelled;

              if (isCancelled) {
                statusDisplay = "cancelled";
              } else if (isActive) {
                statusDisplay = "active";
              } else {
                statusDisplay = "past";
              }

              console.log(
                `Booking ${doc.id} - checkOutDate: ${checkOutDate}, now: ${now}, isActive: ${isActive}, statusDisplay: ${statusDisplay}, isArchived: ${isArchived}`
              );
            } catch (e) {
              console.error("Error processing booking status:", e);
            }

            // Try to fetch the package details
            let packageDetails = null;
            try {
              // First check if packageDetails already exists in the booking
              if (doc.data().packageDetails) {
                packageDetails = doc.data().packageDetails;
                console.log("Using embedded packageDetails from booking");
              }
              // Otherwise, if we have a packageId, fetch the package
              else if (doc.data().packageId) {
                // Use firestoreDoc instead of doc to avoid naming conflict
                const packageRef = firestoreDoc(
                  db,
                  COLLECTIONS.PACKAGES,
                  doc.data().packageId
                );
                const packageSnap = await getDoc(packageRef);
                if (packageSnap.exists()) {
                  packageDetails = packageSnap.data();
                  console.log("Fetched packageDetails from Firestore");
                }
              }
              // If we have a package reference directly in the document
              else if (doc.data().package && doc.data().package._key) {
                try {
                  const packagePath = doc.data().package._key.path.segments;
                  if (packagePath && packagePath.length >= 2) {
                    // Extract collection and id from path
                    const packageId = packagePath[packagePath.length - 1];
                    const packageRef = firestoreDoc(
                      db,
                      COLLECTIONS.PACKAGES,
                      packageId
                    );
                    const packageSnap = await getDoc(packageRef);
                    if (packageSnap.exists()) {
                      packageDetails = packageSnap.data();
                      console.log(
                        "Fetched packageDetails from package reference"
                      );
                    }
                  }
                } catch (refError) {
                  console.error(
                    "Error extracting package from reference:",
                    refError
                  );
                }
              }
            } catch (e) {
              console.error("Error fetching package:", e);
            }

            // Properly handle date conversion from various sources
            let checkInDate = new Date();
            let checkOutDate = new Date();

            try {
              // First try to get dates from package details if available
              if (packageDetails) {
                // Check for flight info dates (for trip packages)
                if (packageDetails.flight_info) {
                  if (packageDetails.flight_info.departure_date) {
                    checkInDate = new Date(packageDetails.flight_info.departure_date);
                  }
                  if (packageDetails.flight_info.return_date) {
                    checkOutDate = new Date(packageDetails.flight_info.return_date);
                  }
                }
                
                // Fall back to check_in_date and check_out_date (for hotel packages)
                if (isNaN(checkInDate.getTime()) && packageDetails.check_in_date) {
                  checkInDate = new Date(packageDetails.check_in_date);
                }
                if (isNaN(checkOutDate.getTime()) && packageDetails.check_out_date) {
                  checkOutDate = new Date(packageDetails.check_out_date);
                }
              }
              
              // If we still don't have valid dates, try from the booking document
              if (isNaN(checkInDate.getTime()) && doc.data().check_in_date) {
                if (typeof doc.data().check_in_date === "object" && doc.data().check_in_date.toDate) {
                  checkInDate = doc.data().check_in_date.toDate();
                } else {
                  checkInDate = new Date(doc.data().check_in_date);
                }
              } else if (isNaN(checkInDate.getTime()) && doc.data().checkInDate) {
                if (typeof doc.data().checkInDate === "object" && doc.data().checkInDate.toDate) {
                  checkInDate = doc.data().checkInDate.toDate();
                } else {
                  checkInDate = new Date(doc.data().checkInDate);
                }
              }

              if (isNaN(checkOutDate.getTime()) && doc.data().check_out_date) {
                if (typeof doc.data().check_out_date === "object" && doc.data().check_out_date.toDate) {
                  checkOutDate = doc.data().check_out_date.toDate();
                } else {
                  checkOutDate = new Date(doc.data().check_out_date);
                }
              } else if (isNaN(checkOutDate.getTime()) && doc.data().checkOutDate) {
                if (typeof doc.data().checkOutDate === "object" && doc.data().checkOutDate.toDate) {
                  checkOutDate = doc.data().checkOutDate.toDate();
                } else {
                  checkOutDate = new Date(doc.data().checkOutDate);
                }
              }

              // Validate the dates
              if (isNaN(checkInDate.getTime())) {
                console.log(`Invalid checkInDate for booking ${doc.id}:`, doc.data().checkInDate);
                checkInDate = new Date(); // Default to current date
              }
              
              if (isNaN(checkOutDate.getTime())) {
                console.log(`Invalid checkOutDate for booking ${doc.id}:`, doc.data().checkOutDate);
                checkOutDate = new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000); // Default to 2 days from now
              }
              
              // Determine if booking is active based on the checkout date
              // A booking is active if:
              // 1. It's not cancelled, AND
              // 2. The checkout/return date is in the future OR it's today
              const isToday = (someDate: Date) => {
                const today = new Date();
                return someDate.getDate() === today.getDate() &&
                  someDate.getMonth() === today.getMonth() &&
                  someDate.getFullYear() === today.getFullYear();
              };
              
              isActive = (checkOutDate > now || isToday(checkOutDate)) && !isCancelled;
              
              // Update status display based on dates
              if (isCancelled) {
                statusDisplay = "cancelled";
              } else if (isActive) {
                statusDisplay = "active";
              } else {
                statusDisplay = "past";
              }

              console.log(
                `Booking ${doc.id} - checkInDate: ${checkInDate.toISOString()}, checkOutDate: ${checkOutDate.toISOString()}, isActive: ${isActive}, statusDisplay: ${statusDisplay}, isArchived: ${isArchived}`
              );
            } catch (e) {
              console.error("Error processing dates:", e);
            }

            // Helper function to safely convert Firestore timestamps to ISO strings
            const safelyConvertDate = (date: any) => {
              if (!date) return new Date().toISOString();

              try {
                if (typeof date === "object" && date.toDate) {
                  return date.toDate().toISOString();
                } else if (typeof date === "string") {
                  const parsed = new Date(date);
                  return isNaN(parsed.getTime())
                    ? new Date().toISOString()
                    : parsed.toISOString();
                } else {
                  return new Date().toISOString();
                }
              } catch (e) {
                console.error("Error converting date:", e);
                return new Date().toISOString();
              }
            };

            // Create a properly typed booking object
            const booking: Booking = {
              id: doc.id,
              userId: doc.data().userId || (doc.data().user && typeof doc.data().user === 'object' && doc.data().user.path ? 
                doc.data().user.path.split('/').pop() : rawUser.id),
              packageId: doc.data().packageId || (doc.data().package && typeof doc.data().package === 'object' && doc.data().package.path ? 
                doc.data().package.path.split('/').pop() : ""),
              packageInfoId: doc.data().packageInfoId,
              packageDetails: packageDetails,
              amount: doc.data().amount || (doc.data().payment && doc.data().payment.amount) || 0,
              status: doc.data().status || "completed",
              bookingReference: doc.data().bookingReference || `BKG-${doc.id.substring(0, 8).toUpperCase()}`,
              bookingDate: safelyConvertDate(doc.data().bookingDate),
              checkInDate: checkInDate.toISOString(),
              checkOutDate: checkOutDate.toISOString(),
              guestCount: doc.data().guestCount || 1,
              isActive: isActive,
              transactionId: doc.data().transactionId || "",
              paymentMethod: doc.data().paymentMethod || (doc.data().payment && doc.data().payment.method) || "stripe",
              metadata: doc.data().metadata,
              isCancelled: isCancelled,
              statusDisplay: statusDisplay,
              isArchived: isArchived,
              createdAt: safelyConvertDate(doc.data().createdAt),
              updatedAt: safelyConvertDate(doc.data().updatedAt),
            };

            return booking;
          })
        );

        // Filter out any documents that are client-agent relationships and archived bookings
        const filteredBookings = processedBookings.filter(
          (booking) =>
            !booking.id.startsWith("client_agent_") && !booking.isArchived
        );

        // Sort bookings by creation date (newest first)
        const sortedBookings = filteredBookings.sort((a, b) => {
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        });

        setAllBookings(sortedBookings);

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
    setDebugInfo("");
    fetchBookings().then(() => {
      // Show a small alert to let the user know bookings have been refreshed
      Alert.alert("Success", "Bookings refreshed successfully", [
        { text: "OK", onPress: () => console.log("Bookings refresh acknowledged") }
      ]);
    });
  };

  const navigateToBookingDetails = (bookingId: string) => {
    // Check if we're trying to navigate to a client-agent relationship document
    if (bookingId.startsWith("client_agent_")) {
      console.log(
        "This is a client-agent relationship document, not a booking"
      );
      Alert.alert(
        "Info",
        "This is a client-agent relationship record, not a booking."
      );
      return;
    }

    // Navigate to booking details page - using the bookings/[id] route
    try {
      router.push(`/bookings/${bookingId}`);
    } catch (e) {
      console.error("Navigation error:", e);
      // Fallback methods
      try {
        // Try alternate navigation method
        router.push({
          pathname: "/bookings/[id]",
          params: { id: bookingId },
        });
      } catch (e2) {
        console.error("Second navigation error:", e2);
        // Last resort fallback
        router.push(`/bookings/${bookingId}`);
      }
    }
  };

  const handleArchive = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      await updateDoc(bookingRef, {
        isArchived: true,
      });

      // Remove from local state
      setActiveBookings((prev) =>
        prev.filter((booking) => booking.id !== bookingId)
      );
      setAllBookings((prev) =>
        prev.filter((booking) => booking.id !== bookingId)
      );
    } catch (error) {
      console.error("Error archiving booking:", error);
      Alert.alert("Error", "Failed to archive booking");
    }
  };

  const navigateToArchivedBookings = () => {
    router.push("/archivedBookings");
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
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
                item.packageDetails?.image || item.packageDetails?.banner_image
                  ? {
                      uri:
                        item.packageDetails.image ||
                        item.packageDetails.banner_image,
                    }
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
          <Text style={styles.referenceValue}>{item.bookingReference || `BKG-${item.id.substring(0, 8).toUpperCase()}`}</Text>
        </View>

        <TouchableOpacity
          style={styles.archiveButton}
          onPress={() => handleArchive(item.id)}
        >
          <Archive size={16} color="#95A5A6" />
          <Text style={styles.archiveButtonText}>Archive</Text>
        </TouchableOpacity>
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
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="My Bookings" 
        showBackButton={true} 
        rightIcon={<Archive size={24} color="#1ABC9C" />}
        onRightIconPress={navigateToArchivedBookings}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : (
        <>
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

          {renderTabContent()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: "#1ABC9C",
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#adb5bd",
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
    paddingBottom: 32,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  bookingsCount: {
    fontSize: 17,
    fontWeight: "600",
    color: "#343a40",
  },
  bookingCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f3f5",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    paddingRight: 12,
  },
  bookingContent: {
    flexDirection: "row",
    padding: 16,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f1f3f5",
  },
  packageImage: {
    width: "100%",
    height: "100%",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 16,
  },
  packageName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#343a40",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#6c757d",
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1ABC9C",
    marginLeft: 6,
  },
  referenceContainer: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  referenceLabel: {
    fontSize: 13,
    color: "#6c757d",
    fontWeight: "500",
  },
  referenceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#495057",
    letterSpacing: 0.5,
  },
  archiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
    backgroundColor: "#f8f9fa",
  },
  archiveButtonText: {
    color: "#6c757d",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
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
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#343a40",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#1ABC9C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  activeCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#1ABC9C",
  },
  pastCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#adb5bd",
  },
  cancelledCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#ff6b6b",
  },
  activeStatusBadge: {
    backgroundColor: "rgba(26, 188, 156, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  pastStatusBadge: {
    backgroundColor: "rgba(173, 181, 189, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  cancelledStatusBadge: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  activeStatusText: {
    fontSize: 12,
    color: "#1ABC9C",
    fontWeight: "600",
  },
  pastStatusText: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "600",
  },
  cancelledStatusText: {
    fontSize: 12,
    color: "#ff6b6b",
    fontWeight: "600",
  },
  archivedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 188, 156, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  archivedButtonText: {
    color: "#1ABC9C",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default UserBookingsScreen;
