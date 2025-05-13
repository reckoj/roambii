import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { firestore, COLLECTIONS } from "@/lib/firebase/firebase-config";
import CustomHeader from "@/components/HeaderComponent";
import {
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Clock,
  Share2,
  ChevronRight,
  CheckCircle,
  XCircle,
  Plane,
  Download,
  ArrowLeft,
  Building,
  Home,
} from "lucide-react-native";
import { cancelBooking } from "@/lib/booking-service";

interface BookingDetail {
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
  transactionId: string;
  paymentMethod: string;
  isActive?: boolean;
  metadata?: string;
  createdAt?: string;
  updatedAt?: string;
}

const BookingDetailsScreen = () => {
  // Using new Expo Router convention - no need for destructuring useLocalSearchParams
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id) {
        Alert.alert("Error", "Booking ID is required");
        router.back();
        return;
      }

      try {
        setLoading(true);

        // Fetch booking from Firestore
        const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, id);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          throw new Error("Booking not found");
        }

        const bookingData = bookingSnap.data();

        // If there's a packageId, fetch the package details
        let packageDetails = null;
        if (bookingData.packageId) {
          try {
            const packageRef = doc(firestore, COLLECTIONS.PACKAGES, bookingData.packageId);
            const packageSnap = await getDoc(packageRef);
            if (packageSnap.exists()) {
              packageDetails = packageSnap.data();
              console.log("Fetched package details:", packageDetails);
            }
          } catch (e) {
            console.error("Error fetching package details:", e);
          }
        }
        
        // Ensure we have proper packageDetails with image
        let finalPackageDetails = bookingData.packageDetails || packageDetails;
        
        // Check if we need to extract image from embedded fields
        if (finalPackageDetails) {
          // Ensure it has either image or banner_image
          if (!finalPackageDetails.image && !finalPackageDetails.banner_image) {
            // Look in standard places for image data
            if (finalPackageDetails.image_url) {
              finalPackageDetails.image = finalPackageDetails.image_url;
            } else if (finalPackageDetails.banner_image_url) {
              finalPackageDetails.banner_image = finalPackageDetails.banner_image_url;
            } else if (finalPackageDetails.coverImage) {
              finalPackageDetails.image = finalPackageDetails.coverImage;
            }
          }
        }

        // Determine if booking is active based on date and status
        const now = new Date();
        let isActive = false;
        try {
          // First try to get dates from package details if available
          let checkOutDate = new Date();
          
          if (bookingData.packageDetails) {
            // Check for flight info dates (for trip packages)
            if (bookingData.packageDetails.flight_info && bookingData.packageDetails.flight_info.return_date) {
              checkOutDate = new Date(bookingData.packageDetails.flight_info.return_date);
            }
            // Fall back to check_out_date (for hotel packages)
            else if (bookingData.packageDetails.check_out_date) {
              checkOutDate = new Date(bookingData.packageDetails.check_out_date);
            }
          }
          
          // If package details don't have valid dates, try from the booking document
          if (isNaN(checkOutDate.getTime())) {
            if (bookingData.check_out_date) {
              if (typeof bookingData.check_out_date === "object" && bookingData.check_out_date.toDate) {
                checkOutDate = bookingData.check_out_date.toDate();
              } else {
                checkOutDate = new Date(bookingData.check_out_date);
              }
            } else if (bookingData.checkOutDate) {
              if (typeof bookingData.checkOutDate === "object" && bookingData.checkOutDate.toDate) {
                checkOutDate = bookingData.checkOutDate.toDate();
              } else {
                checkOutDate = new Date(bookingData.checkOutDate);
              }
            }
          }
          
          // Validate the date
          if (isNaN(checkOutDate.getTime())) {
            console.log(`Invalid checkOutDate for booking ${id}:`, bookingData.checkOutDate);
            checkOutDate = new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000); // Default to 2 days from now
          }
          
          // Determine if booking is active:
          // 1. It's not cancelled, AND 
          // 2. The checkout/return date is in the future OR it's today
          const isToday = (someDate: Date) => {
            const today = new Date();
            return someDate.getDate() === today.getDate() &&
              someDate.getMonth() === today.getMonth() &&
              someDate.getFullYear() === today.getFullYear();
          };
          
          isActive = (checkOutDate > now || isToday(checkOutDate)) && bookingData.status !== "cancelled";
          
          console.log(`Booking ${id} - checkOutDate: ${checkOutDate.toISOString()}, now: ${now.toISOString()}, isActive: ${isActive}, status: ${bookingData.status}`);
        } catch (e) {
          console.error("Error determining booking active status:", e);
        }

        // Create a properly typed booking detail object
        const bookingDetail: BookingDetail = {
          id: bookingSnap.id,
          userId: bookingData.userId || "",
          packageId: bookingData.packageId || "",
          packageInfoId: bookingData.packageInfoId,
          packageDetails: finalPackageDetails,
          amount: bookingData.amount || 0,
          status: bookingData.status || "confirmed",
          bookingReference: bookingData.bookingReference || `BKG-${bookingSnap.id.substring(0, 8).toUpperCase()}`,
          bookingDate: bookingData.bookingDate || new Date().toISOString(),
          checkInDate: bookingData.checkInDate || new Date().toISOString(),
          checkOutDate: bookingData.checkOutDate || new Date().toISOString(),
          guestCount: bookingData.guestCount || 1,
          transactionId: bookingData.transactionId || "",
          paymentMethod: bookingData.paymentMethod || "card",
          isActive: isActive,
          metadata: bookingData.metadata,
          createdAt: bookingData.createdAt,
          updatedAt: bookingData.updatedAt,
        };

        // Log the package details and image values
        console.log("Package Details:", JSON.stringify(bookingDetail.packageDetails, null, 2));
        console.log("Package Image:", bookingDetail.packageDetails?.image);
        console.log("Package Banner Image:", bookingDetail.packageDetails?.banner_image);

        setBooking(bookingDetail);
      } catch (error) {
        console.error("Error fetching booking details:", error);
        Alert.alert(
          "Error",
          "Failed to load booking details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id]);

  const handleShareBooking = async () => {
    if (!booking) return;

    try {
      await Share.share({
        message: `Check out my booking at ${
          booking.packageDetails?.name || "Roambii"
        }\n\nBooking Reference: ${
          booking.bookingReference
        }\nCheck-in: ${new Date(
          booking.checkInDate
        ).toLocaleDateString()}\nCheck-out: ${new Date(
          booking.checkOutDate
        ).toLocaleDateString()}`,
        title: "My Travel Booking",
      });
    } catch (error) {
      console.error("Error sharing booking:", error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!booking) return;

    // Confirm with user
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        {
          text: "No, Keep Booking",
          style: "cancel",
        },
        {
          text: "Yes, Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // Call the service function
              await cancelBooking(booking.id);

              // Update local state
              setBooking({
                ...booking,
                status: "cancelled",
                isActive: false,
              });

              Alert.alert("Success", "Your booking has been cancelled.");
            } catch (error) {
              console.error("Error handling booking cancellation:", error);
              Alert.alert(
                "Error",
                "Failed to cancel booking. Please try again."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Booking Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Booking Details" showBackButton={true} />
        <View style={styles.errorContainer}>
          <XCircle size={64} color="#E74C3C" />
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <Text style={styles.errorMessage}>
            We couldn't find the booking you're looking for.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Determine the correct status style
  const getStatusStyle = () => {
    if (booking.status === "cancelled") {
      return {
        banner: styles.cancelledStatusBanner,
        icon: <XCircle size={20} color="#FFFFFF" />,
        text: "Cancelled Booking",
      };
    } else if (booking.isActive) {
      return {
        banner: styles.activeStatusBanner,
        icon: <CheckCircle size={20} color="#FFFFFF" />,
        text: "Active Booking",
      };
    } else {
      return {
        banner: styles.pastStatusBanner,
        icon: <Clock size={20} color="#FFFFFF" />,
        text: "Past Booking",
      };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Booking Details"
        showBackButton={true}
        rightIcon={<Share2 size={22} color="#ffffff" />}
        onRightIconPress={handleShareBooking}
      />

      <ScrollView style={styles.content}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, statusStyle.banner]}>
          {statusStyle.icon}
          <Text style={styles.statusText}>{statusStyle.text}</Text>
        </View>

        {/* Package Information */}
        <View style={styles.packageCard}>
          {/* More comprehensive image source checking */}
          {booking?.packageDetails && (
            booking.packageDetails.image || 
            booking.packageDetails.banner_image || 
            booking.packageDetails.image_url ||
            booking.packageDetails.banner_image_url ||
            booking.packageDetails.coverImage
          ) ? (
            <Image
              source={{ 
                uri: booking.packageDetails.image || 
                     booking.packageDetails.banner_image ||
                     booking.packageDetails.image_url ||
                     booking.packageDetails.banner_image_url ||
                     booking.packageDetails.coverImage 
              }}
              style={styles.packageImage}
              resizeMode="cover"
              onError={(e) => {
                console.log("Image load error:", e.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Building size={48} color="#95A5A6" />
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}

          <View style={styles.packageDetails}>
            <Text style={styles.packageName}>
              {booking.packageDetails?.name || "Package Booking"}
            </Text>
            <Text style={styles.packageType}>
              {booking.packageDetails?.type || "Accommodation"}
            </Text>

            <View style={styles.infoRow}>
              <MapPin size={16} color="#7F8C8D" />
              <Text style={styles.infoText}>
                {booking.packageDetails?.roomType || "Standard Room"}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking Reference */}
        <View style={styles.referenceCard}>
          <Text style={styles.refTitle}>Booking Reference</Text>
          <Text style={styles.refNumber}>{booking.bookingReference}</Text>

          <View style={styles.bookingDateRow}>
            <Clock size={16} color="#7F8C8D" />
            <Text style={styles.bookingDateText}>
              Booked on {formatDate(booking.bookingDate)}
            </Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Stay Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color="#1ABC9C" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>
                {formatDate(booking.checkInDate)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color="#1ABC9C" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Check-out</Text>
              <Text style={styles.detailValue}>
                {formatDate(booking.checkOutDate)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Users size={20} color="#1ABC9C" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{booking.guestCount}</Text>
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Information</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount Paid</Text>
            <Text style={styles.paymentAmount}>${booking.amount}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>
              {booking.paymentMethod || "Credit Card"}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Transaction ID</Text>
            <Text style={styles.paymentValue}>{booking.transactionId}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Status</Text>
            <View style={styles.paymentStatusContainer}>
              <View
                style={[
                  styles.paymentStatusDot,
                  booking.status === "cancelled"
                    ? styles.cancelledStatusDot
                    : styles.confirmedStatusDot,
                ]}
              />
              <Text
                style={[
                  styles.paymentStatus,
                  booking.status === "cancelled"
                    ? styles.cancelledStatusText
                    : styles.confirmedStatusText,
                ]}
              >
                {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (booking.packageDetails?.$id) {
                router.push(`/properties/${booking.packageDetails.$id}`);
              } else {
                Alert.alert(
                  "Not Available",
                  "Property details are not available"
                );
              }
            }}
          >
            <View style={styles.actionContent}>
              <Home size={20} color="#1ABC9C" />
              <Text style={styles.actionText}>View Property</Text>
            </View>
            <ChevronRight size={20} color="#95A5A6" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareBooking}
          >
            <View style={styles.actionContent}>
              <Share2 size={20} color="#1ABC9C" />
              <Text style={styles.actionText}>Share Booking Details</Text>
            </View>
            <ChevronRight size={20} color="#95A5A6" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert("Coming Soon", "This feature will be available soon!")
            }
          >
            <View style={styles.actionContent}>
              <Download size={20} color="#1ABC9C" />
              <Text style={styles.actionText}>
                Download Booking Confirmation
              </Text>
            </View>
            <ChevronRight size={20} color="#95A5A6" />
          </TouchableOpacity>

          {/* Only show cancel button if booking is active and not already cancelled */}
          {booking.isActive && booking.status !== "cancelled" && (
            <>
              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCancelBooking}
              >
                <View style={styles.actionContent}>
                  <XCircle size={20} color="#E74C3C" />
                  <Text style={[styles.actionText, { color: "#E74C3C" }]}>
                    Cancel Booking
                  </Text>
                </View>
                <ChevronRight size={20} color="#95A5A6" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Show cancellation notice if the booking is cancelled */}
        {booking.status === "cancelled" && (
          <View style={styles.cancellationNotice}>
            <XCircle size={24} color="#E74C3C" />
            <Text style={styles.cancellationText}>
              This booking has been cancelled
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For any inquiries about this booking, please contact our customer
            support.
          </Text>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495E",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1ABC9C",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  activeStatusBanner: {
    backgroundColor: "#1ABC9C", // Green for active
  },
  pastStatusBanner: {
    backgroundColor: "#95A5A6", // Gray for past
  },
  cancelledStatusBanner: {
    backgroundColor: "#E74C3C", // Red for cancelled
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  packageCard: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  packageImage: {
    width: "100%",
    height: 180,
  },
  noImageContainer: {
    width: "100%",
    height: 180,
    backgroundColor: "#F1F2F6",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    color: "#95A5A6",
    marginTop: 8,
  },
  packageDetails: {
    padding: 16,
  },
  packageName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 4,
  },
  packageType: {
    fontSize: 16,
    color: "#7F8C8D",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginLeft: 8,
  },
  referenceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  refTitle: {
    fontSize: 14,
    color: "#95A5A6",
    marginBottom: 4,
  },
  refNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1ABC9C",
    marginBottom: 12,
  },
  bookingDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookingDateText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginLeft: 8,
  },
  detailsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#95A5A6",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: "#34495E",
  },
  paymentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  paymentValue: {
    fontSize: 14,
    color: "#34495E",
    fontWeight: "500",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1ABC9C",
  },
  paymentStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confirmedStatusDot: {
    backgroundColor: "#1ABC9C",
  },
  cancelledStatusDot: {
    backgroundColor: "#E74C3C",
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  confirmedStatusText: {
    color: "#1ABC9C",
  },
  cancelledStatusText: {
    color: "#E74C3C",
  },
  actionsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    color: "#34495E",
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F2F6",
    marginHorizontal: 8,
  },
  cancellationNotice: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cancellationText: {
    color: "#E74C3C",
    fontWeight: "500",
    fontSize: 16,
    marginLeft: 10,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#95A5A6",
    textAlign: "center",
  },
});

export default BookingDetailsScreen;
