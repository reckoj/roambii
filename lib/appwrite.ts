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


import { router } from "expo-router"; // Assuming you're using Expo Router

function redirectUser() {
  router.replace("/"); // Redirect to your main screen
 
}


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

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);



// Register User
export async function registerUser(name: string, email: string, password: string, isAgent: boolean) {
  try {
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 128)
      throw new Error("Full name must be between 1 and 128 characters.");
    if (!trimmedName.includes(" "))
      throw new Error("Please enter your full name (first and last).");

    const user = await account.create(ID.unique(), email, password, trimmedName);
    if (!user) throw new Error("Failed to create user account");

    if (isAgent) {
      const agent = await databases.createDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        ID.unique(),
        {
          userId: user.$id,
          name: trimmedName,
          email,
          createdAt: new Date().toISOString(),
        }
      );
      if (!agent) throw new Error("Failed to add agent to collection");
    }

    return true; // Success
  } catch (error) {
    console.error(error);
    return false; // Failure
  }
}

// Login User
export const loginUser = async (email: string, password: string) => {
  
  try {
    const session = await account.createEmailPasswordSession(email, password);
    if (!session) throw new Error("Failed to create session");

    redirectUser(); // ✅ Redirect user after login

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export async function loginWGoogle() {
  try {
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    if (!response) throw new Error("Create OAuth2 token failed");

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success")
      throw new Error("Create OAuth2 token failed");

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

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      const userAvatar = avatar.getInitials(result.name);

      return {
        ...result,
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

// write function to get property by id
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

// Function to get agent by ID
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


// Function to get all agents
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