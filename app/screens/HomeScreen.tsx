import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RecommendedAgents } from '@/app/components/agents';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Example HomeScreen using the new project structure
 */
const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Roambii</Text>
          <Text style={styles.subtitle}>Discover your next adventure</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Agents</Text>
          <RecommendedAgents />
        </View>
        
        {/* Add more sections here using components from the new structure */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34495E',
  },
  subtitle: {
    fontSize: 16,
    color: '#95A5A6',
    marginTop: 4,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495E',
    marginHorizontal: 16,
    marginBottom: 8,
  },
});

export default HomeScreen; 