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
};

// const storage = new Storage(config.client);
export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

/**
 * Uploads an image to Appwrite storage and returns the file URL.
 * @param fileUri The local file URI (from ImagePicker).
 * @param bucketId The Appwrite storage bucket ID.
 * @returns The URL of the uploaded image.
 */
// export async function uploadImage(fileUri: string, bucketId: string) {
//   try {
//     const fileInfo = await fetch(fileUri);
//     const fileBlob = await fileInfo.blob();

//     const fileUpload = {
//       name: `image_${Date.now()}.jpg`,
//       type: "image/jpeg",
//       uri: fileUri,
//       size: fileBlob.size,
//     };

//     // Upload file to Appwrite Storage
//     const uploadedFile = await storage.createFile(
//       bucketId,
//       ID.unique(),
//       fileUpload
//     );

//     // Generate public URL for the file
//     const fileUrl = storage.getFilePreview(bucketId, uploadedFile.$id);
//     return fileUrl;
//   } catch (error) {
//     console.error("Upload failed:", error);
//     throw new Error("Failed to upload image.");
//   }
// }

/**
 * Updates the user's avatar URL in Appwrite's users collection.
 * @param userId The ID of the user.
 * @param avatarUrl The new avatar URL.
 */
// export async function updateUserAvatar(userId: string, avatarUrl: string) {
//   try {
//     const databases = new Databases(client);
//     await databases.updateDocument(
//       config.databaseId!,
//       config.usersCollectionId!,
//       userId,
//       { avatar: avatarUrl }
//     );
//   } catch (error) {
//     console.error("Failed to update avatar:", error);
//     throw new Error("Could not update avatar.");
//   }
// }

export const updateUserAvatar = async (userId: string, avatarUrl: string) => {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userId,
      {
        avatar: avatarUrl,
      }
    );
    return true;
  } catch (error) {
    console.error("Error updating user avatar:", error);
    return false;
  }
};

export const uploadImage = async (imageUri: string, userId: string) => {
  try {
    // Create a file name with extension from URI
    const fileName = `avatar-${userId}-${Date.now()}.jpg`;

    // Create file object in the format Appwrite expects
    const file = {
      name: fileName,
      type: "image/jpeg",
      uri: imageUri,
      size: 0, // Size will be determined by the system
    };

    // Upload file to Appwrite storage
    const uploadedFile = await storage.createFile(
      config.bucketId!,
      ID.unique(),
      file
    );

    // Get the file view URL
    const fileUrl = storage.getFileView(config.bucketId!, uploadedFile.$id);

    return fileUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

export const createUserDocument = async (
  userId: string,
  name: string,
  email: string
) => {
  try {
    return await databases.createDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userId,
      {
        name: name,
        email: email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      }
    );
  } catch (error) {
    console.error("Error creating user document:", error);
    return null;
  }
};
