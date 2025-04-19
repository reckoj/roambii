// lib/firebase/index.ts
// Export Firebase configuration and services
export * from "./firebase-config";
export * from "./models";

// Export Firebase services
export * from "../auth-service";
export * from "../user-service";
export * from "../package-service";
export * from "../booking-service";
export * from "../chat-service";
export * from "../itinerary-service";
export * from "../review-service";

// Re-export key types for easier imports
export type {
  User,
  Agent,
  Package,
  Booking,
  Review,
  ChatMessage,
  ChatRoom,
  Activity,
  DayPlan,
  Itinerary,
  ItineraryWithDetails,
} from "./models";
