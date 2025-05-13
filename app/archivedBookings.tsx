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
  updateDoc,
} from "firebase/firestore";
import { firestore as db, COLLECTIONS } from "@/lib/firebase/firebase-config";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";
import { Calendar, MapPin, Archive } from "lucide-react-native";
import images from "@/constants/images";

// Reuse the same interfaces and helper functions from userBookings
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
  isArchived?: boolean;
}

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
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
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

const ArchivedBookingsScreen = () => {
  const { rawUser } = useGlobalContext();
  const [archivedBookings, setArchivedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArchivedBookings = useCallback(async () => {
    if (!rawUser?.id) {
      console.log("No user ID available:", rawUser);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);

      const bookingsQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where("userId", "==", rawUser.id),
        where("isArchived", "==", true)
      );

      const response = await getDocs(bookingsQuery);
      const processedBookings: Booking[] = await Promise.all(
        response.docs.map(async (doc) => {
          let packageDetails = null;
          try {
            if (doc.data().packageDetails) {
              packageDetails = doc.data().packageDetails;
            } else if (doc.data().packageId) {
              const packageRef = firestoreDoc(
                db,
                COLLECTIONS.PACKAGES,
                doc.data().packageId
              );
              const packageSnap = await getDoc(packageRef);
              if (packageSnap.exists()) {
                packageDetails = packageSnap.data();
              }
            }
          } catch (e) {
            console.error("Error fetching package:", e);
          }

          return {
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
            isActive: false,
            transactionId: doc.data().transactionId || "",
            paymentMethod: doc.data().paymentMethod || "stripe",
            metadata: doc.data().metadata,
            isCancelled: doc.data().status === "cancelled",
            statusDisplay:
              doc.data().status === "cancelled" ? "cancelled" : "past",
            isArchived: true,
          };
        })
      );

      setArchivedBookings(processedBookings);
    } catch (error) {
      console.error("Error fetching archived bookings:", error);
      Alert.alert("Error", "Failed to load archived bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rawUser]);

  useEffect(() => {
    fetchArchivedBookings();
  }, [fetchArchivedBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchArchivedBookings();
  };

  const handleUnarchive = async (bookingId: string) => {
    try {
      const bookingRef = firestoreDoc(db, COLLECTIONS.BOOKINGS, bookingId);
      await updateDoc(bookingRef, {
        isArchived: false,
      });

      // Remove from local state
      setArchivedBookings((prev) =>
        prev.filter((booking) => booking.id !== bookingId)
      );
    } catch (error) {
      console.error("Error unarchiving booking:", error);
      Alert.alert("Error", "Failed to unarchive booking");
    }
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const checkInDate = formatDateTime(item.checkInDate);
    const checkOutDate = formatDateTime(item.checkOutDate);

    return (
      <View style={[styles.bookingCard, styles.archivedCard]}>
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
          <Text style={styles.referenceValue}>{item.bookingReference}</Text>
        </View>

        <TouchableOpacity
          style={styles.unarchiveButton}
          onPress={() => handleUnarchive(item.id)}
        >
          <Archive size={16} color="#1ABC9C" />
          <Text style={styles.unarchiveButtonText}>Unarchive</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={images.noResult}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>No Archived Bookings</Text>
      <Text style={styles.emptyMessage}>
        Your archived bookings will appear here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Archived Bookings" showBackButton={true} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading archived bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={archivedBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
        />
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
  archivedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#95A5A6",
    opacity: 0.8,
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
  },
  unarchiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F2F6",
  },
  unarchiveButtonText: {
    color: "#1ABC9C",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
});

export default ArchivedBookingsScreen;
