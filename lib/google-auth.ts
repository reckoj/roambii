import {
  account,
  databases,
  config,
  ID,
  OAuthProvider,
  Query,
} from "./appwrite-config";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { Platform } from "react-native";

/**
 * Enhanced Google authentication with better error handling
 */
export const loginWithGoogle = async () => {
  let createdSession = null;

  try {
    // 1. Create a proper redirect URL based on platform
    const redirectUri =
      Platform.OS === "web"
        ? Linking.createURL("auth-callback")
        : Linking.createURL("auth-callback");

    console.log("[Google Auth] Redirect URI:", redirectUri);

    // 2. Create OAuth2 token with detailed error handling
    let response;
    try {
      response = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri
        // Optional scopes if needed
        // ['profile', 'email']
      );
      console.log("[Google Auth] OAuth token created successfully");
    } catch (tokenError: any) {
      console.error("[Google Auth] Token creation failed:", tokenError);
      return {
        success: false,
        message: `OAuth token creation failed: ${
          tokenError.message || "Unknown error"
        }`,
        code: tokenError.code,
      };
    }

    if (!response) {
      console.error("[Google Auth] No response from token creation");
      return {
        success: false,
        message: "Failed to create authentication token",
      };
    }

    // 3. Open authentication browser session with better handling
    console.log("[Google Auth] Opening browser session");
    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );

    console.log("[Google Auth] Browser session result:", browserResult.type);

    if (browserResult.type !== "success") {
      console.error("[Google Auth] Browser session failed:", browserResult);
      return {
        success: false,
        message: "Browser authentication failed or was cancelled",
        browserResult: browserResult.type,
      };
    }

    // 4. Extract and validate authentication parameters
    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();

    console.log(
      "[Google Auth] URL params present - userId:",
      !!userId,
      "secret:",
      !!secret
    );

    if (!secret || !userId) {
      console.error("[Google Auth] Missing auth parameters in redirect");
      return {
        success: false,
        message: "Missing authentication parameters in redirect",
        url: browserResult.url,
      };
    }

    // 5. Create user session
    try {
      const session = await account.createSession(userId, secret);

      if (!session) {
        console.error("[Google Auth] Failed to create session");
        return { success: false, message: "Failed to create user session" };
      }

      createdSession = session.$id;
      console.log("[Google Auth] Session created successfully:", session.$id);
    } catch (sessionError: any) {
      console.error("[Google Auth] Session creation failed:", sessionError);
      return {
        success: false,
        message: `Session creation failed: ${
          sessionError.message || "Unknown error"
        }`,
        code: sessionError.code,
      };
    }

    // 6. Fetch user details and create/update database record
    try {
      const authUser = await account.get();
      console.log("[Google Auth] Retrieved user details");

      // Check if user already exists in database
      const existingUser = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.equal("userId", authUser.$id)]
      );

      // Create user record if it doesn't exist
      if (existingUser.total === 0) {
        try {
          console.log("[Google Auth] Creating new user record");
          await databases.createDocument(
            config.databaseId!,
            config.usersCollectionId!,
            ID.unique(),
            {
              userId: authUser.$id,
              email: authUser.email,
              name: authUser.name,
              isAgent: false,
              isAgentTemp: false,
              avatar: null,
              isEmailVerified: true, // Google OAuth users are pre-verified
            }
          );
          console.log("[Google Auth] User record created successfully");
        } catch (dbError: any) {
          console.error("[Google Auth] Failed to create user record:", dbError);

          // Clean up the session
          if (createdSession) {
            try {
              await account.deleteSession(createdSession);
            } catch (cleanupError) {
              console.error(
                "[Google Auth] Failed to clean up session:",
                cleanupError
              );
            }
          }

          return {
            success: false,
            message: `Failed to create user record: ${
              dbError.message || "Unknown error"
            }`,
            code: dbError.code,
          };
        }
      } else {
        console.log("[Google Auth] User record already exists");
      }

      return { success: true, message: "Google login successful" };
    } catch (userError: any) {
      console.error("[Google Auth] Failed to get user details:", userError);
      return {
        success: false,
        message: `Failed to get user details: ${
          userError.message || "Unknown error"
        }`,
        code: userError.code,
      };
    }
  } catch (error: any) {
    console.error("[Google Auth] General error:", error);

    // Clean up session if it was created
    if (createdSession) {
      try {
        await account.deleteSession(createdSession);
      } catch (cleanupError) {
        console.error(
          "[Google Auth] Failed to clean up session:",
          cleanupError
        );
      }
    }

    return {
      success: false,
      message: `Google login error: ${error.message || "Unknown error"}`,
      code: error.code,
      stack: error.stack,
    };
  }
};
