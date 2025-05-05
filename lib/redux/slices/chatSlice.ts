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
        // Also update our user profiles cache in Redux
        dispatch(
          updateUserProfiles({
            [partnerId]: profile,
          })
        );
      }

      return profile;
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
      state.currentPartner = action.payload;
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
    updateMessages: (state, action) => {
      // This is for real-time updates via Firebase listeners
      const messages = action.payload as ChatMessage[];
      const roomId = state.currentRoom;

      if (messages && messages.length > 0 && roomId) {
        // Important: Replace current messages with the updated messages
        state.currentMessages = messages;

        // Also update the message cache
        state.messageCache[roomId] = messages;
        state.lastUpdated[roomId] = Date.now();

        // Log for debugging
        console.log(`Updated ${messages.length} messages in Redux state`);
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
      state.userProfiles = {
        ...state.userProfiles,
        ...action.payload,
      };
    },
    // Clear all message caches (useful when logging out)
    clearMessageCache: (state) => {
      state.messageCache = {};
      state.lastUpdated = {};
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
} = chatSlice.actions;

// Export the reducer as default
export default chatSlice.reducer;
