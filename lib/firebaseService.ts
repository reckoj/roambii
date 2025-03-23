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
