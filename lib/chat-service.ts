// lib/chat-service.ts
import {
  ref,
  set,
  push,
  get,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
} from "firebase/database";
import { firebaseDb, firestore } from "./firebase/firebase-config";
import {
  doc,
  getDoc,
  collection,
  query as firestoreQuery,
  where,
  getDocs,
} from "firebase/firestore";
import { COLLECTIONS } from "./firebase/firebase-config";

// Export types for chat functionality
export interface ChatMessage {
  id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: number | Object;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  last_message: string;
  last_updated: number | Object;
  unread_count: { [userId: string]: number };
}

interface ChatRoomData {
  participants?: string[];
  user_id?: string;
  agent_id?: string;
  last_message?: string;
  last_updated?: number;
  created_at?: number;
  unread_count?: { [userId: string]: number };
}

// Add agent check cache
const agentCheckCache: { [userId: string]: { isAgent: boolean; agentId: string | null; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
 * Check if a user is an agent and get their agent document ID
 */
export async function checkIsAgent(
  userId: string
): Promise<{ isAgent: boolean; agentId: string | null }> {
  if (!userId) {
    return { isAgent: false, agentId: null };
  }

  // Check cache first
  const cachedResult = agentCheckCache[userId];
  const now = Date.now();
  if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
    return { isAgent: cachedResult.isAgent, agentId: cachedResult.agentId };
  }

  try {
    console.log("[Checking if user is agent] User ID:", userId);

    // Try to find user as an agent by ID
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      const result = { isAgent: true, agentId: userId };
      // Cache the result
      agentCheckCache[userId] = { ...result, timestamp: now };
      return result;
    }

    // Try to find agent by userId field
    const agentsCollection = collection(firestore, COLLECTIONS.AGENTS);
    const q = firestoreQuery(agentsCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const agent = querySnapshot.docs[0];
      const result = { isAgent: true, agentId: agent.id };
      // Cache the result
      agentCheckCache[userId] = { ...result, timestamp: now };
      return result;
    }

    // Cache negative result
    const result = { isAgent: false, agentId: null };
    agentCheckCache[userId] = { ...result, timestamp: now };
    return result;
  } catch (error) {
    console.error("[Agent Check Error]:", error);
    return { isAgent: false, agentId: null };
  }
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
    const roomId = getChatRoomId(resolvedId1, resolvedId2);
    console.log("Generated consistent room ID:", roomId, "from resolved IDs:", resolvedId1, resolvedId2);
    return roomId;
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

    // First check if the user is an agent and get their registration date
    const isAgentResult = await checkIsAgent(userId);
    let agentRegistrationTimestamp: number | null = null;

    if (isAgentResult.isAgent && isAgentResult.agentId) {
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, isAgentResult.agentId);
      const agentDoc = await getDoc(agentRef);
      if (agentDoc.exists()) {
        const agentData = agentDoc.data();
        // Convert Firestore timestamp to milliseconds
        agentRegistrationTimestamp = agentData.createdAt?.toMillis() || null;
      }
    }

    // Reference to the chat_rooms collection in Firebase Realtime Database
    const roomsRef = ref(firebaseDb, "chat_rooms");
    const snapshot = await get(roomsRef);

    if (!snapshot.exists()) {
      console.log("No chat rooms found in Firebase");
      return [];
    }

    const rooms: ChatRoom[] = [];

    snapshot.forEach((roomSnapshot) => {
      const roomData = roomSnapshot.val();

      // Skip rooms created before agent registration if user is an agent
      if (agentRegistrationTimestamp && roomData.created_at) {
        const roomCreationTimestamp = typeof roomData.created_at === 'number' 
          ? roomData.created_at 
          : new Date(roomData.created_at).getTime();
        
        if (roomCreationTimestamp < agentRegistrationTimestamp) {
          console.log(`Skipping room ${roomSnapshot.key} - created before agent registration`);
          return; // Skip this room
        }
      }

      // Check if participants is an array or an object
      if (roomData.participants) {
        // If it's an array, check if user is in it
        if (Array.isArray(roomData.participants)) {
          if (roomData.participants.includes(userId)) {
            rooms.push({
              id: roomSnapshot.key || "",
              participants: roomData.participants || [],
              last_message: roomData.last_message || "",
              last_updated: roomData.last_updated || Date.now(),
              unread_count: roomData.unread_count || { [userId]: 0 },
            });
          }
        }
        // If it's an object, check if user is a value
        else if (typeof roomData.participants === "object") {
          const participantIds = Object.values(roomData.participants);
          if (participantIds.includes(userId)) {
            rooms.push({
              id: roomSnapshot.key || "",
              participants: participantIds as string[],
              last_message: roomData.last_message || "",
              last_updated: roomData.last_updated || Date.now(),
              unread_count: roomData.unread_count || { [userId]: 0 },
            });
          }
        }
      }

      // Also check for rooms where user_id or agent_id matches
      if (
        (roomData.user_id === userId || roomData.agent_id === userId) &&
        !rooms.some((r) => r.id === roomSnapshot.key)
      ) {
        rooms.push({
          id: roomSnapshot.key || "",
          participants: [roomData.user_id, roomData.agent_id].filter(Boolean),
          last_message: roomData.last_message || "",
          last_updated: roomData.last_updated || Date.now(),
          unread_count: roomData.unread_count || { [userId]: 0 },
        });
      }
    });

    // Sort by last updated timestamp
    rooms.sort((a, b) => {
      const timeA =
        typeof a.last_updated === "number" ? a.last_updated : Date.now();
      const timeB =
        typeof b.last_updated === "number" ? b.last_updated : Date.now();
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

    const messagesRef = ref(firebaseDb, `messages/${roomId}`);
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
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
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

    console.log(`Found ${messages.length} messages for room ${roomId}`);
    return messages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

/**
 * Subscribe to messages in a specific room with improved real-time handling
 */
export function subscribeToMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  if (!roomId) {
    console.error("Cannot subscribe to messages: Missing roomId");
    return () => {};
  }

  console.log("[SUBSCRIPTION SETUP] Room:", roomId, "at:", new Date().toISOString());

  const messagesRef = ref(firebaseDb, `messages/${roomId}`);

  // Listen for changes to messages with better logging
  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      console.log("[SUBSCRIPTION TRIGGERED] Room:", roomId, "at:", new Date().toISOString());

      if (!snapshot.exists()) {
        console.log(`[SUBSCRIPTION] No messages for room: ${roomId}`);
        callback([]);
        return;
      }

      const messages: ChatMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        const timestamp = message.timestamp || Date.now();
        
        messages.push({
          id: childSnapshot.key || "",
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          timestamp: typeof timestamp === 'object' && timestamp.seconds 
            ? timestamp.seconds * 1000 + Math.round(timestamp.nanoseconds / 1000000)
            : timestamp,
          read: message.read || false,
        });
      });

      // Sort by timestamp
      messages.sort((a, b) => {
        const timeA = typeof a.timestamp === "number" ? a.timestamp : Date.now();
        const timeB = typeof b.timestamp === "number" ? b.timestamp : Date.now();
        return timeA - timeB;
      });

      console.log(`[SUBSCRIPTION] Room ${roomId}: Sending ${messages.length} messages to callback`);
      callback(messages);
    },
    (error) => {
      console.error(`[SUBSCRIPTION ERROR] Room ${roomId}:`, error);
    }
  );

  // Return enhanced unsubscribe function
  return () => {
    console.log(`[UNSUBSCRIBING] Room ${roomId} at:`, new Date().toISOString());
    off(messagesRef);
  };
}

/**
 * Send a message
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
    // Check if sender is an agent
    const senderCheck = await checkIsAgent(senderId);
    const effectiveSenderId = senderCheck.isAgent && senderCheck.agentId ? senderCheck.agentId : senderId;

    // Check if receiver is an agent
    const receiverCheck = await checkIsAgent(receiverId);
    const effectiveReceiverId = receiverCheck.isAgent && receiverCheck.agentId ? receiverCheck.agentId : receiverId;

    // Generate room ID using effective IDs
    const roomId = await getConsistentRoomId(effectiveSenderId, effectiveReceiverId);

    console.log("[Sending Message] ==> ", {
      roomId,
      senderId: effectiveSenderId,
      receiverId: effectiveReceiverId,
      content,
    });

    const currentTimestamp = Date.now();

    // Prepare message data
    const messageData = {
      sender_id: effectiveSenderId,
      receiver_id: effectiveReceiverId,
      content,
      timestamp: currentTimestamp,
      read: false,
    };

    // Create message reference
    const messagesRef = ref(firebaseDb, `messages/${roomId}`);
    const newMessageRef = push(messagesRef);

    // Save message
    await set(newMessageRef, messageData);

    // Update chat room data
    const roomRef = ref(firebaseDb, `chat_rooms/${roomId}`);
    const roomSnapshot = await get(roomRef);

    if (!roomSnapshot.exists()) {
      // Create new room
      await set(roomRef, {
        participants: [effectiveSenderId, effectiveReceiverId],
        last_message: content,
        last_updated: currentTimestamp,
        created_at: currentTimestamp,
        unread_count: {
          [effectiveReceiverId]: 1,
        },
      });
    } else {
      // Update existing room
      const roomData = roomSnapshot.val();
      const updates: any = {
        last_message: content,
        last_updated: currentTimestamp,
      };

      // Ensure participants array contains both users
      if (!roomData.participants) {
        updates.participants = [effectiveSenderId, effectiveReceiverId];
      } else if (Array.isArray(roomData.participants)) {
        const participants = [...roomData.participants];
        if (!participants.includes(effectiveSenderId)) {
          participants.push(effectiveSenderId);
        }
        if (!participants.includes(effectiveReceiverId)) {
          participants.push(effectiveReceiverId);
        }
        updates.participants = participants;
      }

      // Initialize or increment unread count for receiver
      const currentUnreadCount = roomData.unread_count?.[effectiveReceiverId] || 0;
      updates[`unread_count/${effectiveReceiverId}`] = currentUnreadCount + 1;

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
 * Mark messages as read
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

    // First, update unread count for the user to 0
    const roomRef = ref(firebaseDb, `chat_rooms/${roomId}`);
    const roomSnapshot = await get(roomRef);

    if (!roomSnapshot.exists()) {
      console.log(`Room ${roomId} not found, nothing to mark as read`);
      return true;
    }

    // Update unread count for both regular user ID and agent ID if applicable
    const updates: { [key: string]: any } = {
      [`unread_count/${effectiveUserId}`]: 0,
    };

    // If this is an agent, also update the original user ID's unread count
    if (isAgentResult.isAgent && isAgentResult.agentId) {
      updates[`unread_count/${userId}`] = 0;
    }

    await update(roomRef, updates);

    // Mark all messages as read where user is receiver
    const messagesRef = ref(firebaseDb, `messages/${roomId}`);
    const messagesSnapshot = await get(messagesRef);

    if (!messagesSnapshot.exists()) {
      console.log(`No messages found for room ${roomId}`);
      return true;
    }

    const messageUpdates: { [key: string]: any } = {};
    let updateCount = 0;

    messagesSnapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (
        (message.receiver_id === userId || message.receiver_id === effectiveUserId) &&
        !message.read
      ) {
        messageUpdates[`${childSnapshot.key}/read`] = true;
        updateCount++;
      }
    });

    if (updateCount > 0) {
      console.log(`Marking ${updateCount} messages as read in room ${roomId}`);
      await update(messagesRef, messageUpdates);
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
    const roomRef = ref(firebaseDb, `chat_rooms/${roomId}`);
    const messagesRef = ref(firebaseDb, `messages/${roomId}`);

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

/**
 * Subscribe to chat room updates for a user
 */
export const subscribeToChatRooms = (
  userId: string,
  callback: (rooms: ChatRoom[]) => void
): (() => void) => {
  try {
    console.log("[Setting up chat rooms subscription] for user:", userId);
    
    // First check if the user is an agent
    checkIsAgent(userId).then(async (agentCheck) => {
      const effectiveUserId = agentCheck.isAgent && agentCheck.agentId ? agentCheck.agentId : userId;
      console.log("[Chat Rooms] Using effective user ID:", effectiveUserId, "Is agent:", agentCheck.isAgent);
      
      // Get a reference to the chat rooms collection
      const chatRoomsRef = ref(firebaseDb, 'chat_rooms');
      
      // Set up the real-time listener for all chat rooms
      const unsubscribe = onValue(chatRoomsRef, async (snapshot) => {
        console.log("[Chat rooms update received] for user:", effectiveUserId);
        
        if (!snapshot.exists()) {
          console.log("No chat rooms found");
          callback([]);
          return;
        }

        const rooms: ChatRoom[] = [];
        
        // Process each room
        for (const roomSnapshot of Object.entries(snapshot.val())) {
          const [roomId, roomData] = roomSnapshot;
          
          // Skip if room data is invalid
          if (!roomData || typeof roomData !== 'object') continue;
          
          const typedRoomData = roomData as ChatRoomData;
          
          // Check if user is a participant
          const isParticipant = Array.isArray(typedRoomData.participants) 
            ? typedRoomData.participants.includes(effectiveUserId)
            : false;
            
          // Also check for user_id or agent_id fields
          const isUserOrAgent = typedRoomData.user_id === effectiveUserId || typedRoomData.agent_id === effectiveUserId;
          
          console.log(`[Room ${roomId}] Checking participation:`, {
            isParticipant,
            isUserOrAgent,
            participants: typedRoomData.participants,
            userId: typedRoomData.user_id,
            agentId: typedRoomData.agent_id,
            effectiveUserId
          });
          
          if (isParticipant || isUserOrAgent) {
            // Get the latest message for this room
            const messagesRef = ref(firebaseDb, `messages/${roomId}`);
            const messagesSnapshot = await get(messagesRef);
            let lastMessage = typedRoomData.last_message || "";
            let lastUpdated = typedRoomData.last_updated || Date.now();

            if (messagesSnapshot.exists()) {
              const messages = messagesSnapshot.val();
              const messageIds = Object.keys(messages);
              if (messageIds.length > 0) {
                // Get the latest message
                const latestMessageId = messageIds[messageIds.length - 1];
                const latestMessage = messages[latestMessageId];
                lastMessage = latestMessage.content;
                lastUpdated = latestMessage.timestamp;
              }
            }

            rooms.push({
              id: roomId,
              participants: Array.isArray(typedRoomData.participants) 
                ? typedRoomData.participants 
                : [typedRoomData.user_id, typedRoomData.agent_id].filter(Boolean) as string[],
              last_message: lastMessage,
              last_updated: lastUpdated,
              unread_count: typedRoomData.unread_count || { [effectiveUserId]: 0 },
            });
          }
        }
        
        // Sort rooms by last_updated timestamp
        rooms.sort((a, b) => {
          const timeA = typeof a.last_updated === 'number' ? a.last_updated : 0;
          const timeB = typeof b.last_updated === 'number' ? b.last_updated : 0;
          return timeB - timeA;
        });
        
        console.log(`[Chat rooms update] Found ${rooms.length} rooms for user ${effectiveUserId}`);
        callback(rooms);
      });
      
      return () => {
        console.log("[Cleaning up chat rooms subscription] for user:", effectiveUserId);
        off(chatRoomsRef);
      };
    });
    
    return () => {}; // Return empty function if subscription fails
  } catch (error) {
    console.error('Error setting up chat rooms subscription:', error);
    return () => {}; // Return empty function if subscription fails
  }
};
