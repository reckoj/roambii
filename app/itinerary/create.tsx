import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useGlobalContext } from "@/lib/global-provider";
import { createItinerary } from "@/lib/itinerary-service";
import { Itinerary, DayPlan, Activity } from "@/lib/firebase/models";
import CustomHeader from "@/components/HeaderComponent";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Check,
  Map,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#36d6ba",
  secondary: "#D9D9D9",
  background: "#F9FAFC",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  danger: "#FF4C69",
  divider: "#EEEEEE",
};

const CreateItineraryScreen = () => {
  const { rawUser } = useGlobalContext();
  const [title, setTitle] = useState("");
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Handle date changes
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setStartDate(selectedDate);

      // If end date is before start date, update end date
      if (endDate < selectedDate) {
        setEndDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // Add a new destination field
  const addDestination = () => {
    setDestinations([...destinations, ""]);
    // Scroll to bottom after adding new destination
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Update a destination at a specific index
  const updateDestination = (text: string, index: number) => {
    const newDestinations = [...destinations];
    newDestinations[index] = text;
    setDestinations(newDestinations);
  };

  // Remove a destination at a specific index
  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      const newDestinations = [...destinations];
      newDestinations.splice(index, 1);
      setDestinations(newDestinations);
    }
  };

  // Calculate number of days in the itinerary
  const calculateDays = (): number => {
    const diff = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle form submission
  const handleCreateItinerary = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your itinerary");
      return;
    }

    const filteredDestinations = destinations.filter(
      (dest) => dest.trim() !== ""
    );
    if (filteredDestinations.length === 0) {
      Alert.alert("Error", "Please enter at least one destination");
      return;
    }

    if (endDate < startDate) {
      Alert.alert("Error", "End date cannot be before start date");
      return;
    }

    if (!rawUser?.id) {
      Alert.alert("Error", "You must be logged in to create an itinerary");
      return;
    }

    setIsSubmitting(true);

    try {
      const daysCount = calculateDays();

      // Prepare itinerary data
      const itineraryData: Omit<Itinerary, "id" | "createdAt" | "updatedAt"> = {
        title: title.trim(),
        userId: rawUser.id,
        startDate: startDate,
        endDate: endDate,
        destinations: filteredDestinations,
      };

      // Prepare day plans
      const dayPlans: Omit<DayPlan, "id" | "itineraryId" | "createdAt" | "updatedAt">[] = [];
      const currentDate = new Date(startDate);

      for (let i = 0; i < daysCount; i++) {
        dayPlans.push({
          day: i + 1,
          date: new Date(currentDate),
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create itinerary with day plans
      const createdItinerary = await createItinerary(itineraryData, dayPlans);

      if (createdItinerary) {
        Alert.alert("Success!", "Your itinerary has been created successfully!", [
          {
            text: "View Itinerary",
            onPress: () => {
              router.push(`/itinerary/${createdItinerary.id}`);
            },
          },
        ]);
      } else {
        throw new Error("Failed to create itinerary");
      }
    } catch (error) {
      console.error("Error creating itinerary:", error);
      Alert.alert(
        "Error",
        "Failed to create itinerary. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom header component
  const CustomHeader2 = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <SafeAreaView>
        <View style={styles.headerContent}>
          <View style={styles.headerTitle}>
            <Map size={24} color={COLORS.white} />
            <Text style={styles.headerText}>Messages</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CustomHeader title="Create Itinerary" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContent}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Itinerary Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Summer in Paris"
              placeholderTextColor="#95A5A6"
            />
          </View>

          {/* Date Selection */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Calendar size={18} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Calendar size={18} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                  minimumDate={startDate}
                />
              )}
            </View>
          </View>

          {/* Trip Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>
                {calculateDays()} {calculateDays() === 1 ? "day" : "days"}
              </Text>
            </View>
          </View>

          {/* Destinations */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Destinations</Text>
            <View style={styles.destinationsContainer}>
              {destinations.map((destination, index) => (
                <View key={index} style={styles.destinationInputRow}>
                  <View style={styles.destinationInputContainer}>
                    <MapPin
                      size={16}
                      color="#95A5A6"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.destinationInput}
                      value={destination}
                      onChangeText={(text) => updateDestination(text, index)}
                      placeholder="Enter a destination"
                      placeholderTextColor="#95A5A6"
                    />
                  </View>
                  {destinations.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeDestination(index)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.addButton}
                onPress={addDestination}
              >
                <Plus size={16} color={COLORS.white} />
                <Text style={styles.addButtonText}>Add Destination</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer to ensure content isn't hidden behind the create button */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Create Button at bottom */}
      <View style={styles.createButtonContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateItinerary}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Check size={18} color={COLORS.white} />
              <Text style={styles.createButtonText}>Create Itinerary</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    color: COLORS.text,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePickerButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  dateText: {
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  destinationsContainer: {
    marginBottom: 10,
  },
  destinationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  destinationInputContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  inputIcon: {
    marginRight: 10,
  },
  destinationInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  removeButtonText: {
    color: "#E74C3C",
    fontSize: 16,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  createButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  header: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.white,
    marginLeft: 10,
  },
});

export default CreateItineraryScreen;
