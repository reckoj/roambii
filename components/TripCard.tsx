import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { ChevronRight, Calendar, CreditCard, MapPin } from "lucide-react-native";

interface BookedTrip {
  id: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  amount: number;
}

interface TripCardProps {
  trip: BookedTrip;
  onPress: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  return (
    <TouchableOpacity style={styles.tripCard} onPress={onPress}>
    <View style={styles.tripHeader}>
      <View style={styles.destinationContainer}>
        <MapPin size={20} color="#1ABC9C" />
        <Text style={styles.destinationText}>{trip.destination}</Text>
      </View>
      <ChevronRight size={20} color="#1ABC9C" />
    </View>
    
    <View style={styles.tripDetails}>
      <View style={styles.detailRow}>
        <Calendar size={16} color="#1ABC9C" />
        <Text style={styles.detailText}>
          {new Date(trip.departureDate).toLocaleDateString()} - {new Date(trip.returnDate).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <CreditCard size={16} color="#1ABC9C" />
        <Text style={styles.detailText}>${trip.amount.toLocaleString()}</Text>
      </View>
    </View>
  </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tripCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  destinationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  destinationText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  tripDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
});

export default TripCard;
