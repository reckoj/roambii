import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  checkIsAgent,
  getChatRooms,
  getMessages,
  markMessagesAsRead,
  deleteChat,
  getChatPartner,
  sendMessage,
  ChatRoom,
  ChatMessage,
} from "@/lib/chat-service";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "@/lib/firebase/firebase-config";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  [key: string]: any;
}

interface ChatState {
  chatRooms: ChatRoom[];
  currentRoom: string | null;
  currentMessages: ChatMessage[];
  currentPartner: UserProfile | null;
  unreadCount: number;
  lastMessageSent: ChatMessage | null;
  loading: boolean;
  error: string | null;
  isAgent: boolean;
  agentUserId: string | null;
  messageSubscription: any | null;
  userProfiles: Record<string, UserProfile>;
  messageCache: Record<string, ChatMessage[]>; // Add message cache by roomId
  lastUpdated: Record<string, number>; // Track when each room's messages were last updated
}

const initialState: ChatState = {
  chatRooms: [],
  currentRoom: null,
  currentMessages: [],
  currentPartner: null,
  unreadCount: 0,
  lastMessageSent: null,
  loading: false,
  error: null,
  isAgent: false,
  agentUserId: null,
  messageSubscription: null,
  userProfiles: {},
  messageCache: {},
  lastUpdated: {},
};

// Get user profile from Firestore
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Try direct ID lookup first
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: userId,
        name: userData.name || "Unknown User",
        email: userData.email || "",
        avatar: userData.avatar || undefined,
        ...userData,
      };
    }

    // Try query by userId field
    const usersRef = collection(firestore, COLLECTIONS.USERS);
    const q = query(usersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return {
        id: userId,
        name: userData.name || "Unknown User",
        email: userData.email || "",
        avatar: userData.avatar || undefined,
        ...userData,
      };
    }

    // Try agents collection if not found in users
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      const agentData = agentDoc.data();
      return {
        id: userId,
        name: agentData.name || "Unknown Agent",
        email: agentData.email || "",
        avatar: agentData.avatar || undefined,
        isAgent: true,
        ...agentData,
      };
    }

    // Try query by userId field in agents collection
    const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
    const agentQ = query(agentsRef, where("userId", "==", userId));
    const agentSnapshot = await getDocs(agentQ);

    if (!agentSnapshot.empty) {
      const agentData = agentSnapshot.docs[0].data();
      return {
        id: userId,
        name: agentData.name || "Unknown Agent",
        email: agentData.email || "",
        avatar: agentData.avatar || undefined,
        isAgent: true,
        ...agentData,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// Helper function to convert Firestore Timestamp to number
function convertTimestampToNumber(timestamp: any): number {
  if (!timestamp) return Date.now();
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    return timestamp.seconds * 1000 + Math.round(timestamp.nanoseconds / 1000000);
  }
  return Date.now();
}

// Helper function to serialize user profile data
function serializeUserProfile(profile: any): any {
  if (!profile) return null;
  
  // Create a new object to avoid mutating the original
  const serialized = { ...profile };
  
  // Convert Firestore Timestamps to numbers
  if (serialized.subscription?.currentPeriodEnd) {
    serialized.subscription = {
      ...serialized.subscription,
      currentPeriodEnd: serialized.subscription.currentPeriodEnd.toMillis?.() || Date.now()
    };
  }
  
  // Convert other timestamps
  if (serialized.createdAt?.toMillis) {
    serialized.createdAt = serialized.createdAt.toMillis();
  }
  if (serialized.updatedAt?.toMillis) {
    serialized.updatedAt = serialized.updatedAt.toMillis();
  }
  
  return serialized;
}

// Async thunks for chat
export const fetchChatRoomsAsync = createAsyncThunk(
  "chat/fetchChatRooms",
  async (userId: string, { rejectWithValue }) => {
    try {
      const chatRooms = await getChatRooms(userId);

      // Calculate total unread count
      let totalUnread = 0;
      chatRooms.forEach((room) => {
        const userUnreadCount = room.unread_count?.[userId] || 0;
        totalUnread += userUnreadCount;
      });

      return { chatRooms, userId, totalUnread };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMessagesAsync = createAsyncThunk(
  "chat/fetchMessages",
  async (roomId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { chat: ChatState };
      const cachedMessages = state.chat.messageCache[roomId] || [];
      const now = Date.now();
      const lastUpdate = state.chat.lastUpdated[roomId] || 0;
      const cacheAge = now - lastUpdate;

      // If we have cached messages and they're fresh (less than 5 minutes old)
      // Return them immediately to show something to the user while we fetch fresh data
      if (cachedMessages.length > 0 && cacheAge < 5 * 60 * 1000) {
        // Return cached data immediately marked as non-fresh
        return { roomId, messages: cachedMessages, freshData: false };
      }

      // No valid cache, get fresh messages
      const messages = await getMessages(roomId);
      return { roomId, messages, freshData: true };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendMessageAsync = createAsyncThunk(
  "chat/sendMessage",
  async (
    {
      senderId,
      receiverId,
      content,
    }: {
      senderId: string;
      receiverId: string;
      content: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const message = await sendMessage(senderId, receiverId, content);
      return message;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const markMessagesAsReadAsync = createAsyncThunk(
  "chat/markMessagesAsRead",
  async (
    {
      roomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const success = await markMessagesAsRead(roomId, userId);
      return { roomId, success, userId };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteChatAsync = createAsyncThunk(
  "chat/deleteChat",
  async (roomId: string, { rejectWithValue }) => {
    try {
      const success = await deleteChat(roomId);
      if (success) {
        return roomId;
      }
      return rejectWithValue("Failed to delete chat");
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkIsAgentAsync = createAsyncThunk(
  "chat/checkIsAgent",
  async (userId: string, { rejectWithValue }) => {
    try {
      // This will now use the cached result from chat-service
      const result = await checkIsAgent(userId);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchChatPartnerProfileAsync = createAsyncThunk(
  "chat/fetchChatPartnerProfile",
  async (
    {
      participants,
      currentUserId,
    }: {
      participants: string[];
      currentUserId: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const partnerId = getChatPartner(participants, currentUserId);
      if (!partnerId) return null;

      // Get user profile from Firestore
      const profile = await getUserProfile(partnerId);

      if (profile) {
        // Serialize the profile before storing in Redux
        const serializedProfile = serializeUserProfile(profile);

        // Also update our user profiles cache in Redux
        dispatch(
          updateUserProfiles({
            [partnerId]: serializedProfile,
          })
        );
      }

      return profile ? serializeUserProfile(profile) : null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Create chat slice
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearChatError: (state) => {
      state.error = null;
    },
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;

      // If we have cached messages for this room, use them immediately
      if (state.messageCache[action.payload]) {
        state.currentMessages = state.messageCache[action.payload];
      }
    },
    setCurrentPartner: (state, action) => {
      if (action.payload) {
        state.currentPartner = serializeUserProfile(action.payload);
      } else {
        state.currentPartner = null;
      }
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    addMessage: (state, action) => {
      // This is for real-time updates via Firebase listeners
      const message = action.payload as ChatMessage;
      const roomId = state.currentRoom;

      if (message && roomId) {
        // Only add if it's not already there
        if (!state.currentMessages.some((msg) => msg.id === message.id)) {
          state.currentMessages.push(message);

          // Sort messages by timestamp
          state.currentMessages.sort((a, b) => {
            const timeA =
              typeof a.timestamp === "number" ? a.timestamp : Date.now();
            const timeB =
              typeof b.timestamp === "number" ? b.timestamp : Date.now();
            return timeA - timeB;
          });

          // Also update the message cache
          state.messageCache[roomId] = [...state.currentMessages];
          state.lastUpdated[roomId] = Date.now();
        }
      }
    },
    // In your chatSlice.ts - update the updateMessages reducer
    updateMessages: (state, action) => {
      // This is for real-time updates via Firebase listeners
      const messages = action.payload as ChatMessage[];
      const roomId = state.currentRoom;

      if (messages && roomId) {
        console.log(
          `[REDUX UPDATE] Room ${roomId}: Updating ${messages.length} messages`
        );

        // Always set the current messages to the new messages
        state.currentMessages = messages;

        // Update the message cache for this room
        state.messageCache[roomId] = [...messages];
        state.lastUpdated[roomId] = Date.now();

        // Find the last message for the room banner
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];

          // Update the corresponding chat room's last message if it exists
          const roomIndex = state.chatRooms.findIndex((r) => r.id === roomId);
          if (roomIndex >= 0) {
            state.chatRooms[roomIndex] = {
              ...state.chatRooms[roomIndex],
              last_message: lastMsg.content,
              last_updated:
                typeof lastMsg.timestamp === "number"
                  ? lastMsg.timestamp
                  : Date.now(),
            };

            // Re-sort rooms to keep most recent on top
            state.chatRooms.sort((a, b) => {
              const timeA =
                typeof a.last_updated === "number" ? a.last_updated : 0;
              const timeB =
                typeof b.last_updated === "number" ? b.last_updated : 0;
              return timeB - timeA;
            });
          }
        }
      } else {
        console.log(`[REDUX UPDATE] Skipped - invalid data:`, {
          hasMessages: !!messages,
          roomId,
        });
      }
    },
    setMessageSubscription: (state, action) => {
      state.messageSubscription = action.payload;
    },
    clearMessageSubscription: (state) => {
      // Call the unsubscribe function if it exists
      if (typeof state.messageSubscription === "function") {
        state.messageSubscription();
      }
      state.messageSubscription = null;
    },
    updateChatRoomLastMessage: (state, action) => {
      const { roomId, message, timestamp } = action.payload;

      state.chatRooms = state.chatRooms.map((room) => {
        if (room.id === roomId) {
          return {
            ...room,
            last_message: message,
            last_updated: timestamp || Date.now(),
          };
        }
        return room;
      });

      // Re-sort rooms by lastUpdated
      state.chatRooms.sort((a, b) => {
        const timeA =
          typeof a.last_updated === "number" ? a.last_updated : Date.now();
        const timeB =
          typeof b.last_updated === "number" ? b.last_updated : Date.now();
        return timeB - timeA;
      });
    },
    clearCurrentChat: (state) => {
      state.currentRoom = null;
      state.currentMessages = [];
      state.currentPartner = null;
      // Don't clear the chat rooms list
    },
    // New action to update user profiles
    updateUserProfiles: (state, action) => {
      const serializedProfiles: Record<string, any> = {};

      // Serialize each profile
      for (const [id, profile] of Object.entries(action.payload)) {
        serializedProfiles[id] = serializeUserProfile(profile);
      }

      state.userProfiles = {
        ...state.userProfiles,
        ...serializedProfiles,
      };
    },
    // Clear all message caches (useful when logging out)
    clearMessageCache: (state) => {
      state.messageCache = {};
      state.lastUpdated = {};
    },
    clearAllChatState: (state) => {
      // Clear all chat-related state
      state.chatRooms = [];
      state.currentRoom = null;
      state.currentMessages = [];
      state.currentPartner = null;
      state.userProfiles = {};
      state.messageCache = {};
      state.lastUpdated = {};
      state.error = null;
      // Clear any active subscriptions
      if (typeof state.messageSubscription === "function") {
        state.messageSubscription();
      }
      state.messageSubscription = null;
    },
    updateChatRooms: (state, action) => {
      state.chatRooms = action.payload;
    },
  },
});

export const {
  clearChatError,
  setCurrentRoom,
  setCurrentPartner,
  updateUnreadCount,
  addMessage,
  updateMessages,
  setMessageSubscription,
  clearMessageSubscription,
  updateChatRoomLastMessage,
  clearCurrentChat,
  updateUserProfiles,
  clearMessageCache,
  clearAllChatState,
  updateChatRooms,
} = chatSlice.actions;

// Export the reducer as default
export default chatSlice.reducer;
