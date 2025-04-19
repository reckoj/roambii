import {
  deletePackage,
  getFeaturedPackages,
  getPackageById,
  searchPackages,
  updatePackage,
} from "@/lib/package-service"; // Updated import path to use new firebase services

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Package } from "@/lib/firebase/models"; // Import the Package type from Firebase models

interface PackageState {
  packages: Package[];
  featuredPackages: Package[];
  currentPackage: Package | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  offset: number;
  error: string | null;
  filter: string;
  query: string;
}

// Initial state
const initialState: PackageState = {
  packages: [],
  featuredPackages: [],
  currentPackage: null,
  loading: false,
  loadingMore: false,
  hasMore: true,
  offset: 0,
  error: null,
  filter: "",
  query: "",
};

// Async thunks for packages
export const fetchPackagesAsync = createAsyncThunk(
  "packages/fetchPackages",
  async (
    {
      filter,
      query,
      limit = 6,
      offset = 0,
      reset = false,
    }: {
      filter?: string;
      query?: string;
      limit?: number;
      offset?: number;
      reset?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await searchPackages(
        query || "",
        filter || "All",
        limit.toString()
      );

      if (!result || !Array.isArray(result)) {
        return { packages: [], reset, hasMore: false };
      }

      return {
        packages: result,
        reset,
        hasMore: result.length === limit,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchFeaturedPackagesAsync = createAsyncThunk(
  "packages/fetchFeaturedPackages",
  async (_, { rejectWithValue }) => {
    try {
      const result = await getFeaturedPackages();

      if (!result || !Array.isArray(result)) {
        return [];
      }

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPackageByIdAsync = createAsyncThunk(
  "packages/fetchPackageById",
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await getPackageById(id);

      if (!result) {
        return rejectWithValue("Package not found");
      }

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deletePackageAsync = createAsyncThunk(
  "packages/deletePackage",
  async (id: string, { rejectWithValue }) => {
    try {
      const success = await deletePackage(id);
      if (success) {
        return id;
      }
      return rejectWithValue("Failed to delete package");
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePackageAsync = createAsyncThunk(
  "packages/updatePackage",
  async (
    {
      id,
      data,
      newImageUri,
    }: { id: string; data: Partial<Package>; newImageUri?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await updatePackage(id, data, newImageUri);

      if (!result) {
        return rejectWithValue("Failed to update package");
      }

      // Return the updated package
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Create packages slice
const packageSlice = createSlice({
  name: "packages",
  initialState,
  reducers: {
    clearPackageError: (state) => {
      state.error = null;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setQuery: (state, action) => {
      state.query = action.payload;
    },
    resetPackages: (state) => {
      state.packages = [];
      state.offset = 0;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch packages cases
      .addCase(fetchPackagesAsync.pending, (state, action) => {
        const { meta } = action;
        const { reset = false } = meta.arg || {};
        if (reset) {
          state.loading = true;
        } else {
          state.loadingMore = true;
        }
        state.error = null;
      })
      .addCase(fetchPackagesAsync.fulfilled, (state, action) => {
        const { packages, reset, hasMore } = action.payload;
        state.loading = false;
        state.loadingMore = false;
        state.hasMore = hasMore;

        if (reset) {
          state.packages = packages;
          state.offset = packages.length;
        } else {
          // Filter out duplicates when adding more packages
          const newPackages = packages.filter(
            (pkg) =>
              !state.packages.some((existingPkg) => existingPkg.id === pkg.id)
          );
          state.packages = [...state.packages, ...newPackages];
          state.offset += packages.length;
        }
      })
      .addCase(fetchPackagesAsync.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload as string;
      })

      // Fetch featured packages cases
      .addCase(fetchFeaturedPackagesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedPackagesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredPackages = action.payload;
      })
      .addCase(fetchFeaturedPackagesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch package by ID cases
      .addCase(fetchPackageByIdAsync.pending, (state) => {
        state.loading = true;
        state.currentPackage = null;
        state.error = null;
      })
      .addCase(fetchPackageByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPackage = action.payload;
      })
      .addCase(fetchPackageByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete package cases
      .addCase(deletePackageAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePackageAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = state.packages.filter(
          (pkg) => pkg.id !== action.payload
        );
        state.featuredPackages = state.featuredPackages.filter(
          (pkg) => pkg.id !== action.payload
        );
        if (
          state.currentPackage &&
          state.currentPackage.id === action.payload
        ) {
          state.currentPackage = null;
        }
      })
      .addCase(deletePackageAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update package cases
      .addCase(updatePackageAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePackageAsync.fulfilled, (state, action) => {
        state.loading = false;
        const updatedPackage = action.payload;

        // Update in packages array
        state.packages = state.packages.map((pkg) =>
          pkg.id === updatedPackage.id ? updatedPackage : pkg
        );

        // Update in featured packages if present
        state.featuredPackages = state.featuredPackages.map((pkg) =>
          pkg.id === updatedPackage.id ? updatedPackage : pkg
        );

        // Update current package if it's the one that was updated
        if (
          state.currentPackage &&
          state.currentPackage.id === updatedPackage.id
        ) {
          state.currentPackage = updatedPackage;
        }
      })
      .addCase(updatePackageAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPackageError, setFilter, setQuery, resetPackages } =
  packageSlice.actions;
export default packageSlice.reducer;
