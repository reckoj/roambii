import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
} from "react-native";
import { StatusBar } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getChatPartner, subscribeToChatRooms } from "@/lib/chat-service";
import { useGlobalContext } from "@/lib/global-provider";
import { LinearGradient } from "expo-linear-gradient";
import { MessageSquare, MoreVertical, RefreshCw } from "lucide-react-native";
import images from "@/constants/images";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatRoomsAsync,
  checkIsAgentAsync,
  deleteChatAsync,
  clearCurrentChat,
  updateUserProfiles,
  fetchChatPartnerProfileAsync,
  updateChatRooms,
} from "@/lib/redux/slices/chatSlice";
import { RootState, AppDispatch } from "@/lib/redux/store/store";
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Redux state
  const {
    chatRooms,
    loading: isLoadingRedux,
    isAgent,
    agentUserId,
    unreadCount,
    userProfiles: savedUserProfiles,
    error: chatError,
  } = useSelector((state: RootState) => state.chat);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingProfiles, setLoadingProfiles] = useState<Record<string, boolean>>({});
  const [loadingAvatars, setLoadingAvatars] = useState<Record<string, boolean>>({});
  const [chatRoomSubscription, setChatRoomSubscription] = useState<(() => void) | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check if current user is an agent using Redux
  useEffect(() => {
    const userId = rawUser?.id || rawUser?.id;
    if (!userId) return;

    dispatch(checkIsAgentAsync(userId))
      .unwrap()
      .catch((error) => {
        console.error("Error checking if user is agent:", error);
      });
  }, [rawUser, dispatch]);

  // Fetch chat rooms using Redux with better error handling
  const fetchChatData = useCallback(async (showLoading = true) => {
    const userIdRaw = rawUser?.id || rawUser?.id;

    if (!userIdRaw) {
      console.log("No user ID found, cannot fetch chat rooms");
      setIsInitialLoading(false);
      return;
    }

    const userId = isAgent && agentUserId ? agentUserId : userIdRaw;
    console.log("Fetching chat rooms for:", userId);

    if (showLoading) {
      setIsInitialLoading(true);
    }

    try {
      await dispatch(fetchChatRoomsAsync(userId)).unwrap();
      await fetchMissingPartnerProfiles(userId);
      setRetryCount(0);
      setShowRetryButton(false);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      setRetryCount(prev => prev + 1);
      
      // Show retry button after 2 failed attempts
      if (retryCount >= 1) {
        setShowRetryButton(true);
      }
    } finally {
      if (mountedRef.current) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [rawUser, isAgent, agentUserId, dispatch, retryCount]);

  // Initial fetch
  useEffect(() => {
    if (rawUser?.id) {
      fetchChatData(true);
    }
  }, [rawUser, isAgent, agentUserId]);

  // Optimized profile fetching with batch processing
  const fetchMissingPartnerProfiles = useCallback(async (userId?: string) => {
    if (!rawUser?.id || chatRooms.length === 0) return;

    const currentUserId = userId || (isAgent && agentUserId ? agentUserId : rawUser.id);
    const partnerIds = chatRooms
      .map((room) => getChatPartner(room.participants, currentUserId))
      .filter(Boolean);

    // Filter out partners we already have profiles for
    const missingPartnerIds = partnerIds.filter(id => !savedUserProfiles || !savedUserProfiles[id]);

    if (missingPartnerIds.length === 0) {
      console.log("All partner profiles already cached");
      return;
    }

    console.log(`Batch fetching profiles for ${missingPartnerIds.length} missing partners`);

    // Initialize loading states
    const initialLoadingState: Record<string, boolean> = {};
    missingPartnerIds.forEach((id) => {
      initialLoadingState[id] = true;
    });
    setLoadingProfiles(prev => ({ ...prev, ...initialLoadingState }));
    setLoadingAvatars(prev => ({ ...prev, ...initialLoadingState }));

    // Batch fetch profiles with concurrency limit
    const batchSize = 3; // Limit concurrent requests
    const newProfiles: Record<string, any> = { ...savedUserProfiles };

    for (let i = 0; i < missingPartnerIds.length; i += batchSize) {
      const batch = missingPartnerIds.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (partnerId) => {
          if (!mountedRef.current) return;
          
          try {
            const userProfile = await dispatch(
              fetchChatPartnerProfileAsync({
                participants: [partnerId, currentUserId],
                currentUserId: currentUserId,
              })
            ).unwrap();

            if (userProfile && mountedRef.current) {
              newProfiles[partnerId] = userProfile;
              setLoadingProfiles((prev) => ({ ...prev, [partnerId]: false }));
              setLoadingAvatars((prev) => ({ ...prev, [partnerId]: false }));
            }
          } catch (error) {
            console.error(`Error fetching profile for ${partnerId}:`, error);
            if (mountedRef.current) {
              setLoadingProfiles((prev) => ({ ...prev, [partnerId]: false }));
              setLoadingAvatars((prev) => ({ ...prev, [partnerId]: false }));
            }
          }
        })
      );

      // Small delay between batches to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update Redux with all new profiles at once
    if (mountedRef.current && Object.keys(newProfiles).length > Object.keys(savedUserProfiles || {}).length) {
      dispatch(updateUserProfiles(newProfiles));
    }
  }, [rawUser, isAgent, agentUserId, chatRooms, savedUserProfiles, dispatch]);

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!rawUser?.id) return;

      // Clear current chat when navigating to the chat list
      dispatch(clearCurrentChat());

      // Light refresh on focus (don't show loading)
      fetchChatData(false);
    }, [rawUser, fetchChatData, dispatch])
  );

  // Update onRefresh with smooth animation
  const onRefresh = useCallback(async () => {
    if (!rawUser?.id || isRefreshing) return;

    setIsRefreshing(true);
    setShowRetryButton(false);
    
    // Add a minimum refresh time for smooth UX
    const minimumRefreshTime = 1000;
    const startTime = Date.now();
    
    await fetchChatData(false);
    
    const elapsed = Date.now() - startTime;
    if (elapsed < minimumRefreshTime) {
      await new Promise(resolve => setTimeout(resolve, minimumRefreshTime - elapsed));
    }
    
    setIsRefreshing(false);
  }, [rawUser, isRefreshing, fetchChatData]);

  // Retry function
  const handleRetry = useCallback(async () => {
    setShowRetryButton(false);
    await fetchChatData(true);
  }, [fetchChatData]);

  // Add useEffect for chat room subscription with better error handling
  useEffect(() => {
    if (!rawUser?.id) return;

    const userId = isAgent && agentUserId ? agentUserId : rawUser.id;

    try {
      // Subscribe to chat room updates
      const unsubscribe = subscribeToChatRooms(userId, (updatedRooms) => {
        if (mountedRef.current) {
          // Update chat rooms in Redux
          dispatch(updateChatRooms(updatedRooms));
        }
      });

      setChatRoomSubscription(() => unsubscribe);

      // Cleanup subscription on unmount
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error("Error setting up chat room subscription:", error);
    }
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
    setIsInitialLoading(true);
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
        setIsInitialLoading(false);
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
  const showLoading = isInitialLoading || isLoadingRedux;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CustomHeader />

      <Animated.View 
        style={[
          styles.chatListContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {showLoading && chatRooms.length === 0 ? (
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.success }}>Loading conversations...</Text>
          </View>
        ) : chatRooms.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => item.id || Math.random().toString()}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
                progressViewOffset={60}
              />
            }
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => {
              // Determine the real ID to use
              const userId = isAgent && agentUserId ? agentUserId : rawUser?.id;
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
                      <View style={styles.avatarShimmerContainer}>
                        <ShimmerEffect
                          width={56}
                          height={56}
                          style={styles.avatar}
                        />
                      </View>
                    ) : partnerProfile?.avatar ? (
                      <Image
                        source={{ uri: partnerProfile.avatar }}
                        style={styles.avatar}
                        onLoad={() => handleAvatarLoad(partnerId)}
                        onError={() => {
                          console.log("Avatar load error for:", partnerId);
                          handleAvatarLoad(partnerId);
                          // Fallback when image fails to load
                          setLoadingAvatars((prev) => ({
                            ...prev,
                            [partnerId]: false,
                          }));
                        }}
                        // defaultSource={require("@/assets/images/default-avatar.png")} // Add a default avatar image
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
                        <View style={styles.rightContainer}>
                          <TouchableOpacity
                            style={styles.optionsButton}
                            onPress={() => handleLongPress(item.id, partnerId)}
                          >
                            <MoreVertical size={16} color={COLORS.textLight} />
                          </TouchableOpacity>
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
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Error message and retry button */}
        {chatError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{chatError}</Text>
            {showRetryButton && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <RefreshCw size={16} color={COLORS.white} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
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
  rightContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginLeft: 8,
  },
  optionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightGray,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: `${COLORS.danger}15`,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  avatarShimmerContainer: {
    marginRight: 14,
    borderRadius: 28,
    overflow: "hidden",
  },
});

export default ChatListScreen;
