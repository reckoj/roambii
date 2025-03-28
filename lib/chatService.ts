// // lib/chatService.ts
// import { ID, Query } from "react-native-appwrite";
// import { databases, account, config, client } from "./appwrite";
// import { MessageType, ChatRoom } from "./types";

// /** ✅ Generate a Unique Room ID */
// export function getChatRoomId(userId: string, agentId: string) {
//   if (!userId || !agentId) {
//     console.error("Cannot generate room ID: Missing userId or agentId", {
//       userId,
//       agentId,
//     });
//     return null;
//   }

//   // Clean IDs to ensure they only contain valid characters
//   const cleanUserId = userId.replace(/[^a-zA-Z0-9._-]/g, "");
//   const cleanAgentId = agentId.replace(/[^a-zA-Z0-9._-]/g, "");

//   // Ensure ID doesn't start with special characters
//   const safeUserId = cleanUserId.match(/^[._-]/)
//     ? `a${cleanUserId}`
//     : cleanUserId;
//   const safeAgentId = cleanAgentId.match(/^[._-]/)
//     ? `a${cleanAgentId}`
//     : cleanAgentId;

//   // Limit the length of each ID to ensure the combined ID is not too long
//   const maxIdLength = 15; // This ensures combined ID with separator stays under 36 chars
//   const trimmedUserId = safeUserId.slice(0, maxIdLength);
//   const trimmedAgentId = safeAgentId.slice(0, maxIdLength);

//   // Consistent ordering to ensure the same roomId regardless of who starts the chat
//   return trimmedUserId < trimmedAgentId
//     ? `${trimmedUserId}_${trimmedAgentId}`
//     : `${trimmedAgentId}_${trimmedUserId}`;
// }

// /** ✅ Fetch Chat Rooms for User */
// export async function getChatRooms(userId: string) {
//   try {
//     if (!userId) {
//       console.error("Cannot fetch chat rooms: Missing userId");
//       return [];
//     }

//     if (!config.databaseId || !config.chatRoomsCollectionId) {
//       console.error(
//         "Cannot fetch chat rooms: Missing database or collection configuration",
//         {
//           databaseId: config.databaseId,
//           chatRoomsCollectionId: config.chatRoomsCollectionId,
//         }
//       );
//       return [];
//     }

//     console.log("[Fetching Chat Rooms for] ==> ", userId);
//     console.log(
//       "Using DB:",
//       config.databaseId,
//       "Collection:",
//       config.chatRoomsCollectionId
//     );

//     const response = await databases.listDocuments(
//       config.databaseId,
//       config.chatRoomsCollectionId,
//       [
//         Query.or([
//           Query.equal("user_id", userId),
//           Query.equal("agent_id", userId),
//         ]),
//         Query.orderDesc("last_updated"),
//       ]
//     );

//     console.log("[Chat Rooms Response] ==> ", response.documents);

//     return response.documents.map((doc) => ({
//       $id: doc.$id,
//       room_id: doc.room_id,
//       user_id: doc.user_id,
//       agent_id: doc.agent_id,
//       name: doc.agent_name || doc.user_name || "Unknown",
//       last_message: doc.last_message || "No messages yet",
//       last_updated: doc.last_updated || new Date().toISOString(),
//       unread_count: doc.unread_count || 0,
//     }));
//   } catch (error) {
//     console.error("[Error Fetching Chat Rooms]", error);
//     return [];
//   }
// }

// /** ✅ Get Messages in a Room */
// export async function getMessages(roomId: string) {
//   try {
//     if (!roomId) {
//       console.error("Cannot fetch messages: Missing roomId");
//       return [];
//     }

//     if (!config.databaseId || !config.messagesCollectionId) {
//       console.error(
//         "Cannot fetch messages: Missing database or collection configuration",
//         {
//           databaseId: config.databaseId,
//           messagesCollectionId: config.messagesCollectionId,
//         }
//       );
//       return [];
//     }

//     console.log("[Fetching Messages for Room] ==> ", roomId);
//     console.log(
//       "Using DB:",
//       config.databaseId,
//       "Collection:",
//       config.messagesCollectionId
//     );

//     // Using .list instead of listDocuments to fetch all available messages
//     // listDocuments might be filtered by the user's permissions
//     const response = await databases.listDocuments(
//       config.databaseId,
//       config.messagesCollectionId,
//       [Query.equal("room_id", roomId), Query.orderAsc("timestamp")]
//     );

//     console.log("[Fetched Messages] ==> ", response.documents);

//     if (response.documents.length === 0) {
//       // Try with partial match on room_id if exact match returns no results
//       console.log("[Trying partial match on room_id]");
//       const partialResponse = await databases.listDocuments(
//         config.databaseId,
//         config.messagesCollectionId,
//         [
//           Query.startsWith("room_id", roomId.substring(0, 10)),
//           Query.orderAsc("timestamp"),
//         ]
//       );

//       console.log(
//         "[Fetched Messages with partial match] ==> ",
//         partialResponse.documents
//       );

//       if (partialResponse.documents.length > 0) {
//         // If we found messages with a partial match, use those instead
//         return partialResponse.documents.map((doc) => ({
//           $id: doc.$id,
//           room_id: doc.room_id || roomId,
//           sender_id: doc.sender_id || "",
//           receiver_id: doc.receiver_id || "",
//           content: doc.content || "",
//           read: doc.read || false,
//           timestamp: doc.timestamp || new Date().toISOString(),
//         }));
//       }
//     }

//     // Ensure all documents have the required properties
//     const messages = response.documents.map((doc) => ({
//       $id: doc.$id,
//       room_id: doc.room_id || roomId,
//       sender_id: doc.sender_id || "",
//       receiver_id: doc.receiver_id || "",
//       content: doc.content || "",
//       read: doc.read || false,
//       timestamp: doc.timestamp || new Date().toISOString(),
//     }));

//     return messages;
//   } catch (error) {
//     console.error("[Error Fetching Messages]", error);
//     return [];
//   }
// }

// /** ✅ Send a Message */
// export async function sendMessage(
//   senderId: string,
//   receiverId: string,
//   content: string
// ) {
//   try {
//     if (!senderId || !receiverId || !content.trim()) {
//       console.error("Cannot send message: Missing required data", {
//         senderId,
//         receiverId,
//         hasContent: Boolean(content.trim()),
//       });
//       throw new Error("Missing required data for sending a message");
//     }

//     if (
//       !config.databaseId ||
//       !config.messagesCollectionId ||
//       !config.chatRoomsCollectionId
//     ) {
//       console.error(
//         "Cannot send message: Missing database or collection configuration",
//         {
//           databaseId: config.databaseId,
//           messagesCollectionId: config.messagesCollectionId,
//           chatRoomsCollectionId: config.chatRoomsCollectionId,
//         }
//       );
//       throw new Error("Application configuration error");
//     }

//     const roomId = getChatRoomId(senderId, receiverId);
//     if (!roomId) {
//       throw new Error("Failed to generate a valid room ID");
//     }

//     const messageId = ID.unique();

//     console.log("[Sending Message] ==> ", {
//       roomId,
//       senderId,
//       receiverId,
//       content,
//     });

//     // First, check if chat room exists
//     let roomDocument;
//     try {
//       // Use ID.unique() instead of the roomId for the document ID
//       const roomDocId = roomId.length <= 36 ? roomId : ID.unique();

//       // Prepare room data based on available schema
//       const roomData = {
//         room_id: roomId, // Store original room ID in a field
//         user_id: senderId,
//         agent_id: receiverId,
//         last_message: content,
//         last_updated: new Date().toISOString(),
//         // Only include unread_count if your schema has it
//         // unread_count: 1,
//       };

//       try {
//         roomDocument = await databases.getDocument(
//           config.databaseId,
//           config.chatRoomsCollectionId,
//           roomDocId
//         );
//         console.log("[Found Existing Room] ==> ", roomDocument.$id);
//       } catch (roomError) {
//         // Room doesn't exist, create it
//         console.log("[Creating New Room] ==> ", roomDocId);
//         roomDocument = await databases.createDocument(
//           config.databaseId,
//           config.chatRoomsCollectionId,
//           roomDocId,
//           roomData,
//           // Grant permissions to all authenticated users
//           // This is safer than "any" but makes the room visible to all users
//           ['read("users")', 'update("users")', 'delete("users")']
//         );
//       }
//     } catch (error) {
//       console.error("Error with room document:", error);
//       // Create a fallback room with a guaranteed unique ID
//       const fallbackRoomId = ID.unique();
//       console.log("[Creating Fallback Room] ==> ", fallbackRoomId);

//       // Prepare minimal room data based on available schema
//       const roomData = {
//         room_id: roomId, // Store the original room ID for reference
//         user_id: senderId,
//         agent_id: receiverId,
//         last_message: content,
//         last_updated: new Date().toISOString(),
//         // Only include unread_count if your schema has it
//         // unread_count: 1,
//       };

//       roomDocument = await databases.createDocument(
//         config.databaseId,
//         config.chatRoomsCollectionId,
//         fallbackRoomId,
//         roomData,
//         // Grant permissions to all authenticated users
//         ['read("users")', 'update("users")', 'delete("users")']
//       );
//     }

//     // Now create the message
//     console.log("[Creating Message Document] with ID:", messageId);
//     const newMessage = await databases.createDocument(
//       config.databaseId,
//       config.messagesCollectionId,
//       messageId,
//       {
//         room_id: roomId,
//         sender_id: senderId,
//         receiver_id: receiverId,
//         content,
//         read: false,
//         timestamp: new Date().toISOString(),
//       },
//       // Grant permissions to all authenticated users for the message
//       ['read("users")', 'update("users")', 'delete("users")']
//     );

//     // Update the chat room with latest message info
//     console.log("[Updating Chat Room] with new message:", roomDocument.$id);

//     // Prepare update data based on available schema
//     const updateData = {
//       last_message: content,
//       last_updated: new Date().toISOString(),
//       // Only include unread_count if your schema has it
//       // unread_count: (roomDocument.unread_count || 0) + 1,
//     };

//     await databases.updateDocument(
//       config.databaseId,
//       config.chatRoomsCollectionId,
//       roomDocument.$id, // Use the document's ID instead of the roomId
//       updateData
//     );

//     return newMessage;
//   } catch (error) {
//     console.error("[Error Sending Message]", error);
//     throw error;
//   }
// }

// /** ✅ Subscribe to Messages in a Room */
// export function subscribeToMessages(
//   roomId: string,
//   callback: (message: MessageType) => void
// ) {
//   if (!roomId) {
//     console.error("Cannot subscribe to messages: Missing roomId");
//     return () => {}; // Return no-op function
//   }

//   if (!config.databaseId || !config.messagesCollectionId) {
//     console.error(
//       "Cannot subscribe to messages: Missing database or collection configuration"
//     );
//     return () => {}; // Return no-op function
//   }

//   console.log("[Subscribing to Messages] ==> ", {
//     roomId,
//     database: config.databaseId,
//     collection: config.messagesCollectionId,
//   });

//   try {
//     // Subscribe to ALL document events for the messages collection
//     const unsubscribe = client.subscribe(
//       `databases.${config.databaseId}.collections.${config.messagesCollectionId}.documents`,
//       (response) => {
//         // Only process create events
//         if (
//           response.events.includes(
//             "databases.*.collections.*.documents.*.create"
//           )
//         ) {
//           console.log("[Message Event Received] ==> ", {
//             event: response.events[0],
//             payload: response.payload,
//           });

//           const payload = response.payload as any;

//           if (!payload || !payload.room_id) {
//             console.error("Invalid message payload:", payload);
//             return;
//           }

//           // Create a properly typed message object
//           const newMessage: MessageType = {
//             $id: payload.$id || "",
//             room_id: payload.room_id || "",
//             sender_id: payload.sender_id || "",
//             receiver_id: payload.receiver_id || "",
//             content: payload.content || "",
//             read: payload.read || false,
//             timestamp: payload.timestamp || new Date().toISOString(),
//           };

//           // Check if this message belongs to our room
//           console.log(
//             `Comparing roomIds: message=${newMessage.room_id}, current=${roomId}`
//           );

//           if (newMessage.room_id === roomId) {
//             console.log("[New Message For Current Room] ==> ", newMessage);
//             callback(newMessage);
//           } else {
//             console.log("[Message for different room, ignoring]");
//           }
//         }
//       }
//     );

//     return () => {
//       console.log("[Unsubscribed from Messages]");
//       unsubscribe();
//     };
//   } catch (error) {
//     console.error("[Error Subscribing to Messages]", error);
//     return () => {}; // Return no-op function on error
//   }
// }

// /** ✅ Mark Messages as Read */
// export async function markMessagesAsRead(roomId: string, userId: string) {
//   try {
//     if (!roomId || !userId) {
//       console.error("[Mark Messages as Read] Invalid parameters:", {
//         roomId,
//         userId,
//       });
//       return false;
//     }

//     if (
//       !config.databaseId ||
//       !config.messagesCollectionId ||
//       !config.chatRoomsCollectionId
//     ) {
//       console.error(
//         "Cannot mark messages as read: Missing database or collection configuration"
//       );
//       return false;
//     }

//     console.log("[Marking Messages as Read] ==> ", roomId, userId);

//     // First, get all unread messages for this user
//     const response = await databases.listDocuments(
//       config.databaseId,
//       config.messagesCollectionId,
//       [
//         Query.equal("room_id", roomId),
//         Query.equal("receiver_id", userId),
//         Query.equal("read", false),
//       ]
//     );

//     // Mark each message as read
//     const updatePromises = response.documents.map((doc) =>
//       databases.updateDocument(
//         config.databaseId!,
//         config.messagesCollectionId!,
//         doc.$id,
//         { read: true }
//       )
//     );

//     if (updatePromises.length > 0) {
//       await Promise.all(updatePromises);
//     }

//     // Reset unread count in chat room - Check if room exists first
//     try {
//       // Query to find the room document
//       const response = await databases.listDocuments(
//         config.databaseId,
//         config.chatRoomsCollectionId,
//         [Query.equal("room_id", roomId)]
//       );

//       if (response.documents.length > 0) {
//         // Found room, update unread count if schema supports it
//         const roomDoc = response.documents[0];
//         console.log("[Updating last_updated for room] ==> ", roomDoc.$id);

//         // Only update fields that exist in the schema
//         await databases.updateDocument(
//           config.databaseId,
//           config.chatRoomsCollectionId,
//           roomDoc.$id,
//           {
//             last_updated: new Date().toISOString(),
//             // If you add unread_count to schema, uncomment below
//             // unread_count: 0
//           }
//         );
//       } else {
//         console.log("Chat room doesn't exist yet, no need to update");
//       }
//     } catch (error) {
//       console.error("Error updating room:", error);
//     }

//     return true;
//   } catch (error) {
//     console.error("[Error Marking Messages as Read]", error);
//     return false;
//   }
// }

// lib/chatService.ts
// lib/chatService.ts
// lib/chatService.ts
// chatService.ts - Updated with more reliable room ID generation
import { firebaseDb } from "@/lib/firebase";
import {
  ref,
  set,
  push,
  onValue,
  get,
  query,
  orderByChild,
  update,
  serverTimestamp,
  off,
} from "firebase/database";
import { account, databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";

// Types
export interface FirebaseMessage {
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
  unread_count?: number;
}

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
 * Resolve the correct user ID for an agent
 */
export async function resolveAgentUserId(agentId: string): Promise<string> {
  if (!agentId) return "";

  try {
    // If no agents collection is configured, just return the provided ID
    if (!config.agentsCollectionId) return agentId;

    // Try to get the agent document
    const agentDoc = await databases
      .getDocument(config.databaseId!, config.agentsCollectionId, agentId)
      .catch(() => null);

    // If the agent has a userId field, use that instead
    if (agentDoc && agentDoc.userId) {
      console.log(`Resolved agent ${agentId} to user ID ${agentDoc.userId}`);
      return agentDoc.userId;
    }

    // Otherwise, return the original ID
    return agentId;
  } catch (error) {
    console.error("Error resolving agent user ID:", error);
    return agentId; // Return original ID on error
  }
}

/**
 * Check if a user is an agent and get their agent document ID
 */
export async function checkIsAgent(
  userId: string
): Promise<{ isAgent: boolean; agentId: string | null }> {
  if (!userId || !config.agentsCollectionId) {
    return { isAgent: false, agentId: null };
  }

  try {
    // Try to find this user in the agents collection
    const agents = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId,
      [Query.equal("userId", userId)]
    );

    if (agents.documents.length > 0) {
      console.log("User is an agent:", agents.documents[0].$id);
      return {
        isAgent: true,
        agentId: agents.documents[0].$id,
      };
    } else {
      return { isAgent: false, agentId: null };
    }
  } catch (error) {
    console.error("Error checking if user is agent:", error);
    return { isAgent: false, agentId: null };
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

    // First check if there are any rooms where this user is a participant
    const roomsRef = ref(firebaseDb, "chat_rooms");
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
        // If it's an array, check if user is in it
        if (Array.isArray(roomData.participants)) {
          if (roomData.participants.includes(userId)) {
            rooms.push({
              id: roomSnapshot.key || "",
              participants: roomData.participants || [],
              last_message: roomData.last_message || "",
              last_updated: roomData.last_updated || Date.now(),
              unread_count: roomData.unread_count?.[userId] || 0,
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
              unread_count: roomData.unread_count?.[userId] || 0,
            });
          }
        }
      }

      // Also check for rooms where user_id or agent_id matches
      // This handles rooms created with the old format
      if (
        (roomData.user_id === userId || roomData.agent_id === userId) &&
        !rooms.some((r) => r.id === roomSnapshot.key)
      ) {
        rooms.push({
          id: roomSnapshot.key || "",
          participants: [roomData.user_id, roomData.agent_id].filter(Boolean),
          last_message: roomData.last_message || "",
          last_updated: roomData.last_updated || Date.now(),
          unread_count: roomData.unread_count?.[userId] || 0,
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
export async function getMessages(roomId: string): Promise<FirebaseMessage[]> {
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

    const messages: FirebaseMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      messages.push({
        id: childSnapshot.key || "",
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
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
 */
export function subscribeToMessages(
  roomId: string,
  callback: (messages: FirebaseMessage[]) => void
) {
  if (!roomId) {
    console.error("Cannot subscribe to messages: Missing roomId");
    return () => {};
  }

  console.log("[Subscribing to Messages for Room] ==> ", roomId);

  const messagesRef = ref(firebaseDb, `messages/${roomId}`);

  // Listen for changes to messages
  onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.log(`Received 0 messages from subscription`);
      callback([]);
      return;
    }

    const messages: FirebaseMessage[] = [];
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
 * Send a message
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<FirebaseMessage> {
  if (!senderId || !receiverId || !content.trim()) {
    throw new Error("Missing required data for sending a message");
  }

  try {
    // Generate room ID directly
    const roomId = getChatRoomId(senderId, receiverId);

    console.log("[Sending Message] ==> ", {
      roomId,
      senderId,
      receiverId,
      content,
    });

    // Prepare message data
    const messageData: Omit<FirebaseMessage, "id"> = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      timestamp: serverTimestamp(),
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
        participants: [senderId, receiverId],
        last_message: content,
        last_updated: serverTimestamp(),
        unread_count: {
          [receiverId]: 1,
        },
      });
    } else {
      // Update existing room
      const roomData = roomSnapshot.val();
      const updates: any = {
        last_message: content,
        last_updated: serverTimestamp(),
      };

      // Ensure participants array contains both users
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

      // Increment unread count for receiver
      if (!roomData.unread_count) {
        updates.unread_count = { [receiverId]: 1 };
      } else {
        const currentCount = roomData.unread_count[receiverId] || 0;
        updates[`unread_count/${receiverId}`] = currentCount + 1;
      }

      await update(roomRef, updates);
    }

    return {
      ...messageData,
      id: newMessageRef.key || "",
      timestamp: Date.now(), // Replace serverTimestamp with current time for immediate use
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
    console.error("Cannot mark messages as read: Missing data");
    return false;
  }

  try {
    console.log("[Marking Messages as Read] ==> ", roomId, userId);

    // Update unread count for user
    const roomRef = ref(firebaseDb, `chat_rooms/${roomId}`);
    await update(roomRef, {
      [`unread_count/${userId}`]: 0,
    });

    // Mark all messages as read where user is receiver
    const messagesRef = ref(firebaseDb, `messages/${roomId}`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return true;
    }

    const updates: { [key: string]: any } = {};

    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.receiver_id === userId && !message.read) {
        updates[`${childSnapshot.key}/read`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(messagesRef, updates);
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
