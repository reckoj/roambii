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
import { firestore as db } from "@/lib/firebase/firebase-config";
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
import images from "@/constants/images";
import { useGlobalContext } from "@/lib/global-provider";

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
  travelerInfo?: {
    fullName: string;
    dateOfBirth?: string | null;
    email: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    passportNumber?: string;
    passportExpiryDate?: string | null;
  };
}

const BookingDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAgent } = useGlobalContext();

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id) {
        Alert.alert("Error", "Booking ID is required");
        router.back();
        return;
      }

      try {
        setLoading(true);

        // Fetch booking from users_bookings collection
        const bookingRef = doc(db, "users_bookings", id);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          throw new Error("Booking not found");
        }

        const bookingData = bookingSnap.data();

        // If there's a packageId, fetch the package details
        let packageDetails = null;
        if (bookingData.packageId) {
          try {
            const packageRef = doc(db, "packages", bookingData.packageId);
            const packageSnap = await getDoc(packageRef);
            if (packageSnap.exists()) {
              packageDetails = { id: packageSnap.id, ...packageSnap.data() };
            }
          } catch (e) {
            console.error("Error fetching package details:", e);
          }
        }

        // Determine if booking is active
        const now = new Date();
        let isActive = false;
        try {
          const checkOutDate = new Date(bookingData.checkOutDate);
          isActive = checkOutDate >= now;
        } catch (e) {
          console.error("Error parsing date:", e);
        }

        // Create a properly typed booking detail object
        const bookingDetail: BookingDetail = {
          id: bookingSnap.id,
          userId: bookingData.userId || "",
          packageId: bookingData.packageId || "",
          packageInfoId: bookingData.packageInfoId,
          packageDetails: packageDetails,
          amount: bookingData.amount || 0,
          status: bookingData.status || "completed",
          bookingReference: bookingData.bookingReference || "",
          bookingDate: bookingData.bookingDate || new Date().toISOString(),
          checkInDate: bookingData.checkInDate,
          checkOutDate: bookingData.checkOutDate,
          guestCount: bookingData.guestCount || 1,
          transactionId: bookingData.transactionId || "",
          paymentMethod: bookingData.paymentMethod || "card",
          isActive: isActive,
          metadata: bookingData.metadata,
          createdAt: bookingData.createdAt,
          updatedAt: bookingData.updatedAt,
          travelerInfo: bookingData.travelerInfo || null,
        };

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
        }\nCheck-in: ${formatDateTime(
          booking.checkInDate
        )}\nCheck-out: ${formatDateTime(booking.checkOutDate)}`,
        title: "My Travel Booking",
      });
    } catch (error) {
      console.error("Error sharing booking:", error);
    }
  };

  const renderTravelerInfo = () => {
    if (!isAgent || !booking?.travelerInfo) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Traveler Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Full Name:</Text>
          <Text style={styles.detailValue}>{booking.travelerInfo.fullName || "Not provided"}</Text>
        </View>
        
        {booking.travelerInfo.dateOfBirth && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date of Birth:</Text>
            <Text style={styles.detailValue}>{formatDateTime(booking.travelerInfo.dateOfBirth)}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{booking.travelerInfo.email || "Not provided"}</Text>
        </View>
        
        {booking.travelerInfo.phoneNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{booking.travelerInfo.phoneNumber}</Text>
          </View>
        )}
        
        {booking.travelerInfo.address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>
              {[
                booking.travelerInfo.address,
                booking.travelerInfo.city,
                booking.travelerInfo.state,
                booking.travelerInfo.zipCode,
                booking.travelerInfo.country
              ].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
        
        {booking.travelerInfo.passportNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Passport:</Text>
            <Text style={styles.detailValue}>
              {booking.travelerInfo.passportNumber}
              {booking.travelerInfo.passportExpiryDate ? 
                ` (Expires: ${formatDateTime(booking.travelerInfo.passportExpiryDate)})` : 
                ""}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Booking Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Booking Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="Booking Details"
        showBackButton={true}
        rightIcon={<Share2 size={22} color="#1ABC9C" />}
        onRightIconPress={handleShareBooking}
      />

      <ScrollView style={styles.content}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            booking.isActive
              ? styles.activeStatusBanner
              : styles.pastStatusBanner,
          ]}
        >
          {booking.isActive ? (
            <CheckCircle size={20} color="#FFFFFF" />
          ) : (
            <Clock size={20} color="#FFFFFF" />
          )}
          <Text style={styles.statusText}>
            {booking.isActive ? "Active Booking" : "Past Booking"}
          </Text>
        </View>

        {/* Package Information */}
        <View style={styles.packageCard}>
          {booking.packageDetails?.image ? (
            <Image
              source={{ uri: booking.packageDetails.image }}
              style={styles.packageImage}
              resizeMode="cover"
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
              Booked on {formatDateTime(booking.bookingDate)}
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
                {formatDateTime(booking.checkInDate)}
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
                {formatDateTime(booking.checkOutDate)}
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

          {booking.packageDetails?.allinclusive && (
            <View style={styles.inclusiveTag}>
              <Text style={styles.inclusiveText}>All-Inclusive Package</Text>
            </View>
          )}
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
              <View style={styles.paymentStatusDot} />
              <Text style={styles.paymentStatus}>
                {booking.status || "Completed"}
              </Text>
            </View>
          </View>
        </View>

        {renderTravelerInfo()}

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
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For any inquiries about this booking, please contact our customer
            support.
          </Text>
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
    backgroundColor: "#1ABC9C",
  },
  pastStatusBanner: {
    backgroundColor: "#95A5A6",
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
  inclusiveTag: {
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  inclusiveText: {
    fontSize: 14,
    color: "#1ABC9C",
    fontWeight: "500",
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
    backgroundColor: "#1ABC9C",
    marginRight: 6,
  },
  paymentStatus: {
    fontSize: 14,
    color: "#1ABC9C",
    fontWeight: "500",
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
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#95A5A6",
    textAlign: "center",
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 16,
  },
});

export default BookingDetailsScreen;
