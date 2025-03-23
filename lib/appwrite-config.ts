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
  agentReviewsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_AGENT_REVIEWS_COLLECTION_ID,
  chatRoomsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_CHAT_ROOMS_COLLECTION_ID,
};

// Initialize Appwrite client
export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

// Initialize Appwrite services
export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Export ID utility for convenience
export { ID, Query, OAuthProvider };
