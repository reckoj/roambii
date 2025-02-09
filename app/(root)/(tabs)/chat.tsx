import images from "@/constants/images";
import React, { useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
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

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />

      {chats.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Image
            source={images.nomessages}
            className="w-60 h-60 mb-4"
            resizeMode="contain"
          />
            <Text className="text-lg font-semibold text-gray-500">You have no messages</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold">{item.name}</Text>
              <Text className="text-gray-500">{item.lastMessage}</Text>
            </View>
          )}
        />
      )}

      <View className="p-4">
        <TouchableOpacity
          onPress={() =>
            setChats([{ id: 1, name: "John Doe", lastMessage: "Hello!" }])
          }
        >
          Add Sample Chat
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;
