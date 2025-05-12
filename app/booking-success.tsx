import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function BookingSuccess() {
  useEffect(() => {
    // Redirect to booking confirmation after a short delay
    const timer = setTimeout(() => {
      router.replace('/bookingConfirmation');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1ABC9C" />
      <Text style={styles.text}>Payment Successful!</Text>
      <Text style={styles.subtext}>Redirecting to booking confirmation...</Text>
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
    color: '#1ABC9C',
    marginTop: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
  },
}); 