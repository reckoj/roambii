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
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
  chatCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MESSAGE_COLLECTION_ID,
  packageImagesId: process.env.EXPO_PUBLIC_APPWRITE_PACKAGEIMAGE_BUCKET_ID,
};

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
    console.error("Error checking email:", error);
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
  cPassword: string
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
      }
    );

    if (!newUser) throw new Error("Failed to add user to collection");

    console.log("User added to users collection:", newUser);

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

    console.log("User session updated:", user);

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
    console.error(error);
    return false;
  }
}

export async function logout() {
  try {
    const result = await account.deleteSession("current");
    return result;
  } catch (error) {
    console.error(error);
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
    console.error("Password update error:", error.message);
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
    console.error("Error checking agent status:", error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      const userAvatar = avatar.getInitials(result.name);
      const isAgent = await checkIsAgent(result.email);

      return {
        ...result,
        isAgent,
        avatar: userAvatar.toString(),
      };
    }

    return null;
  } catch (error) {
    console.log("User not authenticated:", error);
    return null;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc("$createdAt"), Query.limit(5)]
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];

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
      config.propertiesCollectionId!,
      buildQuery
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// get property by id
export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
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
    const result = await databases.getDocument(
      config.databaseId!,
      config.agentsCollectionId!,
      id
    );
    return result;
  } catch (error) {
    console.error("Error fetching agent by ID:", error);
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
      name: `image_${Date.now()}.jpg`,
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
export async function updateUserAvatar(userId: string, avatarUrl: string) {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userId,
      { avatar: avatarUrl }
    );
  } catch (error) {
    console.error("Failed to update user avatar:", error);
    throw new Error("Failed to update user profile.");
  }
}
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
      "flight-info",
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
      "package-info",
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
