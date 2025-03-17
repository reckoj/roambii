import { ID, Query } from "react-native-appwrite";
import { databases, account, config, client } from "./appwrite";
import { MessageType } from "./types";

/** ✅ Generate a Unique Room ID */
export function getChatRoomId(userId: string, agentId: string) {
  return userId < agentId ? `${userId}_${agentId}` : `${agentId}_${userId}`;
}

/** ✅ Fetch Chat Rooms for User */
export async function getChatRooms(userId: string) {
  try {
    console.log("[Fetching Chat Rooms for] ==> ", userId);

    const response = await databases.listDocuments(
      config.databaseId!,
      config.chatRoomsCollectionId!,
      [
        Query.or([
          Query.equal("user_id", userId),
          Query.equal("agent_id", userId),
        ]),
        Query.orderDesc("last_updated"),
      ]
    );

    console.log("[Chat Rooms Response] ==> ", response.documents);

    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.agent_name || doc.user_name || "Unknown", // ✅ Fetch correct name
      lastMessage: doc.last_message || "No messages yet",
      roomId: doc.room_id, // ✅ Ensure room_id is available for navigation
    }));
  } catch (error) {
    console.error("[Error Fetching Chat Rooms]", error);
    return [];
  }
}

/** ✅ Get Messages in a Room */
export async function getMessages(roomId: string) {
  try {
    console.log("[Fetching Messages for Room] ==> ", roomId);

    const response = await databases.listDocuments(
      config.databaseId!,
      config.messagesCollectionId!,
      [
        Query.equal("room_id", roomId), // ✅ Fetch messages for correct room
        Query.orderAsc("timestamp"), // ✅ Order messages correctly
      ]
    );

    console.log("[Fetched Messages] ==> ", response.documents);

    return response.documents;
  } catch (error) {
    console.error("[Error Fetching Messages]", error);
    return [];
  }
}

/** ✅ Send a Message */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
) {
  try {
    const roomId = getChatRoomId(senderId, receiverId);

    const messageId = ID.unique(); // ✅ Generate a valid ID

    console.log("Generated Message ID: ", messageId); // ✅ Debugging output

    const newMessage = await databases.createDocument(
      config.databaseId!,
      config.messagesCollectionId!,
      messageId, // ✅ Use generated ID
      {
        room_id: roomId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        read: false,
        timestamp: new Date().toISOString(),
      }
    );

    console.log("[Message Sent] ==> ", newMessage);
    return newMessage;

    // ✅ Update Chat Room with Last Message
    await databases.updateDocument(
      config.databaseId!,
      config.chatRoomsCollectionId!,
      roomId,
      {
        last_message: content,
        last_updated: new Date().toISOString(),
      }
    );

    return newMessage;
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

/** ✅ Subscribe to Messages in a Room */
export function subscribeToMessages(
  roomId: string,
  callback: (message: MessageType) => void
) {
  console.log("[Subscribing to Messages for Room] ==> ", roomId);

  const unsubscribe = client.subscribe(
    `databases.${config.databaseId}.collections.${config.messagesCollectionId}.documents`,
    (response) => {
      if (
        response.events.includes("databases.*.collections.*.documents.*.create")
      ) {
        console.log("[Raw Message Received] ==> ", response.payload);

        // ✅ Explicitly type the payload as MessageType
        const newMessage = response.payload as MessageType;

        if (newMessage.room_id === roomId) {
          console.log("[New Message Received] ==> ", newMessage);
          callback(newMessage);
        }
      }
    }
  );

  return () => {
    console.log("[Unsubscribed from Messages]");
    unsubscribe();
  };
}
