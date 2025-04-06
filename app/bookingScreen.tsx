import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getPackageById } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";
import PaymentComponent from "@/components/PaymentComponent";
import { ArrowLeft } from "lucide-react-native";

type BookingParams = {
  id: string; // Package ID
  startDate?: string;
  endDate?: string;
  guests?: string;
};

const BookingScreen = () => {
  const { id, startDate, endDate, guests } =
    useLocalSearchParams<BookingParams>();
  const { rawUser } = useGlobalContext();
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Default values
  const guestCount = parseInt(guests || "1", 10);
  const bookingStartDate = startDate || new Date().toISOString().split("T")[0];
  const bookingEndDate =
    endDate ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  useEffect(() => {
    if (!id) {
      Alert.alert("Error", "Package ID is required");
      router.back();
      return;
    }

    const fetchPackage = async () => {
      try {
        const data = await getPackageById(id);
        if (data) {
          setPackageData(data);
        } else {
          Alert.alert("Error", "Package not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching package:", error);
        Alert.alert("Error", "Failed to load package information");
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);

  const handlePaymentSuccess = () => {
    // Navigate to booking confirmation screen or show success message
    router.push({
      pathname: "/bookingConfirmation",
      params: { id },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Complete Booking" />

      <ScrollView style={styles.content}>
        {/* Package Summary */}
        <View style={styles.packageSummary}>
          <Image
            source={{ uri: packageData?.image }}
            style={styles.packageImage}
            resizeMode="cover"
          />

          <View style={styles.packageDetails}>
            <Text style={styles.packageName}>{packageData?.name}</Text>
            <Text style={styles.packageType}>{packageData?.type}</Text>
            <Text style={styles.packagePrice}>${packageData?.price}</Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.bookingDetails}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Check-in</Text>
            <Text style={styles.detailValue}>
              {new Date(bookingStartDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Check-out</Text>
            <Text style={styles.detailValue}>
              {new Date(bookingEndDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Guests</Text>
            <Text style={styles.detailValue}>{guestCount}</Text>
          </View>

          <View style={styles.divider} />

          {/* Price Breakdown */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package Price</Text>
            <Text style={styles.detailValue}>${packageData?.price}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Taxes & Fees</Text>
            <Text style={styles.detailValue}>
              ${Math.round(packageData?.price * 0.15)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ${Math.round(packageData?.price * 1.15)}
            </Text>
          </View>
        </View>

        {/* Payment Section */}
        <PaymentComponent
          packageId={id}
          packageName={packageData?.name}
          amount={Math.round(packageData?.price * 1.15)}
          onSuccess={handlePaymentSuccess}
          guessCount={4}
        />
      </ScrollView>
    </View>
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
  packageSummary: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  packageImage: {
    width: 80,
    height: 80,
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
  packagePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1ABC9C",
  },
  bookingDetails: {
    backgroundColor: "white",
    borderRadius: 8,
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: "#7F8C8D",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34495E",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495E",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1ABC9C",
  },
});

export default BookingScreen;
