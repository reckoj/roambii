// App.js - Debug entry point
import './lib/firebase/firebase-config'; // Explicitly import firebase config first
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Original entry point
import 'expo-router/entry';

function AppWrapper() {
  // Log when app loads
  useEffect(() => {
    console.log('----- APP INITIALIZATION DEBUG -----');
    console.log('App component mounted');
    
    // Debug Firebase initialization
    try {
      const auth = require('./lib/firebase/firebase-config').auth;
      console.log('Firebase auth initialized:', !!auth);
      console.log('Auth current user:', !!auth.currentUser);
      
      // Listen for auth state changes
      const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User signed in' : 'No user');
        if (user) {
          console.log('User ID:', user.uid);
          console.log('Email verified:', user.emailVerified);
        }
      });
      
      return () => {
        console.log('Cleaning up auth state listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }, []);
  
  // Pass all props through to the regular entry point
  return <ExpoRoot />;
}

// Register the main component
registerRootComponent(AppWrapper);

// Make this the main entry point
export default AppWrapper; 