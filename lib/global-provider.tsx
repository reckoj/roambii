import React, { createContext, useContext, useState, ReactNode } from "react";

import { getCurrentUser, updateUser } from "./appwrite"; // ✅ Import updateUser
import { useAppwrite } from "./useAppwrite";

import { Redirect } from "expo-router";

interface GlobalContextType {
  isLogged: boolean;
  rawUser: User | null;
  loading: boolean;
  refetch: (...args: any[]) => Promise<void>;
  isAgent: boolean;
  isAgentTemp: boolean;
  toggleAgentView: () => Promise<void>; // ✅ Function to toggle agent view
}

interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
  isAgent: boolean;
  isAgentTemp?: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const {
    data: rawUser,
    loading,
    refetch,
  } = useAppwrite({
    fn: getCurrentUser,
  });

  // ✅ Store `isAgentTemp` in state for instant UI updates
  const [isAgentTemp, setIsAgentTemp] = useState(rawUser?.isAgentTemp || false);

  const isLogged = !!rawUser;
  const isAgent = rawUser?.isAgent || false;

  /** ✅ Toggle Agent View */
  const toggleAgentView = async () => {
    try {
      if (!rawUser?.$id) return;

      const newAgentView = !isAgentTemp; // ✅ Toggle the state

      console.log("[Toggling Agent View] ==> ", newAgentView);

      setIsAgentTemp(newAgentView); // ✅ Update UI instantly

      await updateUser(rawUser.$id, { isAgentTemp: newAgentView }); // ✅ Update in DB
      await refetch(); // ✅ Ensure data syncs

      console.log("[Agent View Toggled] ==> ", newAgentView);
    } catch (error) {
      console.error("[Error Toggling Agent View] ==> ", error);
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
        toggleAgentView, // ✅ Expose function
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
