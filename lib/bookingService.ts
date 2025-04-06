import { databases, config } from "@/lib/appwrite";
import { ID } from "appwrite"; // Direct import from appwrite package

/**
 * Creates a new booking in the database
 * @param userId - The ID of the user making the booking
 * @param packageId - The ID of the package being booked
 * @param amount - The total amount paid
 * @param transactionId - The ID from the payment processor
 * @param checkInDate - The check-in date in ISO format
 * @param checkOutDate - The check-out date in ISO format
 * @param guestCount - The number of guests
 * @returns The created booking document
 */
export const createBooking = async (
  userId: string,
  packageId: string,
  amount: number,
  transactionId: string,
  checkInDate: string,
  checkOutDate: string,
  guestCount: number
) => {
  // Generate a booking reference
  const bookingReference =
    "BK" + Math.random().toString(36).substring(2, 10).toUpperCase();

  // Create booking document with correct userId array that contains the user ID
  return await databases.createDocument(
    config.databaseId!,
    "67f2a49a00243903ad7d", // users_bookings collection ID
    ID.unique(),
    {
      // Ensure userId is an array containing the user ID
      userId: [userId], // This should not be empty
      packageId,
      amount,
      transactionId,
      bookingReference,
      bookingDate: new Date().toISOString(),
      checkInDate,
      checkOutDate,
      guestCount,
      status: "confirmed",
      paymentMethod: "stripe",
    }
  );
};

/**
 * Gets all bookings for a specific user
 * @param userId - The ID of the user
 * @returns An array of booking documents
 */
export const getUserBookings = async (userId: string) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId!,
      "67f2a49a00243903ad7d", // Direct collection ID for users_bookings
      [
        // Using the correct relationship field name
        // Query.equal("userId", userId) // Uncomment this when implementing filtering
      ]
    );

    return response.documents;
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    throw error;
  }
};

/**
 * Gets a specific booking by ID
 * @param bookingId - The ID of the booking
 * @returns The booking document
 */
export const getBookingById = async (bookingId: string) => {
  try {
    return await databases.getDocument(
      config.databaseId!,
      "67f2a49a00243903ad7d", // Direct collection ID for users_bookings
      bookingId
    );
  } catch (error) {
    console.error("Error fetching booking:", error);
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
    return await databases.updateDocument(
      config.databaseId!,
      "67f2a49a00243903ad7d", // users_bookings collection ID
      bookingId,
      {
        status: "cancelled",
      }
    );
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
};
