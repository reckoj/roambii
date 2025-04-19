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
} from "@/lib/chat-service"; // Updated import path
import { getUserProfile } from "@/lib/user-service"; // Updated import path

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

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

// Async thunks for chat
export const fetchChatRoomsAsync = createAsyncThunk(
  "chat/fetchChatRooms",
  async (userId: string, { rejectWithValue }) => {
    try {
      const chatRooms = await getChatRooms(userId);
      return { chatRooms, userId }; // Return both chatRooms and userId
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
        // Still fetch fresh messages but don't wait for them to return something
        getMessages(roomId).then((freshMessages) => {
          // Return the fresh messages, but this won't be handled by the thunk
          return { roomId, messages: freshMessages, freshData: true };
        });

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
      return { roomId, success, userId }; // Include userId for unread count calculation
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

      // First check if we already have this user's profile in the state
      const profile = await getUserProfile(partnerId);

      if (profile) {
        // Also update our user profiles record
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
        state.currentMessages = messages;

        // Also update the message cache
        state.messageCache[roomId] = messages;
        state.lastUpdated[roomId] = Date.now();
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
            lastMessage: message,
            lastUpdated: timestamp || Date.now(),
          };
        }
        return room;
      });

      // Re-sort rooms by lastUpdated
      state.chatRooms.sort((a, b) => {
        const timeA =
          typeof a.lastUpdated === "number" ? a.lastUpdated : Date.now();
        const timeB =
          typeof b.lastUpdated === "number" ? b.lastUpdated : Date.now();
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
  extraReducers: (builder) => {
    builder
      // Check is agent cases
      .addCase(checkIsAgentAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkIsAgentAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAgent = action.payload.isAgent;
        state.agentUserId = action.payload.agentId;
      })
      .addCase(checkIsAgentAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch chat rooms cases
      .addCase(fetchChatRoomsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatRoomsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.chatRooms = action.payload.chatRooms;

        // Calculate total unread count using the current user ID from payload
        const currentUserId = action.payload.userId;
        state.unreadCount = action.payload.chatRooms.reduce((total, room) => {
          // Access the unreadCount object and get the count for the current user
          const count = room.unreadCount?.[currentUserId] || 0;
          return total + count;
        }, 0);
      })
      .addCase(fetchChatRoomsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch messages cases
      .addCase(fetchMessagesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessagesAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { roomId, messages, freshData } = action.payload;

        // Update current messages if this is for the current room
        if (state.currentRoom === roomId) {
          state.currentMessages = messages;
        }

        // Only update the cache if these are fresh messages from the server
        if (freshData) {
          state.messageCache[roomId] = messages;
          state.lastUpdated[roomId] = Date.now();
        }
      })
      .addCase(fetchMessagesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Send message cases
      .addCase(sendMessageAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessageAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.lastMessageSent = action.payload;
        const roomId = state.currentRoom;

        // Update the current messages list if we have a room selected
        if (roomId) {
          if (
            !state.currentMessages.some((msg) => msg.id === action.payload.id)
          ) {
            state.currentMessages.push(action.payload);

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

        // Also update the last message in the corresponding chat room
        if (roomId) {
          const roomIndex = state.chatRooms.findIndex(
            (room) => room.id === roomId
          );
          if (roomIndex !== -1) {
            state.chatRooms[roomIndex] = {
              ...state.chatRooms[roomIndex],
              lastMessage: action.payload.content,
              lastUpdated:
                typeof action.payload.timestamp === "number"
                  ? action.payload.timestamp
                  : Date.now(),
            };

            // Re-sort rooms by last_updated
            state.chatRooms.sort((a, b) => {
              const timeA =
                typeof a.lastUpdated === "number" ? a.lastUpdated : Date.now();
              const timeB =
                typeof b.lastUpdated === "number" ? b.lastUpdated : Date.now();
              return timeB - timeA;
            });
          }
        }
      })
      .addCase(sendMessageAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Mark messages as read cases
      .addCase(markMessagesAsReadAsync.fulfilled, (state, action) => {
        const { roomId, userId } = action.payload;

        // Update unread count for this room
        state.chatRooms = state.chatRooms.map((room) => {
          if (room.id === roomId) {
            // Create a new unreadCount object with the user's count set to 0
            const updatedUnreadCount = { ...room.unreadCount };
            updatedUnreadCount[userId] = 0;

            return {
              ...room,
              unreadCount: updatedUnreadCount,
            };
          }
          return room;
        });

        // Update read status for current messages if we're in this room
        if (state.currentRoom === roomId) {
          state.currentMessages = state.currentMessages.map((message) => {
            if (message.receiverId === userId && !message.read) {
              return { ...message, read: true };
            }
            return message;
          });

          // Also update the message cache
          state.messageCache[roomId] = [...state.currentMessages];
          state.lastUpdated[roomId] = Date.now();
        }

        // Recalculate total unread count
        state.unreadCount = state.chatRooms.reduce((total, room) => {
          // Get the unread count for this user specifically
          const userUnreadCount = room.unreadCount?.[userId] || 0;
          return total + userUnreadCount;
        }, 0);
      })

      // Delete chat cases
      .addCase(deleteChatAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChatAsync.fulfilled, (state, action) => {
        state.loading = false;

        // Remove the chat room
        const deletedRoomId = action.payload;
        state.chatRooms = state.chatRooms.filter(
          (room) => room.id !== deletedRoomId
        );

        // If the current room is the one being deleted, reset it
        if (state.currentRoom === deletedRoomId) {
          state.currentRoom = null;
          state.currentMessages = [];
          state.currentPartner = null;
        }

        // Remove from message cache too
        if (state.messageCache[deletedRoomId]) {
          const newCache = { ...state.messageCache };
          delete newCache[deletedRoomId];
          state.messageCache = newCache;

          const newLastUpdated = { ...state.lastUpdated };
          delete newLastUpdated[deletedRoomId];
          state.lastUpdated = newLastUpdated;
        }

        // Recalculate total unread count (without the deleted room)
        if (state.chatRooms.length > 0) {
          // We need the userId to correctly calculate remaining unread messages
          // Get a sample userId from the first chatRoom's unreadCount
          const sampleRoom = state.chatRooms[0];
          if (sampleRoom && sampleRoom.unreadCount) {
            const userId = Object.keys(sampleRoom.unreadCount)[0];
            if (userId) {
              state.unreadCount = state.chatRooms.reduce(
                (total, room) => total + (room.unreadCount?.[userId] || 0),
                0
              );
            }
          }
        } else {
          state.unreadCount = 0;
        }
      })
      .addCase(deleteChatAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch chat partner profile cases
      .addCase(fetchChatPartnerProfileAsync.pending, (state) => {
        // We don't set loading to true here to avoid UI flicker
      })
      .addCase(fetchChatPartnerProfileAsync.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentPartner = action.payload;
        }
      })
      .addCase(fetchChatPartnerProfileAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      });
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

export default chatSlice.reducer;
