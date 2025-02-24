import { databases } from "@/lib/appwrite";
import { ID } from "react-native-appwrite";

export const sendMessage = async (
  senderId: string,
  receiverId: string,
  roomId: string,
  content: string
) => {
  try {
    await databases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.EXPO_PUBLIC_APPWRITE_MESSAGE_COLLECTION_ID!,
      ID.unique(),
      {
        sender_id: senderId,
        receiver_id: receiverId,
        room_id: roomId,
        content,
        read: false,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
  }
};
