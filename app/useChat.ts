import { client, config, databases } from "@/lib/appwrite";
import { useEffect, useState } from "react";
import { Query } from "react-native-appwrite";

interface Message {
  $id: string;
  sender_id: string;
  receiver_id: string;
  room_id: string;
  content: string;
  read: boolean;
  timestamp: string;
}

const useChat = (roomId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
          [Query.equal("room_id", roomId), Query.orderDesc("timestamp")]
        );
        setMessages(response.documents as unknown as Message[]);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const unsubscribe = client.subscribe(
      `databases.${config.databaseId}.collections.${config.chatCollectionId}.documents`,
      (response) => {
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          const newMessage = response.payload as unknown as Message;
          if (newMessage.receiver_id === roomId) {
            setMessages((prev) => [newMessage, ...prev]);
          }
        }
      }
    );

    return () => unsubscribe(); // Cleanup on unmount
  }, [roomId]);

  return { messages };
};

export default useChat;
