import { useStripe } from "@stripe/stripe-react-native";
import { Alert } from "react-native";

// Your backend API endpoint for creating payment intents
const API_URL = "http://192.168.4.71:4000";

interface PaymentMethodParams {
  type: string;
  billingDetails: {
    email: string;
    name: string;
  };
}

interface PaymentOptions {
  amount: number; // Amount in cents (e.g., 2000 for $20.00)
  currency: string; // 'usd', 'eur', etc.
  packageId: string; // ID of the package being purchased
  customerEmail: string;
  customerName: string;
  description?: string;
}

/**
 * Create a payment intent with Stripe
 * This function communicates with your backend to create a payment intent
 */
export const createPaymentIntent = async (options: PaymentOptions) => {
  try {
    const response = await fetch(`${API_URL}/create-payment-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: options.amount,
        currency: options.currency,
        packageId: options.packageId,
        email: options.customerEmail,
        name: options.customerName,
        description:
          options.description || `Payment for package ${options.packageId}`,
      }),
    });

    const { clientSecret, error } = await response.json();

    if (error) {
      console.log("Error creating payment intent:", error);
      throw new Error(error.message);
    }

    return clientSecret;
  } catch (error) {
    console.log("Failed to create payment intent:", error);
    throw error;
  }
};

/**
 * Hook for handling Stripe payments in components
 */
export const useStripePayment = () => {
  const stripe = useStripe();

  const handlePayment = async (options: PaymentOptions) => {
    try {
      // 1. Create a payment intent on your backend
      const clientSecret = await createPaymentIntent(options);

      if (!clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      // 2. Confirm the payment with the payment sheet
      const { error: paymentSheetError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Roambii Travel",
        // customerId: options.customerEmail, // Optional
        // customerEphemeralKeySecret: "", // Get this from your backend if using Customer objects
        defaultBillingDetails: {
          name: options.customerName,
          email: options.customerEmail,
        },
      });

      if (paymentSheetError) {
        throw new Error(paymentSheetError.message);
      }

      // 3. Present the payment sheet to the user
      const { error: presentError } = await stripe.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          return { success: false, canceled: true };
        }
        throw new Error(presentError.message);
      }

      // Payment successful
      return { success: true };
    } catch (error: any) {
      // Handle errors
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        error.message || "Something went wrong with your payment"
      );
      return { success: false, error };
    }
  };

  return { handlePayment };
};
