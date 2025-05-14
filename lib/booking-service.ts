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
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firestore, COLLECTIONS } from "../lib/firebase/firebase-config";
import { Booking, Package, User } from "./firebase/models";
import { getPackageById } from "../lib/package-service";
import { getUserProfile } from "./user-service";
import { createOrUpdateClientRelationship, createBasicClientRelationship } from "./client-service";

// Define debug mode constant
const DEBUG_MODE = true; // Set to false in production

/**
 * Generate a unique booking reference
 */
function generateBookingReference(): string {
  return "BK" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Create a new booking - with embedded client relationship data
 */
export const createBooking = async (
  userId: string,
  packageId: string,
  paymentId: string,
  paymentStatus: string,
  paymentAmount: number,
  paymentMethod: string,
  paymentCurrency: string,
  paymentDate: Date,
  paymentReceiptUrl: string,
  packageDetails: any
): Promise<string> => {
  try {
    // Get package details
    const packageData = await getPackageById(packageId);
    if (!packageData) {
      throw new Error("Package not found");
    }

    // Get user profile to access legal information
    const userProfile = await getUserProfile(userId);
    
    // Create booking document
    const bookingRef = collection(firestore, COLLECTIONS.BOOKINGS);
    const now = new Date();

    // Prepare client relationship data - embedded in the booking
    const clientRelationshipData = packageData.agent?.id ? {
      clientRelationship: {
        agentId: packageData.agent.id,
        userId: userId,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        isEmbedded: true,
        contactInfo: {
          name: userProfile?.name || "",
          email: userProfile?.email || "",
          phone: userProfile?.legalInformation?.phoneNumber || "",
        }
      }
    } : null;

    console.log("DEBUG - Client relationship data prepared:", {
      hasAgentId: !!packageData.agent?.id,
      agentId: packageData.agent?.id,
      agentRef: packageData.agent ? JSON.stringify(packageData.agent) : "No agent ref",
      data: clientRelationshipData
    });

    // Merge booking data with client relationship data
    const newBooking = {
      user: doc(firestore, COLLECTIONS.USERS, userId),
      package: doc(firestore, COLLECTIONS.PACKAGES, packageId),
      packageDetails: {
        ...packageData,
        id: packageId,
      },
      status: "pending",
      payment: {
        id: paymentId,
        status: paymentStatus,
        amount: paymentAmount,
        method: paymentMethod,
        currency: paymentCurrency,
        date: paymentDate,
        receipt_url: paymentReceiptUrl,
      },
      check_in_date: packageData.check_in_date || now,
      check_out_date: packageData.check_out_date || now,
      check_in_time: packageData.check_in_time || now,
      check_out_time: packageData.check_out_time || now,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Include user's legal information if available
      travelerInfo: userProfile?.legalInformation || {
        fullName: userProfile?.name || "",
        email: userProfile?.email || "",
      },
      // Add client relationship data if package has an agent
      ...(clientRelationshipData || {})
    };

    // Create the booking with embedded client relationship
    const bookingDoc = await addDoc(bookingRef, newBooking);
    console.log("Booking created with ID:", bookingDoc.id);
    
    // Report on client relationship status
    if (packageData.agent?.id) {
      console.log("Client relationship embedded in booking document");
    } else {
      console.log("No agent information available for client relationship");
    }
    
    return bookingDoc.id;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
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
          booking.packageDetails = packageDetails as Package;
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
        booking.packageDetails = packageDetails as Package;
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
      return null;
    }

    // Update booking status
    await updateDoc(bookingRef, {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });

    // Get updated booking
    const updatedBookingDoc = await getDoc(bookingRef);
    const updatedBookingData = updatedBookingDoc.data() as Omit<Booking, "id">;

    return {
      id: bookingId,
      ...updatedBookingData,
      // Convert timestamp objects
      bookingDate:
        updatedBookingData.bookingDate instanceof Timestamp
          ? updatedBookingData.bookingDate.toDate()
          : updatedBookingData.bookingDate,
      checkInDate:
        updatedBookingData.checkInDate instanceof Timestamp
          ? updatedBookingData.checkInDate.toDate()
          : updatedBookingData.checkInDate,
      checkOutDate:
        updatedBookingData.checkOutDate instanceof Timestamp
          ? updatedBookingData.checkOutDate.toDate()
          : updatedBookingData.checkOutDate,
      createdAt:
        updatedBookingData.createdAt instanceof Timestamp
          ? updatedBookingData.createdAt.toDate()
          : updatedBookingData.createdAt,
      updatedAt:
        updatedBookingData.updatedAt instanceof Timestamp
          ? updatedBookingData.updatedAt.toDate()
          : updatedBookingData.updatedAt,
    };
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

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'pending'
): Promise<Booking | null> => {
  try {
    const bookingRef = doc(firestore, COLLECTIONS.BOOKINGS, bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      return null;
    }

    const bookingData = bookingDoc.data() as Booking;
    
    // Prepare update data
    const updateData: any = {
      status: status,
      updatedAt: serverTimestamp(),
    };
    
    // If status is confirmed and there's an agent, embed client relationship if not already there
    if (status === 'confirmed' && bookingData.packageDetails?.agent?.id && !bookingData.clientRelationship) {
      console.log("Adding embedded client relationship for confirmed booking", {
        agentId: bookingData.packageDetails.agent.id,
        userId: bookingData.userId,
      });
      
      const now = new Date();
      
      // Get user profile for contact info
      let contactInfo: { name: string; email: string; phone?: string } = { name: "", email: "" };
      try {
        const userProfile = await getUserProfile(bookingData.userId);
        if (userProfile) {
          contactInfo = {
            name: userProfile.name || "",
            email: userProfile.email || "",
            phone: userProfile.legalInformation?.phoneNumber,
          };
        }
      } catch (err) {
        console.error("Error getting user profile for client relationship:", err);
      }
      
      // Add client relationship data
      updateData.clientRelationship = {
        agentId: bookingData.packageDetails.agent.id,
        userId: bookingData.userId,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        isEmbedded: true,
        contactInfo
      };
    }

    // Update booking status
    await updateDoc(bookingRef, updateData);
    
    if (updateData.clientRelationship) {
      console.log("Client relationship embedded in booking document during status update");
    }

    // Get updated booking
    const updatedBookingDoc = await getDoc(bookingRef);
    const updatedBookingData = updatedBookingDoc.data() as Omit<Booking, "id">;

    return {
      id: bookingId,
      ...updatedBookingData,
      // Convert timestamp objects
      bookingDate:
        updatedBookingData.bookingDate instanceof Timestamp
          ? updatedBookingData.bookingDate.toDate()
          : updatedBookingData.bookingDate,
      checkInDate:
        updatedBookingData.checkInDate instanceof Timestamp
          ? updatedBookingData.checkInDate.toDate()
          : updatedBookingData.checkInDate,
      checkOutDate:
        updatedBookingData.checkOutDate instanceof Timestamp
          ? updatedBookingData.checkOutDate.toDate()
          : updatedBookingData.checkOutDate,
      createdAt:
        updatedBookingData.createdAt instanceof Timestamp
          ? updatedBookingData.createdAt.toDate()
          : updatedBookingData.createdAt,
      updatedAt:
        updatedBookingData.updatedAt instanceof Timestamp
          ? updatedBookingData.updatedAt.toDate()
          : updatedBookingData.updatedAt,
    };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return null;
  }
};
