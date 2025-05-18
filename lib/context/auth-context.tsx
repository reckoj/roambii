import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebase-config';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/firebase-config';
import { User } from '@/lib/firebase/models';
import { saveUserToStorage, getUserFromStorage, clearUserStorage } from '@/lib/user-persistence';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from storage on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await getUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (err) {
        console.error('Error loading stored user:', err);
      }
    };
    loadStoredUser();
  }, []);

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser ? 'User is signed in' : 'User is signed out');
      try {
        if (firebaseUser) {
          console.log('Fetching user data for:', firebaseUser.uid);
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            console.log('User document found');
            const userData = userDoc.data() as Omit<User, 'id'>;
            const newUser = {
              id: firebaseUser.uid,
              $id: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || '',
              email: userData.email || firebaseUser.email || '',
              avatar: userData.avatar || firebaseUser.photoURL || undefined,
              isAgent: userData.isAgent || false,
              isAgentTemp: userData.isAgentTemp || false,
              isEmailVerified: firebaseUser.emailVerified,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            };
            setUser(newUser);
            await saveUserToStorage(newUser);
          } else {
            console.log('User document not found');
            setUser(null);
            await clearUserStorage();
          }
        } else {
          console.log('No Firebase user, setting user to null');
          setUser(null);
          await clearUserStorage();
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUser(null);
        await clearUserStorage();
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}; 