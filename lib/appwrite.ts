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
import { Alert } from "react-native";
import { useGlobalContext } from "./global-provider";

export const config = {
  platform: "com.bysprk.roamii",
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
  chatRoomsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_CHAT_ROOMS_COLLECTION_ID,
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
export async function registerUser(
  name: string,
  email: string,
  password: string,
  isAgent: boolean,
  cPassword: string,
  niche: string
) {
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
    if (await checkEmailExists(email))
      throw new Error("An account with this email already exists.");

    // Create user in Appwrite Authentication
    const user = await account.create(
      ID.unique(),
      email,
      password,
      trimmedName
    );
    if (!user) throw new Error("Failed to create user account");
    // console.log("User created:", user.$id); // ✅ Debugging user creation

    // Store user in users collection
    const newUser = await databases.createDocument(
      config.databaseId!,
      config.usersCollectionId!,
      ID.unique(),
      {
        name: trimmedName,
        email,
        password,
        isAgent,
        userId: user.$id, // ✅ Store the correct user ID
      }
    );

    if (!newUser) throw new Error("Failed to add user to collection");

    // console.log("User added to users collection:", newUser);

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
          userId: user.$id, // ✅ Store the correct user ID
          niche,
        }
      );
      if (!agent) throw new Error("Failed to add agent to collection");
    }

    return { success: true, message: "Registration successful!" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ✅ Login User with Error Handling
export async function loginUser(email: string, password: string) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format.");

    // Fetch user from the database
    const userQuery = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("email", email)]
    );

    if (userQuery.documents.length === 0) {
      throw new Error("User not found. Please register.");
    }

    const user = userQuery.documents[0];

    // Create Appwrite session
    const session = await account.createEmailPasswordSession(email, password);
    if (!session) throw new Error("Failed to create session");

    // console.log("User session updated:", user);

    return { success: true, message: "Login successful!" };
  } catch (error: any) {
    // throw new Error("Login error:", error.message);

    return { success: false, message: error.message };
  }
}

export async function loginWGoogle() {
  try {
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    // if (!response) throw new Error("Create OAuth2 token failed");
    if (!response) return;

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success")
      // throw new Error("Create OAuth2 token failed");
      return;

    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();
    if (!secret || !userId) throw new Error("Create OAuth2 token failed");

    const session = await account.createSession(userId, secret);
    if (!session) throw new Error("Failed to create session");

    return true;
  } catch (error) {
    // console.error(error);
    return false;
  }
}

export async function logout() {
  try {
    const result = await account.deleteSession("current");
    return result;
  } catch (error) {
    // console.error(error);
    return false;
  }
}

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
    // console.error("Error checking agent status:", error);
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
    if (offset) buildQuery.push(Query.offset(offset)); // ✅ Handle pagination

    if (filter && filter !== "All")
      buildQuery.push(Query.equal("type", filter));

    if (query)
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
          Query.search("type", query),
        ])
      );

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      buildQuery
    );

    // ✅ Fetch images for each package
    const packagesWithImages = await Promise.all(
      result.documents.map(async (pkg) => ({
        ...pkg,
        imageUrl: await fetchPackageImage(pkg.image),
      }))
    );

    // ✅ Fetch images for each package
    // const packagesWithImages = await Promise.all(
    //   result.documents.map(async (pkg) => ({
    //     ...pkg,
    //     imageUrl: await fetchPackageImage(pkg.image), // ✅ Fetch correct image URL
    //   }))
    // );

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
    let avatarUrl = agentData.avatar || images.avatar;

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
export async function updateUser(userId: string, updates: Partial<User>) {
  try {
    const updatedUser = await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!, // ✅ Ensure you have the correct collection ID
      userId,
      updates
    );

    console.log("[User Updated] ==> ", updatedUser);
    return updatedUser;
  } catch (error) {
    console.error("[Error Updating User] ==> ", error);
    throw new Error("Failed to update user.");
  }
}

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
