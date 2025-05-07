import { useState } from 'react';
import { auth } from './firebase/firebase-config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase/firebase-config';
import { User } from './firebase/models';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  requiresVerification?: boolean;
}

export const useAuthOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (
    email: string,
    password: string,
    name: string,
    isAgent: boolean = false,
    niche?: string
  ): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Name is required');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update profile with name
      await updateProfile(firebaseUser, { displayName: trimmedName });

      // Create user document in Firestore
      const userData = {
        id: firebaseUser.uid,
        name: trimmedName,
        email,
        isAgent,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(firestore, 'users', firebaseUser.uid), userData);

      // If user is an agent, create agent document
      if (isAgent) {
        const agentData = {
          id: firebaseUser.uid,
          userId: firebaseUser.uid,
          name: trimmedName,
          email,
          bio: '',
          yearsOfExperience: 0,
          region: '',
          languages: [],
          specialties: [],
          niche: niche || '',
          rating: 0,
          reviewCount: 0,
          isProfileComplete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(doc(firestore, 'agents', firebaseUser.uid), agentData);
      }

      // Send verification email
      const continuationUrl = Platform.OS === 'web'
        ? `${window.location.origin}/verify-email`
        : `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/verify-email`;

      await sendEmailVerification(firebaseUser, {
        url: continuationUrl,
        handleCodeInApp: true,
      });

      return {
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        userId: firebaseUser.uid,
      };
    } catch (error: any) {
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting to sign in with email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful, user:', userCredential.user.uid);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        console.log('User email not verified, signing out');
        await signOut(auth);
        return {
          success: false,
          message: 'Please verify your email before logging in.',
          requiresVerification: true,
          userId: firebaseUser.uid,
        };
      }

      // Update last login time
      console.log('Updating last login time');
      await updateDoc(doc(firestore, 'users', firebaseUser.uid), {
        updatedAt: new Date(),
      });

      return { success: true, message: 'Login successful!' };
    } catch (error: any) {
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const userRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user document
        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || undefined,
          isAgent: false,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userRef, userData);
      } else {
        // Update last login time
        await updateDoc(userRef, {
          updatedAt: new Date(),
        });
      }

      return { success: true, message: 'Google login successful!' };
    } catch (error: any) {
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await signOut(auth);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };
    } catch (error: any) {
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (actionCode: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      await checkActionCode(auth, actionCode);
      await applyActionCode(auth, actionCode);

      if (auth.currentUser) {
        await updateDoc(doc(firestore, 'users', auth.currentUser.uid), {
          isEmailVerified: true,
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        message: 'Email successfully verified. You can now sign in.',
      };
    } catch (error: any) {
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    register,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    verifyEmail,
  };
}; 