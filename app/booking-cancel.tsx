import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function BookingCancel() {
  useEffect(() => {
    // Redirect back to previous screen after a short delay
    const timer = setTimeout(() => {
      router.back();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E74C3C" />
      <Text style={styles.text}>Payment Canceled</Text>
      <Text style={styles.subtext}>Redirecting back...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
  },
}); 