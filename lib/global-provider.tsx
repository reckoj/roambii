import React, { createContext, useContext, ReactNode } from "react";

import { getCurrentUser } from "./appwrite";
import { useAppwrite } from "./useAppwrite";

import { Redirect } from "expo-router";

interface GlobalContextType {
  isLogged: boolean;
  rawUser: User | null;
  loading: boolean;
  refetch: (...args: any[]) => Promise<void>;
  isAgent: boolean;
}

interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
  isAgent: boolean;
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
  const user = rawUser
    ? {
        ...rawUser,
        avatar: `https://cloud.appwrite.io/v1/avatars/initials?background=000000&color=ffffff&name=${encodeURIComponent(
          rawUser.name
        )}&size=100`,
      }
    : null;
  const isLogged = !!user;
  const isAgent = user?.isAgent || false;

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        rawUser,
        loading,
        isAgent,
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
