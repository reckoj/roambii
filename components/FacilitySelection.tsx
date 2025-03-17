import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface FacilitySelectionProps {
  formData: { facilities: string[] }; // Explicitly typing formData
  handleChange: (key: string, value: string[]) => void; // Ensuring handleChange updates facilities
}

const FACILITIES_OPTIONS = [
  "Wifi",
  "Parking",
  "Gym",
  "Spa",
  "Restaurant",
  "Bar",
  "Laundry",
  "Conference Room",
];

const FacilitySelection: React.FC<FacilitySelectionProps> = ({
  formData,
  handleChange,
}) => {
  // ✅ Ensure selected facilities come from Appwrite ENUM
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    formData.facilities || []
  );

  const toggleFacility = (facility: string) => {
    let updatedFacilities;

    if (selectedFacilities.includes(facility)) {
      updatedFacilities = selectedFacilities.filter(
        (item) => item !== facility
      );
    } else {
      updatedFacilities = [...selectedFacilities, facility];
    }

    // ✅ Ensure Appwrite gets only valid ENUM values
    const validFacilities = updatedFacilities.filter((f) =>
      FACILITIES_OPTIONS.includes(f)
    );

    setSelectedFacilities(validFacilities);
    handleChange("facilities", validFacilities); // ✅ Only pass valid ENUM values
  };

  return (
    <View style={styles.container}>
      <Text className="text-lg font-semibold mb-2">Facilities</Text>
      <Text style={styles.subtitle}>Select all that apply</Text>

      <View style={styles.pillsContainer}>
        {FACILITIES_OPTIONS.map((facility) => (
          <TouchableOpacity
            key={facility}
            onPress={() => toggleFacility(facility)}
            style={[
              styles.pill,
              selectedFacilities.includes(facility) && styles.selectedPill,
            ]}
            // className={`px-4 py-2 rounded-full border ${
            //   selectedFacilities.includes(facility)
            //     ? "bg-primary-300 border-primary-500"
            //     : "bg-gray-200 border-gray-400"
            // }`}
          >
            <Text
              style={[
                styles.pillText,
                selectedFacilities.includes(facility) &&
                  styles.selectedPillText,
              ]}
            >
              {facility}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default FacilitySelection;
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
