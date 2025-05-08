import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";

// Define interfaces for type safety
export interface Payment {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  paymentMethod: string;
  transactionId: string;
  createdAt: Date;
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
    const paymentsQuery = query(
      collection(firestore, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    return paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];
  } catch (error) {
    console.error("Error getting user payments:", error);
    throw error;
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
    const paymentRef = await addDoc(collection(firestore, "payments"), {
      userId,
      packageId,
      amount,
      status: "completed",
      paymentMethod: "stripe",
      transactionId,
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error creating payment record:", error);
    return false;
  }
};

export const createPaymentRecord = async (paymentData: any) => {
  try {
    const paymentRef = await addDoc(collection(firestore, "payments"), {
      ...paymentData,
      createdAt: new Date()
    });
    return paymentRef.id;
  } catch (error) {
    console.error("Error creating payment record:", error);
    throw error;
  }
};

export const getUserPayments = async (userId: string) => {
  try {
    const paymentsQuery = query(
      collection(firestore, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    return paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];
  } catch (error) {
    console.error("Error getting user payments:", error);
    throw error;
  }
};
