import images from "@/constants/images";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
} from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import { MessageType } from "@/lib/types";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { StatusBar } from "react-native";

// Define the structure of a Chat
type Chat = {
  id: number;
  name: string;
  lastMessage: string;
};

const ChatScreen = () => {
  // Explicitly type state as Chat[]
  const [chats, setChats] = useState<Chat[]>([]);
  const params = useLocalSearchParams();
  //   const params2 = useLocalSearchParams<{ query?: string; filter?: string }>();
  const { userId, agentId } = useLocalSearchParams<{
    userId: string;
    agentId: string;
  }>();
  const { rawUser } = useGlobalContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [load, setLoad] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const roomId = `${userId}_${agentId}`;
    loadMessages(roomId);

    // ✅ Ensure TypeScript knows the type of `message`
    const unsubscribe = subscribeToMessages(roomId, (message: any) => {
      if (message && typeof message === "object" && "content" in message) {
        setMessages((prevMessages) => [
          ...prevMessages,
          message as MessageType,
        ]);
      }
    });

    return () => unsubscribe();
  }, [userId, agentId]);

  const loadMessages = async (roomId: string) => {
    const data = await getMessages(roomId);
    setMessages(data);
    await markMessagesAsRead(roomId, rawUser?.$id!);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    console.log("this is the message ID ===>>>", newMessage);
    await sendMessage(rawUser?.$id!, agentId, newMessage);
    setNewMessage("");
  };

  return (
    <SafeAreaView>
      <View>
        <View className="flex flex-row items-center p-4 border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} />
          </TouchableOpacity>
          <Text className="text-xl font-semibold ml-2">Chat</Text>
          <View className="flex flex-row items-center justify-between mt-5">
            <View className="flex flex-row">
              <Image
                source={{ uri: agentId }}
                className="size-12 rounded-full"
              />
            </View>
            {/* <Image source={icons.bell} className="size-6" /> */}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => (
            <View
              className={`p-3 my-1 rounded-lg max-w-[75%] ${
                item.sender_id === rawUser?.$id
                  ? "bg-blue-500 ml-auto"
                  : "bg-gray-200"
              }`}
            >
              <Text
                className={`${
                  item.sender_id === rawUser?.$id ? "text-white" : "text-black"
                }`}
              >
                {item.content}
              </Text>
            </View>
          )}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <KeyboardAvoidingView
          behavior="padding"
          className="p-4 flex flex-row items-center"
        >
          <TextInput
            className="flex-1 p-3 border border-gray-300 rounded-lg"
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            className="ml-3 p-3 bg-primary-200 rounded-lg"
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;
function markMessagesAsRead(roomId: string, arg1: string) {
  throw new Error("Function not implemented.");
}
