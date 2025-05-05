// lib/redux/slices/authSlice.ts
import {
  confirmPasswordReset,
  getCurrentUser,
  loginUser,
  loginWithGoogle,
  logout,
  registerUser,
  sendResetPasswordEmail,
  updateUser,
  updatePassword,
} from "@/lib/auth-service";
import { User as FirebaseUser } from "@/lib/firebase/models"; // Import the Firebase User type
import { uploadProfileImage } from "@/lib/storage-service";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Define interfaces for Redux state
// Make sure it's compatible with Firebase User model
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAgent: boolean;
  isAgentTemp?: boolean;
  // Add any additional fields needed for the UI
}

// Define interface for registration response
interface RegistrationResponse {
  registrationComplete: boolean;
  requiresVerification: boolean;
  userId?: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  passwordResetSent: boolean;
  passwordResetSuccess: boolean;
  passwordResetError: string | null;
  passwordResetLoading: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: true, // Start with loading true to prevent flash of login screen
  isAuthenticated: false,
  error: null,
  passwordResetSent: false,
  passwordResetSuccess: false,
  passwordResetError: null,
  passwordResetLoading: false,
};

// Helper function to convert Firebase User to Redux User
const convertFirebaseUserToReduxUser = (
  firebaseUser: FirebaseUser | null
): User | null => {
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.id,
    name: firebaseUser.name,
    email: firebaseUser.email,
    avatar: firebaseUser.avatar,
    isAgent: firebaseUser.isAgent || false,
    isAgentTemp: firebaseUser.isAgentTemp || false,
  };
};

// Async thunks for authentication
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

        // Add a small delay to ensure the Firebase auth session is fully established
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Fetch complete user data
        const userData = await getCurrentUser();
        console.log("Auth Slice: User data fetched", userData);

        // Convert to Redux user format
        return convertFirebaseUserToReduxUser(userData);
      }

      console.log("Auth Slice: Login failed", response.message);
      return rejectWithValue(response.message);
    } catch (error: any) {
      console.error("Auth Slice: Login error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const registerUserAsync = createAsyncThunk<
  RegistrationResponse, // Define return type explicitly
  {
    name: string;
    email: string;
    password: string;
    isAgent: boolean;
    cPassword: string;
    niche?: string;
  },
  { rejectValue: string }
>(
  "auth/register",
  async (
    { name, email, password, isAgent, cPassword, niche },
    { rejectWithValue }
  ) => {
    try {
      console.log("Auth Slice: Attempting registration");
      const response = await registerUser(
        name,
        email,
        password,
        isAgent,
        niche
      );

      if (response.success) {
        console.log(
          "Auth Slice: Registration successful, returning userId for verification"
        );
        // Instead of trying to login, just return the userId and email for verification
        return {
          registrationComplete: true,
          requiresVerification: true,
          userId: response.userId,
          email: email,
        };
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
      const response = await loginWithGoogle();

      if (response.success) {
        console.log("Auth Slice: Google login successful, fetching user data");
        const userData = await getCurrentUser();
        console.log("Auth Slice: User data fetched", userData);
        return convertFirebaseUserToReduxUser(userData);
      }

      console.log("Auth Slice: Google login failed");
      return rejectWithValue(response.message || "Google login failed");
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
      // Wait a bit to ensure Firebase is fully initialized
      await new Promise((resolve) => setTimeout(resolve, 300));

      const userData = await getCurrentUser();

      if (!userData) {
        return rejectWithValue("No authenticated user");
      }

      return convertFirebaseUserToReduxUser(userData);
    } catch (error: any) {
      console.error("Failed to fetch current user", error);
      return rejectWithValue(error.message);
    }
  }
);

// Update this function in your authSlice.ts file
export const updateUserAsync = createAsyncThunk(
  "auth/updateUser",
  async (
    {
      userId,
      updates,
      imageUri,
    }: {
      userId: string;
      updates: Partial<User>;
      imageUri?: string; // Add optional image URI parameter
    },
    { rejectWithValue }
  ) => {
    try {
      console.log("Auth Slice: Updating user", userId);
      let finalUpdates = { ...updates };

      // If imageUri is provided, upload it first
      if (imageUri) {
        console.log("Auth Slice: Uploading profile image");
        try {
          const avatarUrl = await uploadProfileImage(userId, imageUri);

          if (avatarUrl) {
            console.log("Auth Slice: Image upload successful, URL:", avatarUrl);
            // Add the avatar URL to the updates
            finalUpdates.avatar = avatarUrl;
          } else {
            console.log(
              "Auth Slice: Failed to upload profile image - null URL returned"
            );
            return rejectWithValue("Failed to upload profile image");
          }
        } catch (uploadError) {
          console.error("Auth Slice: Image upload error:", uploadError);
          return rejectWithValue("Error uploading profile image");
        }
      }

      // Now update the user with all changes including the new avatar URL if applicable
      const success = await updateUser(userId, finalUpdates);

      if (success) {
        console.log(
          "Auth Slice: User update successful with updates:",
          finalUpdates
        );
        return finalUpdates;
      } else {
        console.log("Auth Slice: User update failed");
        return rejectWithValue("Failed to update user");
      }
    } catch (error: any) {
      console.error("Auth Slice: User update error", error);
      return rejectWithValue(error.message || "Unknown error updating user");
    }
  }
);

// New thunk for forgot password
export const sendPasswordResetEmailAsync = createAsyncThunk(
  "auth/sendPasswordResetEmail",
  async (email: string, { rejectWithValue }) => {
    try {
      console.log("Auth Slice: Sending password reset email");
      const response = await sendResetPasswordEmail(email);

      return response;
    } catch (error: any) {
      console.error("Auth Slice: Password reset error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const updatePasswordAsync = createAsyncThunk(
  "auth/updatePassword",
  async (
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("Auth Slice: Updating password");
      const response = await updatePassword(currentPassword, newPassword);

      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      console.error("Auth Slice: Update password error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

// New thunk for confirming password reset
export const confirmPasswordResetAsync = createAsyncThunk(
  "auth/confirmPasswordReset",
  async (
    { code, newPassword }: { code: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("Auth Slice: Confirming password reset");
      const response = await confirmPasswordReset(code, newPassword);

      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      console.error("Auth Slice: Confirm password reset error", error.message);
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
    clearPasswordResetState: (state) => {
      state.passwordResetSent = false;
      state.passwordResetSuccess = false;
      state.passwordResetError = null;
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

        // Check if this is a registration that requires verification
        if (action.payload && action.payload.requiresVerification) {
          // Don't set the user as authenticated yet
          state.user = null;
          state.isAuthenticated = false;
          state.error = null;
          console.log(
            "Auth Slice Reducer: Registration successful, verification required"
          );
        } else if (action.payload && !action.payload.requiresVerification) {
          // This is a theoretical case where verification might not be required
          // and we have a user object in the payload
          state.isAuthenticated = true;
          state.error = null;
          console.log(
            "Auth Slice Reducer: Registration successful, authenticated immediately"
          );
        }
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
          // Create a new user object with the updates
          state.user = {
            ...state.user,
            ...action.payload,
            // Ensure required properties aren't overwritten with undefined
            id: state.user.id,
            name: action.payload.name || state.user.name,
            email: action.payload.email || state.user.email,
            isAgent:
              action.payload.isAgent !== undefined
                ? action.payload.isAgent
                : state.user.isAgent,
          };
        }
        console.log("Auth Slice Reducer: User updated", action.payload);
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log("Auth Slice Reducer: User update rejected", action.payload);
      })
      // Send password reset email cases
      .addCase(sendPasswordResetEmailAsync.pending, (state) => {
        state.passwordResetLoading = true;
        state.passwordResetError = null;
        state.passwordResetSent = false;
      })
      .addCase(sendPasswordResetEmailAsync.fulfilled, (state, action) => {
        state.passwordResetLoading = false;
        state.passwordResetSent = true;
        state.passwordResetError = null;
        console.log(
          "Auth Slice Reducer: Password reset email sent successfully"
        );
      })
      .addCase(updatePasswordAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePasswordAsync.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        console.log("Auth Slice Reducer: Password updated successfully");
      })
      .addCase(updatePasswordAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.log(
          "Auth Slice Reducer: Password update failed",
          action.payload
        );
      });
  },
});

export const { clearAuthError, clearPasswordResetState } = authSlice.actions;
export default authSlice.reducer;
