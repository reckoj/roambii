import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { PackageFormData } from "./packageFormData";
import images from "@/constants/images";
import { Alert, Platform } from "react-native";
import { useGlobalContext } from "./global-provider";
import {
  Activity,
  DayPlan,
  Itinerary,
  ItineraryWithDetails,
} from "./firebase/models";

export const config = {
  platform: "com.bysprk.roambii",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  usersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  packagesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  flightInfoCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_FlIGHT_INFO_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
  packageImagesId: process.env.EXPO_PUBLIC_APPWRITE_PACKAGEIMAGE_BUCKET_ID,
  avatarBucket: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
  imagesBuket: process.env.EXPO_PUBLIC_APPWRITE_PACKAGEIMAGES_BUCKET_ID,
  messagesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MESSAGE_COLLECTION_ID,
  usersBookingId: process.env.EXPO_PUBLIC_APPWRITE_USER_BOOKINGS_ID,
  agentReviewsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_AGENT_REVIEWS_COLLECTION_ID,
  chatRoomsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_CHAT_ROOMS_COLLECTION_ID,
  backendApi: process.env.EXPO_PUBLIC_BACKEND_API,
  itinerariesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_USER_ITINERARY_COLLECTION_ID,
  dayPlansCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_DAY_PLANS,
  activitiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_ACTIVITIES,
};
interface User {
  $id: string;
  name: string;
  email: string;
  avatar?: string;
  isAgent: boolean;
  isAgentTemp?: boolean;
}

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// ✅ Function to check if email is already registered
async function checkEmailExists(email: string) {
  try {
    const existingUser = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("email", email)]
    );

    return existingUser.documents.length > 0;
  } catch (error) {
    // console.error("Error checking email:", error);
    return false;
  }
}

// ✅ Function to hash passwords before storing them
// async function hashPassword(password: string) {
//   const salt = await bcrypt.genSalt(10);
//   return await bcrypt.hash(password, salt);
// }

// ✅ Register User with Validations

/**
 * Register a new user
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  isAgent: boolean,
  cPassword: string,
  niche: string
) => {
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

    if (isAgent && niche) {
      // Store agent in agent collection
      await databases.createDocument(
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
    }

    // Create a session for the user to be able to send verification email
    await account.createEmailPasswordSession(email, password);

    // Send verification email
    const redirectUrl =
      Platform.OS === "web"
        ? Linking.createURL("verify-email")
        : `${Linking.createURL("verify-email")}`;

    await account.createVerification(redirectUrl);

    return {
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      userId: user.$id,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    // Create session for authentication
    const session = await account.createEmailPasswordSession(email, password);

    // Check if user exists in database and if their email is verified
    const userDocs = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("email", email)]
    );

    if (userDocs.total === 0) {
      // User not found in database
      await account.deleteSession("current");
      return { success: false, message: "User not found in database" };
    }

    const user = userDocs.documents[0];

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Delete the session since email isn't verified
      await account.deleteSession("current");
      return {
        success: false,
        message:
          "Please verify your email before logging in. userId: " + user.userId,
        requiresVerification: true,
        userId: user.userId,
      };
    }

    return { success: true, message: "Login successful" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
/**
 * Login with Google
 */
export const loginWGoogle = async (): Promise<boolean> => {
  let createdSession = null;

  try {
    // Step 1: Create OAuth2 token
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    if (!response) {
      return false;
    }

    // Step 2: Open authentication browser session
    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );

    if (browserResult.type !== "success") {
      console.error("Browser authentication failed or was cancelled");
      return false;
    }

    // Step 3: Extract authentication parameters
    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();

    if (!secret || !userId) {
      console.error("Missing authentication parameters in redirect");
      return false;
    }

    // Step 4: Create user session
    const session = await account.createSession(userId, secret);

    if (!session) {
      console.error("Failed to create session");
      return false;
    }

    createdSession = session.$id;

    // Step 5: Fetch user details and create database record
    const authUser = await account.get();

    // Check if user already exists in database
    const existingUser = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", authUser.$id)]
    );

    // Create user record if it doesn't exist
    if (existingUser.total === 0) {
      try {
        // Only include fields that exist in your schema
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
            isEmailVerified: true, // Google OAuth users are considered verified
          }
        );
      } catch (dbError) {
        console.error("Failed to create user record:", dbError);

        // Clean up the session since we couldn't complete the process
        if (createdSession) {
          try {
            await account.deleteSession(createdSession);
          } catch (cleanupError) {
            console.error("Failed to clean up session:", cleanupError);
          }
        }

        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Google login error:", error);

    // Clean up session if it was created
    if (createdSession) {
      try {
        await account.deleteSession(createdSession);
      } catch (cleanupError) {
        console.error("Failed to clean up session:", cleanupError);
      }
    }

    return false;
  }
};

/**
 * Logout the current user
 */
export const logout = async (): Promise<boolean> => {
  try {
    await account.deleteSession("current");
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
};

export async function updateUserPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  try {
    // Validate new password
    if (newPassword.length < 8 || newPassword.length > 20) {
      throw new Error("Password must be between 8 and 20 characters.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    // Update password in Appwrite
    await account.updatePassword(newPassword, currentPassword);

    return { success: true, message: "Password updated successfully!" };
  } catch (error: any) {
    // console.error("Password update error:", error.message);
    return { success: false, message: error.message };
  }
}

export async function checkIsAgent(userId: string) {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!,
      [Query.equal("email", userId)]
    );
    return result.documents.length > 0;
  } catch (error) {
    return false;
  }
}

export async function getCurrentUser() {
  try {
    // Step 1: Get Authenticated User ID
    const authUser = await account.get();
    if (!authUser?.$id) throw new Error("User not authenticated");

    // Step 2: Fetch Full User Data from Database
    const userData = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [
        Query.equal("userId", authUser.$id), // ✅ Query by stored userId
      ]
    );

    if (userData.total === 0) {
      console.warn("User document not found in the database.");
      return null;
    }

    const user = userData.documents[0];

    return {
      ...authUser,
      name: user.name || authUser.name, // ✅ Fallback to auth name
      email: user.email || authUser.email, // ✅ Fallback to auth email
      isAgent: user.isAgent || false,
      isAgentTemp: user.isAgentTemp || false, // ✅ Ensure fallback
      avatar: user.avatar || null, // ✅ Ensure the avatar is set correctly
    };
  } catch (error) {
    console.log("User not authenticated:", error);
    return null;
  }
}

/**
 * Fetch package images properly
 */
const fetchPackageImage = async (fileId: string) => {
  try {
    if (!fileId) return null; // ✅ Prevent fetching if no file ID
    return storage.getFileView(config.imagesBuket!, fileId).toString();
  } catch (error) {
    console.error("[Error Fetching Package Image]", error);
    return null; // ✅ Return null to prevent breaking UI
  }
};

export async function featuredPackages() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      [
        Query.equal("isFeatured", true), // ✅ Fetch featured only
        Query.orderAsc("$createdAt"),
        Query.limit(5),
      ]
    );

    // ✅ Fetch images for each package
    const packagesWithImages = await Promise.all(
      result.documents.map(async (pkg) => ({
        ...pkg,
        imageUrl: await fetchPackageImage(pkg.image), // ✅ Correct image fetching
      }))
    );

    return packagesWithImages;
  } catch (error) {
    console.error("[Error Fetching Featured Packages]", error);
    return [];
  }
}

export async function getAllPackages({
  filter,
  query,
  limit = 6,
  offset = 0,
}: {
  filter?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];

    // Handle pagination
    if (offset) buildQuery.push(Query.offset(offset));

    // Filter by type if provided
    if (filter && filter !== "All")
      buildQuery.push(Query.equal("type", filter));

    // Search functionality - removed 'address' which doesn't exist in schema
    if (query)
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("type", query),
          Query.search("agent", query), // Added search for agent name
        ])
      );

    // Handle limit
    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      buildQuery
    );

    // Fetch images for each package
    const packagesWithImages = await Promise.all(
      result.documents.map(async (pkg) => ({
        ...pkg,
        imageUrl: await fetchPackageImage(pkg.image),
      }))
    );

    return packagesWithImages;
  } catch (error) {
    console.error("[Error Fetching Packages]", error);
    return [];
  }
}

// get property by id
export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument(
      config.databaseId!,
      config.packagesCollectionId!,
      id
    );
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// get agent by ID
export async function getAgentById({ id }: { id: string }) {
  try {
    const agentData = await databases.getDocument(
      config.databaseId!,
      config.agentsCollectionId!,
      id
    );
    // console.log("[Raw Fetched Agent Data] ==> ", agentData);

    // ✅ Fix duplicate URLs by extracting the correct part
    let avatarUrl = agentData.avatar;

    if (avatarUrl.includes("/files/https://")) {
      avatarUrl = avatarUrl.split("/files/https://")[1]; // ✅ Extract correct URL
      avatarUrl = "https://" + avatarUrl; // ✅ Ensure it starts with https://
    }

    // console.log("[Fixed Agent Avatar URL] ==> ", avatarUrl); // ✅ Debugging output

    return {
      ...agentData,
      avatar: avatarUrl,
    };
  } catch (error) {
    console.error("Error fetching agent:", error);
    return null;
  }
}

// get all agents
export async function getAgents() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!
    );
    return result;
  } catch (error) {
    console.error("Error fetching agents:", error);
    return { documents: [] }; // Return empty array to prevent crashes
  }
}

/**
 * Uploads an image to Appwrite storage and returns the file URL.
 * @param fileUri The local file URI (from ImagePicker).
 * @param bucketId The Appwrite storage bucket ID.
 * @returns The URL of the uploaded image.
 */
export async function uploadPimage(fileUri: string, bucketId: string) {
  try {
    const fileInfo = await fetch(fileUri);
    const fileBlob = await fileInfo.blob();

    const fileUpload = {
      name: `image_${Date.now()}`,
      type: "image/jpeg",
      uri: fileUri,
      size: fileBlob.size,
    };

    // Upload file to Appwrite Storage
    const uploadedFile = await storage.createFile(
      bucketId,
      ID.unique(),
      fileUpload
    );

    // Generate public URL for the file
    const fileUrl = storage.getFilePreview(bucketId, uploadedFile.$id);

    return fileUrl;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error("Failed to upload image.");
  }
}

/**
 * Updates the user profile with an avatar URL in the Appwrite database.
 * @param userId The Appwrite user ID.
 * @param avatarUrl The URL of the uploaded avatar.
 */

export const uploadPackageImage = async (
  imageUri: string,
  bucketId: string
) => {
  try {
    const fileInfo = await fetch(imageUri);
    const fileBlob = await fileInfo.blob();

    const fileUpload = {
      name: `image_${Date.now()}.jpg`,
      type: "image/jpeg",
      uri: imageUri,
      size: fileBlob.size,
    };

    // Upload file to Appwrite Storage
    const uploadedFile = await storage.createFile(
      bucketId,
      ID.unique(),
      fileUpload
    );

    // Generate public URL for the file
    const fileUrl = storage.getFilePreview(bucketId, uploadedFile.$id);

    return fileUrl;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error("Failed to upload image.");
  }
};

export const createPackageListing = async (formData: PackageFormData) => {
  try {
    let imageUrl;
    if (formData.image) {
      imageUrl = await uploadPimage(formData.image, config.packageImagesId!);
    }

    // Create Flight Info entry
    const flightInfo = await databases.createDocument(
      config.databaseId!,
      config.flightInfoCollectionId!,
      ID.unique(),
      {
        departure_from: formData.departureInfo.from,
        departure_time: formData.departureInfo.time.toISOString(),
        arrival_to: formData.arrivalInfo.to,
        arrival_time: formData.arrivalInfo.time.toISOString(),
        return_time: formData.returnTime.toISOString(),
      }
    );

    // Create Package Info entry
    const packageData = await databases.createDocument(
      config.databaseId!,
      config.packagesCollectionId!,
      ID.unique(),
      {
        name: "Custom Package",
        description: formData.description,
        price: parseInt(formData.price),
        type: formData.accommodationType,
        allinclusive: formData.isAllInclusive,
        "room-type": formData.roomType,
        image: imageUrl, // Store public image URL instead of file ID
        flight_info: flightInfo.$id,
      }
    );

    alert("Package listing created successfully!");
    return packageData;
  } catch (error) {
    console.error("Failed to create package listing:", error);
    alert("Failed to create package listing. Please try again.");
  }
};

export async function getAgentPackages(agentId: string) {
  try {
    console.log("[Fetching All Packages]...");

    const response = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      [Query.orderDesc("$createdAt")]
    );

    // ✅ Manually filter packages that belong to this agent
    const filteredPackages = response.documents.filter(
      (pkg) => pkg.agent?.userId === agentId
    );

    // console.log("[Filtered Packages] ==> ", filteredPackages);

    return filteredPackages;
  } catch (error) {
    console.error("Error fetching agent packages:", error);
    return [];
  }
}

export async function getAgentPackagesProfile(agentId: string) {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      [Query.equal("agent", agentId)]
    );

    return result.documents;
  } catch (error) {
    console.error("Error fetching agent packages:", error);
    return [];
  }
}
/** ✅ Delete a package */
export async function deletePackage(packageId: string) {
  try {
    await databases.deleteDocument(
      config.databaseId!,
      config.packagesCollectionId!,
      packageId
    );
    return true;
  } catch (error) {
    console.error("Error deleting package:", error);
    return false;
  }
}

/** ✅ Update a package */
export async function updatePackage(packageId: string, updatedData: object) {
  try {
    const response = await databases.updateDocument(
      config.databaseId!,
      config.packagesCollectionId!,
      packageId,
      updatedData
    );
    return response;
  } catch (error) {
    console.error("Error updating package:", error);
    return null;
  }
}

export async function getPackageById(packageId: string) {
  try {
    // console.log("[Fetching Package by ID] ==> ", packageId);

    const response = await databases.getDocument(
      config.databaseId!,
      config.packagesCollectionId!,
      packageId
    );

    // console.log("[Fetched Package] ==> ", response);

    return response;
  } catch (error) {
    console.error("Error fetching package:", error);
    return null;
  }
}

/**
 * ✅ Update a User in Appwrite Database
 * @param userId - The Appwrite User ID
 * @param updates - The fields to update
 */

/**
 * Update user data
 */
export const updateUser = async (
  userId: string,
  updates: Partial<User>
): Promise<Partial<User>> => {
  try {
    // Find user document in database
    const userDocs = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", userId)]
    );

    if (userDocs.total === 0) {
      throw new Error("User not found in database");
    }

    const userDocId = userDocs.documents[0].$id;

    // Remove $id from updates as it's a system field
    const { $id, ...validUpdates } = updates;

    // Update user in database
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userDocId,
      validUpdates
    );

    // If user is an agent, also update agent record
    if (updates.isAgent || userDocs.documents[0].isAgent) {
      const agentDocs = await databases.listDocuments(
        config.databaseId!,
        config.agentsCollectionId!,
        [Query.equal("userId", userId)]
      );

      if (agentDocs.total > 0) {
        const agentDocId = agentDocs.documents[0].$id;
        await databases.updateDocument(
          config.databaseId!,
          config.agentsCollectionId!,
          agentDocId,
          validUpdates
        );
      }
    }

    // If name or email is updated, also update in Appwrite auth
    if (updates.name || updates.email) {
      const updateData: { name?: string; email?: string } = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email;

      await account.updateName(updateData.name || "");
      if (updateData.email) {
        // Email change requires verification
        // Implement as needed
      }
    }

    return updates;
  } catch (error: any) {
    console.error("Update user error:", error);
    throw new Error(error.message || "Failed to update user");
  }
};

export { ID };
/**
 * ✅ Soft Delete User Account (Client-Side)
 * - Marks user as deleted instead of fully deleting (because Appwrite doesn't allow self-deletion)
 */
// export const deleteUserAccount = async (userId: string) => {
//   try {
//     if (!userId) {
//       Alert.alert("Error", "User ID not found.");
//       return;
//     }

//     // 🔥 Find the user document in the database
//     const userDocs = await databases.listDocuments(
//       config.databaseId!,
//       config.usersCollectionId!,
//       [Query.equal("userId", userId)]
//     );

//     if (userDocs.total === 0) {
//       Alert.alert("Error", "User profile not found.");
//       return;
//     }

//     const userDocId = userDocs.documents[0].$id;

//     // 🔥 Update user document: Mark as deleted
//     await databases.updateDocument(
//       config.databaseId!,
//       config.usersCollectionId!,
//       userDocId,
//       { isDeleted: true } // ✅ Set `isDeleted` to true
//     );

//     Alert.alert(
//       "Account Deleted",
//       "Your account has been marked for deletion."
//     );

//     // 🔥 Log out and refresh UI
//     const { refetch } = useGlobalContext();
//     refetch();
//   } catch (error) {
//     console.error("[Error Deleting Account] ==> ", error);
//     Alert.alert("Error", "Failed to delete your account.");
//   }
// };

/**
 * Creates a new itinerary with optional day plans and activities
 * @param itinerary The itinerary data
 * @param dayPlans Optional array of day plans to create
 * @param activities Optional activities mapped to day plans by index
 * @returns The created itinerary with IDs filled in
 */
// export const createItinerary = async (
//   itinerary: Itinerary,
//   dayPlans?: Omit<DayPlan, "itinerary_id">[],
//   activities?: { [dayPlanIndex: number]: Omit<Activity, "day_plan_id">[] }
// ): Promise<Itinerary> => {
//   try {
//     // 1. Create the itinerary
//     const createdItinerary = (await databases.createDocument(
//       config.databaseId!,
//       config.itinerariesCollectionId!,
//       ID.unique(),
//       {
//         ...itinerary,
//         created_at: new Date().toISOString(),
//       }
//     )) as unknown as Itinerary;

//     // 2. Create day plans if provided
//     if (dayPlans && dayPlans.length > 0) {
//       const createdDayPlans: DayPlan[] = [];

//       for (let i = 0; i < dayPlans.length; i++) {
//         const dayPlan = dayPlans[i];
//         const createdDayPlan = (await databases.createDocument(
//           config.databaseId!,
//           config.dayPlansCollectionId!,
//           ID.unique(),
//           {
//             ...dayPlan,
//             itinerary_id: createdItinerary.$id,
//           }
//         )) as unknown as DayPlan;

//         createdDayPlans.push(createdDayPlan);

//         // 3. Create activities for this day plan if provided
//         if (activities && activities[i] && activities[i].length > 0) {
//           for (const activity of activities[i]) {
//             await databases.createDocument(
//               config.databaseId!,
//               config.activitiesCollectionId!,
//               ID.unique(),
//               {
//                 ...activity,
//                 day_plan_id: createdDayPlan.$id,
//               }
//             );
//           }
//         }
//       }
//     }

//     return createdItinerary;
//   } catch (error) {
//     console.error("Error creating itinerary:", error);
//     throw error;
//   }
// };

// /**
//  * Updates an existing itinerary
//  * @param itineraryId The ID of the itinerary to update
//  * @param updatedData The updated itinerary data
//  * @returns The updated itinerary
//  */
// export const updateItinerary = async (
//   itineraryId: string,
//   updatedData: Partial<Omit<Itinerary, "$id" | "created_at">>
// ): Promise<Itinerary> => {
//   try {
//     const updatedItinerary = (await databases.updateDocument(
//       config.databaseId!,
//       config.itinerariesCollectionId!,
//       itineraryId!,
//       updatedData
//     )) as unknown as Itinerary;

//     return updatedItinerary;
//   } catch (error) {
//     console.error("Error updating itinerary:", error);
//     throw error;
//   }
// };

// /**
//  * Fetches an itinerary with all its day plans and activities
//  * @param itineraryId The ID of the itinerary to fetch
//  * @returns The itinerary with day plans and activities
//  */
// export const getItineraryWithDetails = async (
//   itineraryId: string
// ): Promise<ItineraryWithDetails> => {
//   try {
//     // 1. Fetch the itinerary
//     const itinerary = (await databases.getDocument(
//       config.databaseId!,
//       config.itinerariesCollectionId!,
//       itineraryId
//     )) as unknown as Itinerary;

//     // 2. Fetch day plans for this itinerary
//     const dayPlansResult = await databases.listDocuments(
//       config.databaseId!,
//       config.dayPlansCollectionId!,
//       [Query.equal("itinerary_id", itineraryId), Query.orderAsc("day")]
//     );

//     const dayPlans = dayPlansResult.documents as unknown as DayPlan[];
//     const dayPlansWithActivities: (DayPlan & { activities: Activity[] })[] = [];

//     // 3. Fetch activities for each day plan
//     for (const dayPlan of dayPlans) {
//       const activitiesResult = await databases.listDocuments(
//         config.databaseId!,
//         config.activitiesCollectionId!,
//         [Query.equal("day_plan_id", dayPlan.$id!)]
//       );

//       const activities = activitiesResult.documents as unknown as Activity[];

//       dayPlansWithActivities.push({
//         ...dayPlan,
//         activities,
//       });
//     }

//     return {
//       itinerary,
//       dayPlans: dayPlansWithActivities,
//     };
//   } catch (error) {
//     console.error("Error fetching itinerary details:", error);
//     throw error;
//   }
// };

// /**
//  * Updates a day plan
//  * @param dayPlanId The ID of the day plan to update
//  * @param updatedData The updated day plan data
//  * @returns The updated day plan
//  */
// export const updateDayPlan = async (
//   dayPlanId: string,
//   updatedData: Partial<Omit<DayPlan, "$id" | "itinerary_id">>
// ): Promise<DayPlan> => {
//   try {
//     const updatedDayPlan = (await databases.updateDocument(
//       config.databaseId!,
//       config.dayPlansCollectionId!,
//       dayPlanId,
//       updatedData
//     )) as unknown as DayPlan;

//     return updatedDayPlan;
//   } catch (error) {
//     console.error("Error updating day plan:", error);
//     throw error;
//   }
// };

// /**
//  * Creates or updates an activity
//  * @param activity The activity data
//  * @returns The created or updated activity
//  */
// export const saveActivity = async (activity: Activity): Promise<Activity> => {
//   try {
//     if (activity.$id) {
//       // Update existing activity
//       const { $id, ...activityData } = activity;
//       return (await databases.updateDocument(
//         config.databaseId!,
//         config.activitiesCollectionId!,
//         $id,
//         activityData
//       )) as unknown as Activity;
//     } else {
//       // Create new activity
//       const { $id, ...activityData } = activity;
//       return (await databases.createDocument(
//         config.databaseId!,
//         config.activitiesCollectionId!,
//         ID.unique(),
//         activityData
//       )) as unknown as Activity;
//     }
//   } catch (error) {
//     console.error("Error saving activity:", error);
//     throw error;
//   }
// };

// /**
//  * Deletes an itinerary and all related day plans and activities
//  * @param itineraryId The ID of the itinerary to delete
//  */
// export const deleteItinerary = async (itineraryId: string): Promise<void> => {
//   try {
//     // 1. Fetch all day plans for this itinerary
//     const dayPlansResult = await databases.listDocuments(
//       config.databaseId!,
//       config.dayPlansCollectionId!,
//       [Query.equal("itinerary_id", itineraryId)]
//     );

//     const dayPlans = dayPlansResult.documents as unknown as DayPlan[];

//     // 2. Delete all activities for each day plan
//     for (const dayPlan of dayPlans) {
//       const activitiesResult = await databases.listDocuments(
//         config.databaseId!,
//         config.activitiesCollectionId!,
//         [Query.equal("day_plan_id", dayPlan.$id!)]
//       );

//       const activities = activitiesResult.documents as unknown as Activity[];

//       // Delete each activity
//       for (const activity of activities) {
//         await databases.deleteDocument(
//           config.databaseId!,
//           config.activitiesCollectionId!,
//           activity.$id as string
//         );
//       }

//       // Delete the day plan
//       await databases.deleteDocument(
//         config.databaseId!,
//         config.dayPlansCollectionId!,
//         dayPlan.$id as string
//       );
//     }

//     // 3. Delete the itinerary
//     await databases.deleteDocument(
//       config.databaseId!,
//       config.itinerariesCollectionId!,
//       itineraryId
//     );
//   } catch (error) {
//     console.error("Error deleting itinerary:", error);
//     throw error;
//   }
// };
