// lib/redux/slices/itinerarySlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getUserItineraries,
  getItineraryWithDetails,
  createItinerary,
  updateItinerary,
  saveActivity,
  deleteItinerary,
} from "../../itineraryService";
import {
  Itinerary,
  DayPlan,
  Activity,
  ItineraryWithDetails,
} from "../../models";

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
      return itineraries;
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
      itinerary: Itinerary;
      dayPlans?: Omit<DayPlan, "itineraries_Id">[];
      activities?: { [dayPlanIndex: number]: Omit<Activity, "dayPlansId">[] };
    },
    { rejectWithValue }
  ) => {
    try {
      const createdItinerary = await createItinerary(
        itinerary,
        dayPlans,
        activities
      );
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
      updatedData: Partial<Omit<Itinerary, "$id" | "createdAt">>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedItinerary = await updateItinerary(itineraryId, updatedData);
      return updatedItinerary;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveActivityAsync = createAsyncThunk(
  "itineraries/saveActivity",
  async (activity: Activity, { rejectWithValue }) => {
    try {
      const savedActivity = await saveActivity(activity);
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
      await deleteItinerary(itineraryId);
      return itineraryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Create itinerary slice
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
          itinerary.$id === updatedItinerary.$id ? updatedItinerary : itinerary
        );

        // Update currentItinerary if it's the one that was updated
        if (
          state.currentItinerary &&
          state.currentItinerary.itinerary.$id === updatedItinerary.$id
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
      .addCase(saveActivityAsync.fulfilled, (state, action) => {
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
          (itinerary) => itinerary.$id !== action.payload
        );
        if (
          state.currentItinerary &&
          state.currentItinerary.itinerary.$id === action.payload
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
