// lib/chat-notifications.ts
import { ref, onValue } from "firebase/database";
import { firebaseDb } from "./firebase-config";
import store from "../redux/store/store";
import { updateUnreadCount } from "../redux/slices/chatSlice"; // Add this import

let unreadTrackerUnsubscribe: (() => void) | null = null;

/**
 * Set up a tracker for unread messages in the chat rooms
 * This will update the unread count in the Redux store whenever there are changes
 * @param userId The ID of the current user
 */
export const setupUnreadMessageTracker = (userId: string): (() => void) => {
  if (unreadTrackerUnsubscribe) {
    unreadTrackerUnsubscribe();
  }

  try {
    console.log("[Setting up unread message tracker for]", userId);

    // Log to verify Firebase DB
    if (!firebaseDb) {
      console.error("firebaseDb is undefined or null!");
      return () => {};
    } else {
      console.log("firebaseDb is available:", !!firebaseDb);
    }

    // Listen for changes to chat rooms
    const roomsRef = ref(firebaseDb, "chat_rooms");

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      if (!snapshot.exists()) {
        // No chat rooms exist, set unread count to 0
        store.dispatch(updateUnreadCount(0));
        return;
      }

      let totalUnread = 0;

      // Calculate total unread count for the user
      snapshot.forEach((roomSnapshot) => {
        const roomData = roomSnapshot.val();

        // Check if this room has the user as a participant
        let isParticipant = false;

        if (roomData.participants) {
          // If it's an array, check if user is in it
          if (Array.isArray(roomData.participants)) {
            isParticipant = roomData.participants.includes(userId);
          }
          // If it's an object, check if user is a value
          else if (typeof roomData.participants === "object") {
            const participantIds = Object.values(roomData.participants);
            isParticipant = participantIds.includes(userId);
          }
        }

        // Also check old format
        if (
          !isParticipant &&
          (roomData.user_id === userId || roomData.agent_id === userId)
        ) {
          isParticipant = true;
        }

        // If user is a participant, add their unread count
        if (
          isParticipant &&
          roomData.unread_count &&
          roomData.unread_count[userId]
        ) {
          totalUnread += roomData.unread_count[userId];
        }
      });

      // Update Redux store with total unread count
      store.dispatch(updateUnreadCount(totalUnread));
      console.log(`[Unread Message Tracker] Total unread: ${totalUnread}`);
    });

    unreadTrackerUnsubscribe = unsubscribe;
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up unread message tracker:", error);
    return () => {};
  }
};

/**
 * Clean up the unread message tracker when it's no longer needed
 */
export const cleanupUnreadMessageTracker = () => {
  if (unreadTrackerUnsubscribe) {
    unreadTrackerUnsubscribe();
    unreadTrackerUnsubscribe = null;
    console.log("[Cleaned up unread message tracker]");
  }
};
