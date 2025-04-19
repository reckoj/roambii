// lib/firebase/chatService.ts
import {
  ref,
  push,
  set,
  get,
  query,
  orderByChild,
  equalTo,
  update,
  onValue,
  off,
  remove,
} from "firebase/database";
import { database } from "../lib/firebase/firebase-config";
import { getDoc, doc } from "firebase/firestore";
import { firestore, COLLECTIONS } from "../lib/firebase/firebase-config";
import { ChatMessage, ChatRoom } from "./firebase/models";
import { checkIsAgent } from "../lib/auth-service";

/**
 * IMPORTANT: This is the core function that needs to be used consistently
 * Generate a unique room ID for a conversation between two users
 */
export function getChatRoomId(userId1: string, userId2: string): string {
  if (!userId1 || !userId2) {
    console.error("Cannot generate room ID: Missing user IDs", {
      userId1,
      userId2,
    });
    return "";
  }

  // Sort IDs to ensure consistent room ID regardless of who initiates
  const sortedIds = [userId1, userId2].sort();

  // Clean the IDs to make sure they don't have problematic characters
  const cleanId1 = sortedIds[0].replace(/[^\w\-_]/g, "_");
  const cleanId2 = sortedIds[1].replace(/[^\w\-_]/g, "_");

  // Create the room ID
  const roomId = `${cleanId1}_${cleanId2}`;

  console.log("Generated room ID:", roomId, "from users:", userId1, userId2);
  return roomId;
}

/**
 * Get a consistent room ID even when one of the participants is an agent
 */
export async function getConsistentRoomId(
  userId1: string,
  userId2: string
): Promise<string> {
  if (!userId1 || !userId2) {
    console.error("Cannot generate consistent room ID: Missing user IDs", {
      userId1,
      userId2,
    });
    return "";
  }

  console.log("Getting consistent room ID for:", userId1, userId2);

  // First, check if either user is an agent and resolve to their user ID
  let resolvedId1 = userId1;
  let resolvedId2 = userId2;

  try {
    // Check if user1 is an agent
    const user1Check = await checkIsAgent(userId1);
    if (user1Check.isAgent && user1Check.agentId) {
      console.log(`User1 ${userId1} is an agent with ID ${user1Check.agentId}`);
      resolvedId1 = user1Check.agentId;
    }

    // Check if user2 is an agent
    const user2Check = await checkIsAgent(userId2);
    if (user2Check.isAgent && user2Check.agentId) {
      console.log(`User2 ${userId2} is an agent with ID ${user2Check.agentId}`);
      resolvedId2 = user2Check.agentId;
    }

    // Now use these resolved IDs to get a consistent room ID
    return getChatRoomId(resolvedId1, resolvedId2);
  } catch (error) {
    console.error("Error resolving agent IDs:", error);
    // Fall back to the basic method if there's an error
    return getChatRoomId(userId1, userId2);
  }
}

/**
 * Fetch chat rooms for a specific user
 */
export async function getChatRooms(userId: string): Promise<ChatRoom[]> {
  if (!userId) {
    console.error("Cannot fetch chat rooms: Missing userId");
    return [];
  }

  try {
    console.log("[Fetching Chat Rooms for] ==> ", userId);

    // Check for rooms where this user is a participant
    const roomsRef = ref(database, "chat_rooms");
    const snapshot = await get(roomsRef);

    if (!snapshot.exists()) {
      console.log("No chat rooms found in Firebase");
      return [];
    }

    const rooms: ChatRoom[] = [];

    snapshot.forEach((roomSnapshot) => {
      const roomData = roomSnapshot.val();

      // Check if participants is an array or an object
      if (roomData.participants) {
        if (Array.isArray(roomData.participants)) {
          if (roomData.participants.includes(userId)) {
            rooms.push({
              id: roomSnapshot.key || "",
              participants: roomData.participants || [],
              lastMessage: roomData.lastMessage || "",
              lastUpdated: roomData.lastUpdated || Date.now(),
              unreadCount: roomData.unreadCount?.[userId] || 0,
            });
          }
        } else if (typeof roomData.participants === "object") {
          const participantIds = Object.values(roomData.participants);
          if (participantIds.includes(userId)) {
            rooms.push({
              id: roomSnapshot.key || "",
              participants: participantIds as string[],
              lastMessage: roomData.lastMessage || "",
              lastUpdated: roomData.lastUpdated || Date.now(),
              unreadCount: roomData.unreadCount?.[userId] || 0,
            });
          }
        }
      }
    });

    // Sort by last updated timestamp (newest first)
    rooms.sort((a, b) => {
      const timeA =
        typeof a.lastUpdated === "number" ? a.lastUpdated : Date.now();
      const timeB =
        typeof b.lastUpdated === "number" ? b.lastUpdated : Date.now();
      return timeB - timeA;
    });

    console.log(`Fetched ${rooms.length} chat rooms`);
    return rooms;
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return [];
  }
}

/**
 * Fetch messages for a specific room
 */
export async function getMessages(roomId: string): Promise<ChatMessage[]> {
  if (!roomId) {
    console.error("Cannot fetch messages: Missing roomId");
    return [];
  }

  try {
    console.log("[Fetching Messages for Room] ==> ", roomId);

    const messagesRef = ref(database, `messages/${roomId}`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      console.log(`No messages found for room ${roomId}`);
      return [];
    }

    const messages: ChatMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      messages.push({
        id: childSnapshot.key || "",
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        timestamp: message.timestamp || Date.now(), // Default to now if missing
        read: message.read || false,
      });
    });

    // Sort by timestamp
    messages.sort((a, b) => {
      const timeA = typeof a.timestamp === "number" ? a.timestamp : Date.now();
      const timeB = typeof b.timestamp === "number" ? b.timestamp : Date.now();
      return timeA - timeB;
    });

    console.log(`Found ${messages.length} messages for room ${roomId}`);
    return messages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

/**
 * Subscribe to messages in a specific room
 * Returns a function to unsubscribe
 */
export function subscribeToMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  if (!roomId) {
    console.error("Cannot subscribe to messages: Missing roomId");
    return () => {};
  }

  console.log("[Subscribing to Messages for Room] ==> ", roomId);

  const messagesRef = ref(database, `messages/${roomId}`);

  // Listen for changes to messages
  onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.log(`Received 0 messages from subscription`);
      callback([]);
      return;
    }

    const messages: ChatMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      messages.push({
        id: childSnapshot.key || "",
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        timestamp: message.timestamp || Date.now(),
        read: message.read || false,
      });
    });

    // Sort by timestamp
    messages.sort((a, b) => {
      const timeA = typeof a.timestamp === "number" ? a.timestamp : Date.now();
      const timeB = typeof b.timestamp === "number" ? b.timestamp : Date.now();
      return timeA - timeB;
    });

    console.log(`Received ${messages.length} messages from subscription`);
    callback(messages);
  });

  // Return unsubscribe function
  return () => {
    console.log(`Unsubscribing from room ${roomId}`);
    off(messagesRef);
  };
}

/**
 * Send a message with consistent room ID resolution
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<ChatMessage> {
  if (!senderId || !receiverId || !content.trim()) {
    throw new Error("Missing required data for sending a message");
  }

  try {
    // Generate a consistent room ID that handles agent/user relationships
    const roomId = await getConsistentRoomId(senderId, receiverId);

    console.log("[Sending Message] ==> ", {
      roomId,
      senderId,
      receiverId,
      content,
    });

    // Prepare message data
    const messageData: Omit<ChatMessage, "id"> = {
      senderId,
      receiverId,
      content,
      timestamp: Date.now(),
      read: false,
    };

    // Create message reference
    const messagesRef = ref(database, `messages/${roomId}`);
    const newMessageRef = push(messagesRef);

    // Save message
    await set(newMessageRef, messageData);

    // Update chat room data
    const roomRef = ref(database, `chat_rooms/${roomId}`);
    const roomSnapshot = await get(roomRef);

    if (!roomSnapshot.exists()) {
      // Create new room
      await set(roomRef, {
        participants: [senderId, receiverId],
        lastMessage: content,
        lastUpdated: Date.now(),
        unreadCount: {
          [receiverId]: 1,
          [senderId]: 0,
        },
      });
    } else {
      // Update existing room
      const roomData = roomSnapshot.val();
      const updates: any = {
        lastMessage: content,
        lastUpdated: Date.now(),
      };

      // Update participants array if needed
      if (!roomData.participants) {
        updates.participants = [senderId, receiverId];
      } else if (Array.isArray(roomData.participants)) {
        const participants = [...roomData.participants];
        if (!participants.includes(senderId)) {
          participants.push(senderId);
        }
        if (!participants.includes(receiverId)) {
          participants.push(receiverId);
        }
        updates.participants = participants;
      }

      // Update unread count for receiver
      if (!roomData.unreadCount) {
        updates.unreadCount = {
          [receiverId]: 1,
          [senderId]: 0,
        };
      } else {
        const currentCount = roomData.unreadCount[receiverId] || 0;
        updates[`unreadCount/${receiverId}`] = currentCount + 1;
      }

      await update(roomRef, updates);
    }

    return {
      ...messageData,
      id: newMessageRef.key || "",
    };
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Mark messages as read with improved handling for agents
 */
export async function markMessagesAsRead(
  roomId: string,
  userId: string
): Promise<boolean> {
  if (!roomId || !userId) {
    console.error("Cannot mark messages as read: Missing data", {
      roomId,
      userId,
    });
    return false;
  }

  try {
    console.log(`[Marking Messages as Read] Room: ${roomId}, User: ${userId}`);

    // Check if the user is an agent
    const isAgentResult = await checkIsAgent(userId);
    const effectiveUserId =
      isAgentResult.isAgent && isAgentResult.agentId
        ? isAgentResult.agentId
        : userId;

    console.log(
      `Checking agent status: ${
        isAgentResult.isAgent ? "Is agent" : "Not agent"
      }, effectiveUserId: ${effectiveUserId}`
    );

    // First, explicitly update unread count for the user to 0
    const roomRef = ref(database, `chat_rooms/${roomId}`);
    const roomSnapshot = await get(roomRef);

    if (!roomSnapshot.exists()) {
      console.log(`Room ${roomId} not found, nothing to mark as read`);
      return true;
    }

    // Update unread count for both regular user ID and agent ID if applicable
    console.log(
      `Setting unread_count to 0 for user ${effectiveUserId} in room ${roomId}`
    );
    const updates: { [key: string]: any } = {
      [`unreadCount/${effectiveUserId}`]: 0,
    };

    // If this is an agent, also update the original user ID's unread count
    if (isAgentResult.isAgent && isAgentResult.agentId) {
      updates[`unreadCount/${userId}`] = 0;
      console.log(
        `Also setting unread_count to 0 for original userId ${userId}`
      );
    }

    await update(roomRef, updates);

    // Mark all messages as read where user is receiver (checking both IDs)
    const messagesRef = ref(database, `messages/${roomId}`);
    const messagesSnapshot = await get(messagesRef);

    if (!messagesSnapshot.exists()) {
      console.log(`No messages found for room ${roomId}`);
      return true;
    }

    const messageUpdates: { [key: string]: any } = {};
    let updateCount = 0;

    messagesSnapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      // Check both the original user ID and effective ID (for agents)
      if (
        (message.receiverId === userId ||
          message.receiverId === effectiveUserId) &&
        !message.read
      ) {
        messageUpdates[`${childSnapshot.key}/read`] = true;
        updateCount++;
      }
    });

    if (updateCount > 0) {
      console.log(`Marking ${updateCount} messages as read in room ${roomId}`);
      await update(messagesRef, messageUpdates);
    } else {
      console.log(
        `No unread messages found for user ${effectiveUserId} in room ${roomId}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return false;
  }
}

/**
 * Get the other user in a chat room
 */
export function getChatPartner(
  roomParticipants: string[],
  currentUserId: string
): string {
  return roomParticipants.find((id) => id !== currentUserId) || "";
}

/**
 * Delete a chat room and all its messages
 */
export async function deleteChat(roomId: string): Promise<boolean> {
  if (!roomId) {
    console.error("Cannot delete chat: Missing roomId");
    return false;
  }

  try {
    console.log("[Deleting Chat Room and Messages] ==> ", roomId);

    // Create references to both the room and messages
    const roomRef = ref(database, `chat_rooms/${roomId}`);
    const messagesRef = ref(database, `messages/${roomId}`);

    // Delete messages first
    await remove(messagesRef);
    console.log(`Deleted all messages for room ${roomId}`);

    // Then delete the room
    await remove(roomRef);
    console.log(`Deleted chat room ${roomId}`);

    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    throw error;
  }
}
export { ChatRoom, checkIsAgent, ChatMessage };
