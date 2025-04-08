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
  Alert,
  SafeAreaView,
  Linking,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getPackageById } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useStripePayment } from "@/lib/stripeService";
import { createBooking } from "@/lib/bookingService";
import CustomHeader from "@/components/HeaderComponent";
import {
  Lock,
  CreditCard,
  HelpCircle,
  Check,
  X,
  Calendar,
  MapPin,
  Users,
} from "lucide-react-native";
import images from "@/constants/images";

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
  const { handlePayment } = useStripePayment();
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States for payment
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  // Calculate taxes and totals based on package data
  const subtotal = packageData?.price || 0;
  const estimatedTax = Math.round(subtotal * 0.15 * 100) / 100;
  const total = subtotal + estimatedTax;

  const openPaymentModal = () => {
    // Check if user is logged in
    if (!rawUser) {
      Alert.alert("Login Required", "Please log in to make a payment");
      router.replace("/login");
      return;
    }

    setShowFullModal(true);
  };

  const closePaymentModal = () => {
    setShowFullModal(false);
  };

  const initiatePayment = async () => {
    if (!termsAccepted) {
      Alert.alert(
        "Terms & Conditions",
        "Please accept the terms and conditions to proceed"
      );
      return;
    }

    setPaymentLoading(true);

    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(total * 100);

      const result = await handlePayment({
        amount: amountInCents,
        currency: "usd",
        packageId: id,
        customerEmail: rawUser?.email!,
        customerName: rawUser?.name!,
        description: `Payment for ${packageData?.name}`,
      });

      if (result.success) {
        // Create a booking record in Appwrite
        try {
          // Use either package data dates or defaults
          const checkInDate = packageData?.checkInDate || bookingStartDate;
          const checkOutDate = packageData?.checkOutDate || bookingEndDate;

          // Generate a transaction ID
          const transactionId = "stripe_" + Date.now();

          // Create booking
          const bookingResult = await createBooking(
            rawUser?.$id!,
            id,
            total, // Use the total amount including tax
            transactionId,
            checkInDate,
            checkOutDate,
            guestCount
          );

          // Close modal before navigation
          setShowFullModal(false);

          // Navigate to booking confirmation
          if (bookingResult && bookingResult.$id) {
            router.replace({
              pathname: "/bookingConfirmation",
              params: { id, reset: "true" },
            });
          }
        } catch (bookingError) {
          console.error("Error creating booking:", bookingError);
          Alert.alert(
            "Payment Processed",
            "Your payment was successful, but we encountered an issue saving your booking. Please contact support."
          );
        }
      } else if (result.canceled) {
        console.log("Payment was canceled by user");
      }
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        "There was a problem processing your payment. Please try again."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const openLegal = (type: string) => {
    let url = "";
    switch (type) {
      case "refund":
        url = "https://roambii.com/refund-policy";
        break;
      case "privacy":
        url = "https://roambii.com/privacy-policy";
        break;
      case "terms":
        url = "https://roambii.com/terms-of-service";
        break;
    }
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
            defaultSource={images.noResult}
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
            <View style={styles.detailLabelContainer}>
              <Calendar size={16} color="#7F8C8D" />
              <Text style={styles.detailLabel}>Check-in</Text>
            </View>
            <Text style={styles.detailValue}>
              {formatDateTime(packageData.checkInDate || bookingStartDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Calendar size={16} color="#7F8C8D" />
              <Text style={styles.detailLabel}>Check-out</Text>
            </View>
            <Text style={styles.detailValue}>
              {formatDateTime(packageData.checkOutDate || bookingEndDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Users size={16} color="#7F8C8D" />
              <Text style={styles.detailLabel}>Guests</Text>
            </View>
            <Text style={styles.detailValue}>
              {packageData.guessCount || guestCount}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Price Breakdown */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package Price</Text>
            <Text style={styles.detailValue}>${packageData?.price}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.taxRow}>
              <Text style={styles.detailLabel}>Taxes & Fees</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Estimated Tax",
                    "Final taxes will be calculated based on your billing address and applicable tax rates. The displayed amount is an estimate only."
                  )
                }
                style={styles.helpButton}
              >
                <HelpCircle size={16} color="#95A5A6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailValue}>${estimatedTax}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total}</Text>
          </View>
        </View>

        {/* Payment Button (Direct in the screen instead of a separate component) */}
        <View style={styles.paymentContainer}>
          <View style={styles.termsSection}>
            <TouchableOpacity
              style={styles.termsCheckbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted
                    ? styles.checkboxChecked
                    : styles.checkboxUnchecked,
                ]}
              >
                {termsAccepted && <Check size={16} color="white" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms & Conditions, Privacy Policy, and Refund
                Policy
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.checkoutButton,
              !termsAccepted && styles.checkoutButtonDisabled,
            ]}
            disabled={!termsAccepted || paymentLoading}
            onPress={initiatePayment}
          >
            {paymentLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.checkoutButtonContent}>
                <Lock color="white" size={16} />
                <Text style={styles.checkoutButtonText}>PAY ${total}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.secureText}>
            Payments are secure and encrypted
          </Text>

          {/* Legal Links */}
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity onPress={() => openLegal("refund")}>
              <Text style={styles.legalLink}>Refund Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => openLegal("privacy")}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => openLegal("terms")}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Full Screen Payment Modal (if we need a separate screen for payment form) */}
      <Modal visible={showFullModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ width: 24 }} />
            <Text style={styles.modalTitle}>Complete Payment</Text>
            <TouchableOpacity
              onPress={closePaymentModal}
              style={styles.backButton}
            >
              <X size={24} color="#34495E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Payment Method Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodHeader}>
                  <CreditCard size={20} color="#1ABC9C" />
                  <Text style={styles.paymentMethodTitle}>
                    Credit / Debit Card
                  </Text>
                </View>
                <Text style={styles.paymentMethodDescription}>
                  Complete your payment securely through our payment provider.
                </Text>
              </View>
            </View>

            {/* Order Summary Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemName}>
                    {packageData?.name}
                  </Text>
                  <Text style={styles.summaryItemPrice}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <View style={styles.taxRow}>
                    <Text style={styles.summaryItemName}>Estimated Tax</Text>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Estimated Tax",
                          "Final taxes will be calculated based on your billing address and applicable tax rates. The displayed amount is an estimate only."
                        )
                      }
                      style={styles.helpButton}
                    >
                      <HelpCircle size={16} color="#95A5A6" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.summaryItemPrice}>
                    ${estimatedTax.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.modalTotalText}>Total</Text>
                  <Text style={styles.modalTotalAmount}>
                    ${total.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Checkout Button (inside modal) */}
            <TouchableOpacity
              style={[
                styles.payButton,
                paymentLoading && styles.disabledButton,
              ]}
              onPress={initiatePayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <View style={styles.payButtonContent}>
                  <Lock color="white" size={20} />
                  <Text style={styles.payButtonText}>
                    PAY ${total.toFixed(2)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <Lock size={16} color="#95A5A6" />
              <Text style={styles.securityText}>
                Your payment is secure and encrypted
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  packageSummary: {
    flexDirection: "row",
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 16,
    color: "#7F8C8D",
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34495E",
  },
  taxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  helpButton: {
    marginLeft: 6,
    padding: 2,
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

  // Payment container (direct on screen)
  paymentContainer: {
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
  termsSection: {
    marginBottom: 16,
  },
  termsCheckbox: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxUnchecked: {
    borderWidth: 1,
    borderColor: "#95A5A6",
    backgroundColor: "white",
  },
  checkboxChecked: {
    backgroundColor: "#1ABC9C",
    borderWidth: 0,
  },
  termsText: {
    fontSize: 14,
    color: "#34495E",
    flex: 1,
  },
  checkoutButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  checkoutButtonDisabled: {
    backgroundColor: "#A5D6CD",
  },
  checkoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  secureText: {
    fontSize: 12,
    color: "#95A5A6",
    textAlign: "center",
    marginBottom: 16,
  },
  legalLinksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  legalLink: {
    fontSize: 12,
    color: "#34495E",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 12,
    color: "#95A5A6",
    marginHorizontal: 8,
  },

  // Modal styles for payment screen (if needed)
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495E",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  paymentMethodCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34495E",
    marginLeft: 8,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryItemName: {
    fontSize: 14,
    color: "#34495E",
  },
  summaryItemPrice: {
    fontSize: 14,
    color: "#34495E",
    fontWeight: "500",
  },
  payButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: "#A5D6CD",
  },
  payButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalTotalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495E",
  },
  modalTotalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1ABC9C",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  securityText: {
    fontSize: 12,
    color: "#95A5A6",
    marginLeft: 6,
  },
});

export default BookingScreen;
