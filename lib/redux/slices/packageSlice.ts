import {
  deletePackage,
  getFeaturedPackages,
  getPackageById,
  searchPackages,
  updatePackage,
} from "@/lib/package-service";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Define a proper interface for your package data that matches what your Firebase returns
interface Package {
  id: string;
  name: string;
  price: number;
  type: string;
  description?: string;
  image?: string;
  agent: {
    id: string;
    name: string;
    avatar?: string;
  };
  // Add all other fields your packages have
  rating?: number;
  amenities?: string[];
  allinclusive?: boolean;
  roomType?: string;
  bedrooms?: number;
  bathrooms?: number;
  guestCount?: number;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  stayLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

// Helper function to serialize dates
const serializePackage = (pkg: any): Package => {
  return {
    id: pkg.id || "",
    name: pkg.name || "",
    price:
      typeof pkg.price === "number" ? pkg.price : parseFloat(pkg.price) || 0,
    type: pkg.type || "",
    description: pkg.description || "",
    image: pkg.image || pkg.banner_image || "",
    agent: {
      id: pkg.agent?.id || "",
      name: pkg.agent?.name || "Unknown",
      avatar: pkg.agent?.avatar || "",
    },
    rating:
      typeof pkg.rating === "number" ? pkg.rating : parseFloat(pkg.rating) || 0,
    amenities: pkg.amenities || [],
    allinclusive: pkg.allinclusive || pkg.is_all_inclusive || false,
    roomType: pkg.roomType || pkg.room_type || "",
    bedrooms: pkg.bedrooms || pkg.beds || 0,
    bathrooms: pkg.bathrooms || pkg.baths || 0,
    guestCount: pkg.guestCount || pkg.guest_amount || 0,
    checkInDate:
      pkg.check_in_date instanceof Date
        ? pkg.check_in_date.toISOString()
        : pkg.check_in_date || "",
    checkOutDate:
      pkg.check_out_date instanceof Date
        ? pkg.check_out_date.toISOString()
        : pkg.check_out_date || "",
    checkInTime:
      pkg.check_in_time instanceof Date
        ? pkg.check_in_time.toISOString()
        : pkg.check_in_time || "",
    checkOutTime:
      pkg.check_out_time instanceof Date
        ? pkg.check_out_time.toISOString()
        : pkg.check_out_time || "",
    stayLink: pkg.stayLink || pkg.stay_link || "",
    createdAt:
      pkg.createdAt instanceof Date
        ? pkg.createdAt.toISOString()
        : pkg.createdAt || "",
    updatedAt:
      pkg.updatedAt instanceof Date
        ? pkg.updatedAt.toISOString()
        : pkg.updatedAt || "",
  };
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
    { rejectWithValue, getState }
  ) => {
    try {
      // Get current state
      const state = getState() as { packages: PackageState };
      const currentFilter = state.packages.filter;
      const currentQuery = state.packages.query;
      const currentPackages = state.packages.packages;

      // If we're not resetting and we already have packages, check if we need to fetch more
      if (!reset && currentPackages.length > 0) {
        // If filter/query hasn't changed and we have more packages than the offset, return empty array
        if (filter === currentFilter && query === currentQuery && currentPackages.length >= offset) {
          return {
            packages: [],
            reset: false,
            hasMore: state.packages.hasMore,
          };
        }
      }

      const result = await searchPackages(query || "", filter || "All", limit);

      if (!result || !Array.isArray(result)) {
        return { packages: [], reset, hasMore: false };
      }

      // Transform and serialize each package
      const serializedPackages = result.map((pkg) => serializePackage(pkg));

      // If we're not resetting, filter out duplicates
      const newPackages = reset 
        ? serializedPackages 
        : serializedPackages.filter(
            (pkg) => !currentPackages.some((existingPkg) => existingPkg.id === pkg.id)
          );

      return {
        packages: newPackages,
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

      // Transform and serialize each package
      return result.map((pkg) => serializePackage(pkg));
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

      // Transform and serialize the package
      return serializePackage(result);
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

      // Transform and serialize the updated package
      return serializePackage(result);
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
        } else if (packages.length > 0) {
          // Create a map of existing packages for quick lookup
          const existingPackagesMap = new Map(state.packages.map(pkg => [pkg.id, pkg]));
          
          // Add only new packages that don't exist in the map
          const uniqueNewPackages = packages.filter(pkg => !existingPackagesMap.has(pkg.id));
          
          if (uniqueNewPackages.length > 0) {
            state.packages = [...state.packages, ...uniqueNewPackages];
            state.offset = state.packages.length;
          }
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
