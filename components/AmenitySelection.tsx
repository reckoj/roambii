import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface AmenitiesSelectionProps {
  formData: { amenities: string[] }; // Explicitly typing formData
  handleChange: (key: string, value: string[]) => void; // Ensuring handleChange updates amenities
}

const AMENITIES_OPTIONS = [
  "Wifi",
  "Parking",
  "Gym",
  "Spa",
  "Restaurant",
  "Bar",
  "Laundry",
  "Conference Room",
  "Beach",
  "Pool",
];

const AmenitySelection: React.FC<AmenitiesSelectionProps> = ({
  formData,
  handleChange,
}) => {
  // ✅ Ensure selected amenities come from Appwrite ENUM
  const [selectedamenities, setSelectedamenities] = useState<string[]>(
    formData.amenities || []
  );

  const toggleAmenity = (amenity: string) => {
    let updatedamenities;

    if (selectedamenities.includes(amenity)) {
      updatedamenities = selectedamenities.filter((item) => item !== amenity);
    } else {
      updatedamenities = [...selectedamenities, amenity];
    }

    // ✅ Ensure Appwrite gets only valid ENUM values
    const validamenities = updatedamenities.filter((f) =>
      AMENITIES_OPTIONS.includes(f)
    );

    setSelectedamenities(validamenities);
    handleChange("amenities", validamenities); // ✅ Only pass valid ENUM values
  };

  return (
    <View style={styles.container}>
      <Text className="text-lg font-semibold mb-2">amenities</Text>
      <Text style={styles.subtitle}>Select all that apply</Text>

      <View style={styles.pillsContainer}>
        {AMENITIES_OPTIONS.map((amenity) => (
          <TouchableOpacity
            key={amenity}
            onPress={() => toggleAmenity(amenity)}
            style={[
              styles.pill,
              selectedamenities.includes(amenity) && styles.selectedPill,
            ]}
            // className={`px-4 py-2 rounded-full border ${
            //   selectedamenities.includes(amenity)
            //     ? "bg-primary-300 border-primary-500"
            //     : "bg-gray-200 border-gray-400"
            // }`}
          >
            <Text
              style={[
                styles.pillText,
                selectedamenities.includes(amenity) && styles.selectedPillText,
              ]}
            >
              {amenity}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default AmenitySelection;
// Styles equivalent to TailwindCSS classes
const styles = StyleSheet.create({
  container: {
    padding: 6,
    backgroundColor: "white",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#34495E",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 32,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: "#f3f4f6",
    margin: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedPill: {
    backgroundColor: "#1ABC9C",
    borderColor: "#1ABC9C",
  },
  pillText: {
    fontSize: 14,
    color: "#374151",
  },
  selectedPillText: {
    color: "white",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#95A5A6",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
  },
});
