import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Log Firebase config to debug environment variables
console.log("Initializing Firebase with config:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? "Present" : "Missing",
});

// Initialize Firebase
let app;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully!");
  } else {
    app = getApp();
    console.log("Using existing Firebase app");
  }
} catch (error) {
  console.error("Error initializing Firebase app:", error);
  throw error;
}

// Initialize and export services
const auth: Auth = getAuth(app);

const firestore = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { app, auth, firestore, database, storage };

// Rest of the file remains the same...

// Add type definitions for collections to ensure type safety
export const COLLECTIONS = {
  USERS: "users",
  AGENTS: "agents",
  PACKAGES: "packages",
  BOOKINGS: "bookings",
  REVIEWS: "agent_reviews",
  CHAT_ROOMS: "chat_rooms", // Will be stored in Realtime Database
  MESSAGES: "messages", // Will be stored in Realtime Database
  ITINERARIES: "itineraries",
  DAY_PLANS: "day_plans",
  ACTIVITIES: "activities",
  USER_BOOKINGS: "user_bookings",
  FLIGHT_INFO: "flight_info",
  AGENT_BOOKINGS: "agent_bookings",
};

// Export Firebase collection paths for easier access
export const FIREBASE_PATHS = {
  // Realtime Database paths
  CHAT_ROOMS: "chat_rooms",
  MESSAGES: "messages",
  USER_STATUSES: "user_statuses",

  // Firestore collection paths match the COLLECTIONS object
};
