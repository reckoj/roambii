import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { useStripePayment } from "@/lib/stripeService";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import { createBooking } from "@/lib/booking-service";
import {
  Lock,
  ArrowLeft,
  CreditCard,
  HelpCircle,
  Check,
  DeleteIcon,
  X,
} from "lucide-react-native";

interface PaymentComponentProps {
  packageId: string;
  packageName: string;
  guessCount: number;
  amount: number; // Amount in dollars (will be converted to cents)
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PaymentComponent: React.FC<PaymentComponentProps> = ({
  packageId,
  packageName,
  amount,
  guessCount,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { rawUser } = useGlobalContext();
  const { handlePayment } = useStripePayment();

  // Calculate taxes and totals
  const subtotal = amount;
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
    onCancel && onCancel();
  };

  const initiatePayment = async () => {
    if (!termsAccepted) {
      Alert.alert(
        "Terms & Conditions",
        "Please accept the terms and conditions to proceed"
      );
      return;
    }

    // Validate user data
    if (!rawUser) {
      console.error("No user data available");
      Alert.alert(
        "Authentication Error",
        "Please log in to make a booking"
      );
      router.replace("/login");
      return;
    }

    if (!rawUser.id) {
      console.error("User ID is missing:", rawUser);
      Alert.alert(
        "Authentication Error",
        "User ID is missing. Please try logging in again."
      );
      router.replace("/login");
      return;
    }

    // Validate package data
    if (!packageId) {
      console.error("Package ID is missing");
      Alert.alert(
        "Booking Error",
        "Package information is missing. Please try again."
      );
      return;
    }

    // Validate amount
    if (!amount || isNaN(amount)) {
      console.error("Invalid amount:", amount);
      Alert.alert(
        "Booking Error",
        "Invalid package amount. Please try again."
      );
      return;
    }

    setLoading(true);

    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(total * 100);

      console.log("Payment details:", {
        userId: rawUser.id,
        packageId,
        amount: amountInCents,
        email: rawUser.email,
        name: rawUser.name
      });

      const result = await handlePayment({
        amount: amountInCents,
        currency: "usd",
        packageId,
        customerEmail: rawUser.email!,
        customerName: rawUser.name!,
        description: `Payment for ${packageName}`,
      });

      if (result.success) {
        try {
          // Use package dates if available, otherwise calculate default dates
          const now = new Date();
          const checkInDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
          const checkOutDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

          // Generate a transaction ID
          const transactionId = "stripe_" + Date.now();

          // Create booking with proper Firestore references
          const bookingData = {
            userId: rawUser.id,
            packageId: packageId,
            amount: total,
            transactionId,
            checkInDate: checkInDate.toISOString(),
            checkOutDate: checkOutDate.toISOString(),
            guestCount: guessCount,
            status: "confirmed",
            paymentStatus: "paid",
            paymentMethod: "stripe",
            bookingReference: `BK${Date.now().toString(36).toUpperCase()}`,
            packageDetails: {
              name: packageName || "Package",
              type: "Villa",
              price: total,
              guestCount: guessCount,
              description: "Package booking"
            }
          };

          // Add detailed debugging logs
          console.log("=== DEBUG: Booking Data ===");
          console.log("Raw User:", {
            id: rawUser.id,
            email: rawUser.email,
            name: rawUser.name
          });
          console.log("Package Info:", {
            id: packageId,
            name: packageName,
            amount: total,
            guestCount: guessCount
          });
          console.log("Dates:", {
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString()
          });
          console.log("Full Booking Data:", JSON.stringify(bookingData, null, 2));
          console.log("=== End Debug ===");

          // Type-safe validation of required fields
          type BookingDataKey = keyof typeof bookingData;
          const requiredFields: BookingDataKey[] = ['userId', 'packageId', 'amount', 'checkInDate', 'checkOutDate'];
          const missingFields = requiredFields.filter(field => !bookingData[field]);
          
          if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields);
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
          }

          // Ensure all data is properly defined before calling createBooking
          if (!bookingData.userId || !bookingData.packageId || !bookingData.amount) {
            throw new Error("Required booking data is missing");
          }

          console.log("Calling createBooking with data:", JSON.stringify(bookingData, null, 2));
          const bookingResult = await createBooking(bookingData);

          if (!bookingResult || !bookingResult.id) {
            throw new Error("Failed to create booking record");
          }

          // Close modal before navigation
          setShowFullModal(false);

          // Show success message
          Alert.alert(
            "Payment Successful",
            "Your booking has been confirmed!",
            [
              {
                text: "View Booking",
                onPress: () => {
                  // Navigate to booking confirmation with the booking ID
                  router.replace({
                    pathname: "/bookingConfirmation",
                    params: { 
                      id: bookingResult.id,
                      reset: "true"
                    }
                  });
                },
              },
            ]
          );

          // Call onSuccess callback if provided
          onSuccess && onSuccess();
        } catch (bookingError: any) {
          console.error("Error creating booking:", bookingError);
          Alert.alert(
            "Payment Processed",
            "Your payment was successful, but we encountered an issue saving your booking. Please contact support.",
            [
              {
                text: "Contact Support",
                onPress: () => {
                  // Navigate to support or open email
                  Linking.openURL("mailto:support@roambii.com");
                },
              },
            ]
          );
        }
      } else if (result.canceled) {
        console.log("Payment was canceled by user");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        error.message || "There was a problem processing your payment. Please try again."
      );
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Booking</Text>
      <Text style={styles.amount}>${total.toFixed(2)}</Text>

      <TouchableOpacity
        style={styles.checkoutButton}
        onPress={openPaymentModal}
      >
        <View style={styles.checkoutButtonContent}>
          <Lock color="white" size={16} />
          <Text style={styles.checkoutButtonText}>CHECKOUT SECURELY</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.secureText}>Payments are secure and encrypted</Text>

      {/* Full Screen Payment Modal */}
      <Modal visible={showFullModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ width: 24 }} />
            <Text style={styles.modalTitle}>Checkout</Text>
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
                  Click the checkout button below to enter your card details
                  securely via Stripe.
                </Text>
              </View>
            </View>

            {/* Order Summary Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemName}>{packageName}</Text>
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
                  <Text style={styles.totalText}>Total</Text>
                  <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Terms & Conditions Section */}
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

            {/* Checkout Button */}
            <TouchableOpacity
              style={[
                styles.payButton,
                !termsAccepted && styles.disabledButton,
              ]}
              onPress={initiatePayment}
              disabled={loading || !termsAccepted}
            >
              {loading ? (
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

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: 8,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#34495E",
    textAlign: "center",
  },
  amount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1ABC9C",
    textAlign: "center",
    marginBottom: 24,
  },
  checkoutButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  checkoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  secureText: {
    fontSize: 12,
    color: "#95A5A6",
    textAlign: "center",
  },

  // Modal Styles
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

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495E",
    marginBottom: 12,
  },

  // Payment Method Styles
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

  // Summary Styles
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
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495E",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1ABC9C",
  },

  // Terms Section
  termsSection: {
    marginBottom: 24,
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

  // Payment Button
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

  // Legal Links
  legalLinksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 16,
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

  // Security Badge
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

export default PaymentComponent;
