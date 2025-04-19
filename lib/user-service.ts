// lib/firebase/userService.ts
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { ref, set, update, get } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  firestore,
  database,
  storage,
  COLLECTIONS,
} from "../lib/firebase/firebase-config";
import { User, Agent } from "./firebase/models";

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data() as Omit<User, "id">;

    return {
      id: userId,
      ...userData,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * Get agent profile from Firestore
 */
export const getAgentProfile = async (
  agentId: string
): Promise<Agent | null> => {
  try {
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      return null;
    }

    const agentData = agentDoc.data() as Omit<Agent, "id">;

    return {
      id: agentId,
      ...agentData,
    };
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    return null;
  }
};

/**
 * Get multiple user profiles from Firestore
 */
export const getUserProfiles = async (
  userIds: string[]
): Promise<{ [key: string]: User }> => {
  if (userIds.length === 0) return {};

  try {
    const users: { [key: string]: User } = {};

    // Firebase Firestore doesn't support array 'in' queries with more than 10 items
    // So we need to batch the requests
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    // Execute batch queries
    for (const batch of batches) {
      const usersRef = collection(firestore, COLLECTIONS.USERS);
      const usersQuery = query(usersRef, where("id", "in", batch));
      const querySnapshot = await getDocs(usersQuery);

      querySnapshot.forEach((doc) => {
        const userData = doc.data() as Omit<User, "id">;
        users[doc.id] = {
          id: doc.id,
          ...userData,
        };
      });
    }

    // Add direct fetch for any missing users
    const missingIds = userIds.filter((id) => !users[id]);
    for (const id of missingIds) {
      const user = await getUserProfile(id);
      if (user) {
        users[id] = user;
      }
    }

    return users;
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return {};
  }
};

/**
 * Get all agents
 */
export const getAllAgents = async (limit = 50): Promise<Agent[]> => {
  try {
    const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
    const agentsQuery = query(agentsRef);
    const querySnapshot = await getDocs(agentsQuery);

    const agents: Agent[] = [];

    querySnapshot.forEach((doc) => {
      const agentData = doc.data() as Omit<Agent, "id">;
      agents.push({
        id: doc.id,
        ...agentData,
      });
    });

    return agents;
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

/**
 * Upload profile image to Firebase Storage
 */
export const uploadProfileImage = async (
  userId: string,
  imageUri: string
): Promise<string | null> => {
  try {
    // Fetch the file from the URI
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Generate a unique file name
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}_${uuidv4()}.${fileExtension}`;

    // Upload to Firebase Storage
    const avatarRef = storageRef(storage, `avatars/${fileName}`);
    await uploadBytes(avatarRef, blob);

    // Get download URL
    const downloadUrl = await getDownloadURL(avatarRef);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return null;
  }
};

/**
 * Update user avatar in Firestore and sync to Firebase Realtime Database
 */
export const updateUserAvatar = async (
  userId: string,
  avatarUrl: string
): Promise<boolean> => {
  try {
    // Update in Firestore
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      avatar: avatarUrl,
      updatedAt: new Date(),
    });

    // Check if user is an agent and update agent record if needed
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      await updateDoc(agentRef, {
        avatar: avatarUrl,
        updatedAt: new Date(),
      });
    }

    // Sync to Realtime Database for chat features
    const userStatusRef = ref(database, `user_statuses/${userId}`);
    await update(userStatusRef, {
      avatar: avatarUrl,
      updatedAt: Date.now(),
    });

    return true;
  } catch (error) {
    console.error("Error updating user avatar:", error);
    return false;
  }
};

/**
 * Synchronize user data from Firestore to Realtime Database
 * (to keep user info up-to-date in Realtime Database for chat features)
 */
export const syncUserToRealtimeDatabase = async (
  userId: string
): Promise<boolean> => {
  try {
    // Get user from Firestore
    const user = await getUserProfile(userId);
    if (!user) return false;

    // Update user info in Realtime Database
    const userRef = ref(database, `user_statuses/${userId}`);

    const userData = {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      updated_at: Date.now(),
    };

    await set(userRef, userData);

    return true;
  } catch (error) {
    console.error("Error syncing user to Realtime Database:", error);
    return false;
  }
};

/**
 * Update user's online status in Realtime Database
 */
export const updateUserOnlineStatus = (
  userId: string,
  isOnline: boolean
): void => {
  if (!userId) return;

  try {
    const userRef = ref(database, `user_statuses/${userId}`);
    update(userRef, {
      online: isOnline,
      last_active: Date.now(),
    });
  } catch (error) {
    console.error("Error updating online status:", error);
  }
};

/**
 * Set up online presence detection
 * Returns a cleanup function to mark user as offline when they leave
 */
export const setupOnlinePresence = (userId: string): (() => void) => {
  if (!userId) return () => {};

  // Set user as online
  updateUserOnlineStatus(userId, true);

  // Return cleanup function
  return () => {
    updateUserOnlineStatus(userId, false);
  };
};

/**
 * Toggle agent view for a user
 */
export const toggleAgentView = async (
  userId: string,
  isAgentTemp: boolean
): Promise<boolean> => {
  try {
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);

    await updateDoc(userRef, {
      isAgentTemp: isAgentTemp,
      updatedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("Error toggling agent view:", error);
    return false;
  }
};

/**
 * Find agents by name (for search functionality)
 */
export const findAgentsByName = async (
  searchTerm: string
): Promise<Agent[]> => {
  try {
    // This is not an optimal solution for production
    // Ideally, you would use Firebase extensions like Algolia for this
    // But for simplicity, we're fetching all agents and filtering client-side
    const agents = await getAllAgents();

    // Filter by name
    const matchingAgents = agents.filter((agent) => {
      if (!agent.name) return false;
      const agentNameLower = agent.name.toLowerCase();
      const searchTermLower = searchTerm.toLowerCase();
      return agentNameLower.includes(searchTermLower);
    });

    return matchingAgents;
  } catch (error) {
    console.error("Error finding agents by name:", error);
    return [];
  }
};
