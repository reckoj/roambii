import React, { ReactElement } from "react";
import { StripeProvider as StripeProviderNative } from "@stripe/stripe-react-native";

// Replace with your publishable key from Stripe Dashboard
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_APPWRITE_STRIPE_PUBKEY!; // Replace with your actual key

interface StripeProviderProps {
  children: ReactElement | ReactElement[];
}

/**
 * Stripe Provider Component
 * Initializes Stripe and provides the StripeProvider context to child components
 */
const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <StripeProviderNative
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.roambii" // Required for Apple Pay
      urlScheme="roambii" // Required for 3D Secure and returning to the app
    >
      {children}
    </StripeProviderNative>
  );
};

export default StripeProvider;
