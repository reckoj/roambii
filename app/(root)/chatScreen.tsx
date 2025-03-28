// ChatScreen.tsx - With fixed profile resolution
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
} from "react-native";
import { StatusBar } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  getChatRoomId,
  FirebaseMessage,
} from "@/lib/chatService";
import { useGlobalContext } from "@/lib/global-provider";
import images from "@/constants/images";
import { databases, config } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";

const ChatScreen = () => {
  // Get route parameters
  const params = useLocalSearchParams();
  const receivedAgentId = params.agentId as string;

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
  const flatListRef = useRef<FlatList>(null);

  // Debug logs for parameters
  useEffect(() => {
    console.log("ChatScreen initialized with:", {
      currentUserId,
      receivedAgentId,
    });
  }, [currentUserId, receivedAgentId]);

  // Fetch partner profile from Appwrite - FIXED approach
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
            // FIXED: Use receivedAgentId instead of rawUser.$id
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
        } else {
          // Fallback profile with basic info
          setPartnerProfile({
            name: "User " + receivedAgentId.substring(0, 8),
            email: null,
            avatar: null,
          });
          console.log("Using fallback profile for:", receivedAgentId);
        }
      } catch (error) {
        console.error("Error in profile resolution:", error);
        // Fallback profile
        setPartnerProfile({
          name: "User " + receivedAgentId.substring(0, 8),
          email: null,
          avatar: null,
        });
      }
    };

    fetchPartnerProfile();
  }, [receivedAgentId]);

  // Set up chat room and messages
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

    // Generate consistent roomId using the utility function
    const roomId = getChatRoomId(currentUserId, receivedAgentId);
    setChatRoomId(roomId);
    console.log("Using room ID:", roomId);

    if (!roomId) {
      setError("Could not generate a valid room ID");
      setLoading(false);
      return () => {};
    }

    // Load initial messages
    const loadInitialData = async () => {
      try {
        console.log("Loading initial messages for room:", roomId);
        const initialMessages = await getMessages(roomId);

        console.log(`Loaded ${initialMessages.length} messages`);
        setMessages(initialMessages);

        // Mark messages as read
        if (initialMessages.length > 0) {
          await markMessagesAsRead(roomId, currentUserId);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading messages:", error);
        setError("Failed to load messages. Please try again.");
        setLoading(false);
      }
    };

    loadInitialData();

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
        markMessagesAsRead(roomId, currentUserId);
      }
    });

    return unsubscribe;
  }, [receivedAgentId, currentUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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

      // Send message through Firebase (using our updated service)
      await sendMessage(currentUserId, receivedAgentId, messageToSend);

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
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Chat</Text>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 text-lg mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg"
            onPress={() => {
              setError(null);
              setLoading(true);
              if (currentUserId && receivedAgentId) {
                const roomId = getChatRoomId(currentUserId, receivedAgentId);
                setChatRoomId(roomId);
                getMessages(roomId)
                  .then((msgs) => {
                    setMessages(msgs);
                    setLoading(false);
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
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>

        <Image
          source={
            partnerProfile?.avatar
              ? { uri: partnerProfile.avatar }
              : images.avatar
          }
          className="w-10 h-10 rounded-full mr-3"
        />

        <Text className="text-lg font-semibold flex-1">
          {partnerProfile?.name ||
            partnerProfile?.email ||
            receivedAgentId ||
            "Chat"}
        </Text>
      </View>

      {/* Debug Info */}
      <View className="px-4 py-1 bg-yellow-100">
        <Text className="text-xs">Room ID: {chatRoomId || "None"}</Text>
        <Text className="text-xs">Messages: {messages.length}</Text>
        <Text className="text-xs">User ID: {currentUserId || "None"}</Text>
        <Text className="text-xs">Partner ID: {receivedAgentId || "None"}</Text>
      </View>

      {/* Messages */}
      <View className="flex-1">
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
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => (
              <View
                className={`p-3 my-1 rounded-lg max-w-[75%] ${
                  item.sender_id === currentUserId
                    ? "bg-blue-500 ml-auto"
                    : "bg-gray-200"
                }`}
              >
                <Text
                  className={`${
                    item.sender_id === currentUserId
                      ? "text-white"
                      : "text-black"
                  }`}
                >
                  {item.content}
                </Text>
                <View className="flex-row justify-between items-center mt-1">
                  <Text
                    className={`text-xs ${
                      item.sender_id === currentUserId
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(
                      typeof item.timestamp === "number"
                        ? item.timestamp
                        : Date.now()
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {item.sender_id === currentUserId && (
                    <Text className="text-xs text-blue-100">
                      {item.read ? "Read" : "Sent"}
                    </Text>
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="p-2 flex-row items-center border-t border-gray-200">
          <TextInput
            className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            className="ml-3 p-3 bg-blue-500 rounded-full"
            disabled={!newMessage.trim()}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
