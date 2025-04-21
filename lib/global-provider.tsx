import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { auth, firestore } from "@/lib/firebase/firebase-config";
import { COLLECTIONS } from "@/lib/firebase/firebase-config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Redirect } from "expo-router";

interface GlobalContextType {
  isLogged: boolean;
  rawUser: User | null;
  loading: boolean;
  refetch: () => Promise<void>;
  isAgent: boolean;
  isAgentTemp: boolean;
  toggleAgentView: () => Promise<void>;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAgent: boolean;
  isAgentTemp?: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAgentTemp, setIsAgentTemp] = useState(false);

  const isLogged = !!rawUser;
  const isAgent = rawUser?.isAgent || false;

  // Function to fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      console.log("Fetching user data for:", uid);

      // First try to get user by document ID
      let userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, uid));

      // If not found, try querying by userId field
      if (!userDoc.exists()) {
        console.log("User doc not found by ID, trying to find by userId field");
        const userQuery = query(
          collection(firestore, COLLECTIONS.USERS),
          where("userId", "==", uid)
        );
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
        } else {
          console.log("No user document found in Firestore");
          return null;
        }
      }

      const userData = userDoc.data();
      console.log("Found user data:", userData);

      // Use the document ID as the user ID
      const user: User = {
        id: uid, // Use Firebase Auth UID as the user ID
        name: userData!.name || "",
        email: userData!.email || "",
        avatar: userData!.avatar || undefined,
        isAgent: userData!.isAgent || false,
        isAgentTemp: userData!.isAgentTemp || false,
      };

      setIsAgentTemp(userData!.isAgentTemp || false);
      return user;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        console.log("Auth state changed: User is signed in", user.uid);
        const userData = await fetchUserData(user.uid);
        setRawUser(userData);
      } else {
        // User is signed out
        console.log("Auth state changed: User is signed out");
        setRawUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Manual refetch function for updating user data
  const refetch = async () => {
    if (!auth.currentUser) {
      setRawUser(null);
      return;
    }

    setLoading(true);
    const userData = await fetchUserData(auth.currentUser.uid);
    setRawUser(userData);
    setLoading(false);
  };

  // Toggle Agent View
  const toggleAgentView = async () => {
    try {
      if (!rawUser?.id) return;

      const newAgentView = !isAgentTemp;
      console.log("[Toggling Agent View] ==> ", newAgentView);

      setIsAgentTemp(newAgentView); // Update UI instantly

      // Find user document
      const userQuery = query(
        collection(firestore, COLLECTIONS.USERS),
        where("userId", "==", rawUser.id)
      );

      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        console.error("User document not found for ID:", rawUser.id);
        return;
      }

      const userDocRef = doc(
        firestore,
        COLLECTIONS.USERS,
        querySnapshot.docs[0].id
      );

      // Update in Firestore
      await updateDoc(userDocRef, {
        isAgentTemp: newAgentView,
      });

      // Refresh user data
      await refetch();

      console.log("[Agent View Toggled] ==> ", newAgentView);
    } catch (error) {
      console.error("[Error Toggling Agent View] ==> ", error);
      // Revert UI state if operation failed
      setIsAgentTemp(!isAgentTemp);
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        rawUser,
        loading,
        isAgent,
        isAgentTemp,
        toggleAgentView,
        refetch,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;
