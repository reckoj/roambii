// import firestore from "@react-native-firebase/firestore";

// // ✅ Send a new message
// export const sendMessage = async (
//   roomId: string,
//   senderId: string,
//   message: string
// ) => {
//   try {
//     await firestore().collection("messages").add({
//       roomId,
//       senderId,
//       message,
//       timestamp: firestore.FieldValue.serverTimestamp(),
//     });
//   } catch (error) {
//     console.error("Error sending message:", error);
//   }
// };

// // ✅ Listen for messages in real-time
// export const listenForMessages = (
//   roomId: string,
//   setMessages: (messages: any[]) => void
// ) => {
//   return firestore()
//     .collection("messages")
//     .where("roomId", "==", roomId)
//     .orderBy("timestamp", "asc")
//     .onSnapshot((snapshot) => {
//       const messages = snapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       }));
//       setMessages(messages);
//     });
// };

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBNKsTqFajCAv0u0lCvzrmAVjcl4yZxCS8",
  authDomain: "roambii.firebaseapp.com",
  projectId: "roambii",
  storageBucket: "roambii.firebasestorage.app",
  messagingSenderId: "895869322473",
  appId: "1:895869322473:web:788e8745141cc2e556dc78",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
