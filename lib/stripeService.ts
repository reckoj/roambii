import { useStripe } from "@stripe/stripe-react-native";
import { Alert } from "react-native";
import { router } from "expo-router";

interface PaymentOptions {
  amount: number; // Amount in cents (e.g., 2000 for $20.00)
  currency: string; // 'usd', 'eur', etc.
  packageId: string; // ID of the package being purchased
  customerEmail: string;
  customerName: string;
  description?: string;
}

/**192.168.4.47
 * Hook for handling Stripe payments in components
 */
export const useStripePayment = () => {
  const stripe = useStripe();

  const handlePayment = async (options: PaymentOptions) => {
    try {
      // Get Payment Intent from local server
      const response = await fetch(
        "http://192.168.4.111:4000/create-payment-intent",
        {
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
            description: options.description,
          }),
        }
      );

      const { clientSecret, error } = await response.json();

      if (error) {
        throw new Error(error.message);
      }

      // Initialize the payment sheet
      const { error: initError } = await stripe.initPaymentSheet({
        merchantDisplayName: "Roambii Travel",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: options.customerName,
          email: options.customerEmail,
        },
        returnURL: "roambii://stripe-redirect",
        style: "automatic",
        appearance: {
          colors: {
            primary: "#1ABC9C",
          },
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present the payment sheet
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
