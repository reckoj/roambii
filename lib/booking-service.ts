// lib/firebase/bookingService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "../lib/firebase/firebase-config";
import { Booking, Package } from "./firebase/models";
import { getPackageById } from "../lib/package-service";

/**
 * Generate a unique booking reference
 */
function generateBookingReference(): string {
  return "BK" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Create a new booking
 */
export const createBooking = async (
  userId: string,
  packageId: string,
  amount: number,
  transactionId: string,
  checkInDate: string,
  checkOutDate: string,
  guestCount: number
): Promise<Booking | null> => {
  try {
    // Verify the package exists
    const packageDetails = await getPackageById(packageId);
    if (!packageDetails) {
      throw new Error("Package not found");
    }

    // Generate a booking reference
    const bookingReference = generateBookingReference();

    // Create a new booking document
    const bookingRef = doc(collection(firestore, COLLECTIONS.BOOKINGS));

    const bookingData: Omit<Booking, "id"> = {
      userId,
      packageId,
      amount,
      transactionId,
      bookingReference,
      status: "confirmed",
      bookingDate: new Date(),
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      guestCount,
      paymentMethod: "stripe",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(bookingRef, bookingData);

    return {
      id: bookingRef.id,
      ...bookingData,
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    return null;
  }
};

/**
 * Get all bookings for a user
 */
export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const bookingsRef = collection(firestore, COLLECTIONS.BOOKINGS);
    const q = query(
      bookingsRef,
      where("userId", "==", userId),
      orderBy("bookingDate", "desc")
    );

    const querySnapshot = await getDocs(q);
    const bookings: Booking[] = [];

    for (const doc of querySnapshot.docs) {
      const bookingData = doc.data() as Omit<Booking, "id">;

      // Convert Timestamp objects to Date objects
      const booking: Booking = {
        id: doc.id,
        ...bookingData,
        bookingDate:
          bookingData.bookingDate instanceof Timestamp
            ? bookingData.bookingDate.toDate()
            : bookingData.bookingDate,
        checkInDate:
          bookingData.checkInDate instanceof Timestamp
            ? bookingData.checkInDate.toDate()
            : bookingData.checkInDate,
        checkOutDate:
          bookingData.checkOutDate instanceof Timestamp
            ? bookingData.checkOutDate.toDate()
            : bookingData.checkOutDate,
        createdAt:
          bookingData.createdAt instanceof Timestamp
            ? bookingData.createdAt.toDate()
            : bookingData.createdAt,
        updatedAt:
          bookingData.updatedAt instanceof Timestamp
            ? bookingData.updatedAt.toDate()
            : bookingData.updatedAt,
      };

      // Fetch package details if needed
      if (!booking.packageDetails && booking.packageId) {
        const packageDetails = await getPackageById(booking.packageId);
        if (packageDetails) {
          booking.packageDetails = packageDetails;
        }
      }

      bookings.push(booking);
    }

    return bookings;
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return [];
  }
};

/**
 * Get a booking by ID
 */
export const getBookingById = async (
  bookingId: string
): Promise<Booking | null> => {
  try {
    const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      return null;
    }

    const bookingData = bookingDoc.data() as Omit<Booking, "id">;

    // Convert Timestamp objects to Date objects
    const booking: Booking = {
      id: bookingDoc.id,
      ...bookingData,
      bookingDate:
        bookingData.bookingDate instanceof Timestamp
          ? bookingData.bookingDate.toDate()
          : bookingData.bookingDate,
      checkInDate:
        bookingData.checkInDate instanceof Timestamp
          ? bookingData.checkInDate.toDate()
          : bookingData.checkInDate,
      checkOutDate:
        bookingData.checkOutDate instanceof Timestamp
          ? bookingData.checkOutDate.toDate()
          : bookingData.checkOutDate,
      createdAt:
        bookingData.createdAt instanceof Timestamp
          ? bookingData.createdAt.toDate()
          : bookingData.createdAt,
      updatedAt:
        bookingData.updatedAt instanceof Timestamp
          ? bookingData.updatedAt.toDate()
          : bookingData.updatedAt,
    };

    // Fetch package details if needed
    if (!booking.packageDetails && booking.packageId) {
      const packageDetails = await getPackageById(booking.packageId);
      if (packageDetails) {
        booking.packageDetails = packageDetails;
      }
    }

    return booking;
  } catch (error) {
    console.error("Error fetching booking details:", error);
    return null;
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (
  bookingId: string
): Promise<Booking | null> => {
  try {
    const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      throw new Error("Booking not found");
    }

    await updateDoc(bookingRef, {
      status: "cancelled",
      updatedAt: new Date(),
    });

    // Fetch the updated booking
    return getBookingById(bookingId);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return null;
  }
};

/**
 * Get bookings for a package
 */
export const getBookingsByPackage = async (
  packageId: string
): Promise<Booking[]> => {
  try {
    const bookingsRef = collection(firestore, COLLECTIONS.BOOKINGS);
    const q = query(
      bookingsRef,
      where("packageId", "==", packageId),
      orderBy("bookingDate", "desc")
    );

    const querySnapshot = await getDocs(q);
    const bookings: Booking[] = [];

    querySnapshot.forEach((doc) => {
      const bookingData = doc.data() as Omit<Booking, "id">;

      // Convert Timestamp objects to Date objects
      bookings.push({
        id: doc.id,
        ...bookingData,
        bookingDate:
          bookingData.bookingDate instanceof Timestamp
            ? bookingData.bookingDate.toDate()
            : bookingData.bookingDate,
        checkInDate:
          bookingData.checkInDate instanceof Timestamp
            ? bookingData.checkInDate.toDate()
            : bookingData.checkInDate,
        checkOutDate:
          bookingData.checkOutDate instanceof Timestamp
            ? bookingData.checkOutDate.toDate()
            : bookingData.checkOutDate,
        createdAt:
          bookingData.createdAt instanceof Timestamp
            ? bookingData.createdAt.toDate()
            : bookingData.createdAt,
        updatedAt:
          bookingData.updatedAt instanceof Timestamp
            ? bookingData.updatedAt.toDate()
            : bookingData.updatedAt,
      });
    });

    return bookings;
  } catch (error) {
    console.error("Error fetching package bookings:", error);
    return [];
  }
};

/**
 * Get active bookings (where checkout date is in the future)
 */
export const getActiveBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const allBookings = await getUserBookings(userId);
    const now = new Date();

    return allBookings.filter((booking) => {
      const checkOutDate =
        booking.checkOutDate instanceof Date
          ? booking.checkOutDate
          : booking.checkOutDate.toDate();

      return checkOutDate >= now && booking.status === "confirmed";
    });
  } catch (error) {
    console.error("Error fetching active bookings:", error);
    return [];
  }
};

/**
 * Get past bookings (where checkout date is in the past)
 */
export const getPastBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const allBookings = await getUserBookings(userId);
    const now = new Date();

    return allBookings.filter((booking) => {
      // Convert Timestamp to Date if necessary
      const checkOutDate =
        booking.checkOutDate instanceof Date
          ? booking.checkOutDate
          : booking.checkOutDate.toDate();

      return checkOutDate < now && booking.status === "confirmed";
    });
  } catch (error) {
    console.error("Error fetching past bookings:", error);
    return [];
  }
};

/**
 * Get cancelled bookings
 */
export const getCancelledBookings = async (
  userId: string
): Promise<Booking[]> => {
  try {
    const allBookings = await getUserBookings(userId);

    // Filter for cancelled bookings
    return allBookings.filter((booking) => booking.status === "cancelled");
  } catch (error) {
    console.error("Error fetching cancelled bookings:", error);
    return [];
  }
};
