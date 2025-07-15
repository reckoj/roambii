import { Redirect } from 'expo-router';
import { useAuth } from '../lib/context/auth-context';
import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  console.log("🏠 Index screen rendered");
  
  const { user, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("🔍 Index - Auth state:", { user: !!user, loading });
    
    // Add error handling for auth context
    try {
      if (!loading && user === undefined) {
        console.warn("⚠️ Auth context returned undefined user");
      }
    } catch (error) {
      console.error("❌ Auth context error:", error);
      setAuthError(error instanceof Error ? error.message : "Auth error");
    }
  }, [user, loading]);

  // Show auth error if any
  if (authError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Auth Error:</Text>
        <Text>{authError}</Text>
      </View>
    );
  }

  // Show loading state with logging
  if (loading) {
    console.log("⏳ Index - Loading auth state...");
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Redirect based on auth status
  if (user) {
    console.log("✅ Index - User authenticated, redirecting to home");
    return <Redirect href="/(root)/(tabs)" />;
  } else {
    console.log("❌ Index - No user, redirecting to login");
    // Direct to login screen
    return <Redirect href="/login" />;
  }
}
