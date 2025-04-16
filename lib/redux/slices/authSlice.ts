// lib/redux/slices/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  loginUser,
  registerUser,
  getCurrentUser,
  logout,
  loginWGoogle,
  updateUser,
} from "../../appwrite";

// Define interfaces for state
interface User {
  $id: string;
  name: string;
  email: string;
  avatar?: string;
  isAgent: boolean;
  isAgentTemp?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: true, // Start with loading true to prevent flash of login screen
  isAuthenticated: false,
  error: null,
};

// Async thunks for authentication
// In lib/redux/slices/authSlice.ts, update the loginUserAsync function
export const loginUserAsync = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      console.log("Auth Slice: Attempting login");
      const response = await loginUser(email, password);

      if (response.success) {
        console.log("Auth Slice: Login successful, fetching user data");

        // Add a small delay to ensure the Appwrite session is fully established
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Fetch complete user data
        const userData = await getCurrentUser();
        console.log("Auth Slice: User data fetched", userData);

        return userData;
      }

      console.log("Auth Slice: Login failed", response.message);
      return rejectWithValue(response.message);
    } catch (error: any) {
      console.error("Auth Slice: Login error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const registerUserAsync = createAsyncThunk(
  "auth/register",
  async (
    {
      name,
      email,
      password,
      isAgent,
      cPassword,
      niche,
    }: {
      name: string;
      email: string;
      password: string;
      isAgent: boolean;
      cPassword: string;
      niche: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log("Auth Slice: Attempting registration");
      const response = await registerUser(
        name,
        email,
        password,
        isAgent,
        cPassword,
        niche
      );

      if (response.success) {
        console.log("Auth Slice: Registration successful, logging in");
        // If registration is successful, login
        const loginResponse = await loginUser(email, password);
        if (loginResponse.success) {
          const userData = await getCurrentUser();
          return userData;
        }
        return rejectWithValue(loginResponse.message);
      }

      console.log("Auth Slice: Registration failed", response.message);
      return rejectWithValue(response.message);
    } catch (error: any) {
      console.error("Auth Slice: Registration error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const loginWithGoogleAsync = createAsyncThunk(
  "auth/googleLogin",
  async (_, { rejectWithValue }) => {
    try {
      console.log("Auth Slice: Attempting Google login");
      const success = await loginWGoogle();

      if (success) {
        console.log("Auth Slice: Google login successful, fetching user data");
        const userData = await getCurrentUser();
        console.log("Auth Slice: User data fetched", userData);
        return userData;
      }

      console.log("Auth Slice: Google login failed");
      return rejectWithValue("Google login failed");
    } catch (error: any) {
      console.error("Auth Slice: Google login error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const logoutAsync = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      console.log("Auth Slice: Logging out");
      await logout();
      console.log("Auth Slice: Logout successful");
      return null;
    } catch (error: any) {
      console.error("Auth Slice: Logout error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCurrentUserAsync = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      console.log("Auth Slice: Fetching current user");
      const userData = await getCurrentUser();
      console.log("Auth Slice: Current user data", userData);
      return userData;
    } catch (error: any) {
      console.error("Auth Slice: Fetch current user error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserAsync = createAsyncThunk(
  "auth/updateUser",
  async (
    { userId, updates }: { userId: string; updates: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      console.log("Auth Slice: Updating user", userId);
      const response = await updateUser(userId, updates);
      console.log("Auth Slice: User update successful");
      return response;
    } catch (error: any) {
      console.error("Auth Slice: User update error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

// Create auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Any synchronous reducers go here
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUserAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
        console.log(
          "Auth Slice Reducer: Login successful, authenticated:",
          !!action.payload
        );
      })
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log("Auth Slice Reducer: Login rejected", action.payload);
      })

      // Register cases
      .addCase(registerUserAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUserAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
        console.log(
          "Auth Slice Reducer: Registration successful, authenticated:",
          !!action.payload
        );
      })
      .addCase(registerUserAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log(
          "Auth Slice Reducer: Registration rejected",
          action.payload
        );
      })

      // Google login cases
      .addCase(loginWithGoogleAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogleAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
        console.log(
          "Auth Slice Reducer: Google login successful, authenticated:",
          !!action.payload
        );
      })
      .addCase(loginWithGoogleAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log(
          "Auth Slice Reducer: Google login rejected",
          action.payload
        );
      })

      // Logout cases
      .addCase(logoutAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        console.log("Auth Slice Reducer: Logout successful");
      })
      .addCase(logoutAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log("Auth Slice Reducer: Logout rejected", action.payload);
      })

      // Fetch current user cases
      .addCase(fetchCurrentUserAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUserAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        console.log(
          "Auth Slice Reducer: Current user fetched, authenticated:",
          !!action.payload
        );
      })
      .addCase(fetchCurrentUserAsync.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        console.log(
          "Auth Slice Reducer: Current user fetch failed, not authenticated"
        );
      })

      // Update user cases
      .addCase(updateUserAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user = { ...state.user, ...action.payload } as User;
        }
        console.log("Auth Slice Reducer: User updated", action.payload);
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log("Auth Slice Reducer: User update rejected", action.payload);
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
