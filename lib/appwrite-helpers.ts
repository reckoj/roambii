// lib/appwrite-helpers.ts
import { account, databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";
import { firebaseDb } from "./firebase";
import { ref, update, get } from "firebase/database";

/**
 * Get user profile data from Appwrite
 */
export async function getUserProfile(userId: string) {
  if (!userId) return null;

  try {
    const document = await databases.getDocument(
      config.databaseId!,
      config.usersCollectionId!, // Make sure you have this in your config
      userId
    );

    return document;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Get multiple user profiles from Appwrite
 */
export async function getUserProfiles(userIds: string[]) {
  if (!userIds.length) return {};

  try {
    const response = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("$id", userIds)]
    );

    // Create a map of user profiles for easy lookup
    const profiles: { [key: string]: any } = {};
    response.documents.forEach((doc) => {
      profiles[doc.$id] = doc;
    });

    return profiles;
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return {};
  }
}

/**
 * Synchronize user data from Appwrite to Firebase
 * (to keep user info up-to-date in Firebase)
 */
export async function syncUserToFirebase(userId: string) {
  if (!userId) return;

  try {
    // Get user from Appwrite
    const user = await getUserProfile(userId);
    if (!user) return;

    // Update user info in Firebase
    const userRef = ref(firebaseDb, `users/${userId}`);

    // Check if user exists in Firebase
    const snapshot = await get(userRef);

    // These are the fields we want to sync
    const userData = {
      id: user.$id,
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      updated_at: new Date().toISOString(),
    };

    // Update or create user in Firebase
    await update(userRef, userData);

    console.log("User synchronized with Firebase:", userId);
    return true;
  } catch (error) {
    console.error("Error syncing user to Firebase:", error);
    return false;
  }
}

/**
 * Update user's online status in Firebase
 */
export function updateUserOnlineStatus(userId: string, isOnline: boolean) {
  if (!userId) return;

  try {
    const userRef = ref(firebaseDb, `users/${userId}`);
    update(userRef, {
      online: isOnline,
      last_active: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating online status:", error);
  }
}

/**
 * Set up online presence detection
 */
export function setupOnlinePresence(userId: string) {
  if (!userId) return () => {};

  // Set user as online
  updateUserOnlineStatus(userId, true);

  // Set up cleanup function to mark user as offline when they leave
  return () => {
    updateUserOnlineStatus(userId, false);
  };
}

/**
 * Migrate existing Appwrite chat messages to Firebase (one-time operation)
 */
export async function migrateExistingChatsToFirebase(userId: string) {
  if (!userId) return;

  try {
    console.log("Starting chat migration for user:", userId);

    // Fetch existing chat rooms from Appwrite
    const chatRooms = await databases.listDocuments(
      config.databaseId!,
      config.chatRoomsCollectionId!,
      [
        Query.or([
          Query.equal("user_id", userId),
          Query.equal("agent_id", userId),
        ]),
      ]
    );

    console.log(`Found ${chatRooms.documents.length} chat rooms to migrate`);

    for (const room of chatRooms.documents) {
      const senderId = room.user_id;
      const receiverId = room.agent_id;

      // Skip if either ID is missing
      if (!senderId || !receiverId) continue;

      // Generate room ID
      const roomId =
        senderId < receiverId
          ? `${senderId}_${receiverId}`
          : `${receiverId}_${senderId}`;

      // Fetch messages for this room
      const messages = await databases.listDocuments(
        config.databaseId!,
        config.messagesCollectionId!,
        [
          Query.equal("room_id", room.room_id || roomId),
          Query.orderAsc("timestamp"),
        ]
      );

      console.log(
        `Migrating ${messages.documents.length} messages for room ${roomId}`
      );

      // Create room in Firebase
      const roomRef = ref(firebaseDb, `chat_rooms/${roomId}`);
      await update(roomRef, {
        participants: [senderId, receiverId],
        last_message: room.last_message || "",
        last_updated: new Date(room.last_updated || Date.now()).getTime(),
        migrated_from_appwrite: true,
      });

      // Migrate messages
      const messagesRef = ref(firebaseDb, `messages/${roomId}`);

      // Prepare batch of updates
      const updates: { [key: string]: any } = {};

      messages.documents.forEach((msg, index) => {
        updates[`message_${index}`] = {
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now()).getTime(),
          read: msg.read || false,
          migrated_from_appwrite: true,
        };
      });

      // Update messages in batch
      if (Object.keys(updates).length > 0) {
        await update(messagesRef, updates);
      }
    }

    console.log("Migration completed successfully");
    return true;
  } catch (error) {
    console.error("Error migrating chats to Firebase:", error);
    return false;
  }
}
