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
  DocumentReference,
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
 * Verification status enum
 */
export enum VerificationStatus {
  VERIFIED = 'verified',
  ALREADY_VERIFIED = 'already-verified',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  FAILED = 'failed'
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

    // Create user in Firebase Authentication first
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    try {
      // Update profile with name
      await updateProfile(firebaseUser, { displayName: trimmedName });

      // Create user document in Firestore
      const userData = {
        id: firebaseUser.uid,
        name: trimmedName,
        email,
        isAgent,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create user document
      await setDoc(doc(firestore, COLLECTIONS.USERS, firebaseUser.uid), userData);

      // If user is an agent, create agent document
      if (isAgent) {
        const agentData = {
          id: firebaseUser.uid,
          userId: firebaseUser.uid,
          name: trimmedName,
          email,
          bio: "",
          yearsOfExperience: 0,
          region: "",
          languages: [],
          specialties: [],
          niche: niche || "",
          rating: 0,
          reviewCount: 0,
          isProfileComplete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create agent document
        await setDoc(doc(firestore, COLLECTIONS.AGENTS, firebaseUser.uid), agentData);
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
        message: "Registration successful! Please check your email to verify your account.",
        userId: firebaseUser.uid,
      };
    } catch (error) {
      // If anything fails after user creation, delete the user
      await firebaseUser.delete();
      throw error;
    }
  } catch (error: any) {
    console.error("Registration error:", error);
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
 * Get the currently authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  console.log("getCurrentUser: Starting to fetch current user");
  
  // Add a small delay to ensure auth state is ready
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // First check if auth is initialized
  if (!auth) {
    console.error("getCurrentUser: Firebase auth not initialized");
    return null;
  }
  
  try {
    // Get the current Firebase user
    const firebaseUser = auth.currentUser;
    console.log("getCurrentUser: Firebase auth.currentUser check:", firebaseUser ? "User found" : "No user");

    if (!firebaseUser) {
      console.log("getCurrentUser: No authenticated user found");
      return null;
    }

    // Get the user document from Firestore
    console.log("getCurrentUser: Fetching user document from Firestore");
    const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, firebaseUser.uid));

    if (!userDoc.exists()) {
      console.log("getCurrentUser: User doc not found in Firestore");
      // Create basic user profile if not exists (fallback)
      try {
        const basicUserData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          avatar: firebaseUser.photoURL || undefined,
          isAgent: false,
          isEmailVerified: firebaseUser.emailVerified,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Create user document as fallback
        await setDoc(doc(firestore, COLLECTIONS.USERS, firebaseUser.uid), basicUserData);
        console.log("getCurrentUser: Created basic user profile as fallback");
        return basicUserData as User;
      } catch (err) {
        console.error("getCurrentUser: Failed to create fallback user profile", err);
        return null;
      }
    }

    // Merge Firebase user and Firestore data
    console.log("getCurrentUser: Successfully fetched user document");
    const userData = userDoc.data() as User;
    
    const mergedUser: User = {
      ...userData,
      id: firebaseUser.uid,
      $id: firebaseUser.uid,
      isEmailVerified: firebaseUser.emailVerified,
    };

    console.log("getCurrentUser: Returning merged user data");
    return mergedUser;
  } catch (error) {
    console.error("getCurrentUser: Error fetching user data", error);
    return null;
  }
};

/**
 * Update user profile with enhanced error handling and Firebase Auth synchronization
 */
export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<boolean> => {
  try {
    console.log(
      "Updating user:",
      userId,
      "with updates:",
      JSON.stringify(updates)
    );

    // First find the user document - multiple strategies for backward compatibility
    let userDocRef: DocumentReference | null = null;

    // Strategy 1: Direct ID lookup
    const directRef = doc(firestore, COLLECTIONS.USERS, userId);
    const directDoc = await getDoc(directRef);

    if (directDoc.exists()) {
      console.log("Found user document via direct ID");
      userDocRef = directRef;
    } else {
      // Strategy 2: Query by userId field
      console.log("Direct ID lookup failed, trying userId field");
      const usersRef = collection(firestore, COLLECTIONS.USERS);
      const q = query(usersRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        userDocRef = querySnapshot.docs[0].ref;
        console.log("Found user document via userId field");
      } else {
        // Strategy 3: Try email if auth.currentUser is available
        if (auth.currentUser?.email) {
          console.log("Trying to find user by email:", auth.currentUser.email);
          const emailQuery = query(
            usersRef,
            where("email", "==", auth.currentUser.email)
          );
          const emailSnapshot = await getDocs(emailQuery);

          if (!emailSnapshot.empty) {
            userDocRef = emailSnapshot.docs[0].ref;
            console.log("Found user document via email");
          }
        }
      }
    }

    if (!userDocRef) {
      console.error("Failed to find user document for update");
      return false;
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update the user document
    await updateDoc(userDocRef, updateData);
    console.log("Updated user document in Firestore");

    // Update Firebase Auth profile if relevant fields are being updated
    if (auth.currentUser) {
      const authUpdates: any = {};
      let needsAuthUpdate = false;

      if (updates.name) {
        authUpdates.displayName = updates.name;
        needsAuthUpdate = true;
      }

      if (updates.avatar) {
        authUpdates.photoURL = updates.avatar;
        needsAuthUpdate = true;
      }

      if (needsAuthUpdate) {
        try {
          await updateProfile(auth.currentUser, authUpdates);
          console.log("Updated Firebase Auth profile");
        } catch (authError) {
          console.warn("Failed to update Firebase Auth profile:", authError);
          // Continue since Firestore update was successful
        }
      }
    }

    // If user is an agent, update agent document as well
    if (updates.avatar || updates.name) {
      try {
        // First check if user is an agent by document ID
        const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
        const agentDoc = await getDoc(agentRef);

        if (agentDoc.exists()) {
          const agentUpdates: any = {};
          if (updates.avatar) agentUpdates.avatar = updates.avatar;
          if (updates.name) agentUpdates.name = updates.name;
          agentUpdates.updatedAt = new Date();

          await updateDoc(agentRef, agentUpdates);
          console.log("Updated agent document");
        } else {
          // Try to find agent by userId
          const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
          const q = query(agentsRef, where("userId", "==", userId));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const agentDoc = querySnapshot.docs[0];
            const agentUpdates: any = {};
            if (updates.avatar) agentUpdates.avatar = updates.avatar;
            if (updates.name) agentUpdates.name = updates.name;
            agentUpdates.updatedAt = new Date();

            await updateDoc(agentDoc.ref, agentUpdates);
            console.log("Updated agent document via userId");
          }
        }
      } catch (agentError) {
        console.warn("Failed to update agent document:", agentError);
        // Continue since the user update was successful
      }
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

/**
 * Handle email verification from deep link
 */
export const handleVerificationDeepLink = async (
  url: string
): Promise<{ success: boolean; message: string; status: VerificationStatus }> => {
  try {
    // Parse action code from URL
    const actionCode = url.split('oobCode=')[1]?.split('&')[0];
    
    if (!actionCode) {
      return {
        success: false,
        message: 'Invalid verification link. Please request a new verification email.',
        status: VerificationStatus.INVALID
      };
    }

    try {
      // Check the action code first
      await checkActionCode(auth, actionCode);
      
      // Apply the verification code
      await applyActionCode(auth, actionCode);
      
      // Get current user
      const user = auth.currentUser;
      
      // If user is signed in, reload to update the emailVerified status
      if (user) {
        await user.reload();
        
        if (user.emailVerified) {
          // Update user document in Firestore
          const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
          await updateDoc(userRef, {
            isEmailVerified: true,
            updatedAt: new Date()
          });
          
          return {
            success: true,
            message: 'Your email has been verified! You can now use all features of the app.',
            status: VerificationStatus.VERIFIED
          };
        } else {
          return {
            success: false,
            message: 'Email verification applied but your account shows as not verified. Please try signing in again.',
            status: VerificationStatus.FAILED
          };
        }
      }
      
      return {
        success: true,
        message: 'Your email has been verified! Please sign in to continue.',
        status: VerificationStatus.VERIFIED
      };
    } catch (error: any) {
      console.error('Error verifying email:', error);
      const errorCode = error.code;
      
      if (errorCode === 'auth/invalid-action-code') {
        return {
          success: false,
          message: 'Invalid verification link. Please request a new verification email.',
          status: VerificationStatus.INVALID
        };
      } else if (errorCode === 'auth/expired-action-code') {
        return {
          success: false,
          message: 'This verification link has expired. Please request a new verification email.',
          status: VerificationStatus.EXPIRED
        };
      } else if (errorCode === 'auth/user-disabled') {
        return {
          success: false,
          message: 'This account has been disabled. Please contact support.',
          status: VerificationStatus.FAILED
        };
      } else {
        return {
          success: false,
          message: 'Failed to verify email. Please try again or request a new verification email.',
          status: VerificationStatus.FAILED
        };
      }
    }
  } catch (error: any) {
    console.error('Error handling verification deep link:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
      status: VerificationStatus.FAILED
    };
  }
};
