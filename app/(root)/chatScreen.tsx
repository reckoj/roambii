import React, { useEffect, useRef, useState, useCallback } from "react";
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
} from "react-native";
import { StatusBar } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import {
  subscribeToMessages,
  getConsistentRoomId,
  ChatMessage,
} from "@/lib/chat-service";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import { databases, config } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import ChatBubble from "@/components/ChatBubble";

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
} from "@/lib/redux/slices/chatSlice";
import { RootState, AppDispatch } from "@/lib/redux/store/store";
import ShimmerEffect from "@/components/LoadingShimmer";

const ChatScreen = () => {
  // Get route parameters
  const params = useLocalSearchParams();
  const receivedAgentId = params.agentId as string;
  const previousScreen = (params.from as string) || ""; // Track where we came from

  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const {
    currentRoom,
    currentMessages,
    currentPartner,
    loading: reduxLoading,
    error: reduxError,
    userProfiles: savedUserProfiles,
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
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Fetch partner profile from Redux cache first, then Appwrite
  const fetchPartnerProfile = useCallback(async () => {
    if (!receivedAgentId) return;

    try {
      // First check if we already have this profile in Redux cache
      if (savedUserProfiles && savedUserProfiles[receivedAgentId]) {
        console.log(`Using cached profile for partner: ${receivedAgentId}`);
        dispatch(setCurrentPartner(savedUserProfiles[receivedAgentId]));
        setPartnerLoading(false);
        return;
      }

      console.log("Fetching partner profile for:", receivedAgentId);
      setPartnerLoading(true);

      // Fetch the profile...
      let foundProfile = null;

      // 1. Try to fetch from users collection first
      if (config.usersCollectionId) {
        try {
          const userProfile = await databases
            .getDocument(
              config.databaseId!,
              config.usersCollectionId,
              receivedAgentId
            )
            .catch(() => null);

          if (userProfile) {
            console.log("Found partner in users collection:", userProfile.$id);
            foundProfile = userProfile;
          }
        } catch (err) {
          console.warn("Could not find user in main users collection");
        }
      }

      // 2. Try agents collection if needed
      if (!foundProfile && config.agentsCollectionId) {
        try {
          const agentProfile = await databases
            .getDocument(
              config.databaseId!,
              config.agentsCollectionId,
              receivedAgentId
            )
            .catch(() => null);

          if (agentProfile) {
            console.log(
              "Found partner in agents collection:",
              agentProfile.$id
            );
            foundProfile = agentProfile;
          }
        } catch (err) {
          console.warn("Could not find user in agents collection");
        }
      }

      // 3. Try searching users by equality if ID lookup failed
      if (!foundProfile && config.usersCollectionId) {
        try {
          // Try to find by userId field if it's an agent ID
          const userDocs = await databases.listDocuments(
            config.databaseId!,
            config.usersCollectionId,
            [Query.equal("userId", receivedAgentId)]
          );

          if (userDocs.documents.length > 0) {
            console.log(
              "Found partner through userId query:",
              userDocs.documents[0].$id
            );
            foundProfile = userDocs.documents[0];
          }
        } catch (err) {
          console.warn("Query for user by userId failed");
        }
      }

      // Set partner profile in Redux
      if (foundProfile) {
        dispatch(setCurrentPartner(foundProfile));

        // Also update the userProfiles cache in Redux
        if (savedUserProfiles) {
          dispatch(
            updateUserProfiles({
              ...savedUserProfiles,
              [receivedAgentId]: foundProfile,
            })
          );
        } else {
          dispatch(
            updateUserProfiles({
              [receivedAgentId]: foundProfile,
            })
          );
        }
      }

      setPartnerLoading(false);
    } catch (error) {
      console.error("Error in profile resolution:", error);
      setPartnerLoading(false);
    }
  }, [receivedAgentId, dispatch, savedUserProfiles]);

  // Fetch profile on mount
  useEffect(() => {
    fetchPartnerProfile();
  }, [fetchPartnerProfile]);

  // Setup chat room once
  const setupChatRoom = useCallback(async () => {
    // Skip if already set up
    if (hasSetupRef.current || !currentUserId || !receivedAgentId) return;

    hasSetupRef.current = true;

    try {
      setLoading(true);
      setMessagesLoading(true);

      // Generate room ID
      const roomId = await getConsistentRoomId(currentUserId, receivedAgentId);

      if (!roomId) {
        setError("Could not generate a valid room ID");
        setLoading(false);
        setMessagesLoading(false);
        return;
      }

      // Store in ref for stable reference
      roomIdRef.current = roomId;

      // Store in Redux
      dispatch(setCurrentRoom(roomId));
      console.log("Using consistent room ID:", roomId);

      // Check if we have cached messages
      if (
        messageCache &&
        messageCache[roomId] &&
        messageCache[roomId].length > 0
      ) {
        console.log(
          `Using ${messageCache[roomId].length} cached messages while fetching fresh data`
        );
        setMessagesLoading(false);
      }

      // Fetch messages
      console.log("Loading initial messages for room:", roomId);
      await dispatch(fetchMessagesAsync(roomId)).unwrap();

      // Mark messages as read
      await dispatch(
        markMessagesAsReadAsync({
          roomId,
          userId: currentUserId,
        })
      ).unwrap();

      setLoading(false);
      setMessagesLoading(false);
    } catch (error: any) {
      console.error("Error setting up chat room:", error);
      setError(error.message || "Failed to load messages. Please try again.");
      setLoading(false);
      setMessagesLoading(false);
      hasSetupRef.current = false; // Reset so we can try again
    }
  }, [currentUserId, receivedAgentId, dispatch, messageCache]);

  // Setup subscription separately
  const setupSubscription = useCallback(() => {
    // Only set up subscription if we have a room and don't already have one
    if (!roomIdRef.current || subscriptionRef.current || !currentUserId) {
      return;
    }

    console.log("Setting up message subscription for:", roomIdRef.current);

    try {
      // Create a subscription and store in ref
      subscriptionRef.current = subscribeToMessages(
        roomIdRef.current,
        (updatedMessages: string | any[]) => {
          console.log(
            `Received ${updatedMessages.length} messages from subscription`
          );
          dispatch(updateMessages(updatedMessages));
        }
      );
    } catch (error) {
      console.error("Error setting up subscription:", error);
    }
  }, [currentUserId, dispatch]);

  // Initialize chat room and setup subscription
  useEffect(() => {
    if (!currentUserId || !receivedAgentId) {
      setError(
        !currentUserId
          ? "Please log in to continue"
          : "Missing recipient information"
      );
      setLoading(false);
      return;
    }

    // Setup chat room
    setupChatRoom();

    // Clean up function
    return () => {
      // Only clean up subscription when component unmounts completely
      if (subscriptionRef.current) {
        console.log("Component unmounting, cleaning up subscription");
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [currentUserId, receivedAgentId, setupChatRoom]);

  // Setup subscription after room is set up
  useEffect(() => {
    if (roomIdRef.current && !subscriptionRef.current) {
      setupSubscription();
    }
  }, [roomIdRef.current, setupSubscription]);

  // Mark messages as read when focused
  useFocusEffect(
    useCallback(() => {
      // Make sure we have a room ID and messages before attempting to mark as read
      if (roomIdRef.current && currentUserId && currentMessages.length > 0) {
        console.log("Screen focused, marking messages as read");
        dispatch(
          markMessagesAsReadAsync({
            roomId: roomIdRef.current,
            userId: currentUserId,
          })
        )
          .unwrap()
          .then(() => console.log("Messages marked as read on screen focus"))
          .catch((err) =>
            console.error("Error marking messages as read on focus:", err)
          );
      }

      return () => {
        console.log("ChatScreen lost focus");
      };
    }, [currentUserId, currentMessages.length, dispatch])
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (currentMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages]);

  // Use Redux to send messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !receivedAgentId) {
      if (!currentUserId) {
        Alert.alert("Error", "You must be logged in to send messages");
      }
      return;
    }

    try {
      // Clear input field immediately for better UX
      const messageToSend = newMessage;
      setNewMessage("");

      console.log("Sending message to:", receivedAgentId);

      // Use Redux action to send message
      await dispatch(
        sendMessageAsync({
          senderId: currentUserId,
          receiverId: receivedAgentId,
          content: messageToSend,
        })
      ).unwrap();

      // No need to manually update messages array as subscription will handle it
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert(
        "Failed to Send",
        "Your message couldn't be sent. Please try again."
      );
    }
  };

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

    const rawPartnerName =
      currentPartner?.name || currentPartner?.email || "Unknown";
    return !isIdOnly(rawPartnerName, receivedAgentId) ? rawPartnerName : "Chat";
  };

  // Generate initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name || name === "Chat") return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
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
              if (subscriptionRef.current) {
                subscriptionRef.current();
                subscriptionRef.current = null;
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
          {/* {isLoadingState && currentMessages.length === 0 ? (
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
          ) : ( */}
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            keyExtractor={(item) =>
              item.id || `${item.timestamp}-${item.senderId}`
            }
            contentContainerStyle={{ padding: 16 }}
            // ListFooterComponent={
            //   messagesLoading ? (
            //     <View style={styles.inlineLoadingContainer}>
            //       <ActivityIndicator size="small" color="#1ABC9C" />
            //     </View>
            //   ) : null
            // }
            renderItem={({ item, index }) => {
              // Determine if this message is from the same sender as the previous one
              const isConsecutive =
                index > 0 &&
                currentMessages[index - 1].senderId === item.senderId;
              const isFromCurrentUser = item.senderId === currentUserId;

              return (
                <ChatBubble
                  message={item}
                  isFromCurrentUser={isFromCurrentUser}
                  isConsecutive={isConsecutive}
                />
              );
            }}
          />
          {/* )} */}
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
});

export default ChatScreen;
