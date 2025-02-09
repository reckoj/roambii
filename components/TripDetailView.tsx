import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Plane } from "lucide-react-native";
import icons from "@/constants/icons";

interface BookedTrip {
  bookingReference: string;
  flightDetails: {
    outbound: { from: string; to: string; departure: string; arrival: string; flightNumber: string };
    return: { from: string; to: string; departure: string; arrival: string; flightNumber: string };
  };
  amount: number;
  paymentMethod: string;
  passengers: number;
  departureDate: string;
  returnDate: string;
}

interface TripDetailViewProps {
  trip: BookedTrip;
  onBack: () => void;
}

const TripDetailView: React.FC<TripDetailViewProps> = ({ trip, onBack }) => {
  return (
    <ScrollView contentContainerStyle={{  height: "100%",
        paddingBottom: 45}} >
      <View className="flex flex-row items-center w-full justify-between mb-4">
        <TouchableOpacity onPress={onBack} className="flex flex-row bg-primary-300 rounded-full size-11 items-center justify-center">
          <Image source={icons.backArrow} className="size-5" />
        </TouchableOpacity>
      </View>

      <View style={styles.receiptCard}>
        <Text style={styles.receiptTitle}>Booking Details</Text>
        <Text style={styles.bookingReference}>Ref: {trip.bookingReference}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>

          {/* Outbound Flight */}
          <View style={styles.flightSection}>
            <Text style={styles.flightLabel}>Outbound</Text>
            <View style={styles.flightRow}>
              <Text>{trip.flightDetails.outbound.from} → {trip.flightDetails.outbound.to}</Text>
              <Plane size={16} color="#1ABC9C" />
              <Text>{trip.flightDetails.outbound.departure} - {trip.flightDetails.outbound.arrival}</Text>
            </View>
          </View>

          {/* Return Flight */}
          <View style={styles.flightSection}>
            <Text style={styles.flightLabel}>Return</Text>
            <View style={styles.flightRow}>
              <Text>{trip.flightDetails.return.from} → {trip.flightDetails.return.to}</Text>
              <Plane size={16} color="#1ABC9C" />
              <Text>{trip.flightDetails.return.departure} - {trip.flightDetails.return.arrival}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Text>Amount Paid: ${trip.amount.toLocaleString()}</Text>
          <Text>Payment Method: {trip.paymentMethod}</Text>
        </View>

        <View style={styles.section}>
          <Text>Passengers: {trip.passengers}</Text>
          <Text>Travel Dates: {new Date(trip.departureDate).toLocaleDateString()} - {new Date(trip.returnDate).toLocaleDateString()}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  detailContainer: { flex: 1, backgroundColor: "#F3F4F6", padding: 16 },
  receiptCard: { backgroundColor: "white", borderRadius: 12, padding: 16 },
  receiptTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  bookingReference: { fontSize: 14, color: "#6B7280", marginBottom: 24 },
  section: { marginBottom: 24, borderTopWidth: 1, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  flightSection: { marginBottom: 16 },
  flightLabel: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  flightRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default TripDetailView;
