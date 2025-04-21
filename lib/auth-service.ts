// lib/firebase/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  applyActionCode,
  checkActionCode,
  User as FirebaseUser,
  AuthError,
  OAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  confirmPasswordReset as firebase_confirmPasswordReset,
  updatePassword as firebase_updatePassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, firestore, COLLECTIONS } from "../lib/firebase/firebase-config";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { Agent, User } from "./firebase/models";
import { getUserProfile } from "./user-service";

// Interface for auth responses
interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  requiresVerification?: boolean;
}

/**
 * Register a new user with email and password
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  isAgent: boolean,
  niche?: string
): Promise<AuthResponse> => {
  try {
    // Validate user inputs
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 128) {
      throw new Error("Full name must be between 1 and 128 characters.");
    }
    if (!trimmedName.includes(" ")) {
      throw new Error("Please enter your full name (first and last).");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format.");
    }

    if (password.length < 8 || password.length > 20) {
      throw new Error("Password must be between 8 and 20 characters.");
    }

    // Check if email already exists in Firestore
    const usersRef = collection(firestore, COLLECTIONS.USERS);
    const emailQuery = query(usersRef, where("email", "==", email));
    const emailExists = await getDocs(emailQuery);

    if (!emailExists.empty) {
      throw new Error("An account with this email already exists.");
    }

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    // Update profile with name
    await updateProfile(firebaseUser, { displayName: trimmedName });

    // Create user document in Firestore
    const userData: Omit<User, "id"> = {
      name: trimmedName,
      email,
      isAgent,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      $id: "",
    };

    await setDoc(doc(firestore, COLLECTIONS.USERS, firebaseUser.uid), userData);

    // If user is an agent, create agent document
    if (isAgent) {
      const agentData: Omit<Agent, "id"> = {
        ...userData,
        niche: niche || "",
        rating: 0,
        reviewCount: 0,
      };

      await setDoc(
        doc(firestore, COLLECTIONS.AGENTS, firebaseUser.uid),
        agentData
      );
    }

    // Send verification email
    const continuationUrl =
      Platform.OS === "web"
        ? `${window.location.origin}/verify-email`
        : `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/verify-email`;

    await sendEmailVerification(firebaseUser, {
      url: continuationUrl,
      handleCodeInApp: true,
    });

    return {
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      userId: firebaseUser.uid,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Login with email and password
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format.");
    }

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    // Check if email is verified directly from Firebase Auth
    if (!firebaseUser.emailVerified) {
      // Sign out since email isn't verified
      await signOut(auth);
      return {
        success: false,
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        userId: firebaseUser.uid,
      };
    }

    // Update the last login time in the user document
    const userRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
    await updateDoc(userRef, {
      updatedAt: new Date(),
    });

    return { success: true, message: "Login successful!" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Login with Google
 */
export const loginWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const provider = new GoogleAuthProvider();

    if (Platform.OS === "web") {
      // Web implementation
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      await handleGoogleUserData(firebaseUser);
      return { success: true, message: "Google login successful!" };
    } else {
      // Mobile implementation with redirect
      await signInWithRedirect(auth, provider);
      const result = await getRedirectResult(auth);

      if (result && result.user) {
        await handleGoogleUserData(result.user);
        return { success: true, message: "Google login successful!" };
      }

      return {
        success: false,
        message: "Google login failed or was cancelled",
      };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Helper function to handle Google auth user data
 */
async function handleGoogleUserData(firebaseUser: FirebaseUser): Promise<void> {
  // Check if user already exists in Firestore
  const userRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Create new user document
    const userData: Omit<User, "id"> = {
      name: firebaseUser.displayName || "Google User",
      email: firebaseUser.email || "",
      avatar: firebaseUser.photoURL || undefined,
      isAgent: false,
      isEmailVerified: true, // Google OAuth users are pre-verified
      createdAt: new Date(),
      updatedAt: new Date(),
      $id: "",
    };

    await setDoc(userRef, userData);
  } else {
    // Update last login time
    await updateDoc(userRef, {
      updatedAt: new Date(),
    });
  }
}

/**
 * Logout current user
 */
export const logout = async (): Promise<boolean> => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
};

/**
 * Get current authenticated user with additional Firestore data
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First, check Firebase's current user
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      // Try to restore session via onAuthStateChanged
      return await new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          async (user) => {
            unsubscribe(); // Immediately unsubscribe

            if (user) {
              try {
                const userData = await getUserProfile(user.uid);
                resolve(userData);
              } catch (error) {
                console.error("Error fetching user profile:", error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          },
          (error) => {
            console.error("Auth state change error:", error);
            reject(error);
          }
        );

        // Timeout if auth state doesn't resolve
        setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 5000);
      });
    }

    // Existing logic for getting user details
    const userRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as Omit<User, "id">;

    return {
      id: firebaseUser.uid,
      $id: firebaseUser.uid,
      name: userData.name || firebaseUser.displayName || "",
      email: userData.email || firebaseUser.email || "",
      avatar: userData.avatar || firebaseUser.photoURL || undefined,
      isAgent: userData.isAgent || false,
      isAgentTemp: userData.isAgentTemp || false,
      isEmailVerified: firebaseUser.emailVerified,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<boolean> => {
  try {
    // Update user document in Firestore
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date(),
    });

    // If user is an agent, update agent document as well
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      await updateDoc(agentRef, {
        ...updates,
        updatedAt: new Date(),
      });
    }

    // Update Firebase Auth profile if name is being updated
    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updates.name,
      });
    }

    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};

/**
 * Send password reset email
 */
export const sendResetPasswordEmail = async (
  email: string
): Promise<AuthResponse> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: "Password reset email sent. Please check your inbox.",
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Send verification email to current user
 */
export const resendVerificationEmail = async (): Promise<AuthResponse> => {
  try {
    if (!auth.currentUser) {
      return { success: false, message: "No user is currently signed in." };
    }

    await sendEmailVerification(auth.currentUser, {
      url:
        Platform.OS === "web"
          ? Linking.createURL("verify-email")
          : `${Linking.createURL("verify-email")}`,
      handleCodeInApp: true,
    });

    return {
      success: true,
      message: "Verification email sent. Please check your inbox.",
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Verify email with action code from link
 */
export const verifyEmail = async (
  actionCode: string
): Promise<AuthResponse> => {
  try {
    // Check that the action code is valid
    await checkActionCode(auth, actionCode);

    // Apply the verification code
    await applyActionCode(auth, actionCode);

    // If user is signed in, update Firestore
    if (auth.currentUser) {
      const userRef = doc(firestore, COLLECTIONS.USERS, auth.currentUser.uid);
      await updateDoc(userRef, {
        isEmailVerified: true,
        updatedAt: new Date(),
      });
    }

    return {
      success: true,
      message: "Email successfully verified. You can now sign in.",
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Check if a user is an agent
 */
export const checkIsAgent = async (
  userId: string
): Promise<{ isAgent: boolean; agentId: string | null }> => {
  try {
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      return { isAgent: true, agentId: userId };
    }

    return { isAgent: false, agentId: null };
  } catch (error) {
    console.error("Error checking if user is agent:", error);
    return { isAgent: false, agentId: null };
  }
};

/**
 * Update user password
 */
export const updatePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return {
        success: false,
        message: "No user is currently signed in or user has no email.",
      };
    }

    // Validate new password
    if (newPassword.length < 8 || newPassword.length > 20) {
      return {
        success: false,
        message: "New password must be between 8 and 20 characters.",
      };
    }

    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    try {
      await reauthenticateWithCredential(user, credential);
    } catch (authError) {
      return {
        success: false,
        message: "Current password is incorrect. Please try again.",
      };
    }

    // Use the imported function from firebase/auth
    await firebase_updatePassword(user, newPassword);

    // Update user document with timestamp
    const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
    await updateDoc(userRef, {
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: "Password updated successfully.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update password.",
    };
  }
};

/**
 * Confirm password reset with code
 */
export const confirmPasswordReset = async (
  code: string,
  newPassword: string
): Promise<AuthResponse> => {
  try {
    // Validate password
    if (newPassword.length < 8 || newPassword.length > 20) {
      throw new Error("Password must be between 8 and 20 characters.");
    }

    // Check that the code is valid
    await checkActionCode(auth, code);

    // Apply the reset code - use the imported function instead of auth.confirmPasswordReset
    await firebase_confirmPasswordReset(auth, code, newPassword);

    return {
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.message ||
        "Failed to reset password. The link may be invalid or expired.",
    };
  }
};
