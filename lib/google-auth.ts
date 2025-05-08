import { GoogleAuthProvider, signInWithPopup, signInWithCredential } from "firebase/auth";
import { auth } from "./firebase/firebase-config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";

/**
 * Enhanced Google authentication with better error handling
 */
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists
    const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, user.uid));
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(doc(firestore, COLLECTIONS.USERS, user.uid), {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL,
        createdAt: new Date(),
        isAgent: false
      });
    }

    return {
      success: true,
      message: "Successfully signed in with Google",
      userId: user.uid
    };
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    return {
      success: false,
      message: error.message || "Failed to sign in with Google"
    };
  }
};
