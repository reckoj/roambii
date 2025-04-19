// // lib/redux/slices/bookingSlice.ts
// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import {
//   createBooking,
//   getUserBookings,
//   getBookingById,
//   cancelBooking,
// } from "../../bookingService";

// // Define Appwrite Document type
// interface Document {
//   $id: string;
//   $collectionId?: string;
//   $databaseId?: string;
//   $createdAt?: string;
//   $updatedAt?: string;
//   $permissions?: string[];
//   [key: string]: any; // Allow for any additional properties
// }

// interface BookingDetail {
//   $id: string;
//   userId: string[] | string;
//   packageId: string;
//   packageDetails?: any;
//   amount: number;
//   status: string;
//   bookingReference: string;
//   bookingDate: string;
//   checkInDate: string;
//   checkOutDate: string;
//   guestCount: number;
//   transactionId: string;
//   paymentMethod: string;
//   isActive?: boolean;
//   metadata?: string;
//   $collectionId?: string;
//   $databaseId?: string;
//   $createdAt?: string;
//   $updatedAt?: string;
//   $permissions?: string[];
// }

// interface BookingState {
//   bookings: BookingDetail[];
//   activeBookings: BookingDetail[];
//   pastBookings: BookingDetail[];
//   cancelledBookings: BookingDetail[];
//   currentBooking: BookingDetail | null;
//   loading: boolean;
//   error: string | null;
// }

// const initialState: BookingState = {
//   bookings: [],
//   activeBookings: [],
//   pastBookings: [],
//   cancelledBookings: [],
//   currentBooking: null,
//   loading: false,
//   error: null,
// };

// // Helper function to categorize bookings
// const categorizeBookings = (bookings: BookingDetail[]) => {
//   const now = new Date();
//   const active: BookingDetail[] = [];
//   const past: BookingDetail[] = [];
//   const cancelled: BookingDetail[] = [];

//   bookings.forEach((booking) => {
//     // Check if booking is cancelled
//     if (booking.status === "cancelled") {
//       cancelled.push(booking);
//       return;
//     }

//     // Check if booking is active (checkout date is in the future)
//     try {
//       const checkOutDate = new Date(booking.checkOutDate);
//       if (checkOutDate >= now) {
//         active.push({ ...booking, isActive: true });
//       } else {
//         past.push({ ...booking, isActive: false });
//       }
//     } catch (e) {
//       // If there's an error parsing the date, put in past bookings
//       past.push({ ...booking, isActive: false });
//     }
//   });

//   return { active, past, cancelled };
// };

// // Async thunks for bookings
// export const createBookingAsync = createAsyncThunk(
//   "bookings/createBooking",
//   async (
//     {
//       userId,
//       packageId,
//       amount,
//       transactionId,
//       checkInDate,
//       checkOutDate,
//       guestCount,
//     }: {
//       userId: string;
//       packageId: string;
//       amount: number;
//       transactionId: string;
//       checkInDate: string;
//       checkOutDate: string;
//       guestCount: number;
//     },
//     { rejectWithValue }
//   ) => {
//     try {
//       const booking = await createBooking(
//         userId,
//         packageId,
//         amount,
//         transactionId,
//         checkInDate,
//         checkOutDate,
//         guestCount
//       );
//       return booking;
//     } catch (error: any) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// export const fetchUserBookingsAsync = createAsyncThunk(
//   "bookings/fetchUserBookings",
//   async (userId: string, { rejectWithValue }) => {
//     try {
//       const bookings = await getUserBookings(userId);
//       return bookings;
//     } catch (error: any) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// export const fetchBookingByIdAsync = createAsyncThunk(
//   "bookings/fetchBookingById",
//   async (bookingId: string, { rejectWithValue }) => {
//     try {
//       const booking = await getBookingById(bookingId);
//       return booking;
//     } catch (error: any) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// export const cancelBookingAsync = createAsyncThunk(
//   "bookings/cancelBooking",
//   async (bookingId: string, { rejectWithValue }) => {
//     try {
//       const updatedBooking = await cancelBooking(bookingId);
//       return updatedBooking;
//     } catch (error: any) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// // Create bookings slice
// const bookingSlice = createSlice({
//   name: "bookings",
//   initialState,
//   reducers: {
//     clearBookingError: (state) => {
//       state.error = null;
//     },
//     clearCurrentBooking: (state) => {
//       state.currentBooking = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // Create booking cases
//       .addCase(createBookingAsync.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(createBookingAsync.fulfilled, (state, action) => {
//         state.loading = false;

//         // Transform Document to BookingDetail
//         const doc = action.payload;
//         const newBooking: BookingDetail = {
//           $id: doc.$id,
//           userId: doc.userId || [],
//           packageId: doc.packageId || "",
//           packageDetails: doc.packageDetails || null,
//           amount: doc.amount || 0,
//           status: doc.status || "confirmed",
//           bookingReference: doc.bookingReference || "",
//           bookingDate: doc.bookingDate || new Date().toISOString(),
//           checkInDate: doc.checkInDate || new Date().toISOString(),
//           checkOutDate: doc.checkOutDate || new Date().toISOString(),
//           guestCount: doc.guestCount || 1,
//           transactionId: doc.transactionId || "",
//           paymentMethod: doc.paymentMethod || "card",
//           isActive: true, // New booking is always active
//           metadata: doc.metadata,
//           $collectionId: doc.$collectionId,
//           $databaseId: doc.$databaseId,
//           $createdAt: doc.$createdAt,
//           $updatedAt: doc.$updatedAt,
//           $permissions: doc.$permissions,
//         };

//         // Add to bookings list and categorize
//         state.bookings.unshift(newBooking);

//         // Set as current booking
//         state.currentBooking = newBooking;

//         // Recategorize
//         const categorized = categorizeBookings(state.bookings);
//         state.activeBookings = categorized.active;
//         state.pastBookings = categorized.past;
//         state.cancelledBookings = categorized.cancelled;
//       })
//       .addCase(createBookingAsync.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string;
//       })

//       // Fetch user bookings cases
//       .addCase(fetchUserBookingsAsync.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchUserBookingsAsync.fulfilled, (state, action) => {
//         state.loading = false;

//         // Transform Document objects to BookingDetail objects
//         const bookings: BookingDetail[] = action.payload.map(
//           (doc: Document) => ({
//             $id: doc.$id,
//             userId: doc.userId || [],
//             packageId: doc.packageId || "",
//             packageDetails: doc.packageDetails || null,
//             amount: doc.amount || 0,
//             status: doc.status || "pending",
//             bookingReference: doc.bookingReference || "",
//             bookingDate: doc.bookingDate || new Date().toISOString(),
//             checkInDate: doc.checkInDate || new Date().toISOString(),
//             checkOutDate: doc.checkOutDate || new Date().toISOString(),
//             guestCount: doc.guestCount || 1,
//             transactionId: doc.transactionId || "",
//             paymentMethod: doc.paymentMethod || "card",
//             isActive: doc.isActive || false,
//             metadata: doc.metadata,
//             $collectionId: doc.$collectionId,
//             $databaseId: doc.$databaseId,
//             $createdAt: doc.$createdAt,
//             $updatedAt: doc.$updatedAt,
//             $permissions: doc.$permissions,
//           })
//         );

//         state.bookings = bookings;

//         // Categorize bookings
//         const categorized = categorizeBookings(bookings);
//         state.activeBookings = categorized.active;
//         state.pastBookings = categorized.past;
//         state.cancelledBookings = categorized.cancelled;
//       })
//       .addCase(fetchUserBookingsAsync.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string;
//       })

//       // Fetch booking by ID cases
//       .addCase(fetchBookingByIdAsync.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchBookingByIdAsync.fulfilled, (state, action) => {
//         state.loading = false;

//         // Transform Document to BookingDetail
//         const doc = action.payload;
//         const booking: BookingDetail = {
//           $id: doc.$id,
//           userId: doc.userId || [],
//           packageId: doc.packageId || "",
//           packageDetails: doc.packageDetails || null,
//           amount: doc.amount || 0,
//           status: doc.status || "pending",
//           bookingReference: doc.bookingReference || "",
//           bookingDate: doc.bookingDate || new Date().toISOString(),
//           checkInDate: doc.checkInDate || new Date().toISOString(),
//           checkOutDate: doc.checkOutDate || new Date().toISOString(),
//           guestCount: doc.guestCount || 1,
//           transactionId: doc.transactionId || "",
//           paymentMethod: doc.paymentMethod || "card",
//           isActive: doc.isActive || false,
//           metadata: doc.metadata,
//           $collectionId: doc.$collectionId,
//           $databaseId: doc.$databaseId,
//           $createdAt: doc.$createdAt,
//           $updatedAt: doc.$updatedAt,
//           $permissions: doc.$permissions,
//         };

//         state.currentBooking = booking;
//       })
//       .addCase(fetchBookingByIdAsync.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string;
//       })

//       // Cancel booking cases
//       .addCase(cancelBookingAsync.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(cancelBookingAsync.fulfilled, (state, action) => {
//         state.loading = false;

//         // Transform Document to BookingDetail
//         const doc = action.payload;
//         const updatedBooking: BookingDetail = {
//           $id: doc.$id,
//           userId: doc.userId || [],
//           packageId: doc.packageId || "",
//           packageDetails: doc.packageDetails || null,
//           amount: doc.amount || 0,
//           status: "cancelled", // Always set to cancelled
//           bookingReference: doc.bookingReference || "",
//           bookingDate: doc.bookingDate || new Date().toISOString(),
//           checkInDate: doc.checkInDate || new Date().toISOString(),
//           checkOutDate: doc.checkOutDate || new Date().toISOString(),
//           guestCount: doc.guestCount || 1,
//           transactionId: doc.transactionId || "",
//           paymentMethod: doc.paymentMethod || "card",
//           isActive: false, // Cancelled booking is never active
//           metadata: doc.metadata,
//           $collectionId: doc.$collectionId,
//           $databaseId: doc.$databaseId,
//           $createdAt: doc.$createdAt,
//           $updatedAt: doc.$updatedAt,
//           $permissions: doc.$permissions,
//         };

//         // Update in bookings array
//         state.bookings = state.bookings.map((booking) =>
//           booking.$id === updatedBooking.$id ? updatedBooking : booking
//         );

//         // Update current booking if it's the one that was cancelled
//         if (
//           state.currentBooking &&
//           state.currentBooking.$id === updatedBooking.$id
//         ) {
//           state.currentBooking = updatedBooking;
//         }

//         // Recategorize bookings
//         const categorized = categorizeBookings(state.bookings);
//         state.activeBookings = categorized.active;
//         state.pastBookings = categorized.past;
//         state.cancelledBookings = categorized.cancelled;
//       })
//       .addCase(cancelBookingAsync.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string;
//       });
//   },
// });

// export const { clearBookingError, clearCurrentBooking } = bookingSlice.actions;
// export default bookingSlice.reducer;

// lib/redux/slices/bookingSlice.ts
import {
  cancelBooking,
  createBooking,
  getBookingById,
  getUserBookings,
} from "@/lib/booking-service";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

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
      const booking = await createBooking(
        userId,
        packageId,
        amount,
        transactionId,
        checkInDate,
        checkOutDate,
        guestCount
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

        const newBooking: BookingDetail = {
          ...action.payload,
          id: action.payload!.id,
          isActive: true, // New booking is always active
          userId: "",
          packageId: "",
          amount: 0,
          status: "",
          bookingReference: "",
          bookingDate: "",
          checkInDate: "",
          checkOutDate: "",
          guestCount: 0,
          transactionId: "",
          paymentMethod: "",
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

        // Transform returned bookings to the expected format
        const bookings: BookingDetail[] = action.payload.map(
          (booking: any) => ({
            id: booking.id,
            userId: booking.userId || [],
            packageId: booking.packageId || "",
            packageDetails: booking.packageDetails || null,
            amount: booking.amount || 0,
            status: booking.status || "pending",
            bookingReference: booking.bookingReference || "",
            bookingDate: booking.bookingDate || new Date().toISOString(),
            checkInDate: booking.checkInDate || new Date().toISOString(),
            checkOutDate: booking.checkOutDate || new Date().toISOString(),
            guestCount: booking.guestCount || 1,
            transactionId: booking.transactionId || "",
            paymentMethod: booking.paymentMethod || "card",
            isActive: booking.isActive || false,
            metadata: booking.metadata,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
          })
        );

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

        // Transform to BookingDetail
        const booking: BookingDetail = {
          id: action.payload?.id!,
          userId: action.payload?.userId!,
          packageId: action.payload?.packageId!,
          amount: action.payload?.amount!,
          status: action.payload?.status!,
          bookingReference: action.payload?.bookingReference!,
          bookingDate: action.payload?.bookingDate.toString()!,
          checkInDate: action.payload?.checkInDate.toString()!,
          checkOutDate: action.payload?.checkOutDate.toString()!,
          guestCount: action.payload?.guestCount!,
          transactionId: action.payload?.transactionId!,
          paymentMethod: action.payload?.paymentMethod!,
        };

        state.currentBooking = booking;
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

        // Transform to BookingDetail
        const updatedBooking: BookingDetail = {
          id: action.payload?.id!,
          userId: action.payload?.userId!,
          packageId: action.payload?.packageId!,
          amount: action.payload?.amount!,
          status: action.payload?.status!,
          bookingReference: action.payload?.bookingReference!,
          bookingDate: action.payload?.bookingDate.toString()!,
          checkInDate: action.payload?.checkInDate.toString()!,
          checkOutDate: action.payload?.checkOutDate.toString()!,
          guestCount: action.payload?.guestCount!,
          transactionId: action.payload?.transactionId!,
          paymentMethod: action.payload?.paymentMethod!,
        };

        // Update in bookings array
        state.bookings = state.bookings.map((booking) =>
          booking.id === updatedBooking.id ? updatedBooking : booking
        );

        // Update current booking if it's the one that was cancelled
        if (
          state.currentBooking &&
          state.currentBooking.id === updatedBooking.id
        ) {
          state.currentBooking = updatedBooking;
        }

        // Recategorize bookings
        const categorized = categorizeBookings(state.bookings);
        state.activeBookings = categorized.active;
        state.pastBookings = categorized.past;
        state.cancelledBookings = categorized.cancelled;
      })
      .addCase(cancelBookingAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBookingError, clearCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
