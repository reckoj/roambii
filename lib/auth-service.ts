import { account, databases, config, client } from "./appwrite-config"; // Import from your existing config file
import { ID, Query } from "react-native-appwrite";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

// Status of email verification
export enum VerificationStatus {
  VERIFIED = "verified",
  PENDING = "pending",
  FAILED = "failed",
}

// Interfaces
export interface VerificationResult {
  success: boolean;
  message: string;
  status?: VerificationStatus;
}

/**
 * Send verification email to the user after registration
 */
export const sendVerificationEmail = async (): Promise<VerificationResult> => {
  try {
    // Get the redirect URL for your app
    // Using both app scheme and web URL formats for better compatibility
    const redirectUrl =
      Platform.OS === "web"
        ? Linking.createURL("verify-email")
        : `${Linking.createURL("verify-email")}`;

    console.log("Verification redirect URL:", redirectUrl);

    // Send verification email
    await account.createVerification(redirectUrl);

    return {
      success: true,
      message: "Verification email sent successfully!",
      status: VerificationStatus.PENDING,
    };
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return {
      success: false,
      message: error.message || "Failed to send verification email",
      status: VerificationStatus.FAILED,
    };
  }
};

/**
 * Complete email verification process with the token from the URL
 */
export const completeEmailVerification = async (
  userId: string,
  secret: string
): Promise<VerificationResult> => {
  try {
    // Complete verification using Appwrite
    await account.updateVerification(userId, secret);

    // Update user's verification status in the database
    const userDocs = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", userId)]
    );

    if (userDocs.total > 0) {
      const userDocId = userDocs.documents[0].$id;
      await databases.updateDocument(
        config.databaseId!,
        config.usersCollectionId!,
        userDocId,
        { isEmailVerified: true }
      );
    }

    return {
      success: true,
      message: "Email verification completed successfully!",
      status: VerificationStatus.VERIFIED,
    };
  } catch (error: any) {
    console.error("Error completing verification:", error);
    return {
      success: false,
      message: error.message || "Failed to verify email",
      status: VerificationStatus.FAILED,
    };
  }
};

/**
 * Check if user's email is verified
 */
export const checkEmailVerificationStatus = async (
  userId: string
): Promise<boolean> => {
  try {
    // First check in Appwrite auth (if the email is verified at Appwrite level)
    const user = await account.get();

    // Then check our database record
    const userDocs = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", userId)]
    );

    if (userDocs.total === 0) return false;

    return !!userDocs.documents[0].isEmailVerified;
  } catch (error) {
    console.error("Error checking verification status:", error);
    return false;
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail =
  async (): Promise<VerificationResult> => {
    return sendVerificationEmail();
  };

/**
 * Handle deep link for email verification
 */
export const handleVerificationDeepLink = async (
  url: string
): Promise<VerificationResult> => {
  try {
    const parsedUrl = new URL(url);
    const userId = parsedUrl.searchParams.get("userId");
    const secret = parsedUrl.searchParams.get("secret");

    if (!userId || !secret) {
      throw new Error("Invalid verification link");
    }

    return await completeEmailVerification(userId, secret);
  } catch (error: any) {
    console.error("Error handling verification deep link:", error);
    return {
      success: false,
      message: error.message || "Failed to process verification link",
      status: VerificationStatus.FAILED,
    };
  }
};

/**
 * Modified registration function that includes email verification
 */
export const registerUserWithVerification = async (
  name: string,
  email: string,
  password: string,
  isAgent: boolean,
  cPassword: string,
  niche: string
): Promise<{
  success: boolean;
  message: string;
  verificationSent?: boolean;
  userId?: string;
}> => {
  try {
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 128)
      throw new Error("Full name must be between 1 and 128 characters.");
    if (!trimmedName.includes(" "))
      throw new Error("Please enter your full name (first and last).");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format.");

    if (password.length < 8 || password.length > 20)
      throw new Error("Password must be between 8 and 20 characters.");
    if (cPassword != password) {
      throw new Error("Password must match.");
    }

    // Check if email is already registered
    const existingUser = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("email", email)]
    );

    if (existingUser.documents.length > 0) {
      throw new Error("An account with this email already exists.");
    }

    // Create user in Appwrite Authentication
    const user = await account.create(
      ID.unique(),
      email,
      password,
      trimmedName
    );
    if (!user) throw new Error("Failed to create user account");

    // Store user in users collection with verification status
    const newUser = await databases.createDocument(
      config.databaseId!,
      config.usersCollectionId!,
      ID.unique(),
      {
        name: trimmedName,
        email,
        password,
        isAgent,
        userId: user.$id,
        isEmailVerified: false, // Initially not verified
      }
    );

    if (!newUser) throw new Error("Failed to add user to collection");

    if (isAgent) {
      // Store agent in agent collection
      const agent = await databases.createDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        ID.unique(),
        {
          name: trimmedName,
          email,
          password,
          isAgent,
          userId: user.$id,
          niche,
          isEmailVerified: false, // Initially not verified
        }
      );
      if (!agent) throw new Error("Failed to add agent to collection");
    }

    // Create a session for the user to be able to send verification email
    await account.createEmailPasswordSession(email, password);

    // Send verification email
    const verificationResult = await sendVerificationEmail();

    return {
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      verificationSent: verificationResult.success,
      userId: user.$id, // Include the userId in the return object
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Modified login function that checks email verification
 */
export const loginUserWithVerification = async (
  email: string,
  password: string
): Promise<{
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  userId?: string;
}> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format.");

    // Create Appwrite session
    const session = await account.createEmailPasswordSession(email, password);
    if (!session) throw new Error("Failed to create session");

    // Fetch user from the database
    const userQuery = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("email", email)]
    );

    if (userQuery.documents.length === 0) {
      // This shouldn't normally happen if user was registered properly
      await account.deleteSession("current"); // Delete the session
      throw new Error("User not found in database. Please contact support.");
    }

    const user = userQuery.documents[0];

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Delete the session since email isn't verified
      await account.deleteSession("current");
      return {
        success: false,
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        userId: user.userId,
      };
    }

    return { success: true, message: "Login successful!" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
