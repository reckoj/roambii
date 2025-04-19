// // lib/firebase/firebase-index.ts
// import {
//   auth,
//   firestore,
//   storage,
//   database,
//   collectionConfig,
// } from "./firebase-config";
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signOut,
//   GoogleAuthProvider,
//   signInWithPopup,
//   signInWithRedirect,
//   getRedirectResult,
//   updateProfile,
//   sendEmailVerification,
//   onAuthStateChanged,
// } from "firebase/auth";
// import {
//   collection,
//   doc,
//   getDoc,
//   getDocs,
//   query,
//   where,
//   orderBy,
//   limit,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   serverTimestamp,
// } from "firebase/firestore";
// import {
//   ref,
//   get,
//   set,
//   push,
//   update,
//   remove,
//   onValue,
//   off,
//   serverTimestamp as rtdbServerTimestamp,
// } from "firebase/database";
// import {
//   ref as storageRef,
//   uploadBytes,
//   getDownloadURL,
//   deleteObject,
// } from "firebase/storage";
// import { Platform } from "react-native";
// import { getFirestoreService } from "./firestore-service";
// import { uploadUserAvatar, uploadPackageImage } from "../storage-service";

// // Export Firebase message interface
// export interface FirebaseMessage {
//   id?: string;
//   sender_id: string;
//   receiver_id: string;
//   content: string;
//   timestamp: number | object;
//   read: boolean;
// }

// // Export Chat Room interface
// export interface ChatRoom {
//   id: string;
//   participants: string[];
//   last_message: string;
//   last_updated: number | object;
//   unread_count: { [userId: string]: number };
// }

// // Export Itinerary interfaces
// export interface Itinerary {
//   id?: string;
//   title: string;
//   userId: string;
//   start_date: string;
//   end_date: string;
//   destinations: string[];
//   sharedWith?: string[];
//   createdAt?: any;
//   updatedAt?: any;
// }

// export interface DayPlan {
//   id?: string;
//   itineraries_Id: string;
//   day: number;
//   date: string;
// }

// export interface Activity {
//   id?: string;
//   dayPlansId: string;
//   time: string;
//   title: string;
//   type: string;
//   notes: string;
// }

// export interface ItineraryWithDetails {
//   itinerary: Itinerary;
//   dayPlans: (DayPlan & { activities: Activity[] })[];
// }

// /**
//  * Login user with email and password
//  */
// export const loginUser = async (email: string, password: string) => {
//   try {
//     const userCredential = await signInWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     return { success: true, user: userCredential.user };
//   } catch (error: any) {
//     console.error("Login error:", error);
//     return { success: false, message: error.message };
//   }
// };

// /**
//  * Register a new user
//  */
// export const registerUser = async (
//   name: string,
//   email: string,
//   password: string,
//   isAgent: boolean = false,
//   cPassword: string = "",
//   niche: string = ""
// ) => {
//   try {
//     // Validate password match
//     if (cPassword && password !== cPassword) {
//       return { success: false, message: "Passwords do not match" };
//     }

//     // Create user with Firebase Auth
//     const userCredential = await createUserWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     const user = userCredential.user;

//     // Update profile with display name
//     await updateProfile(user, { displayName: name });

//     // Create user document in Firestore
//     const userData = {
//       name,
//       email,
//       userId: user.uid,
//       isAgent,
//       isAgentTemp: false,
//       createdAt: serverTimestamp(),
//       updatedAt: serverTimestamp(),
//     };

//     await addDoc(collection(firestore, collectionConfig.usersCollection), {
//       ...userData,
//       id: user.uid,
//     });

//     // If user is an agent, create agent document
//     if (isAgent) {
//       await addDoc(collection(firestore, collectionConfig.agentsCollection), {
//         name,
//         email,
//         userId: user.uid,
//         niche: niche || "Travel",
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//       });
//     }

//     return { success: true, user };
//   } catch (error: any) {
//     console.error("Registration error:", error);
//     return { success: false, message: error.message };
//   }
// };

// /**
//  * Get current user data
//  */
// export const getCurrentUser = async () => {
//   const user = auth.currentUser;
//   if (!user) return null;

//   try {
//     // Get user document from Firestore
//     const usersRef = collection(firestore, collectionConfig.usersCollection);
//     const q = query(usersRef, where("userId", "==", user.uid));
//     const querySnapshot = await getDocs(q);

//     if (querySnapshot.empty) {
//       // Fallback to using the user ID as document ID
//       const userDoc = await getDoc(
//         doc(firestore, collectionConfig.usersCollection, user.uid)
//       );

//       if (userDoc.exists()) {
//         return {
//           $id: user.uid,
//           id: user.uid,
//           name: userDoc.data().name || user.displayName || "",
//           email: userDoc.data().email || user.email || "",
//           avatar: userDoc.data().avatar || user.photoURL || null,
//           isAgent: userDoc.data().isAgent || false,
//           isAgentTemp: userDoc.data().isAgentTemp || false,
//         };
//       }

//       // Create user document if it doesn't exist
//       await addDoc(collection(firestore, collectionConfig.usersCollection), {
//         userId: user.uid,
//         name: user.displayName || "",
//         email: user.email || "",
//         avatar: user.photoURL || null,
//         isAgent: false,
//         isAgentTemp: false,
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//       });

//       return {
//         $id: user.uid,
//         id: user.uid,
//         name: user.displayName || "",
//         email: user.email || "",
//         avatar: user.photoURL || null,
//         isAgent: false,
//         isAgentTemp: false,
//       };
//     }

//     const userData = querySnapshot.docs[0].data();
//     return {
//       $id: user.uid,
//       id: user.uid,
//       name: userData.name || user.displayName || "",
//       email: userData.email || user.email || "",
//       avatar: userData.avatar || user.photoURL || null,
//       isAgent: userData.isAgent || false,
//       isAgentTemp: userData.isAgentTemp || false,
//     };
//   } catch (error) {
//     console.error("Error getting current user:", error);
//     return null;
//   }
// };

// /**
//  * Log out current user
//  */
// export const logout = async () => {
//   try {
//     await signOut(auth);
//     return true;
//   } catch (error) {
//     console.error("Logout error:", error);
//     return false;
//   }
// };

// /**
//  * Login with Google
//  */
// export const loginWithGoogle = async () => {
//   try {
//     const provider = new GoogleAuthProvider();
//     // Handle platform differences
//     if (Platform.OS === "web") {
//       // For web
//       const result = await signInWithPopup(auth, provider);
//       return !!result.user;
//     } else {
//       // For mobile (Expo), this would need additional configuration
//       console.warn(
//         "Google login needs Firebase native SDK integration on mobile"
//       );
//       return false;
//     }
//   } catch (error) {
//     console.error("Google login error:", error);
//     return false;
//   }
// };

// /**
//  * Update user profile
//  */
// export const updateUser = async (userId: string, updates: any) => {
//   try {
//     const user = auth.currentUser;

//     // Update Firebase Auth profile if needed
//     if (user && user.uid === userId) {
//       if (updates.name) {
//         await updateProfile(user, { displayName: updates.name });
//       }
//       if (updates.avatar) {
//         await updateProfile(user, { photoURL: updates.avatar });
//       }
//     }

//     // Update Firestore document
//     const usersRef = collection(firestore, collectionConfig.usersCollection);
//     const q = query(usersRef, where("userId", "==", userId));
//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       const userDoc = querySnapshot.docs[0];
//       await updateDoc(userDoc.ref, {
//         ...updates,
//         updatedAt: serverTimestamp(),
//       });
//     } else {
//       // Try updating by document ID
//       await updateDoc(
//         doc(firestore, collectionConfig.usersCollection, userId),
//         {
//           ...updates,
//           updatedAt: serverTimestamp(),
//         }
//       );
//     }

//     return true;
//   } catch (error) {
//     console.error("Update user error:", error);
//     throw error;
//   }
// };

// /**
//  * Get chat rooms for a specific user
//  */
// export async function getChatRooms(userId: string): Promise<ChatRoom[]> {
//   if (!userId) {
//     console.error("Cannot fetch chat rooms: Missing userId");
//     return [];
//   }

//   try {
//     console.log("[Fetching Chat Rooms for] ==> ", userId);

//     // Reference to the chat_rooms collection in Firebase Realtime Database
//     const roomsRef = ref(database, "chat_rooms");
//     const snapshot = await get(roomsRef);

//     if (!snapshot.exists()) {
//       console.log("No chat rooms found in Firebase");
//       return [];
//     }

//     const rooms: ChatRoom[] = [];

//     snapshot.forEach((roomSnapshot) => {
//       const roomData = roomSnapshot.val();

//       // Check if participants is an array or an object
//       if (roomData.participants) {
//         // If it's an array, check if user is in it
//         if (Array.isArray(roomData.participants)) {
//           if (roomData.participants.includes(userId)) {
//             rooms.push({
//               id: roomSnapshot.key || "",
//               participants: roomData.participants || [],
//               last_message: roomData.last_message || "",
//               last_updated: roomData.last_updated || Date.now(),
//               unread_count: roomData.unread_count || { [userId]: 0 },
//             });
//           }
//         }
//         // If it's an object, check if user is a value
//         else if (typeof roomData.participants === "object") {
//           const participantIds = Object.values(roomData.participants);
//           if (participantIds.includes(userId)) {
//             rooms.push({
//               id: roomSnapshot.key || "",
//               participants: participantIds as string[],
//               last_message: roomData.last_message || "",
//               last_updated: roomData.last_updated || Date.now(),
//               unread_count: roomData.unread_count || { [userId]: 0 },
//             });
//           }
//         }
//       }

//       // Also check for rooms where user_id or agent_id matches
//       if (
//         (roomData.user_id === userId || roomData.agent_id === userId) &&
//         !rooms.some((r) => r.id === roomSnapshot.key)
//       ) {
//         rooms.push({
//           id: roomSnapshot.key || "",
//           participants: [roomData.user_id, roomData.agent_id].filter(Boolean),
//           last_message: roomData.last_message || "",
//           last_updated: roomData.last_updated || Date.now(),
//           unread_count: roomData.unread_count || { [userId]: 0 },
//         });
//       }
//     });

//     // Sort by last updated timestamp
//     rooms.sort((a, b) => {
//       const timeA =
//         typeof a.last_updated === "number" ? a.last_updated : Date.now();
//       const timeB =
//         typeof b.last_updated === "number" ? b.last_updated : Date.now();
//       return timeB - timeA;
//     });

//     console.log(`Fetched ${rooms.length} chat rooms`);
//     return rooms;
//   } catch (error) {
//     console.error("Error fetching chat rooms:", error);
//     return [];
//   }
// }

// /**
//  * Fetch messages for a specific room
//  */
// export async function getMessages(roomId: string): Promise<FirebaseMessage[]> {
//   if (!roomId) {
//     console.error("Cannot fetch messages: Missing roomId");
//     return [];
//   }

//   try {
//     console.log("[Fetching Messages for Room] ==> ", roomId);

//     const messagesRef = ref(database, `messages/${roomId}`);
//     const snapshot = await get(messagesRef);

//     if (!snapshot.exists()) {
//       console.log(`No messages found for room ${roomId}`);
//       return [];
//     }

//     const messages: FirebaseMessage[] = [];
//     snapshot.forEach((childSnapshot) => {
//       const message = childSnapshot.val();
//       messages.push({
//         id: childSnapshot.key || "",
//         sender_id: message.sender_id,
//         receiver_id: message.receiver_id,
//         content: message.content,
//         timestamp: message.timestamp || Date.now(),
//         read: message.read || false,
//       });
//     });

//     // Sort by timestamp
//     messages.sort((a, b) => {
//       const timeA = typeof a.timestamp === "number" ? a.timestamp : Date.now();
//       const timeB = typeof b.timestamp === "number" ? b.timestamp : Date.now();
//       return timeA - timeB;
//     });

//     console.log(`Found ${messages.length} messages for room ${roomId}`);
//     return messages;
//   } catch (error) {
//     console.error("Error fetching messages:", error);
//     return [];
//   }
// }

// /**
//  * Generate a unique room ID for a conversation between two users
//  */
// export function getChatRoomId(userId1: string, userId2: string): string {
//   if (!userId1 || !userId2) {
//     console.error("Cannot generate room ID: Missing user IDs", {
//       userId1,
//       userId2,
//     });
//     return "";
//   }

//   // Sort IDs to ensure consistent room ID regardless of who initiates
//   const sortedIds = [userId1, userId2].sort();

//   // Clean the IDs to make sure they don't have problematic characters
//   const cleanId1 = sortedIds[0].replace(/[^\w\-_]/g, "_");
//   const cleanId2 = sortedIds[1].replace(/[^\w\-_]/g, "_");

//   // Create the room ID
//   const roomId = `${cleanId1}_${cleanId2}`;

//   console.log("Generated room ID:", roomId, "from users:", userId1, userId2);
//   return roomId;
// }

// /**
//  * Send a message with consistent room ID
//  */
// export async function sendMessageWithConsistentRoomId(
//   senderId: string,
//   receiverId: string,
//   content: string
// ): Promise<FirebaseMessage> {
//   if (!senderId || !receiverId || !content.trim()) {
//     throw new Error("Missing required data for sending a message");
//   }

//   try {
//     // Generate room ID using helper function
//     const roomId = getChatRoomId(senderId, receiverId);

//     console.log("[Sending Message with Consistent Room ID] ==> ", {
//       roomId,
//       senderId,
//       receiverId,
//       content,
//     });

//     // Prepare message data
//     const messageData: Omit<FirebaseMessage, "id"> = {
//       sender_id: senderId,
//       receiver_id: receiverId,
//       content,
//       timestamp: rtdbServerTimestamp(),
//       read: false,
//     };

//     // Create message reference
//     const messagesRef = ref(database, `messages/${roomId}`);
//     const newMessageRef = push(messagesRef);
//     const messageId = newMessageRef.key || "";

//     // Save message
//     await set(newMessageRef, messageData);

//     // Update chat room data
//     const roomRef = ref(database, `chat_rooms/${roomId}`);
//     const roomSnapshot = await get(roomRef);

//     if (!roomSnapshot.exists()) {
//       // Create new room
//       await set(roomRef, {
//         participants: [senderId, receiverId],
//         last_message: content,
//         last_updated: rtdbServerTimestamp(),
//         unread_count: {
//           [receiverId]: 1,
//           [senderId]: 0,
//         },
//       });
//     } else {
//       // Update existing room
//       const roomData = roomSnapshot.val();
//       const updates: any = {
//         last_message: content,
//         last_updated: rtdbServerTimestamp(),
//       };

//       // Update participants array if needed
//       if (!roomData.participants) {
//         updates.participants = [senderId, receiverId];
//       } else if (Array.isArray(roomData.participants)) {
//         const participants = [...roomData.participants];
//         if (!participants.includes(senderId)) {
//           participants.push(senderId);
//         }
//         if (!participants.includes(receiverId)) {
//           participants.push(receiverId);
//         }
//         updates.participants = participants;
//       }

//       // Update unread count for receiver
//       if (!roomData.unread_count) {
//         updates.unread_count = {
//           [receiverId]: 1,
//           [senderId]: 0,
//         };
//       } else {
//         const currentCount = roomData.unread_count[receiverId] || 0;
//         updates[`unread_count/${receiverId}`] = currentCount + 1;
//       }

//       await update(roomRef, updates);
//     }

//     return {
//       ...messageData,
//       id: messageId,
//       timestamp: Date.now(), // Replace serverTimestamp with current time for immediate use
//     };
//   } catch (error) {
//     console.error("Error sending message:", error);
//     throw error;
//   }
// }

// /**
//  * Mark messages as read
//  */
// export async function markMessagesAsRead(
//   roomId: string,
//   userId: string
// ): Promise<boolean> {
//   if (!roomId || !userId) {
//     console.error("Cannot mark messages as read: Missing data", {
//       roomId,
//       userId,
//     });
//     return false;
//   }

//   try {
//     console.log(`[Marking Messages as Read] Room: ${roomId}, User: ${userId}`);

//     // First, explicitly update unread count for the user to 0
//     const roomRef = ref(database, `chat_rooms/${roomId}`);
//     const roomSnapshot = await get(roomRef);

//     if (!roomSnapshot.exists()) {
//       console.log(`Room ${roomId} not found, nothing to mark as read`);
//       return true;
//     }

//     // Update unread count
//     const updates: { [key: string]: any } = {
//       [`unread_count/${userId}`]: 0,
//     };

//     await update(roomRef, updates);

//     // Mark all messages as read where user is receiver
//     const messagesRef = ref(database, `messages/${roomId}`);
//     const messagesSnapshot = await get(messagesRef);

//     if (!messagesSnapshot.exists()) {
//       console.log(`No messages found for room ${roomId}`);
//       return true;
//     }

//     const messageUpdates: { [key: string]: any } = {};
//     let updateCount = 0;

//     messagesSnapshot.forEach((childSnapshot) => {
//       const message = childSnapshot.val();
//       if (message.receiver_id === userId && !message.read) {
//         const messageKey = childSnapshot.key || "";
//         messageUpdates[`${messageKey}/read`] = true;
//         updateCount++;
//       }
//     });

//     if (updateCount > 0) {
//       console.log(`Marking ${updateCount} messages as read in room ${roomId}`);
//       await update(messagesRef, messageUpdates);
//     } else {
//       console.log(
//         `No unread messages found for user ${userId} in room ${roomId}`
//       );
//     }

//     return true;
//   } catch (error) {
//     console.error("Error marking messages as read:", error);
//     return false;
//   }
// }

// /**
//  * Delete a chat room and all its messages
//  */
// export async function deleteChat(roomId: string): Promise<boolean> {
//   if (!roomId) {
//     console.error("Cannot delete chat: Missing roomId");
//     return false;
//   }

//   try {
//     console.log("[Deleting Chat Room and Messages] ==> ", roomId);

//     // Create references to both the room and messages
//     const roomRef = ref(database, `chat_rooms/${roomId}`);
//     const messagesRef = ref(database, `messages/${roomId}`);

//     // Delete messages first
//     await remove(messagesRef);
//     console.log(`Deleted all messages for room ${roomId}`);

//     // Then delete the room
//     await remove(roomRef);
//     console.log(`Deleted chat room ${roomId}`);

//     return true;
//   } catch (error) {
//     console.error("Error deleting chat:", error);
//     throw error;
//   }
// }

// /**
//  * Get the other user in a chat room
//  */
// export function getChatPartner(
//   roomParticipants: string[],
//   currentUserId: string
// ): string {
//   return roomParticipants.find((id) => id !== currentUserId) || "";
// }

// /**
//  * Check if a user is an agent
//  */
// export async function checkIsAgent(
//   userId: string
// ): Promise<{ isAgent: boolean; agentId: string | null }> {
//   try {
//     const docRef = doc(firestore, collectionConfig.agentsCollection, userId);
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       return {
//         isAgent: true,
//         agentId: userId,
//       };
//     }

//     // Check if user is linked to an agent via userId field
//     const agentsRef = collection(firestore, collectionConfig.agentsCollection);
//     const q = query(agentsRef, where("userId", "==", userId));
//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       const agent = querySnapshot.docs[0];
//       return {
//         isAgent: true,
//         agentId: agent.id,
//       };
//     }

//     return { isAgent: false, agentId: null };
//   } catch (error) {
//     console.error("Error checking if user is agent:", error);
//     return { isAgent: false, agentId: null };
//   }
// }

// /**
//  * Get user profile by ID
//  */
// export async function getUserProfile(userId: string) {
//   if (!userId) return null;

//   try {
//     const docRef = doc(firestore, collectionConfig.usersCollection, userId);
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       return {
//         id: docSnap.id,
//         ...docSnap.data(),
//       };
//     }

//     // Try querying by userId field
//     const usersRef = collection(firestore, collectionConfig.usersCollection);
//     const q = query(usersRef, where("userId", "==", userId));
//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       const userDoc = querySnapshot.docs[0];
//       return {
//         id: userDoc.id,
//         ...userDoc.data(),
//       };
//     }

//     return null;
//   } catch (error) {
//     console.error("Error fetching user profile:", error);
//     return null;
//   }
// }

// /**
//  * Get multiple user profiles
//  */
// export async function getUserProfiles(userIds: string[]) {
//   if (!userIds.length) return {};

//   try {
//     const profiles: { [key: string]: any } = {};

//     for (const userId of userIds) {
//       const profile = await getUserProfile(userId);
//       if (profile) {
//         profiles[userId] = profile;
//       }
//     }

//     return profiles;
//   } catch (error) {
//     console.error("Error fetching user profiles:", error);
//     return {};
//   }
// }

// /**
//  * Create a booking
//  */
// export async function createBooking(
//   userId: string,
//   packageId: string,
//   amount: number,
//   transactionId: string,
//   checkInDate: string,
//   checkOutDate: string,
//   guestCount: number
// ) {
//   try {
//     // Generate a booking reference
//     const bookingReference =
//       "BK" + Math.random().toString(36).substring(2, 10).toUpperCase();

//     // Create new booking document with Firebase-compatible structure
//     const bookingsRef = collection(
//       firestore,
//       collectionConfig.bookingsCollection
//     );

//     // Add the document
//     const newBookingRef = await addDoc(bookingsRef, {
//       userId: [userId], // Store as array for compatibility
//       packageId,
//       amount,
//       transactionId,
//       bookingReference,
//       bookingDate: new Date().toISOString(),
//       checkInDate,
//       checkOutDate,
//       guestCount,
//       status: "confirmed",
//       paymentMethod: "stripe",
//       createdAt: serverTimestamp(),
//     });

//     // Return the created booking with its ID
//     return {
//       id: newBookingRef.id,
//       userId: [userId],
//       packageId,
//       amount,
//       transactionId,
//       bookingReference,
//       bookingDate: new Date().toISOString(),
//       checkInDate,
//       checkOutDate,
//       guestCount,
//       status: "confirmed",
//       paymentMethod: "stripe",
//     };
//   } catch (error) {
//     console.error("Error creating booking:", error);
//     throw error;
//   }
// }

// /**
//  * Get bookings for a user
//  */
// export async function getUserBookings(userId: string) {
//   try {
//     const bookingsRef = collection(
//       firestore,
//       collectionConfig.bookingsCollection
//     );
//     const q = query(
//       bookingsRef,
//       where("userId", "array-contains", userId),
//       orderBy("createdAt", "desc")
//     );

//     const querySnapshot = await getDocs(q);

//     const bookings = querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     return bookings;
//   } catch (error) {
//     console.error("Error fetching user bookings:", error);
//     return [];
//   }
// }

// /**
//  * Get a specific booking by ID
//  */
// export async function getBookingById(bookingId: string) {
//   try {
//     const docRef = doc(
//       firestore,
//       collectionConfig.bookingsCollection,
//       bookingId
//     );
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       return {
//         id: docSnap.id,
//         ...docSnap.data(),
//       };
//     }

//     throw new Error("Booking not found");
//   } catch (error) {
//     console.error("Error fetching booking:", error);
//     throw error;
//   }
// }

// /**
//  * Cancel a booking
//  */
// export async function cancelBooking(bookingId: string) {
//   try {
//     const docRef = doc(
//       firestore,
//       collectionConfig.bookingsCollection,
//       bookingId
//     );

//     // Update the booking status
//     await updateDoc(docRef, {
//       status: "cancelled",
//       updatedAt: serverTimestamp(),
//     });

//     // Get the updated booking
//     return await getBookingById(bookingId);
//   } catch (error) {
//     console.error("Error cancelling booking:", error);
//     throw error;
//   }
// }

// // Itinerary functions
// export async function getUserItineraries(userId: string): Promise<Itinerary[]> {
//   try {
//     // Get itineraries where user is the owner
//     const itinerariesRef = collection(
//       firestore,
//       collectionConfig.itinerariesCollection
//     );
//     const q = query(itinerariesRef, where("userId", "==", userId));
//     const querySnapshot = await getDocs(q);

//     const itineraries = querySnapshot.docs.map(
//       (doc) =>
//         ({
//           id: doc.id,
//           ...doc.data(),
//         } as Itinerary)
//     );

//     // Get itineraries shared with this user
//     const sharedQ = query(
//       itinerariesRef,
//       where("sharedWith", "array-contains", userId)
//     );
//     const sharedSnapshot = await getDocs(sharedQ);

//     const sharedItineraries = sharedSnapshot.docs.map(
//       (doc) =>
//         ({
//           id: doc.id,
//           ...doc.data(),
//         } as Itinerary)
//     );

//     // Combine and remove duplicates
//     return [
//       ...itineraries,
//       ...sharedItineraries.filter(
//         (shared) => !itineraries.some((it) => it.id === shared.id)
//       ),
//     ];
//   } catch (error) {
//     console.error("Error fetching user itineraries:", error);
//     return [];
//   }
// }

// export async function getItineraryWithDetails(
//   itineraryId: string
// ): Promise<ItineraryWithDetails> {
//   try {
//     // Get itinerary
//     const itineraryRef = doc(
//       firestore,
//       collectionConfig.itinerariesCollection,
//       itineraryId
//     );
//     const itinerarySnap = await getDoc(itineraryRef);

//     if (!itinerarySnap.exists()) {
//       throw new Error(`Itinerary not found: ${itineraryId}`);
//     }

//     const itinerary = {
//       id: itinerarySnap.id,
//       ...itinerarySnap.data(),
//     } as Itinerary;

//     // Get day plans
//     const dayPlansRef = collection(
//       firestore,
//       collectionConfig.dayPlansCollection
//     );
//     const dayPlansQ = query(
//       dayPlansRef,
//       where("itineraries_Id", "==", itineraryId),
//       orderBy("day", "asc")
//     );
//     const dayPlansSnapshot = await getDocs(dayPlansQ);

//     const dayPlansWithActivities: (DayPlan & { activities: Activity[] })[] = [];

//     // Get activities for each day plan
//     for (const dayPlanDoc of dayPlansSnapshot.docs) {
//       const dayPlan = {
//         id: dayPlanDoc.id,
//         ...dayPlanDoc.data(),
//       } as DayPlan;

//       // Get activities
//       const activitiesRef = collection(
//         firestore,
//         collectionConfig.activitiesCollection
//       );
//       const activitiesQ = query(
//         activitiesRef,
//         where("dayPlansId", "==", dayPlan.id)
//       );
//       const activitiesSnapshot = await getDocs(activitiesQ);

//       const activities = activitiesSnapshot.docs.map(
//         (doc) =>
//           ({
//             id: doc.id,
//             ...doc.data(),
//           } as Activity)
//       );

//       dayPlansWithActivities.push({
//         ...dayPlan,
//         activities,
//       });
//     }

//     return {
//       itinerary,
//       dayPlans: dayPlansWithActivities,
//     };
//   } catch (error) {
//     console.error("Error fetching itinerary details:", error);
//     throw error;
//   }
// }

// export async function createItinerary(
//   itinerary: Itinerary,
//   dayPlans?: Omit<DayPlan, "itineraries_Id">[],
//   activities?: { [dayPlanIndex: number]: Omit<Activity, "dayPlansId">[] }
// ): Promise<Itinerary> {
//   try {
//     // Create itinerary document
//     const itineraryRef = await addDoc(
//       collection(firestore, collectionConfig.itinerariesCollection),
//       {
//         title: itinerary.title,
//         userId: itinerary.userId,
//         start_date: itinerary.start_date,
//         end_date: itinerary.end_date,
//         destinations: itinerary.destinations,
//         sharedWith: itinerary.sharedWith || [],
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//       }
//     );

//     const createdItinerary = {
//       id: itineraryRef.id,
//       ...itinerary,
//     };

//     // Create day plans if provided
//     if (dayPlans && dayPlans.length > 0) {
//       for (let i = 0; i < dayPlans.length; i++) {
//         const dayPlan = dayPlans[i];

//         // Create day plan
//         const dayPlanRef = await addDoc(
//           collection(firestore, collectionConfig.dayPlansCollection),
//           {
//             ...dayPlan,
//             itineraries_Id: itineraryRef.id,
//             createdAt: serverTimestamp(),
//             updatedAt: serverTimestamp(),
//           }
//         );

//         // Create activities for this day plan if provided
//         if (activities && activities[i] && activities[i].length > 0) {
//           for (const activity of activities[i]) {
//             await addDoc(
//               collection(firestore, collectionConfig.activitiesCollection),
//               {
//                 ...activity,
//                 dayPlansId: dayPlanRef.id,
//                 createdAt: serverTimestamp(),
//                 updatedAt: serverTimestamp(),
//               }
//             );
//           }
//         }
//       }
//     }

//     return createdItinerary;
//   } catch (error) {
//     console.error("Error creating itinerary:", error);
//     throw error;
//   }
// }

// export async function updateItinerary(
//   itineraryId: string,
//   updatedData: Partial<Omit<Itinerary, "id" | "createdAt">>
// ): Promise<Itinerary> {
//   try {
//     const itineraryRef = doc(
//       firestore,
//       collectionConfig.itinerariesCollection,
//       itineraryId
//     );

//     await updateDoc(itineraryRef, {
//       ...updatedData,
//       updatedAt: serverTimestamp(),
//     });

//     const updatedDoc = await getDoc(itineraryRef);

//     if (!updatedDoc.exists()) {
//       throw new Error(`Itinerary not found after update: ${itineraryId}`);
//     }

//     return {
//       id: updatedDoc.id,
//       ...updatedDoc.data(),
//     } as Itinerary;
//   } catch (error) {
//     console.error("Error updating itinerary:", error);
//     throw error;
//   }
// }

// export async function saveActivity(activity: Activity): Promise<Activity> {
//   try {
//     if (activity.id) {
//       // Update existing activity
//       const activityRef = doc(
//         firestore,
//         collectionConfig.activitiesCollection,
//         activity.id
//       );

//       await updateDoc(activityRef, {
//         time: activity.time,
//         title: activity.title,
//         type: activity.type,
//         notes: activity.notes,
//         updatedAt: serverTimestamp(),
//       });

//       const updatedDoc = await getDoc(activityRef);

//       if (!updatedDoc.exists()) {
//         throw new Error(`Activity not found after update: ${activity.id}`);
//       }

//       return {
//         id: updatedDoc.id,
//         ...updatedDoc.data(),
//       } as Activity;
//     } else {
//       // Create new activity
//       const newActivityRef = await addDoc(
//         collection(firestore, collectionConfig.activitiesCollection),
//         {
//           dayPlansId: activity.dayPlansId,
//           time: activity.time,
//           title: activity.title,
//           type: activity.type,
//           notes: activity.notes,
//           createdAt: serverTimestamp(),
//           updatedAt: serverTimestamp(),
//         }
//       );

//       return {
//         id: newActivityRef.id,
//         ...activity,
//       };
//     }
//   } catch (error) {
//     console.error("Error saving activity:", error);
//     throw error;
//   }
// }

// export async function deleteItinerary(itineraryId: string): Promise<void> {
//   try {
//     // Get day plans for this itinerary
//     const dayPlansRef = collection(
//       firestore,
//       collectionConfig.dayPlansCollection
//     );
//     const dayPlansQ = query(
//       dayPlansRef,
//       where("itineraries_Id", "==", itineraryId)
//     );
//     const dayPlansSnapshot = await getDocs(dayPlansQ);

//     // Delete day plans and their activities
//     for (const dayPlanDoc of dayPlansSnapshot.docs) {
//       const dayPlanId = dayPlanDoc.id;

//       // Delete activities for this day plan
//       const activitiesRef = collection(
//         firestore,
//         collectionConfig.activitiesCollection
//       );
//       const activitiesQ = query(
//         activitiesRef,
//         where("dayPlansId", "==", dayPlanId)
//       );
//       const activitiesSnapshot = await getDocs(activitiesQ);

//       for (const activityDoc of activitiesSnapshot.docs) {
//         await deleteDoc(
//           doc(firestore, collectionConfig.activitiesCollection, activityDoc.id)
//         );
//       }

//       // Delete day plan
//       await deleteDoc(
//         doc(firestore, collectionConfig.dayPlansCollection, dayPlanId)
//       );
//     }

//     // Delete itinerary
//     await deleteDoc(
//       doc(firestore, collectionConfig.itinerariesCollection, itineraryId)
//     );
//   } catch (error) {
//     console.error("Error deleting itinerary:", error);
//     throw error;
//   }
// }

// /**
//  * Search packages by query, region, and package type
//  */
// export async function searchPackages(
//   query = "",
//   region = "All",
//   packageType = "All",
//   limitCount = 20
// ) {
//   try {
//     const queryConstraints: any[] = [];

//     // Add type filter if selected
//     if (packageType !== "All") {
//       queryConstraints.push(where("type", "==", packageType));
//     }

//     // Add region filter if selected
//     if (region !== "All") {
//       queryConstraints.push(where("region", "==", region));
//     }

//     // Add limit
//     queryConstraints.push(limit(limitCount));

//     const packagesRef = collection(
//       firestore,
//       collectionConfig.packagesCollection
//     );
//     const q = query(packagesRef, ...queryConstraints);
//     const querySnapshot = await getDocs(q);

//     let results = querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     // Client-side filtering for the search term if provided
//     if (query && query.trim() !== "") {
//       const searchTermLower = query.toLowerCase();
//       results = results.filter((pkg) => {
//         return (
//           (pkg.name && pkg.name.toLowerCase().includes(searchTermLower)) ||
//           (pkg.type && pkg.type.toLowerCase().includes(searchTermLower)) ||
//           (pkg.description &&
//             pkg.description.toLowerCase().includes(searchTermLower))
//         );
//       });
//     }

//     return results;
//   } catch (error) {
//     console.error("Error searching packages:", error);
//     return [];
//   }
// }

// /**
//  * Get featured packages
//  */
// export async function getFeaturedPackages(limitCount: number = 5) {
//   try {
//     const packagesRef = collection(
//       firestore,
//       collectionConfig.packagesCollection
//     );
//     const q = query(
//       packagesRef,
//       where("isFeatured", "==", true),
//       limit(limitCount)
//     );

//     const querySnapshot = await getDocs(q);

//     return querySnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//   } catch (error) {
//     console.error("Error fetching featured packages:", error);
//     return [];
//   }
// }

// /**
//  * Get package by ID
//  */
// export async function getPackageById(id: string) {
//   try {
//     const docRef = doc(firestore, collectionConfig.packagesCollection, id);
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       return {
//         id: docSnap.id,
//         ...docSnap.data(),
//       };
//     }

//     return null;
//   } catch (error) {
//     console.error("Error fetching package:", error);
//     return null;
//   }
// }

// /**
//  * Delete a package
//  */
// export async function deletePackage(id: string) {
//   try {
//     const docRef = doc(firestore, collectionConfig.packagesCollection, id);

//     // Delete the document
//     await deleteDoc(docRef);
//     return true;
//   } catch (error) {
//     console.error("Error deleting package:", error);
//     return false;
//   }
// }

// /**
//  * Update a package
//  */
// export async function updatePackage(
//   id: string,
//   data: any,
//   newImageUri?: string
// ) {
//   try {
//     // Upload image if provided
//     if (newImageUri) {
//       const imageRef = storageRef(storage, `package-images/${id}`);

//       // Convert image URI to blob for upload
//       const response = await fetch(newImageUri);
//       const blob = await response.blob();
//       await uploadBytes(imageRef, blob);

//       // Get download URL
//       const imageUrl = await getDownloadURL(imageRef);
//       data.image = imageUrl;
//     }

//     // Update package document
//     const docRef = doc(firestore, collectionConfig.packagesCollection, id);

//     // Update the document
//     await updateDoc(docRef, {
//       ...data,
//       updatedAt: serverTimestamp(),
//     });

//     return true;
//   } catch (error) {
//     console.error("Error updating package:", error);
//     return false;
//   }
// }

// // Export other functions from your Firestore service
// export { getFirestoreService };
