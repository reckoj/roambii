import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  StyleSheet,
  Dimensions,
} from "react-native";
import { StatusBar } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getChatPartner, checkIsAgent, deleteChat } from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import { databases, config } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import { ref, onValue, get } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { MessageSquare, MoreVertical } from "lucide-react-native";
import images from "@/constants/images";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#8F70FF",
  secondary: "#D9D9D9",
  tertiary: "#FF8F70",
  background: "#F9FAFC",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  danger: "#FF4C69",
  success: "#00D27A",
  lightGray: "#F0F2F5",
  divider: "#EEEEEE",
  messagePreview: "#666666",
  unreadBadge: "#7F5DF0",
};

const { width } = Dimensions.get("window");

interface ChatRoom {
  id: string;
  participants: string[];
  last_message: string;
  last_updated: number;
  unread_count: number;
}

const ChatListScreen: React.FC = () => {
  const { rawUser } = useGlobalContext();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: any }>({});
  const [isAgent, setIsAgent] = useState<boolean>(false);
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

    // Return the found profile or null
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

  // Setup real-time listener for chat rooms
  useEffect(() => {
    if (!rawUser?.$id) {
      console.log("No user ID found, cannot setup real-time listener");
      setIsLoading(false);
      return () => {};
    }

    // Use the correct ID to fetch rooms (agent ID if an agent, user ID otherwise)
    const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;

    console.log("Setting up real-time listener for chat rooms:", userId);
    setIsLoading(true);

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
          setIsLoading(false);
          return;
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
              .map((room) => getChatPartner(room.participants, userId || ""))
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

        setIsLoading(false);
      },
      (error) => {
        console.error("Error setting up real-time listener:", error);
        setIsLoading(false);
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
      let isMounted = true;
      console.log("ChatListScreen is now focused");

      // Use a one-time flag to prevent infinite loops
      if (isMounted) {
        // Flag to prevent triggering on every render
        isMounted = false;

        // Manual timeout instead of state change to prevent re-renders
        // This refreshes data without setting loading state
        const timer = setTimeout(() => {
          if (rawUser?.$id) {
            // Re-fetch the latest data by triggering the firebase listener
            const roomsRef = ref(firebaseDb, "chat_rooms");
            get(roomsRef).then(() => {
              // The onValue listener will handle the response
              console.log("Refreshed data on focus");
            });
          }
        }, 300);

        return () => {
          clearTimeout(timer);
          console.log("ChatListScreen lost focus");
        };
      }
    }, [rawUser])
  );

  // Update onRefresh to trigger data refresh
  const onRefresh = useCallback(() => {
    setIsLoading(true);

    // Refresh the data
    if (rawUser?.$id) {
      const roomsRef = ref(firebaseDb, "chat_rooms");
      get(roomsRef)
        .then(() => {
          // Give some visual feedback before stopping the loading indicator
          setTimeout(() => {
            setIsLoading(false);
          }, 800);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [rawUser]);

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
      setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  // Generate initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Custom header component
  const CustomHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <SafeAreaView>
        <View style={styles.headerContent}>
          <View style={styles.headerTitle}>
            <MessageSquare size={24} color={COLORS.white} />
            <Text style={styles.headerText}>Messages</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={images.nomessages}
        style={styles.noMessagesImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        When you start conversations, they'll appear here
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CustomHeader />

      <View style={styles.chatListContainer}>
        {isLoading && chatRooms.length === 0 ? (
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : chatRooms.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => item.id || Math.random().toString()}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => {
              // Determine the real ID to use
              const userId =
                isAgent && agentUserId ? agentUserId : rawUser?.$id;
              const partnerId = getChatPartner(item.participants, userId || "");

              const partnerProfile = userProfiles[partnerId];
              const partnerName =
                partnerProfile?.name ||
                partnerProfile?.email ||
                partnerId ||
                "Unknown";
              const hasUnread = item.unread_count > 0;

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.chatItem,
                    pressed ? styles.chatItemPressed : null,
                    hasUnread ? styles.unreadChatItem : null,
                  ]}
                  onPress={() => navigateToChat(partnerId)}
                  onLongPress={() => handleLongPress(item.id, partnerId)}
                  delayLongPress={500} // Adjust timing for long press
                >
                  <View style={styles.chatItemContent}>
                    {partnerProfile?.avatar ? (
                      <Image
                        source={{ uri: partnerProfile.avatar }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>
                          {getInitials(partnerName)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.chatDetails}>
                      <View style={styles.chatHeader}>
                        <Text
                          style={[
                            styles.chatName,
                            hasUnread ? styles.boldText : null,
                          ]}
                          numberOfLines={1}
                        >
                          {partnerName}
                        </Text>
                        <Text style={styles.timeStamp}>
                          {formatTimestamp(item.last_updated)}
                        </Text>
                        <TouchableOpacity
                          style={styles.optionsButton}
                          onPress={() => handleLongPress(item.id, partnerId)}
                        >
                          <MoreVertical size={16} color={COLORS.textLight} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.messageRow}>
                        <Text
                          style={[
                            styles.messagePreview,
                            hasUnread ? styles.boldText : null,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.last_message || "No messages yet"}
                        </Text>

                        {hasUnread && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
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
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.white,
    marginLeft: 10,
  },
  chatListContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  chatList: {
    paddingBottom: 20,
  },
  chatItem: {
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  chatItemPressed: {
    backgroundColor: COLORS.lightGray,
  },
  unreadChatItem: {
    backgroundColor: `${COLORS.primary}10`, // 10% opacity of primary color
  },
  chatItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}15`,
    paddingBottom: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.secondary}30`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  timeStamp: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messagePreview: {
    fontSize: 14,
    color: COLORS.messagePreview,
    flex: 1,
  },
  boldText: {
    fontWeight: "700",
    color: COLORS.text,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  optionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 10, // No visible separator, just spacing
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  noMessagesImage: {
    width: width * 0.6,
    height: width * 0.4,
    marginBottom: 20,
    opacity: 0.9,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChatListScreen;
