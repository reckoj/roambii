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

/**192.168.4.112
 * Hook for handling Stripe payments in components
 */
export const useStripePayment = () => {
  const stripe = useStripe();

  const handlePayment = async (options: PaymentOptions) => {
    try {
      console.log("Starting payment process with options:", {
        amount: options.amount,
        currency: options.currency,
        packageId: options.packageId,
        customerEmail: options.customerEmail,
        customerName: options.customerName,
      });

      console.log("Environment variable EXPO_PUBLIC_BACKEND_API:", process.env.EXPO_PUBLIC_BACKEND_API);
      console.log("Making request to:", `${process.env.EXPO_PUBLIC_BACKEND_API}/create-payment-intent`);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - server may be unreachable')), 30000)
      );

      // Get Payment Intent from local server with timeout
      const fetchPromise = fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_API}/create-payment-intent`,
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

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log("Payment intent response:", responseData);

      const { clientSecret, error } = responseData;

      if (error) {
        console.error("Payment intent creation error:", error);
        throw new Error(error.message);
      }

      if (!clientSecret) {
        console.error("No client secret received from server");
        throw new Error("No client secret received from server");
      }

      console.log("Initializing payment sheet...");

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
        console.error("Payment sheet initialization error:", initError);
        throw new Error(initError.message);
      }

      console.log("Presenting payment sheet...");

      // Present the payment sheet
      const { error: presentError } = await stripe.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          console.log("Payment was canceled by user");
          return { success: false, canceled: true };
        }
        console.error("Payment sheet presentation error:", presentError);
        throw new Error(presentError.message);
      }

      console.log("Payment completed successfully!");

      // Payment successful
      return { success: true };
    } catch (error: any) {
      console.error("Payment error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      Alert.alert(
        "Payment Failed",
        error.message || "Something went wrong with your payment"
      );
      return { success: false, error };
    }
  };

  return { handlePayment };
};
