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
  packagesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  // bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
  avatarBucket: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
  imagesBuket: process.env.EXPO_PUBLIC_APPWRITE_PACKAGEIMAGES_BUCKET_ID,
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
      config.avatarBucket!,
      ID.unique(),
      file
    );

    // Get the file view URL
    const fileUrl = storage.getFileView(config.avatarBucket!, uploadedFile.$id);

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

/**
 * Uploads an image to Appwrite storage and updates the avatar for users & agents.
 */
export async function handleAvtarImagePicked(imageUri: string, userId: string) {
  try {
    console.log("[Uploading Image]...");

    // Step 1: Upload Image to Appwrite Storage
    const file = await fetch(imageUri);
    const blob = await file.blob();
    const fileUpload = {
      name: `avatar_${userId}.jpg`,
      type: "image/jpeg",
      uri: imageUri,
      size: blob.size,
    };

    const uploadedFile = await storage.createFile(
      config.avatarBucket!,
      ID.unique(),
      fileUpload
    );

    const fileUrl = storage
      .getFileView(config.avatarBucket!, uploadedFile.$id)
      .toString();
    console.log("[Generated File URL] ==> ", fileUrl);

    // Step 2: Update Avatar in Users Collection
    const userExists = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", userId)]
    );

    if (userExists.total > 0) {
      const userDocId = userExists.documents[0].$id;
      await databases.updateDocument(
        config.databaseId!,
        config.usersCollectionId!,
        userDocId,
        {
          avatar: fileUrl,
        }
      );
      console.log("[User Avatar Updated] ==> ", fileUrl);
    }

    // Step 3: Update Avatar in Agents Collection (if user is an agent)
    const agentExists = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!,
      [Query.equal("userId", userId)] // 🔍 Find agent linked to this user
    );

    if (agentExists.total > 0) {
      const agentDocId = agentExists.documents[0].$id;
      await databases.updateDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        agentDocId,
        {
          avatar: fileUrl,
        }
      );
      console.log("[Agent Avatar Updated] ==> ", fileUrl);
    } else {
      console.warn("[No Agent Profile Found] - Only user avatar updated.");
    }

    return fileUrl;
  } catch (error) {
    console.error("[handleImagePicked] error ==>", error);
    throw new Error("Upload failed, sorry :(");
  }
}

/**
 * Uploads an image to Appwrite storage .
 */
export async function handlePackageImagePicked(
  imageUri: string,
  userId: string
) {
  try {
    console.log("[Uploading Image]...");

    const file = await fetch(imageUri);
    const blob = await file.blob();
    const fileUpload = {
      name: `${userId}.jpg`, // ✅ Ensuring unique file name
      type: "image/jpeg",
      uri: imageUri,
      size: blob.size,
    };

    // const uploadedFile = await storage.createFile(
    //   config.imagesBuket!,
    //   ID.unique(),
    //   fileUpload
    const uploadedFile = await storage.createFile(
      config.imagesBuket!,
      ID.unique(),
      fileUpload
    );

    console.log("[Uploaded File ID] ==> ", uploadedFile.$id);

    // ✅ Generate the public image URL instead of returning file ID
    const fileUrl = storage
      .getFilePreview(config.imagesBuket!, uploadedFile.$id)
      .toString();

    console.log("[Generated Public File URL] ==> ", fileUrl);

    return fileUrl; // ✅ Return full URL instead of file ID
    // );

    // ✅ Return only the File ID (not a URL)
    // return uploadedFile.$id;
  } catch (error) {
    console.error("[handleImagePicked] error ==>", error);
    throw new Error("Upload failed, sorry :(");
  }
}
