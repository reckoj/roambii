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
  StyleSheet,
  Dimensions,
} from "react-native";
import { StatusBar } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getChatPartner } from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import { LinearGradient } from "expo-linear-gradient";
import { MessageSquare, MoreVertical } from "lucide-react-native";
import images from "@/constants/images";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatRoomsAsync,
  checkIsAgentAsync,
  deleteChatAsync,
  clearCurrentChat,
  updateUserProfiles,
} from "@/lib/redux/slices/chatSlice";
import { RootState, AppDispatch } from "@/lib/store/store";
import { config, databases } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import ShimmerEffect from "@/components/LoadingShimmer";

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

const ChatListScreen: React.FC = () => {
  const { rawUser } = useGlobalContext();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const {
    chatRooms,
    loading: isLoadingRedux,
    isAgent,
    agentUserId,
    unreadCount,
    userProfiles: savedUserProfiles,
  } = useSelector((state: RootState) => state.chat);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProfiles, setLoadingProfiles] = useState<
    Record<string, boolean>
  >({});
  const [loadingAvatars, setLoadingAvatars] = useState<Record<string, boolean>>(
    {}
  );

  // Check if current user is an agent using Redux
  useEffect(() => {
    if (!rawUser?.$id) return;

    dispatch(checkIsAgentAsync(rawUser.$id))
      .unwrap()
      .catch((error) => {
        console.error("Error checking if user is agent:", error);
      });
  }, [rawUser, dispatch]);

  // Fetch chat rooms using Redux
  useEffect(() => {
    if (!rawUser?.$id) {
      console.log("No user ID found, cannot fetch chat rooms");
      setIsLoading(false);
      return;
    }

    // Use the correct ID to fetch rooms (agent ID if an agent, user ID otherwise)
    const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;
    console.log("Fetching chat rooms for:", userId);

    setIsLoading(true);
    dispatch(fetchChatRoomsAsync(userId))
      .unwrap()
      .then(() => {
        fetchMissingPartnerProfiles();
      })
      .catch((error) => {
        console.error("Error fetching chat rooms:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [rawUser, isAgent, agentUserId, dispatch]);

  // Fetch partner profile - using ChatScreen's approach
  const fetchPartnerProfile = async (partnerId: string) => {
    if (!partnerId) return null;

    // Check if we already have this profile saved in Redux store
    if (savedUserProfiles && savedUserProfiles[partnerId]) {
      console.log(`Using cached profile for partner: ${partnerId}`);
      setLoadingProfiles((prev) => ({ ...prev, [partnerId]: false }));
      setLoadingAvatars((prev) => ({ ...prev, [partnerId]: false }));
      return savedUserProfiles[partnerId];
    }

    console.log("Fetching profile for partner:", partnerId);

    // Mark this profile as loading
    setLoadingProfiles((prev) => ({ ...prev, [partnerId]: true }));
    setLoadingAvatars((prev) => ({ ...prev, [partnerId]: true }));

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

    // Mark profile loading as complete
    setLoadingProfiles((prev) => ({ ...prev, [partnerId]: false }));
    setLoadingAvatars((prev) => ({ ...prev, [partnerId]: false }));

    // Return the found profile or null
    return foundProfile;
  };

  // Fetch profiles for partners that are missing from the Redux store
  const fetchMissingPartnerProfiles = async () => {
    if (!rawUser?.$id || chatRooms.length === 0) return;

    const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;
    const partnerIds = chatRooms
      .map((room) => getChatPartner(room.participants, userId))
      .filter(Boolean);

    // Initialize loading states for all missing partners
    const initialLoadingState: Record<string, boolean> = {};
    const missingPartnerIds: string[] = [];

    partnerIds.forEach((id) => {
      if (!savedUserProfiles || !savedUserProfiles[id]) {
        initialLoadingState[id] = true;
        missingPartnerIds.push(id);
      } else {
        initialLoadingState[id] = false;
      }
    });

    setLoadingProfiles(initialLoadingState);
    setLoadingAvatars(initialLoadingState);

    // If there are no missing profiles, we're done
    if (missingPartnerIds.length === 0) {
      console.log("All partner profiles already cached");
      return;
    }

    console.log(
      `Fetching profiles for ${missingPartnerIds.length} missing partners`
    );
    const newProfiles: Record<string, any> = { ...savedUserProfiles };

    for (const partnerId of missingPartnerIds) {
      const profile = await fetchPartnerProfile(partnerId);
      if (profile) {
        newProfiles[partnerId] = profile;
      }
    }

    // Save the updated profiles to Redux
    dispatch(updateUserProfiles(newProfiles));
  };

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!rawUser?.$id) return;

      // Clear current chat when navigating to the chat list
      dispatch(clearCurrentChat());

      // Refresh chat rooms
      const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;
      dispatch(fetchChatRoomsAsync(userId))
        .unwrap()
        .then(() => {
          fetchMissingPartnerProfiles();
        })
        .catch((error) => {
          console.error("Error refreshing chat rooms:", error);
        });

      return () => {
        // Cleanup when screen loses focus
      };
    }, [rawUser, isAgent, agentUserId, dispatch])
  );

  // Update onRefresh to trigger data refresh
  const onRefresh = useCallback(() => {
    if (!rawUser?.$id) return;

    setIsLoading(true);
    const userId = isAgent && agentUserId ? agentUserId : rawUser.$id;

    dispatch(fetchChatRoomsAsync(userId))
      .unwrap()
      .then(() => {
        fetchMissingPartnerProfiles();
      })
      .catch((error) => {
        console.error("Error refreshing chat rooms:", error);
      })
      .finally(() => {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      });
  }, [rawUser, isAgent, agentUserId, dispatch]);

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
    // Get display name for the partner
    const partnerProfile = savedUserProfiles?.[partnerId];
    const partnerName =
      partnerProfile?.name || partnerProfile?.email || "this conversation";

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

  // Delete a chat conversation using Redux
  const deleteConversation = async (roomId: string) => {
    setIsLoading(true);
    dispatch(deleteChatAsync(roomId))
      .unwrap()
      .then(() => {
        console.log(`Chat room ${roomId} deleted successfully`);
      })
      .catch((error: any) => {
        console.error("Error deleting chat:", error);
        Alert.alert(
          "Error",
          "Failed to delete the conversation. Please try again."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Generate initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle avatar load complete
  const handleAvatarLoad = (partnerId: string) => {
    setLoadingAvatars((prev) => ({ ...prev, [partnerId]: false }));
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
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
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

  // Check if a partner name is just an ID (no proper name found)
  const isIdOnly = (partnerName: string, partnerId: string): boolean => {
    // Check if the name matches the ID pattern or is close to the ID
    return (
      partnerName === partnerId ||
      partnerName === "Unknown" ||
      (!partnerName.includes(" ") && partnerName.length > 20)
    );
  };

  // Use both local and Redux loading states
  const showLoading = isLoading || isLoadingRedux;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CustomHeader />

      <View style={styles.chatListContainer}>
        {showLoading && chatRooms.length === 0 ? (
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
                refreshing={showLoading}
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

              const partnerProfile = savedUserProfiles?.[partnerId];
              const isProfileLoading = loadingProfiles[partnerId];
              const isAvatarLoading = loadingAvatars[partnerId];

              // Get display name, but ONLY if it's not just the ID
              const rawPartnerName =
                partnerProfile?.name || partnerProfile?.email || "Unknown";
              const showName =
                !isProfileLoading && !isIdOnly(rawPartnerName, partnerId);

              const hasUnread = (item.unread_count?.[userId || ""] || 0) > 0;

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
                    {/* Avatar with shimmer loading effect */}
                    {isAvatarLoading ? (
                      <ShimmerEffect
                        width={56}
                        height={56}
                        style={styles.avatar}
                      />
                    ) : partnerProfile?.avatar ? (
                      <Image
                        source={{ uri: partnerProfile.avatar }}
                        style={styles.avatar}
                        onLoad={() => handleAvatarLoad(partnerId)}
                        onError={() => handleAvatarLoad(partnerId)}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>
                          {getInitials(showName ? rawPartnerName : "")}
                        </Text>
                      </View>
                    )}

                    <View style={styles.chatDetails}>
                      <View style={styles.chatHeader}>
                        {/* Name with shimmer loading effect */}
                        {isProfileLoading || !showName ? (
                          <ShimmerEffect
                            width={120}
                            height={20}
                            style={styles.nameShimmer}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.chatName,
                              hasUnread ? styles.boldText : null,
                            ]}
                            numberOfLines={1}
                          >
                            {rawPartnerName}
                          </Text>
                        )}
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
                              {item.unread_count?.[userId || ""] > 99
                                ? "99+"
                                : item.unread_count?.[userId || ""]}
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
  headerBadge: {
    backgroundColor: COLORS.white,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 6,
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
  nameShimmer: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
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
    backgroundColor: COLORS.white,
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
