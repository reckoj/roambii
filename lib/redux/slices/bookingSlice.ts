// lib/redux/slices/bookingSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createBooking,
  getBookingById,
  bookingService
} from "@/lib/services";

// Import missing functions directly from booking-service
const getUserBookings = bookingService.getUserBookings;
const cancelBooking = bookingService.cancelBooking;

// Define Booking interface using Firebase data structure
interface BookingDetail {
  id: string;
  userId: string[] | string;
  packageId: string;
  packageDetails?: any;
  amount: number;
  status: string;
  bookingReference: string;
  bookingDate: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  transactionId: string;
  paymentMethod: string;
  isActive?: boolean;
  metadata?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface BookingState {
  bookings: BookingDetail[];
  activeBookings: BookingDetail[];
  pastBookings: BookingDetail[];
  cancelledBookings: BookingDetail[];
  currentBooking: BookingDetail | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  activeBookings: [],
  pastBookings: [],
  cancelledBookings: [],
  currentBooking: null,
  loading: false,
  error: null,
};

// Helper function to categorize bookings
const categorizeBookings = (bookings: BookingDetail[]) => {
  const now = new Date();
  const active: BookingDetail[] = [];
  const past: BookingDetail[] = [];
  const cancelled: BookingDetail[] = [];

  bookings.forEach((booking) => {
    // Check if booking is cancelled
    if (booking.status === "cancelled") {
      cancelled.push(booking);
      return;
    }

    // Check if booking is active (checkout date is in the future)
    try {
      const checkOutDate = new Date(booking.checkOutDate);
      if (checkOutDate >= now) {
        active.push({ ...booking, isActive: true });
      } else {
        past.push({ ...booking, isActive: false });
      }
    } catch (e) {
      // If there's an error parsing the date, put in past bookings
      past.push({ ...booking, isActive: false });
    }
  });

  return { active, past, cancelled };
};

// Async thunks for bookings
export const createBookingAsync = createAsyncThunk(
  "bookings/createBooking",
  async (
    {
      userId,
      packageId,
      amount,
      transactionId,
      checkInDate,
      checkOutDate,
      guestCount,
    }: {
      userId: string;
      packageId: string;
      amount: number;
      transactionId: string;
      checkInDate: string;
      checkOutDate: string;
      guestCount: number;
    },
    { rejectWithValue }
  ) => {
    try {
      // Use enhanced createBooking with all required parameters
      // Additional parameters that weren't provided are set with defaults
      const booking = await createBooking(
        userId,
        packageId,
        transactionId, // paymentId
        'confirmed', // paymentStatus
        amount, // paymentAmount
        'card', // paymentMethod
        'USD', // paymentCurrency
        new Date(), // paymentDate
        '', // paymentReceiptUrl
        null // packageDetails (will be fetched inside the function)
      );
      return booking;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserBookingsAsync = createAsyncThunk(
  "bookings/fetchUserBookings",
  async (userId: string, { rejectWithValue }) => {
    try {
      const bookings = await getUserBookings(userId);
      return bookings;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBookingByIdAsync = createAsyncThunk(
  "bookings/fetchBookingById",
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const booking = await getBookingById(bookingId);
      return booking;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelBookingAsync = createAsyncThunk(
  "bookings/cancelBooking",
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const updatedBooking = await cancelBooking(bookingId);
      return updatedBooking;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Create bookings slice
const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    clearBookingError: (state) => {
      state.error = null;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create booking cases
      .addCase(createBookingAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBookingAsync.fulfilled, (state, action) => {
        state.loading = false;

        // Transform document to BookingDetail
        // In this case, action.payload is just the ID of the booking
        const bookingId = action.payload as string;
        
        // Create a placeholder booking until we fetch the full details
        const newBooking: BookingDetail = {
          id: bookingId,
          userId: "",
          packageId: "",
          amount: 0,
          status: "confirmed",
          bookingReference: "",
          bookingDate: new Date().toISOString(),
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date().toISOString(),
          guestCount: 1,
          transactionId: "",
          paymentMethod: "card",
          isActive: true, // New booking is always active
        };

        // Add to bookings list and categorize
        state.bookings.unshift(newBooking);

        // Set as current booking
        state.currentBooking = newBooking;

        // Recategorize
        const categorized = categorizeBookings(state.bookings);
        state.activeBookings = categorized.active;
        state.pastBookings = categorized.past;
        state.cancelledBookings = categorized.cancelled;
      })
      .addCase(createBookingAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch user bookings cases
      .addCase(fetchUserBookingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookingsAsync.fulfilled, (state, action) => {
        state.loading = false;

        // Process bookings from Firebase
        const bookings: BookingDetail[] = action.payload.map((doc: any) => ({
          id: doc.id,
          userId: doc.userId || [],
          packageId: doc.packageId || "",
          packageDetails: doc.packageDetails || null,
          amount: doc.amount || 0,
          status: doc.status || "confirmed",
          bookingReference: doc.bookingReference || "",
          bookingDate: doc.bookingDate instanceof Date 
            ? doc.bookingDate.toISOString() 
            : typeof doc.bookingDate === 'string' 
              ? doc.bookingDate 
              : new Date().toISOString(),
          checkInDate: doc.checkInDate instanceof Date 
            ? doc.checkInDate.toISOString() 
            : typeof doc.checkInDate === 'string' 
              ? doc.checkInDate 
              : new Date().toISOString(),
          checkOutDate: doc.checkOutDate instanceof Date 
            ? doc.checkOutDate.toISOString() 
            : typeof doc.checkOutDate === 'string' 
              ? doc.checkOutDate 
              : new Date().toISOString(),
          guestCount: doc.guestCount || 1,
          transactionId: doc.transactionId || "",
          paymentMethod: doc.paymentMethod || "card",
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }));

        state.bookings = bookings;

        // Categorize bookings
        const categorized = categorizeBookings(bookings);
        state.activeBookings = categorized.active;
        state.pastBookings = categorized.past;
        state.cancelledBookings = categorized.cancelled;
      })
      .addCase(fetchUserBookingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch booking by ID cases
      .addCase(fetchBookingByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        
        // Process booking from Firebase
        const doc = action.payload;
        if (doc) {
          const booking: BookingDetail = {
            id: doc.id,
            userId: doc.userId || [],
            packageId: doc.packageId || "",
            packageDetails: doc.packageDetails || null,
            amount: doc.amount || 0,
            status: doc.status || "confirmed",
            bookingReference: doc.bookingReference || "",
            bookingDate: doc.bookingDate instanceof Date 
              ? doc.bookingDate.toISOString() 
              : typeof doc.bookingDate === 'string' 
                ? doc.bookingDate 
                : new Date().toISOString(),
            checkInDate: doc.checkInDate instanceof Date 
              ? doc.checkInDate.toISOString() 
              : typeof doc.checkInDate === 'string' 
                ? doc.checkInDate 
                : new Date().toISOString(),
            checkOutDate: doc.checkOutDate instanceof Date 
              ? doc.checkOutDate.toISOString() 
              : typeof doc.checkOutDate === 'string' 
                ? doc.checkOutDate 
                : new Date().toISOString(),
            guestCount: doc.guestCount || 1,
            transactionId: doc.transactionId || "",
            paymentMethod: doc.paymentMethod || "card",
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          };
          
          state.currentBooking = booking;
        }
      })
      .addCase(fetchBookingByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Cancel booking cases
      .addCase(cancelBookingAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelBookingAsync.fulfilled, (state, action) => {
        state.loading = false;
        
        // Process updated booking from Firebase
        const doc = action.payload;
        if (doc) {
          // Update the booking in the lists
          state.bookings = state.bookings.map((booking) =>
            booking.id === doc.id
              ? { ...booking, status: "cancelled" }
              : booking
          );
          
          if (state.currentBooking && state.currentBooking.id === doc.id) {
            state.currentBooking = { ...state.currentBooking, status: "cancelled" };
          }
          
          // Recategorize
          const categorized = categorizeBookings(state.bookings);
          state.activeBookings = categorized.active;
          state.pastBookings = categorized.past;
          state.cancelledBookings = categorized.cancelled;
        }
      })
      .addCase(cancelBookingAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBookingError, clearCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
