// lib/firebase/firebase-config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  Auth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
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

// Initialize Firebase
let app: any;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully!");
} else {
  app = getApp();
  console.log("Using existing Firebase app");
}

// Initialize Auth with AsyncStorage persistence
let auth: Auth;
try {
  // Try to initialize auth with persistence first
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log("Firebase Auth initialized with AsyncStorage persistence");
} catch (error) {
  // If already initialized, get the existing instance
  auth = getAuth(app);
  console.log("Using existing Firebase Auth instance");
}

// Ensure auth is ready
if (auth) {
  console.log("Firebase Auth initialized successfully");
} else {
  console.error("Failed to initialize Firebase Auth");
}

// Initialize and export services
const firestore = getFirestore(app);
const firebaseDb = getDatabase(app);
const storage = getStorage(app);

export { app, auth, firestore, firebaseDb, storage };

// Add type definitions for collections to ensure type safety
export const COLLECTIONS = {
  USERS: "users",
  AGENTS: "agents",
  PACKAGES: "package_info",
  BOOKINGS: "bookings",
  REVIEWS: "agent_reviews",
  CHAT_ROOMS: "chat_rooms",
  MESSAGES: "messages",
  ITINERARIES: "itineraries",
  DAY_PLANS: "day_plans",
  ACTIVITIES: "activities",
  USER_BOOKINGS: "user_bookings",
  FLIGHT_INFO: "flight_info",
  AGENT_BOOKINGS: "agent_bookings",
  CLIENTS: "clients",
};

// Export Firebase collection paths for easier access
export const FIREBASE_PATHS = {
  CHAT_ROOMS: "chat_rooms",
  MESSAGES: "messages",
  USER_STATUSES: "user_statuses",
};
