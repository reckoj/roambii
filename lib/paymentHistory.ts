import { databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";

// Define interfaces for type safety
export interface Payment {
  $id: string;
  userId: string;
  packageId: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  packageDetails?: any; // This will hold package information if fetched
}

/**
 * Fetch payment history for a user
 * @param userId The user ID
 * @returns Array of payment records
 */
export const fetchPaymentHistory = async (
  userId: string
): Promise<Payment[]> => {
  try {
    // First, create a payments collection in Appwrite if you haven't already
    // This would typically store payment information after successful Stripe payments

    // Query payments for this user
    const paymentsResponse = await databases.listDocuments(
      config.databaseId!,
      "payments", // Replace with your payments collection ID
      [Query.equal("userId", userId), Query.orderDesc("createdAt")]
    );

    // Transform the results
    const payments = paymentsResponse.documents.map((doc) => ({
      $id: doc.$id,
      userId: doc.userId,
      packageId: doc.packageId,
      amount: doc.amount,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
      transactionId: doc.transactionId,
      createdAt: doc.createdAt,
    }));

    // If you want to fetch package details for each payment
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        try {
          const packageData = await databases.getDocument(
            config.databaseId!,
            config.packagesCollectionId!,
            payment.packageId
          );

          return {
            ...payment,
            packageDetails: packageData,
          };
        } catch (error) {
          console.error(
            `Failed to fetch package details for payment ${payment.$id}:`,
            error
          );
          return payment;
        }
      })
    );

    return paymentsWithDetails;
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return [];
  }
};

/**
 * Record a new payment in the database
 * This would be called after a successful Stripe payment
 */
export const recordPayment = async (
  userId: string,
  packageId: string,
  amount: number,
  transactionId: string
): Promise<boolean> => {
  try {
    await databases.createDocument(
      config.databaseId!,
      "payments", // Replace with your payments collection ID
      "unique()",
      {
        userId,
        packageId,
        amount,
        status: "completed",
        paymentMethod: "stripe",
        transactionId,
        createdAt: new Date().toISOString(),
      }
    );

    return true;
  } catch (error) {
    console.error("Failed to record payment:", error);
    return false;
  }
};
