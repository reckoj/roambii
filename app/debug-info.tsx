import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/context/auth-context';
import { useState, useEffect } from 'react';
import Constants from 'expo-constants';

export default function DebugInfo() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [firebaseStatus, setFirebaseStatus] = useState('Checking...');

  useEffect(() => {
    try {
      // Check if Firebase is initialized
      const { app } = require('../lib/firebase/firebase-config');
      if (app) {
        setFirebaseStatus('✅ Firebase initialized');
      } else {
        setFirebaseStatus('❌ Firebase not initialized');
      }
    } catch (error) {
      setFirebaseStatus(`❌ Firebase error: ${error}`);
    }
  }, []);

  const expoConfig = Constants.expoConfig?.extra || {};
  const envVars = {
    API_KEY: !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    AUTH_DOMAIN: !!process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: !!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: !!process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: !!process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: !!process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    DATABASE_URL: !!process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  };

  const expoConfigVars = {
    API_KEY: !!expoConfig.EXPO_PUBLIC_FIREBASE_API_KEY,
    AUTH_DOMAIN: !!expoConfig.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: !!expoConfig.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: !!expoConfig.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: !!expoConfig.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: !!expoConfig.EXPO_PUBLIC_FIREBASE_APP_ID,
    DATABASE_URL: !!expoConfig.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          🐛 Debug Information
        </Text>

        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Firebase Status</Text>
          <Text style={{ fontSize: 16 }}>{firebaseStatus}</Text>
        </View>

        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Auth Status</Text>
          <Text style={{ fontSize: 16 }}>Loading: {loading ? 'Yes' : 'No'}</Text>
          <Text style={{ fontSize: 16 }}>User: {user ? 'Logged in' : 'Not logged in'}</Text>
        </View>

        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Environment Variables</Text>
          {Object.entries(envVars).map(([key, value]) => (
            <Text key={key} style={{ fontSize: 14, marginBottom: 5 }}>
              {key}: {value ? '✅' : '❌'}
            </Text>
          ))}
        </View>

        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Expo Config Variables</Text>
          {Object.entries(expoConfigVars).map(([key, value]) => (
            <Text key={key} style={{ fontSize: 14, marginBottom: 5 }}>
              {key}: {value ? '✅' : '❌'}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#3b82f6',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 20
          }}
          onPress={() => router.push('/login')}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            Go to Login
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#10b981',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 10
          }}
          onPress={() => router.replace('/')}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            Restart App
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
} 