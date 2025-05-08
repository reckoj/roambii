import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";

/**
 * Creates a new booking in the database
 * @param bookingData - The data for the new booking
 * @returns The ID of the created booking
 */
export const createBooking = async (bookingData: any) => {
  try {
    const bookingRef = await addDoc(collection(firestore, COLLECTIONS.BOOKINGS), {
      ...bookingData,
      createdAt: new Date(),
      status: "pending"
    });
    return bookingRef.id;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

/**
 * Updates an existing booking in the database
 * @param bookingId - The ID of the booking to update
 * @param updateData - The data to update in the booking
 * @returns True if the booking was updated successfully
 */
export const updateBooking = async (bookingId: string, updateData: any) => {
  try {
    const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, bookingId);
    await updateDoc(bookingRef, {
      ...updateData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
};

/**
 * Gets a specific booking by ID
 * @param bookingId - The ID of the booking
 * @returns The booking document
 */
export const getBooking = async (bookingId: string) => {
  try {
    const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      return { id: bookingSnap.id, ...bookingSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting booking:", error);
    throw error;
  }
};

/**
 * Gets all bookings for a specific user
 * @param userId - The ID of the user
 * @returns An array of booking documents
 */
export const getUserBookings = async (userId: string) => {
  try {
    const bookingsQuery = query(
      collection(firestore, COLLECTIONS.BOOKINGS),
      where("userId", "==", userId)
    );
    const bookingsSnap = await getDocs(bookingsQuery);
    return bookingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user bookings:", error);
    throw error;
  }
};

/**
 * Cancels a booking by ID
 * @param bookingId - The ID of the booking to cancel
 * @returns The updated booking document
 */
export const cancelBooking = async (bookingId: string) => {
  try {
    // Update the booking status to cancelled
    const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, bookingId);
    await updateDoc(bookingRef, {
      status: "cancelled"
    });
    return true;
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
};
