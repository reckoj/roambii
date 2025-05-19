import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ImageBackground,
  RefreshControl,
  Dimensions,
  Pressable,
} from "react-native";
import { StatusBar } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import {
  subscribeToMessages,
  getConsistentRoomId,
  ChatMessage,
  getChatPartner,
} from "@/lib/chat-service";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/firebase-config";
import ChatBubble from "@/components/ChatBubble";
import { Ionicons } from "@expo/vector-icons";
import ShimmerEffect from "@/components/LoadingShimmer";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentRoom,
  setCurrentPartner,
  fetchMessagesAsync,
  sendMessageAsync,
  markMessagesAsReadAsync,
  updateMessages,
  updateUserProfiles,
  fetchChatPartnerProfileAsync,
} from "@/lib/redux/slices/chatSlice";
import { RootState, AppDispatch } from "@/lib/redux/store/store";

const ChatScreen = () => {
  // Get route parameters
  const params = useLocalSearchParams();
  const receivedAgentId = params.agentId as string;
  const receivedUserId = params.userId as string;
  const receivedRoomId = params.room_id as string;
  const previousScreen = (params.from as string) || ""; // Track where we came from

  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const {
    currentRoom,
    currentMessages,
    currentPartner,
    loading: reduxLoading,
    error: reduxError,
    isAgent: reduxIsAgent,
    agentUserId: reduxAgentUserId,
    messageCache,
  } = useSelector((state: RootState) => state.chat);

  // Get authenticated user
  const { rawUser } = useGlobalContext();
  const currentUserId = rawUser?.id;

  // State
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const roomIdRef = useRef<string | null>(null);
  const hasSetupRef = useRef(false);

  // Add a stable ref that won't be affected by re-renders
  const stableSubscriptionRef = useRef<{ unsubscribe: (() => void) | null }>({
    unsubscribe: null,
  });
  const [subscriptionSetupInProgress, setSubscriptionSetupInProgress] =
    useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add a memoized agent check that uses the cached result
  const isAgent = useMemo((): boolean => {
    if (!currentUserId) return false;
    // Use the cached result from Redux state
    return reduxIsAgent && reduxAgentUserId === currentUserId;
  }, [currentUserId, reduxIsAgent, reduxAgentUserId]);

  // Add a memoized room ID generator
  const generateRoomId = useCallback(async () => {
    // If we already have a room ID from params, use it
    if (receivedRoomId) {
      console.log("[Room ID] Using provided room ID:", receivedRoomId);
      return receivedRoomId;
    }
    
    if (!currentUserId || !receivedAgentId) return null;

    try {
      const roomId = await getConsistentRoomId(currentUserId, receivedAgentId);
      console.log(
        "[Room ID Generated] Using room ID:",
        roomId,
        "for users:",
        currentUserId,
        receivedAgentId
      );
      return roomId;
    } catch (error) {
      console.error("[Room ID Error]:", error);
      return null;
    }
  }, [currentUserId, receivedAgentId, receivedRoomId]);

  // Fetch partner profile from Redux cache first, then Firebase
  const fetchPartnerProfile = useCallback(async () => {
    if (!receivedAgentId) return;

    try {
      // First check if we already have this profile in Redux cache
      if (currentPartner) {
        console.log(`Using cached profile for partner: ${receivedAgentId}`);
        setPartnerLoading(false);
        return;
      }

      console.log("Fetching partner profile for:", receivedAgentId);
      setPartnerLoading(true);

      // Fetch the profile...
      let foundProfile = null;

      // 1. First check if this is an agent ID
      try {
        const agentRef = doc(firestore, "agents", receivedAgentId);
        const agentSnap = await getDoc(agentRef);

        if (agentSnap.exists()) {
          console.log("Found partner in agents collection:", agentSnap.id);
          const agentData = agentSnap.data();
          foundProfile = {
            id: receivedAgentId, // Use the original ID
            name: agentData.name || "Unknown Agent",
            email: agentData.email || "",
            avatar: agentData.avatar || "",
            isAgent: true,
            // Convert timestamps to numbers
            createdAt: agentData.createdAt?.toMillis?.() || Date.now(),
            updatedAt: agentData.updatedAt?.toMillis?.() || Date.now(),
            ...agentData,
          };
          // Remove the original timestamp objects
          delete foundProfile.createdAt;
          delete foundProfile.updatedAt;
          console.log("Agent profile data:", foundProfile);
        }
      } catch (err) {
        console.warn("Could not find user in agents collection");
      }

      // 2. If not found in agents, try users collection
      if (!foundProfile) {
        try {
          const userRef = doc(firestore, "users", receivedAgentId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            console.log("Found partner in users collection:", userSnap.id);
            const userData = userSnap.data();
            foundProfile = {
              id: receivedAgentId, // Use the original ID
              name: userData.name || "Unknown User",
              email: userData.email || "",
              avatar: userData.avatar || "",
              isAgent: false,
              // Convert timestamps to numbers
              createdAt: userData.createdAt?.toMillis?.() || Date.now(),
              updatedAt: userData.updatedAt?.toMillis?.() || Date.now(),
              ...userData,
            };
            // Remove the original timestamp objects
            delete foundProfile.createdAt;
            delete foundProfile.updatedAt;
            console.log("User profile data:", foundProfile);
          }
        } catch (err) {
          console.warn("Could not find user in main users collection");
        }
      }

      // 3. Try searching users by userId field if still not found
      if (!foundProfile) {
        try {
          const usersRef = collection(firestore, "users");
          const q = query(usersRef, where("userId", "==", receivedAgentId));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            console.log("Found partner through userId query:", userDoc.id);
            const userData = userDoc.data();
            foundProfile = {
              id: receivedAgentId, // Use the original ID
              name: userData.name || "Unknown User",
              email: userData.email || "",
              avatar: userData.avatar || "",
              isAgent: false,
              // Convert timestamps to numbers
              createdAt: userData.createdAt?.toMillis?.() || Date.now(),
              updatedAt: userData.updatedAt?.toMillis?.() || Date.now(),
              ...userData,
            };
            // Remove the original timestamp objects
            delete foundProfile.createdAt;
            delete foundProfile.updatedAt;
            console.log("User profile data from query:", foundProfile);
          }
        } catch (err) {
          console.warn("Query for user by userId failed");
        }
      }

      // Set partner profile in Redux
      if (foundProfile) {
        console.log("Setting partner profile:", foundProfile);
        dispatch(setCurrentPartner(foundProfile));

        // Also update the userProfiles cache in Redux
        dispatch(
          updateUserProfiles({
            [receivedAgentId]: foundProfile,
          })
        );
      } else {
        // If no profile found, create a basic one with the ID
        const basicProfile = {
          id: receivedAgentId,
          name: "Unknown User",
          email: "",
          avatar: "",
          isAgent: false,
        };
        console.log("No profile found, using basic profile:", basicProfile);
        dispatch(setCurrentPartner(basicProfile));
        dispatch(
          updateUserProfiles({
            [receivedAgentId]: basicProfile,
          })
        );
      }

      setPartnerLoading(false);
    } catch (error) {
      console.error("Error in profile resolution:", error);
      setPartnerLoading(false);
    }
  }, [receivedAgentId, dispatch, currentPartner]);

  // Fetch profile on mount
  useEffect(() => {
    fetchPartnerProfile();
  }, [fetchPartnerProfile]);

  // Setup chat room once with proper cleanup
  const setupChatRoom = useCallback(async () => {
    if (hasSetupRef.current) {
      console.log("[Setup Skipped] Already set up");
      return;
    }
    
    // Check if we have the necessary information
    if (!currentUserId) {
      console.error("[Setup Error] Missing current user ID");
      setError("Please log in to continue");
      setLoading(false);
      return;
    }
    
    // Make sure we have either a room ID or agent ID
    if (!receivedRoomId && !receivedAgentId) {
      console.error("[Setup Error] Missing both room ID and agent ID");
      setError("Missing chat information");
      setLoading(false);
      return;
    }
    
    hasSetupRef.current = true; // Set this before async operations

    try {
      setLoading(true);
      setMessagesLoading(true);

      // Generate room ID
      const roomId = await generateRoomId();
      if (!roomId) {
        throw new Error("Could not generate a valid room ID");
      }

      // Store in ref for stable reference
      roomIdRef.current = roomId;
      dispatch(setCurrentRoom(roomId));

      // Use cached messages if available
      if (messageCache[roomId]?.length > 0) {
        console.log(
          `[Cache Hit] Using ${messageCache[roomId].length} cached messages`
        );
        dispatch(updateMessages(messageCache[roomId]));
        setMessagesLoading(false);
      }

      // Fetch fresh messages
      await dispatch(fetchMessagesAsync(roomId));

      // Setup real-time subscription
      if (stableSubscriptionRef.current.unsubscribe) {
        stableSubscriptionRef.current.unsubscribe();
      }

      const unsubscribe = subscribeToMessages(roomId, (messages) => {
        dispatch(updateMessages(messages));
      });

      stableSubscriptionRef.current.unsubscribe = unsubscribe;

      setLoading(false);
      setMessagesLoading(false);
    } catch (error) {
      console.error("[Setup Error]:", error);
      setError(
        error instanceof Error ? error.message : "Failed to setup chat room"
      );
      setLoading(false);
      setMessagesLoading(false);
    }
  }, [currentUserId, receivedAgentId, receivedRoomId, dispatch, messageCache, generateRoomId]);

  // Initialize chat room on mount
  useEffect(() => {
    if (!currentUserId) {
      setError("Please log in to continue");
      setLoading(false);
      return;
    }

    if (!receivedRoomId && !receivedAgentId) {
      setError("Missing chat information");
      setLoading(false);
      return;
    }

    setupChatRoom();
  }, [currentUserId, receivedAgentId, receivedRoomId, setupChatRoom]);

  // Optimize message subscription
  useEffect(() => {
    if (!roomIdRef.current || !currentUserId) {
      console.log("[Subscription] Skipping - missing roomId or userId");
      return;
    }

    console.log("[Subscription] Setting up for room:", roomIdRef.current);

    // Clean up existing subscription
    if (stableSubscriptionRef.current.unsubscribe) {
      console.log("[Subscription] Cleaning up existing subscription");
      stableSubscriptionRef.current.unsubscribe();
      stableSubscriptionRef.current.unsubscribe = null;
    }

    // Set up new subscription with error handling
    try {
      const unsubscribe = subscribeToMessages(roomIdRef.current, (messages) => {
        console.log("[Subscription] Received", messages.length, "messages");

        // Update messages in Redux
        dispatch(updateMessages(messages));

        // Check for unread messages
        const unreadMessages = messages.filter(
          (msg) => !msg.read && msg.receiver_id === currentUserId
        );

        if (unreadMessages.length > 0) {
          console.log(
            "[Subscription] Found",
            unreadMessages.length,
            "unread messages"
          );
          dispatch(
            markMessagesAsReadAsync({
              roomId: roomIdRef.current!,
              userId: currentUserId,
            })
          ).catch((err) => console.error("[Read Error]:", err));
        }
      });

      stableSubscriptionRef.current.unsubscribe = unsubscribe;

      // Force a re-render to ensure subscription is active
      setForceUpdate((prev) => prev + 1);
    } catch (error) {
      console.error("[Subscription Error]:", error);
      setError("Failed to setup message subscription");
    }

    return () => {
      if (stableSubscriptionRef.current.unsubscribe) {
        console.log("[Cleanup] Removing subscription");
        stableSubscriptionRef.current.unsubscribe();
        stableSubscriptionRef.current.unsubscribe = null;
      }
    };
  }, [currentUserId, dispatch, roomIdRef.current]);

  // Add a debug effect to monitor subscription status
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[Subscription Status]", {
        hasSubscription: !!stableSubscriptionRef.current.unsubscribe,
        roomId: roomIdRef.current,
        messageCount: currentMessages.length,
        lastUpdate: new Date().toISOString(),
      });
    }, 5000); // Log every 5 seconds

    return () => clearInterval(interval);
  }, [currentMessages.length]);

  // Optimize focus effect
  useFocusEffect(
    useCallback(() => {
      if (!currentUserId) return;
      
      // We need either a room ID or agent ID
      if (!receivedRoomId && !receivedAgentId) return;

      console.log("[Focus] Setting up chat room");

      // Only reset setup if we don't have a room ID
      if (!roomIdRef.current) {
        hasSetupRef.current = false;
        setupChatRoom();
      }

      return () => {
        console.log("[Unfocus] Cleaning up");
        // Don't clean up subscription on unfocus
      };
    }, [currentUserId, receivedAgentId, receivedRoomId, setupChatRoom])
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (currentMessages.length > 0) {
      console.log("[SCROLL EFFECT] Scrolling to bottom:", {
        messageCount: currentMessages.length,
        forceUpdate,
        roomId: roomIdRef.current,
      });

      // Small delay to ensure render completes
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [currentMessages, forceUpdate]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !roomIdRef.current) return;

    try {
      const messageData = {
        senderId: currentUserId,
        receiverId: receivedAgentId,
        content: newMessage.trim(),
        timestamp: Date.now(),
        read: false,
      };

      await dispatch(
        sendMessageAsync({
          senderId: currentUserId,
          receiverId: receivedAgentId,
          content: newMessage.trim(),
        })
      );

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  // Mark messages as read when entering chat
  useEffect(() => {
    if (roomIdRef.current && currentUserId) {
      dispatch(
        markMessagesAsReadAsync({
          roomId: roomIdRef.current,
          userId: currentUserId,
        })
      ).catch((err) => console.error("[Read Error]:", err));
    }
  }, [roomIdRef.current, currentUserId, dispatch]);

  // Check if a partner name is just an ID (no proper name found)
  const isIdOnly = (partnerName: string, partnerId: string): boolean => {
    // Check if the name matches the ID pattern or is close to the ID
    return (
      partnerName === partnerId ||
      partnerName === "Unknown" ||
      (!partnerName.includes(" ") && partnerName.length > 20)
    );
  };

  // Get display name, only if it's not just the ID
  const getDisplayName = (): string => {
    if (!currentPartner) return "Chat";

    const rawPartnerName = currentPartner?.name || "Unknown";
    console.log(
      "Raw partner name:",
      rawPartnerName,
      "from partner:",
      currentPartner
    );
    return rawPartnerName;
  };

  // Generate initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name || name === "Chat") return "?";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
    console.log("Generated initials:", initials, "from name:", name);
    return initials;
  };

  // Use both local and Redux loading/error states
  const isLoadingState = loading || reduxLoading;
  const errorState = error || reduxError;

  // Handle navigation back
  const handleNavigateBack = () => {
    // Don't clean up subscription when navigating
    if (previousScreen === "chatlist") {
      router.push("/chat");
    } else if (previousScreen === "agentprofile") {
      router.back(); // This works correctly for agent profile
    } else {
      // Try to determine if we should go to chatlist based on navigation history
      if (router.canGoBack()) {
        router.back();
      } else {
        // Default to chatlist if we can't determine
        router.push("/chat");
      }
    }
  };

  if (errorState) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <TouchableOpacity onPress={handleNavigateBack} className="mr-3">
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Chat</Text>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 text-lg mb-4">{errorState}</Text>
          <TouchableOpacity
            className="bg-primary-200 px-4 py-2 rounded-lg"
            onPress={() => {
              // Reset state to try again
              setError(null);
              setLoading(true);
              setMessagesLoading(true);
              hasSetupRef.current = false;

              // Clean up existing subscription
              if (stableSubscriptionRef.current.unsubscribe) {
                stableSubscriptionRef.current.unsubscribe();
                stableSubscriptionRef.current.unsubscribe = null;
              }

              setupChatRoom();
            }}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = getDisplayName();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-primary-300">
        <TouchableOpacity onPress={handleNavigateBack} className="mr-3">
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>

        {/* Profile picture with shimmer loading effect */}
        {partnerLoading ? (
          <ShimmerEffect width={48} height={48} style={styles.avatarShimmer} />
        ) : currentPartner?.avatar ? (
          <Image
            source={{ uri: currentPartner.avatar }}
            className="w-12 h-12 rounded-full mr-3"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
        )}

        {/* Partner name with shimmer loading effect */}
        {partnerLoading ? (
          <ShimmerEffect width={120} height={24} style={styles.nameShimmer} />
        ) : (
          <Text className="text-lg font-semibold flex-1">{displayName}</Text>
        )}
      </View>

      {/* Messages with Background Image */}
      <View style={styles.chatContainer}>
        {/* Background Image with Opacity Overlay */}
        <ImageBackground
          source={images.chatbg2}
          style={styles.backgroundImage}
          resizeMode="repeat"
          imageStyle={styles.backgroundImageStyle}
        >
          {/* Opacity Overlay */}
          <View style={styles.overlayLight} />

          {/* Messages Content */}
          {isLoadingState && currentMessages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1ABC9C" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : currentMessages.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <View style={styles.emptyStateContainer}>
                <Text className="text-gray-500">No messages yet</Text>
                <Text className="text-gray-400 text-sm mt-2">
                  Start a conversation
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={currentMessages}
              keyExtractor={(item) =>
                item.id || `${item.timestamp}-${item.sender_id}`
              }
              contentContainerStyle={{ padding: 16 }}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={() => {
                    console.log("[MANUAL REFRESH] Resetting subscription");
                    // Clean up existing subscription
                    if (stableSubscriptionRef.current.unsubscribe) {
                      stableSubscriptionRef.current.unsubscribe();
                      stableSubscriptionRef.current.unsubscribe = null;
                    }

                    // Force re-fetch messages
                    if (roomIdRef.current) {
                      dispatch(fetchMessagesAsync(roomIdRef.current));
                      // Re-setup subscription after refresh
                      setTimeout(() => {
                        setupChatRoom();
                      }, 500);
                    }
                  }}
                  colors={["#1ABC9C"]}
                />
              }
              renderItem={({ item, index }) => {
                // Determine if this message is from the same sender as the previous one
                const isConsecutive =
                  index > 0 &&
                  currentMessages[index - 1].sender_id === item.sender_id;
                const isFromCurrentUser = item.sender_id === currentUserId;

                return (
                  <ChatBubble
                    message={item}
                    isFromCurrentUser={isFromCurrentUser}
                    isConsecutive={isConsecutive}
                  />
                );
              }}
            />
          )}
        </ImageBackground>
      </View>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#979797"
            multiline
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            style={[
              styles.sendButton,
              !newMessage.trim() ? styles.sendButtonDisabled : {},
            ]}
            disabled={!newMessage.trim()}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Define styles for the component
const styles = StyleSheet.create({
  // Added shimmer styles for avatar and name
  avatarShimmer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  nameShimmer: {
    height: 24,
    borderRadius: 4,
    flex: 1,
  },
  // Loading indicators
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  loadingText: {
    marginTop: 10,
    color: "#666666",
  },
  inlineLoadingContainer: {
    padding: 10,
    alignItems: "center",
  },
  // Avatar fallback
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666666",
  },
  // Added background image style
  chatContainer: {
    flex: 1,
    position: "relative",
  },
  // Background image styles
  backgroundImage: {
    flex: 1,
    width: "100%",
  },

  // Style for the background image itself
  backgroundImageStyle: {
    opacity: 1, // Makes the image lighter (value between 0 and 1)
  },

  // Alternative: Overlay to lighten the background
  overlayLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.85)", // White overlay with 85% opacity
  },

  // Added empty state container with semi-transparent background
  emptyStateContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },

  // Chat bubble styles
  bubbleBase: {
    maxWidth: "80%",
    minWidth: "20%",
    padding: 8,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: "#1ABC9C",
    borderTopRightRadius: 4,
  },
  bubbleUserConsecutive: {
    borderTopRightRadius: 18,
  },
  bubblePartner: {
    backgroundColor: "#F0F2F5",
    borderTopLeftRadius: 4,
  },
  bubblePartnerConsecutive: {
    borderTopLeftRadius: 18,
  },
  textUser: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  textPartner: {
    color: "#000000",
    fontSize: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  metaTextUser: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
  },
  metaTextPartner: {
    color: "rgba(0, 0, 0, 0.5)",
    fontSize: 12,
  },
  readStatus: {
    marginLeft: 5,
  },

  // Input area styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    backgroundColor: "white",
  },
  textInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 20,
    backgroundColor: "#F6F6F6",
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#1ABC9C",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A5D6CD",
  },
  debugContainer: {
    position: "absolute",
    top: 70,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 5,
    borderRadius: 5,
    zIndex: 9999,
  },
  debugText: {
    color: "white",
    fontSize: 10,
  },
});

export default ChatScreen;
