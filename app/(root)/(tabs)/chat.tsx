// ChatListScreen.tsx - With improved profile resolution matching ChatScreen
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { StatusBar } from "react-native";
import { router } from "expo-router";
import { getChatRooms, getChatPartner, checkIsAgent } from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import { databases, config } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";

const ChatListScreen = () => {
  const { rawUser } = useGlobalContext();
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [isAgent, setIsAgent] = useState(false);
  const [agentUserId, setAgentUserId] = useState<string | null>(null);

  // Check if current user is an agent
  useEffect(() => {
    const checkIfAgent = async () => {
      if (!rawUser?.$id) return;

      try {
        const result = await checkIsAgent(rawUser.$id);
        console.log("Agent check result:", result);

        setIsAgent(result.isAgent);
        setAgentUserId(result.agentId);
      } catch (error) {
        console.error("Error checking if user is agent:", error);
      }
    };

    checkIfAgent();
  }, [rawUser]);

  // More robust profile fetching that matches the ChatScreen implementation
  const fetchPartnerProfile = async (partnerId: string) => {
    if (!partnerId) return null;

    console.log("Fetching profile for partner:", partnerId);

    // We'll try multiple approaches to find the profile
    let foundProfile = null;

    // 1. Try to fetch from users collection first
    if (config.usersCollectionId) {
      try {
        const userProfile = await databases
          .getDocument(config.databaseId!, config.usersCollectionId, partnerId)
          .catch(() => null);

        if (userProfile) {
          console.log(`Found partner ${partnerId} in users collection`);
          foundProfile = userProfile;
        }
      } catch (err) {
        console.log(`Partner ${partnerId} not in users collection`);
      }
    }

    // 2. Try agents collection if needed
    if (!foundProfile && config.agentsCollectionId) {
      try {
        const agentProfile = await databases
          .getDocument(config.databaseId!, config.agentsCollectionId, partnerId)
          .catch(() => null);

        if (agentProfile) {
          console.log(`Found partner ${partnerId} in agents collection`);
          foundProfile = agentProfile;
        }
      } catch (err) {
        console.log(`Partner ${partnerId} not in agents collection`);
      }
    }

    // 3. Try searching users by userId field as a fallback
    if (!foundProfile && config.usersCollectionId) {
      try {
        const userDocs = await databases.listDocuments(
          config.databaseId!,
          config.usersCollectionId,
          [Query.equal("userId", partnerId)]
        );

        if (userDocs.documents.length > 0) {
          console.log(`Found partner ${partnerId} through userId query`);
          foundProfile = userDocs.documents[0];
        }
      } catch (err) {
        console.log(`Query for user by userId failed for ${partnerId}`);
      }
    }

    // Return found profile or create fallback
    if (foundProfile) {
      return foundProfile;
    } else {
      // Create fallback profile
      return {
        name: `User ${partnerId.substring(0, 8)}`,
        email: null,
        avatar: null,
      };
    }
  };

  // Fetch profiles for all partners
  const fetchAllPartnerProfiles = async (partnerIds: string[]) => {
    const profiles: { [key: string]: any } = {};

    for (const partnerId of partnerIds) {
      profiles[partnerId] = await fetchPartnerProfile(partnerId);
    }

    return profiles;
  };

  // Fetch chat rooms and user profiles
  const fetchData = async () => {
    if (!rawUser?.$id) {
      console.log("No user ID found, cannot fetch chat rooms");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Use the correct ID to fetch rooms (agent ID if an agent, user ID otherwise)
      const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;
      console.log(
        `Fetching chat rooms using ID: ${userId} (${
          isAgent ? "agent" : "user"
        })`
      );

      // Fetch chat rooms from Firebase
      const rooms = await getChatRooms(userId);
      console.log(`Fetched ${rooms.length} chat rooms`);

      // Get partner IDs to fetch profiles
      const partnerIds = rooms
        .map((room) => getChatPartner(room.participants, userId))
        .filter(Boolean);

      console.log("Partner IDs:", partnerIds);

      // Fetch profiles with improved method matching ChatScreen
      if (partnerIds.length > 0) {
        const profiles = await fetchAllPartnerProfiles(partnerIds);
        setUserProfiles(profiles);
      }

      setChatRooms(rooms);
    } catch (error) {
      console.error("Error fetching chat data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (rawUser?.$id) {
      fetchData();
    }
  }, [rawUser, isAgent, agentUserId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";

    const date = new Date(
      typeof timestamp === "number" ? timestamp : Date.now()
    );
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 24 hours, show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // If less than a week, show day name
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: "short" });
    }

    // Otherwise show date
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Navigate to the chat screen with the correct parameters
  const navigateToChat = (partnerId: string) => {
    console.log("Navigating to chat with partner:", partnerId);

    router.push({
      pathname: "/chatScreen",
      params: {
        agentId: partnerId,
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
        <Text className="text-2xl font-semibold p-4">Messages</Text>

        {/* Debug Info */}
        <View className="px-4 py-1 bg-yellow-100">
          <Text className="text-xs">User ID: {rawUser?.$id || "None"}</Text>
          <Text className="text-xs">Is Agent: {isAgent ? "Yes" : "No"}</Text>
          <Text className="text-xs">Agent ID: {agentUserId || "N/A"}</Text>
          <Text className="text-xs">Rooms: {chatRooms.length}</Text>
          <Text className="text-xs">
            Profiles: {Object.keys(userProfiles).length}
          </Text>
        </View>

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
            <TouchableOpacity
              className="mt-4 p-3 bg-blue-500 rounded-lg"
              onPress={onRefresh}
            >
              <Text className="text-white">Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => item.id || Math.random().toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => {
              // Determine the real ID to use
              const userId =
                isAgent && agentUserId ? agentUserId : rawUser?.$id;
              const partnerId = getChatPartner(item.participants, userId || "");

              const partnerProfile = userProfiles[partnerId];

              return (
                <TouchableOpacity
                  className="p-4 border-b border-gray-200 flex-row items-center justify-between"
                  onPress={() => navigateToChat(partnerId)}
                >
                  <View className="flex-row items-center flex-1">
                    <Image
                      source={
                        partnerProfile?.avatar
                          ? { uri: partnerProfile.avatar }
                          : images.avatar
                      }
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-semibold">
                          {partnerProfile?.name ||
                            partnerProfile?.email ||
                            partnerId ||
                            "Unknown"}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {formatTimestamp(item.last_updated)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text
                          className="text-gray-500 flex-1"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.last_message || "No messages yet"}
                        </Text>
                        {item.unread_count > 0 && (
                          <View className="bg-blue-500 rounded-full min-w-6 h-6 items-center justify-center ml-2">
                            <Text className="text-white text-xs font-bold px-1">
                              {item.unread_count > 99
                                ? "99+"
                                : item.unread_count}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
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

export default ChatListScreen;
