import {
  Activity,
  DayPlan,
  Itinerary,
  ItineraryWithDetails,
} from "@/lib/firebase/models";
import {
  createItinerary,
  deleteItinerary,
  getItineraryWithDetails,
  getUserItineraries,
  saveActivity,
  updateItinerary,
} from "@/lib/itinerary-service"; // Updated import path to use firebase services

interface ItineraryState {
  itineraries: Itinerary[];
  currentItinerary: ItineraryWithDetails | null;
  loading: boolean;
  error: string | null;
  lastRefreshTime: Date | null;
}

const initialState: ItineraryState = {
  itineraries: [],
  currentItinerary: null,
  loading: false,
  error: null,
  lastRefreshTime: null,
};

// Async thunks for itineraries
export const fetchUserItinerariesAsync = createAsyncThunk(
  "itineraries/fetchUserItineraries",
  async (userId: string, { rejectWithValue }) => {
    try {
      const itineraries = await getUserItineraries(userId);
      return itineraries; // This should always return an array, even if empty
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchItineraryWithDetailsAsync = createAsyncThunk(
  "itineraries/fetchItineraryWithDetails",
  async (itineraryId: string, { rejectWithValue }) => {
    try {
      const itineraryDetails = await getItineraryWithDetails(itineraryId);

      if (!itineraryDetails) {
        return rejectWithValue("Itinerary not found");
      }

      return itineraryDetails;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createItineraryAsync = createAsyncThunk(
  "itineraries/createItinerary",
  async (
    {
      itinerary,
      dayPlans,
      activities,
    }: {
      itinerary: Omit<Itinerary, "id" | "createdAt" | "updatedAt">;
      dayPlans?: Omit<
        DayPlan,
        "id" | "itineraryId" | "createdAt" | "updatedAt"
      >[];
      activities?: {
        [dayPlanIndex: number]: Omit<
          Activity,
          "id" | "dayPlanId" | "createdAt" | "updatedAt"
        >[];
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const createdItinerary = await createItinerary(
        itinerary,
        dayPlans,
        activities
      );

      if (!createdItinerary) {
        return rejectWithValue("Failed to create itinerary");
      }

      return createdItinerary;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateItineraryAsync = createAsyncThunk(
  "itineraries/updateItinerary",
  async (
    {
      itineraryId,
      updatedData,
    }: {
      itineraryId: string;
      updatedData: Partial<Omit<Itinerary, "id" | "createdAt" | "updatedAt">>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedItinerary = await updateItinerary(itineraryId, updatedData);

      if (!updatedItinerary) {
        return rejectWithValue("Failed to update itinerary");
      }

      return updatedItinerary;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveActivityAsync = createAsyncThunk(
  "itineraries/saveActivity",
  async (
    activity: Omit<Activity, "createdAt" | "updatedAt"> & { id?: string },
    { rejectWithValue }
  ) => {
    try {
      const savedActivity = await saveActivity(activity);

      if (!savedActivity) {
        return rejectWithValue("Failed to save activity");
      }

      return savedActivity;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteItineraryAsync = createAsyncThunk(
  "itineraries/deleteItinerary",
  async (itineraryId: string, { rejectWithValue }) => {
    try {
      const success = await deleteItinerary(itineraryId);

      if (!success) {
        return rejectWithValue("Failed to delete itinerary");
      }

      return itineraryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Create itinerary slice
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const itinerarySlice = createSlice({
  name: "itineraries",
  initialState,
  reducers: {
    clearItineraryError: (state) => {
      state.error = null;
    },
    setLastRefreshTime: (state, action) => {
      state.lastRefreshTime = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user itineraries cases
      .addCase(fetchUserItinerariesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserItinerariesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries = action.payload;
        state.lastRefreshTime = new Date();
      })
      .addCase(fetchUserItinerariesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch itinerary with details cases
      .addCase(fetchItineraryWithDetailsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItineraryWithDetailsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItinerary = action.payload;
      })
      .addCase(fetchItineraryWithDetailsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create itinerary cases
      .addCase(createItineraryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createItineraryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries.unshift(action.payload);
      })
      .addCase(createItineraryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update itinerary cases
      .addCase(updateItineraryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateItineraryAsync.fulfilled, (state, action) => {
        state.loading = false;
        const updatedItinerary = action.payload;

        // Update in itineraries array
        state.itineraries = state.itineraries.map((itinerary) =>
          itinerary.id === updatedItinerary.id ? updatedItinerary : itinerary
        );

        // Update currentItinerary if it's the one that was updated
        if (
          state.currentItinerary &&
          state.currentItinerary.itinerary.id === updatedItinerary.id
        ) {
          state.currentItinerary = {
            ...state.currentItinerary,
            itinerary: updatedItinerary,
          };
        }
      })
      .addCase(updateItineraryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Save activity cases
      .addCase(saveActivityAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveActivityAsync.fulfilled, (state) => {
        state.loading = false;
        // If current itinerary is loaded, we need to refresh it
        // This will be handled by re-fetching the itinerary with details
      })
      .addCase(saveActivityAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete itinerary cases
      .addCase(deleteItineraryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteItineraryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries = state.itineraries.filter(
          (itinerary) => itinerary.id !== action.payload
        );
        if (
          state.currentItinerary &&
          state.currentItinerary.itinerary.id === action.payload
        ) {
          state.currentItinerary = null;
        }
      })
      .addCase(deleteItineraryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearItineraryError, setLastRefreshTime } =
  itinerarySlice.actions;
export default itinerarySlice.reducer;
