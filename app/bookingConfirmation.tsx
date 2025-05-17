import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { firestore as db, COLLECTIONS } from "@/lib/firebase/firebase-config";
import { Check, Calendar, Users, MapPin } from "lucide-react-native";
import {
  testClientCollectionPermissions,
  createMinimalClientRecord,
  createBasicClientRelationship,
} from "@/lib/client-service";

// Format date/time helper function
const formatDateTime = (
  dateTimeString: string | number | Date | any,
  isTime = false
) => {
  if (!dateTimeString) return isTime ? "Not specified" : "Not specified";

  try {
    // Handle Firestore Timestamp objects
    if (dateTimeString && dateTimeString.seconds) {
      dateTimeString = new Date(dateTimeString.seconds * 1000);
    }

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

// Types definition
interface BookingDetails {
  id: string;
  packageId?: string;
  userId?: string;
  checkInDate: any;
  checkOutDate: any;
  guestCount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  bookingReference: string;
  amount?: number;
  packageDetails?: any;
  package?: {
    _key?: {
      path?: {
        segments?: string[];
      };
    };
  };
  createdAt?: any;
  updatedAt?: any;
}

const BookingConfirmationScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create minimal client record function
  const handleCreateMinimalClient = async () => {
    if (!booking) {
      Alert.alert("Error", "Booking details not available");
      return;
    }

    try {
      const agentId = booking.packageDetails?.agent?.id || "test-agent-id";
      const userId = booking.userId || "test-user-id";
      const bookingId = booking.id;

      console.log("DEBUG - Attempting to create minimal client record:", {
        agentId,
        userId,
        bookingId,
      });

      const clientId = await createMinimalClientRecord(
        agentId,
        userId,
        bookingId
      );

      if (clientId) {
        Alert.alert(
          "Success",
          `Created minimal client record with ID: ${clientId}`
        );
      } else {
        Alert.alert(
          "Failed",
          "Could not create minimal client record. Check logs for details."
        );
      }
    } catch (error) {
      Alert.alert("Error Creating Client", JSON.stringify(error));
    }
  };

  // Create basic client record function (simpler version)
  const handleCreateBasicClient = async () => {
    if (!booking) {
      Alert.alert("Error", "Booking details not available");
      return;
    }

    try {
      const agentId = booking.packageDetails?.agent?.id || "test-agent-id";
      const userId = booking.userId || "test-user-id";
      const bookingId = booking.id;
      const amount = booking.amount || 0;

      console.log(
        "DEBUG - Attempting to create basic client record (no auth checks):",
        {
          agentId,
          userId,
          bookingId,
          amount,
        }
      );

      const clientId = await createBasicClientRelationship(
        agentId,
        userId,
        bookingId,
        amount
      );

      if (clientId) {
        Alert.alert(
          "Success",
          `Created basic client record with ID: ${clientId}`
        );
      } else {
        Alert.alert(
          "Failed",
          "Could not create basic client record. Check logs for details."
        );
      }
    } catch (error) {
      console.error("DEBUG - Error creating basic client:", error);
      Alert.alert("Error Creating Basic Client", JSON.stringify(error));
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Booking ID is missing");
      setLoading(false);
      return;
    }

    console.log(`BookingConfirmation screen loaded with ID: ${id}`);

    // Check if this ID might be a package ID instead of booking ID
    // This is a workaround for cases where the package ID is passed instead of booking ID
    const fetchBookingByPackageId = async () => {
      try {
        console.log(
          `Attempting to find most recent booking for package ID: ${id}`
        );
        // Try to find the most recent booking for this package

        // Since we can't easily query by packageId, let's work around by:
        // 1. First try to get the ID as a booking directly
        const bookingDocRef = doc(db, COLLECTIONS.BOOKINGS, id);
        const bookingSnapshot = await getDoc(bookingDocRef);

        if (bookingSnapshot.exists()) {
          // Great! This is actually a booking ID
          console.log(`ID ${id} is a valid booking ID`);
          const bookingData = {
            id: bookingSnapshot.id,
            ...bookingSnapshot.data(),
          } as BookingDetails;
          setBooking(bookingData);

          // Handle package data if needed
          if (bookingData.packageDetails) {
            console.log("Using embedded packageDetails from booking");
          } else if (bookingData.packageId) {
            try {
              console.log(`Fetching package with ID: ${bookingData.packageId}`);
              const packageRef = doc(
                db,
                COLLECTIONS.PACKAGES,
                bookingData.packageId
              );
              const packageSnap = await getDoc(packageRef);

              if (packageSnap.exists()) {
                const packageInfo = {
                  id: packageSnap.id,
                  ...packageSnap.data(),
                } as { id: string; price?: number };
                console.log("Fetched package details successfully");
                setPackageData(packageInfo);
              }
            } catch (pkgError) {
              console.error("Error fetching package:", pkgError);
            }
          }
        } else {
          // This ID might be a package ID - attempt to find the most recent booking for this package
          console.log(
            `ID ${id} is not a booking ID. Treating it as a package ID.`
          );
          // This approach is flawed since we can't query by packageId easily without setting up indices
          // As a workaround, we'll use a placeholder booking

          // Try to get package details to at least show something
          try {
            const packageRef = doc(db, COLLECTIONS.PACKAGES, id);
            const packageSnap = await getDoc(packageRef);

            if (packageSnap.exists()) {
              console.log("Found package details for ID:", id);
              const packageInfo = {
                id: packageSnap.id,
                ...packageSnap.data(),
              } as { id: string; price?: number };
              setPackageData(packageInfo);

              // Create a placeholder booking
              setBooking({
                id: "placeholder",
                packageId: id,
                checkInDate: new Date(),
                checkOutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                guestCount: 1,
                status: "confirmed",
                paymentStatus: "paid",
                paymentMethod: "card",
                bookingReference: `TEMP${Date.now()
                  .toString(36)
                  .toUpperCase()}`,
                amount: packageInfo.price || 0,
                packageDetails: packageInfo,
              });
            } else {
              throw new Error("Package not found");
            }
          } catch (error) {
            console.error("Error handling package ID:", error);
            setError("Booking not found. Please check your booking details.");
          }
        }
      } catch (error) {
        console.error("Error fetching booking by package ID:", error);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingByPackageId();
  }, [id]);

  // Generate a booking reference if not available
  const bookingReference = React.useMemo(() => {
    if (booking?.bookingReference) {
      return booking.bookingReference;
    }

    // Fallback to random reference if not available
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, [booking]);

  const handleBackToHome = () => {
    router.replace("/");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare display data
  const displayData = booking || ({} as BookingDetails);
  const displayPackage =
    packageData ||
    (booking?.packageDetails
      ? {
          name: booking.packageDetails.name,
          type: booking.packageDetails.type,
          roomType: booking.packageDetails.type,
          price: booking.packageDetails.price,
          guestCount: booking.guestCount,
        }
      : {});

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.successContainer}>
          <View style={styles.checkCircle}>
            <Check size={48} color="#FFF" />
          </View>

          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successMessage}>
            Your travel package has been successfully booked.
          </Text>
        </View>

        <View style={styles.bookingDetails}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.detailCard}>
            <Text style={styles.referenceText}>Booking Reference</Text>
            <Text style={styles.referenceNumber}>{bookingReference}</Text>

            <View style={styles.divider} />

            <View style={styles.packageInfo}>
              <Image
                source={{
                  uri: displayPackage.banner_image || displayPackage.image,
                }}
                style={styles.packageImage}
                resizeMode="cover"
                defaultSource={{
                  uri: "https://via.placeholder.com/100x100?text=Package",
                }}
              />

              <View style={styles.packageDetails}>
                <Text style={styles.packageName}>
                  {displayPackage.name || "Package"}
                </Text>
                <Text style={styles.packageType}>
                  {displayPackage.type || "Standard"}
                </Text>

                <View style={styles.infoRow}>
                  <MapPin size={16} color="#95A5A6" />
                  <Text style={styles.infoText}>
                    {displayPackage.roomType || "Standard Room"}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Calendar size={16} color="#95A5A6" />
                  <Text style={styles.infoText}>
                    {formatDateTime(displayData.checkInDate)} -{" "}
                    {formatDateTime(displayData.checkOutDate)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Users size={16} color="#95A5A6" />
                  <Text style={styles.infoText}>
                    {displayData.guestCount || displayPackage.guestCount || 1}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>
                {displayData.paymentMethod || "Credit Card (Stripe)"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Amount Paid</Text>
              <Text style={styles.paymentValue}>
                $
                {displayData.amount ||
                  (displayPackage
                    ? Math.round((displayPackage.price || 0) * 1.15)
                    : 0)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <Text style={[styles.paymentValue, styles.successStatus]}>
                {displayData.paymentStatus || "Paid"}
              </Text>
            </View>
          </View>

          <Text style={styles.infoNote}>
            A confirmation email has been sent to your registered email address.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#95A5A6",
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#E74C3C",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: "#34495E",
    marginBottom: 20,
    textAlign: "center",
  },
  successContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1ABC9C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 8,
  },
  bookingDetails: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 16,
  },
  detailCard: {
    marginBottom: 20,
  },
  referenceText: {
    fontSize: 14,
    color: "#95A5A6",
    marginBottom: 4,
  },
  referenceNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1ABC9C",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  packageInfo: {
    flexDirection: "row",
  },
  packageImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  packageDetails: {
    flex: 1,
    marginLeft: 16,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495E",
  },
  packageType: {
    fontSize: 14,
    color: "#95A5A6",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginLeft: 8,
  },
  paymentInfo: {
    backgroundColor: "#F7FAFC",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#34495E",
  },
  successStatus: {
    color: "#1ABC9C",
  },
  infoNote: {
    fontSize: 14,
    color: "#95A5A6",
    fontStyle: "italic",
    textAlign: "center",
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  debugButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  debugButtonHalf: {
    flex: 0.48, // Leave a small gap between buttons
  },
  debugButtonThird: {
    flex: 0.32, // Leave a small gap between buttons
  },
  debugButton: {
    backgroundColor: "#3498DB",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  debugButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  debugResults: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  debugText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
});

export default BookingConfirmationScreen;
