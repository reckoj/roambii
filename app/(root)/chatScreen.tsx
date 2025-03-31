// ChatScreen.tsx - With improved bubbles and TypeScript fixes
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
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
} from "react-native";
import { StatusBar } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  getChatRoomId,
  FirebaseMessage,
  getConsistentRoomId,
  sendMessageWithConsistentRoomId,
} from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import { databases, config } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";
import ChatBubble from "@/components/ChatBubble";

const ChatScreen = () => {
  // Get route parameters
  const params = useLocalSearchParams();
  const receivedAgentId = params.agentId as string;
  const previousScreen = (params.from as string) || ""; // Track where we came from

  // Get authenticated user
  const { rawUser } = useGlobalContext();
  const currentUserId = rawUser?.$id;

  // State
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<FirebaseMessage>>(null);

  // Debug logs for parameters
  useEffect(() => {
    console.log("ChatScreen initialized with:", {
      currentUserId,
      receivedAgentId,
      previousScreen,
    });
  }, [currentUserId, receivedAgentId, previousScreen]);

  // Add useFocusEffect to mark messages as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log("ChatScreen is focused");

      // Mark messages as read whenever the screen comes into focus
      if (chatRoomId && currentUserId && messages.length > 0) {
        console.log("Screen focused, marking messages as read");
        markMessagesAsRead(chatRoomId, currentUserId)
          .then(() => console.log("Messages marked as read on screen focus"))
          .catch((err) =>
            console.error("Error marking messages as read on focus:", err)
          );
      }

      return () => {
        console.log("ChatScreen lost focus");
      };
    }, [chatRoomId, currentUserId, messages.length])
  );

  // Fetch partner profile from Appwrite
  useEffect(() => {
    const fetchPartnerProfile = async () => {
      if (!receivedAgentId) return;

      try {
        console.log("Fetching partner profile for:", receivedAgentId);

        // We'll try multiple approaches to find the profile
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
              console.log(
                "Found partner in users collection:",
                userProfile.$id
              );
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

        // Set whatever we found, or create fallback
        if (foundProfile) {
          setPartnerProfile(foundProfile);
        }
      } catch (error) {
        console.error("Error in profile resolution:", error);
      }
    };

    fetchPartnerProfile();
  }, [receivedAgentId]);

  // Set up chat room and messages with consistent room ID handling
  useEffect(() => {
    if (!currentUserId || !receivedAgentId) {
      setError(
        !currentUserId
          ? "Please log in to continue"
          : "Missing recipient information"
      );
      setLoading(false);
      return () => {};
    }

    // Generate consistent roomId using our enhanced function
    const setupChatRoom = async () => {
      try {
        // Use the enhanced function that handles agent/user relationships
        const roomId = await getConsistentRoomId(
          currentUserId,
          receivedAgentId
        );
        setChatRoomId(roomId);
        console.log("Using consistent room ID:", roomId);

        if (!roomId) {
          setError("Could not generate a valid room ID");
          setLoading(false);
          return;
        }

        // Load initial messages
        console.log("Loading initial messages for room:", roomId);
        const initialMessages = await getMessages(roomId);

        console.log(`Loaded ${initialMessages.length} messages`);
        setMessages(initialMessages);

        // Mark messages as read immediately when entering chat screen
        if (initialMessages.length > 0) {
          console.log("Marking initial messages as read");
          await markMessagesAsRead(roomId, currentUserId);
        }

        setLoading(false);

        // Subscribe to new messages
        const unsubscribe = subscribeToMessages(roomId, (updatedMessages) => {
          console.log(
            `Received ${updatedMessages.length} messages from subscription`
          );
          setMessages(updatedMessages);

          // Mark messages as read automatically if they're for the current user
          const hasUnreadMessages = updatedMessages.some(
            (msg) => msg.receiver_id === currentUserId && !msg.read
          );

          if (hasUnreadMessages) {
            console.log("New unread messages detected, marking as read");
            markMessagesAsRead(roomId, currentUserId)
              .then(() => console.log("New messages marked as read"))
              .catch((err) =>
                console.error("Error marking new messages as read:", err)
              );
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error setting up chat room:", error);
        setError("Failed to load messages. Please try again.");
        setLoading(false);
        return () => {};
      }
    };

    // Call the async setup function and store the returned unsubscribe function
    let unsubscribe = () => {};
    setupChatRoom().then((unsub) => {
      if (unsub) unsubscribe = unsub;
    });

    // Return the unsubscribe function for cleanup
    return () => unsubscribe();
  }, [receivedAgentId, currentUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Use the new consistent room ID function for sending messages
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

      // Use the enhanced function that ensures consistent room ID
      await sendMessageWithConsistentRoomId(
        currentUserId,
        receivedAgentId,
        messageToSend
      );

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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text className="mt-4 text-gray-500">Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <TouchableOpacity
            onPress={() => {
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
            }}
            className="mr-3"
          >
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Chat</Text>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 text-lg mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-primary-200 px-4 py-2 rounded-lg"
            onPress={() => {
              setError(null);
              setLoading(true);
              if (currentUserId && receivedAgentId) {
                // Use enhanced function for retry too
                getConsistentRoomId(currentUserId, receivedAgentId)
                  .then((roomId) => {
                    if (!roomId) {
                      setError("Could not generate a valid room ID");
                      setLoading(false);
                      return;
                    }
                    setChatRoomId(roomId);
                    return getMessages(roomId);
                  })
                  .then((msgs) => {
                    if (msgs) {
                      setMessages(msgs);
                      setLoading(false);
                    }
                  })
                  .catch((err) => {
                    console.error(err);
                    setError("Failed to load messages");
                    setLoading(false);
                  });
              } else {
                setError("Missing user or recipient information");
                setLoading(false);
              }
            }}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => {
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
          }}
          className="mr-3"
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>

        {partnerProfile?.avatar ? (
          <Image
            source={{ uri: partnerProfile.avatar }}
            className="w-12 h-12 rounded-full mr-3"
          />
        ) : (
          <View className="w-12 h-12 rounded-full mr-3 bg-gray-200" />
        )}

        <Text className="text-lg font-semibold flex-1">
          {partnerProfile?.name ||
            partnerProfile?.email ||
            receivedAgentId ||
            "Chat"}
        </Text>
      </View>

      {/* Messages */}
      <View className="flex-1 bg-gray-50">
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">No messages yet</Text>
            <Text className="text-gray-400 text-sm mt-2">
              Start a conversation
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) =>
              item.id || `${item.timestamp}-${item.sender_id}`
            }
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => {
              // Determine if this message is from the same sender as the previous one
              const isConsecutive =
                index > 0 && messages[index - 1].sender_id === item.sender_id;
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
