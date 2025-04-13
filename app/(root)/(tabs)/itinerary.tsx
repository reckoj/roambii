import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import { getUserItineraries } from "@/lib/itineraryService";
import { Itinerary } from "@/lib/models";
import {
  Calendar,
  MapPin,
  Plus,
  ChevronRight,
  PlusCircle,
} from "lucide-react-native";
import images from "@/constants/images";
import { LinearGradient } from "expo-linear-gradient";
import CustomHeader from "@/components/HeaderComponent";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#36d6ba",
  secondary: "#D9D9D9",
  background: "#FFFFFF",
  cardBackground: "#F9FAFC",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  divider: "#EEEEEE",
};

const ItineraryTabScreen = () => {
  const { rawUser } = useGlobalContext();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Fetch itineraries using a useCallback to prevent unnecessary function recreations
  const fetchItineraries = useCallback(async () => {
    if (!rawUser?.$id) return;

    try {
      const data = await getUserItineraries(rawUser.$id);
      setItineraries(data);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Error fetching itineraries:", error);
      Alert.alert(
        "Error",
        "Failed to load itineraries. Pull down to try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rawUser]);

  // Initial load
  useEffect(() => {
    if (rawUser?.$id) {
      setLoading(true);
      fetchItineraries();
    }
  }, [rawUser, fetchItineraries]);

  useFocusEffect(
    useCallback(() => {
      if (rawUser?.$id) {
        // Set refreshing state to show loading indicator
        setRefreshing(true);
        fetchItineraries();
      }
      return () => {
        // Optional cleanup
      };
    }, [rawUser, fetchItineraries])
  );

  // Handle refresh with debounce to prevent multiple rapid refreshes
  const handleRefresh = useCallback(() => {
    // Don't allow refreshes more frequently than every 2 seconds
    const now = new Date();
    if (lastRefreshTime && now.getTime() - lastRefreshTime.getTime() < 2000) {
      setTimeout(() => setRefreshing(false), 500);
      return;
    }

    setRefreshing(true);
    fetchItineraries();
  }, [fetchItineraries, lastRefreshTime]);

  // Format date range
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startStr} - ${endStr}`;
  };

  // Calculate trip duration
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  };

  // Navigate to create itinerary
  const handleCreateItinerary = () => {
    router.push("/itinerary/create");
  };

  // Navigate to itinerary details
  const handleViewItinerary = (itineraryId: string) => {
    router.push(`/itinerary/${itineraryId}`);
  };

  // Render itinerary card
  const renderItineraryCard = ({ item }: { item: Itinerary }) => {
    return (
      <TouchableOpacity
        style={styles.itineraryCard}
        onPress={() => handleViewItinerary(item.$id!)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={["rgba(26, 188, 156, 0.3)", "rgba(26, 188, 156, 0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardGradient}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {calculateDuration(item.start_date, item.end_date)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {formatDateRange(item.start_date, item.end_date)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.destinations.join(", ")}
            </Text>
          </View>
        </View>

        <View style={styles.arrowContainer}>
          <ChevronRight size={20} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={images.noResult}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>No Itineraries Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first travel itinerary to get started
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateItinerary}
      >
        <Plus size={16} color={COLORS.white} />
        <Text style={styles.createButtonText}>Create Itinerary</Text>
      </TouchableOpacity>
    </View>
  );

  // Last refresh time display
  const renderLastRefreshed = () => {
    if (!lastRefreshTime) return null;

    return (
      <Text style={styles.lastRefreshedText}>
        Last updated: {lastRefreshTime.toLocaleTimeString()}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <CustomHeader
        title="My Itineraries"
        onRightIconPress={handleCreateItinerary}
        rightIcon={<PlusCircle color="white" size={28} />}
        showBackButton={false}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading itineraries...</Text>
        </View>
      ) : itineraries.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={itineraries}
          renderItem={renderItineraryCard}
          keyExtractor={(item) => item.$id!}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
              title="Pull to refresh"
              titleColor={COLORS.textLight}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Your Travel Plans</Text>
              {renderLastRefreshed()}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginBottom: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  listHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  lastRefreshedText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  itineraryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  durationBadge: {
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
    flex: 1,
  },
  arrowContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: 8,
  },
});

export default ItineraryTabScreen;
