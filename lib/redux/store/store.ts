// lib/redux/store/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authReducer from "../slices/authSlice";
import packageReducer from "../slices/packageSlice";
import itineraryReducer from "../slices/itinerarySlice";
import chatReducer from "../slices/chatSlice";
import bookingReducer from "../slices/bookingSlice";
import agentProfileReducer from "../slices/agentProfileSlice";

// Configure Redux Persist
const persistConfig = {
  key: "root",
  version: 1,
  storage: AsyncStorage,
  whitelist: ["auth"], // Only persist auth reducer
  blacklist: [], // Optionally blacklist some reducers
};

// Specific config for chat reducer to persist user profiles and messages
const chatPersistConfig = {
  key: "chat",
  storage: AsyncStorage,
  whitelist: ["userProfiles", "chatRooms", "currentMessages", "messageCache"], // Persist profiles, chat rooms, and messages
};

const rootReducer = combineReducers({
  auth: authReducer,
  packages: packageReducer,
  itineraries: itineraryReducer,
  chat: persistReducer(chatPersistConfig, chatReducer), // Apply persist to chat slice
  bookings: bookingReducer,
  agentProfile: agentProfileReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializability check
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "chat/setMessageSubscription",
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          "chat.messageSubscription",
          "chat.currentPartner.updatedAt",
          "chat.userProfiles",
        ],
      },
    }),
});

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Create persistor
export const persistor = persistStore(store);
export default store;
