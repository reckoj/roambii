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
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getPackageById } from "@/lib/appwrite";
import CustomHeader from "@/components/HeaderComponent";
import { Check, Calendar, Users, MapPin } from "lucide-react-native";

const BookingConfirmationScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackage = async () => {
      if (id) {
        try {
          const data = await getPackageById(id);
          setPackageData(data);
        } catch (error) {
          console.error("Error fetching package:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);

  // Generate a random booking reference
  const bookingReference = React.useMemo(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  const handleViewBookings = () => {
    router.push("/userBookings");
  };

  const handleBackToHome = () => {
    router.replace("/");
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1">
        {/* <CustomHeader title="Booking Confirmed" showBackButton={false} /> */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      {/* <CustomHeader title="Booking Confirmed" showBackButton={false} /> */}

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

            {packageData && (
              <View style={styles.packageInfo}>
                <Image
                  source={{ uri: packageData.image }}
                  style={styles.packageImage}
                  resizeMode="cover"
                />

                <View style={styles.packageDetails}>
                  <Text style={styles.packageName}>{packageData.name}</Text>
                  <Text style={styles.packageType}>{packageData.type}</Text>

                  <View style={styles.infoRow}>
                    <MapPin size={16} color="#95A5A6" />
                    <Text style={styles.infoText}>
                      {packageData.roomType || "Standard Room"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Calendar size={16} color="#95A5A6" />
                    <Text style={styles.infoText}>
                      {formatDateTime(packageData?.checkInDate)}{" "}
                      {formatDateTime(packageData?.checkOutDate)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Users size={16} color="#95A5A6" />
                    <Text style={styles.infoText}>
                      {packageData.guessCount}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>Credit Card (Stripe)</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Amount Paid</Text>
              <Text style={styles.paymentValue}>
                ${packageData ? Math.round(packageData.price * 1.15) : "0"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <Text style={[styles.paymentValue, styles.successStatus]}>
                Paid
              </Text>
            </View>
          </View>

          <Text style={styles.infoNote}>
            A confirmation email has been sent to your registered email address.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {/* <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleViewBookings}
          >
            <Text style={styles.primaryButtonText}>View My Bookings</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#95A5A6",
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
  button: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#1ABC9C",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#1ABC9C",
    backgroundColor: "white",
  },
  secondaryButtonText: {
    color: "#1ABC9C",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default BookingConfirmationScreen;
