import images from "@/constants/images";
import { getChatRooms } from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "react-native";
import { router } from "expo-router";

const ChatScreen = () => {
  const { rawUser } = useGlobalContext();
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!rawUser?.$id) return;
      console.log("[Fetching Chat Rooms for] ==> ", rawUser.$id);

      const data = await getChatRooms(rawUser.$id);
      console.log("[Chat Rooms Response] ==> ", data);

      if (data && data.length > 0) {
        setChatRooms(data);
      }

      setLoading(false);
    };

    fetchRooms();
  }, [rawUser]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 ">
        <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
        <Text className="text-2xl font-semibold p-4">Messages</Text>

        {chatRooms.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Image
              source={images.nomessages}
              className="w-60 h-60 mb-4"
              resizeMode="contain"
            />
            <Text className="text-lg font-semibold text-gray-500">
              You have no messages
            </Text>
          </View>
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item, index) => item.$id || index.toString()} // ✅ Ensure the key is valid
            renderItem={({ item }) => {
              const chatPartnerId =
                rawUser?.$id === item.user_id ? item.agent_id : item.user_id;
              const lastMessage = item.last_message || "No messages yet";
              return (
                <TouchableOpacity
                  className="p-4 border-b border-gray-200 flex-row items-center"
                  onPress={() =>
                    router.push({
                      pathname: "/chatScreen",
                      params: {
                        userId: item.user_id,
                        agentId: item.agent_id,
                      },
                    })
                  }
                >
                  <Image
                    source={images.avatar} // Placeholder image
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <View>
                    <Text className="text-lg font-semibold">
                      {chatPartnerId || "Unknown"}
                    </Text>
                    <Text className="text-gray-500">{lastMessage}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;
