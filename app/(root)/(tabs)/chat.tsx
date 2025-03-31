import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  Pressable,
} from "react-native";
import { StatusBar } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getChatPartner, checkIsAgent, deleteChat } from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import { databases, config } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { ref, onValue } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import CustomHeader from "@/components/HeaderComponent";

const ChatListScreen = () => {
  const { rawUser } = useGlobalContext();
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [isAgent, setIsAgent] = useState(false);
  const [agentUserId, setAgentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Fetch partner profile - using ChatScreen's approach
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

    // Return the found profile or null, just like in ChatScreen
    return foundProfile;
  };

  // Fetch profiles for all partners
  const fetchAllPartnerProfiles = async (partnerIds: string[]) => {
    const profiles: { [key: string]: any } = {};

    for (const partnerId of partnerIds) {
      profiles[partnerId] = await fetchPartnerProfile(partnerId);
    }

    return profiles;
  };

  // Setup real-time listener for chat rooms instead of manual fetching
  useEffect(() => {
    if (!rawUser?.$id) {
      console.log("No user ID found, cannot setup real-time listener");
      setLoading(false);
      return () => {};
    }

    // Use the correct ID to fetch rooms (agent ID if an agent, user ID otherwise)
    const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;

    console.log("Setting up real-time listener for chat rooms:", userId);
    setLoading(true);

    // Create reference to the chat_rooms node
    const roomsRef = ref(firebaseDb, "chat_rooms");

    // Set up an onValue listener
    const unsubscribe = onValue(
      roomsRef,
      async (snapshot) => {
        console.log("Real-time update received for chat rooms");

        if (!snapshot.exists()) {
          console.log("No chat rooms found");
          setChatRooms([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const rooms: any[] = [];

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

          // Also check for rooms with older format
          if (
            (roomData.user_id === userId || roomData.agent_id === userId) &&
            !rooms.some((r) => r.id === roomSnapshot.key)
          ) {
            rooms.push({
              id: roomSnapshot.key || "",
              participants: [roomData.user_id, roomData.agent_id].filter(
                Boolean
              ),
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

        console.log(`Real-time update: Found ${rooms.length} chat rooms`);
        setChatRooms(rooms);

        // Once we have the rooms, fetch profiles for all partners
        if (rooms.length > 0) {
          try {
            const partnerIds = rooms
              .map((room) => getChatPartner(room.participants, userId))
              .filter(Boolean);

            const profiles = await fetchAllPartnerProfiles(partnerIds);
            console.log(
              `Fetched ${Object.keys(profiles).length} partner profiles`
            );
            setUserProfiles(profiles);
          } catch (error) {
            console.error("Error fetching partner profiles:", error);
          }
        }

        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error setting up real-time listener:", error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    // Clean up listener on unmount
    return () => {
      console.log("Cleaning up real-time listener");
      unsubscribe();
    };
  }, [rawUser, isAgent, agentUserId]);

  // Add useFocusEffect to refresh UI when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("ChatListScreen is now focused");

      // If we're not currently loading, show a brief refresh indicator for user feedback
      if (!loading) {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
      }

      return () => {
        console.log("ChatListScreen lost focus");
      };
    }, [loading])
  );

  // Update onRefresh to trigger brief UI refresh - data will update via real-time listener
  const onRefresh = () => {
    setRefreshing(true);

    // Just wait a moment to provide user feedback
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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

  const navigateToChat = (partnerId: string) => {
    console.log("Navigating to chat with partner:", partnerId);

    router.push({
      pathname: "/chatScreen",
      params: {
        agentId: partnerId,
        from: "chatlist", // Add this to track navigation source
      },
    });
  };

  // Handle long press on a chat item to delete
  const handleLongPress = (roomId: string, partnerId: string) => {
    const partnerProfile = userProfiles[partnerId];
    const partnerName =
      partnerProfile?.name || partnerProfile?.email || partnerId || "Unknown";

    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete your conversation with ${partnerName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteConversation(roomId),
        },
      ]
    );
  };

  // Delete a chat conversation
  const deleteConversation = async (roomId: string) => {
    try {
      setDeleting(true);

      // Implement deleteChat function in chatService.ts
      await deleteChat(roomId);

      // No need to manually update local state as the real-time listener will handle it
      console.log(`Chat room ${roomId} deleted successfully`);
    } catch (error) {
      console.error("Error deleting chat:", error);
      Alert.alert(
        "Error",
        "Failed to delete the conversation. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CustomHeader title="Chats" handleSafeArea={true} />
      <View className="flex-1 bg-white">
        {deleting && (
          <View className="absolute inset-0 bg-black bg-opacity-20 z-10 flex items-center justify-center">
            <ActivityIndicator size="large" color="#1ABC9C" />
          </View>
        )}

        {chatRooms.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="w-60 h-60 mb-4 items-center justify-center bg-gray-100 rounded-full">
              <Text className="text-6xl">💬</Text>
            </View>
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
                <Pressable
                  className="p-4 border-b border-gray-200 flex-row items-center justify-between"
                  onPress={() => navigateToChat(partnerId)}
                  onLongPress={() => handleLongPress(item.id, partnerId)}
                  delayLongPress={500} // Adjust timing for long press
                  android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                >
                  <View className="flex-row items-center flex-1">
                    {partnerProfile?.avatar ? (
                      <Image
                        source={{ uri: partnerProfile.avatar }}
                        className="w-12 h-12 rounded-full mr-3"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-full mr-3 bg-gray-200" />
                    )}
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-semibold">
                          {partnerProfile?.name ||
                            partnerProfile?.email ||
                            partnerId ||
                            "Chat"}
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
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

export default ChatListScreen;
