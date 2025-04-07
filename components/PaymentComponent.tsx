import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useStripePayment } from "@/lib/stripeService";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import { createBooking } from "@/lib/bookingService";

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
  const { rawUser } = useGlobalContext();
  const { handlePayment } = useStripePayment();

  const initiatePayment = async () => {
    // Check if user is logged in
    if (!rawUser) {
      Alert.alert("Login Required", "Please log in to make a payment");
      router.replace("/login");
      return;
    }

    setLoading(true);

    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      const result = await handlePayment({
        amount: amountInCents,
        currency: "usd", // Change as needed
        packageId,
        customerEmail: rawUser.email,
        customerName: rawUser.name,
        description: `Payment for ${packageName}`,
      });

      if (result.success) {
        // Create a booking record in Appwrite
        try {
          // Calculate checkout date based on default 7-day stay
          const checkInDate = new Date(
            Date.now() + 6 * 24 * 60 * 60 * 1000
          ).toISOString();
          const checkOutDate = new Date(
            Date.now() + 8 * 48 * 60 * 60 * 1000
          ).toISOString();

          // Generate a transaction ID if none is provided in the result
          const transactionId = "stripe_" + Date.now(); // Simple unique ID

          // Create booking
          const bookingResult = await createBooking(
            rawUser.$id, // Make sure this is the correct user ID
            packageId,
            amount,
            transactionId,
            checkInDate,
            checkOutDate,
            guessCount
          );

          // Call onSuccess callback if provided
          onSuccess && onSuccess();

          // Navigate to booking details or bookings list without allowing back navigation
          if (bookingResult && bookingResult.$id) {
            // Navigate to the specific booking details
            router.replace(`/bookingConfirmation`);
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
        onCancel && onCancel();
      }
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Booking</Text>
      <Text style={styles.amount}>${amount.toFixed(2)}</Text>

      <TouchableOpacity
        style={styles.payButton}
        onPress={initiatePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.payButtonText}>Buy Now</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.secureText}>Payments are secure and encrypted</Text>
    </View>
  );
};

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
  payButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  payButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  secureText: {
    fontSize: 12,
    color: "#95A5A6",
    textAlign: "center",
  },
});

export default PaymentComponent;
