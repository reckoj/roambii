import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

// Components
import CustomInput from "@/components/CustomInput";
import AuthButton from "@/components/AuthButton";
import AmenitySelection from "@/components/AmenitySelection";

// Firebase
import { createPackage, getCurrentUserAgent } from "@/lib/package-service";
import { auth, COLLECTIONS, firestore } from "@/lib/firebase/firebase-config";
import CustomHeader from "@/components/HeaderComponent";
import FlightInformation from "./FlightInfo";
import { collection, getDocs } from "firebase/firestore";

const CreatePackageScreen = () => {
  const router = useRouter();
  const [isAgent, setIsAgent] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // In CreatePackageScreen.tsx, add this debugging code
  const user = auth.currentUser;

  useEffect(() => {
    const checkAgentStatus = async () => {
      if (!user) {
        Alert.alert(
          "Authentication Error",
          "You must be logged in to create a package"
        );
        router.back();
        return;
      }

      console.log("Current user ID:", user.uid);
      console.log("Current user email:", user.email);
      console.log("Current user auth token:", await user.getIdToken());

      // Debug: Directly check the agents collection
      try {
        const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
        const allAgentsSnapshot = await getDocs(agentsRef);
        console.log("Total agents in database:", allAgentsSnapshot.size);

        allAgentsSnapshot.forEach((doc) => {
          console.log("Agent doc ID:", doc.id);
          console.log("Agent data:", doc.data());
        });
      } catch (error) {
        console.error("Error listing all agents:", error);
      }

      try {
        const agentData = await getCurrentUserAgent(user.uid);
        console.log("Agent data returned:", agentData);

        if (agentData) {
          setIsAgent(true);
          setAgentId(agentData.id);
          console.log("Agent status confirmed. Agent ID:", agentData.id);
        } else {
          console.log("No agent data found for user:", user.uid);
          Alert.alert("Access Denied", "Only agents can create packages");
          router.back();
        }
      } catch (error) {
        console.error("Error checking agent status:", error);
        Alert.alert("Error", "Failed to verify agent status");
        router.back();
      } finally {
        setInitializing(false);
      }
    };

    checkAgentStatus();
  }, [user, router]);

  // Set default times for check-in and check-out
  const defaultCheckInTime = new Date();
  defaultCheckInTime.setHours(15, 0, 0, 0); // 3:00 PM

  const defaultCheckOutTime = new Date();
  defaultCheckOutTime.setHours(11, 0, 0, 0); // 11:00 AM

  // Set default dates (today for check-in, tomorrow for check-out)
  const defaultCheckInDate = new Date();

  const defaultCheckOutDate = new Date();
  defaultCheckOutDate.setDate(defaultCheckOutDate.getDate() + 1);

  const [formData, setFormData] = useState({
    departingFrom: "",
    arrivingTo: "",
    returningFrom: "",
    returningTo: "",
    departingTime: "",
    arrivingToTime: "",
    returningFromTime: "",
    returningToTime: "",
    departureDate: "",
    returnDate: "",
    name: "",
    type: "Hotel", // Default enum
    description: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    rating: "",
    amenities: [],
    image: "",
    guestAmount: "",
    allinclusive: false,
    roomType: "Standard Room", // Default enum
    checkInDate: defaultCheckInDate.toISOString(),
    checkOutDate: defaultCheckOutDate.toISOString(),
    checkInTime: defaultCheckInTime.toISOString(),
    checkOutTime: defaultCheckOutTime.toISOString(),
    stayLink: "",
  });

  // Date picker states
  const [showCheckInDate, setShowCheckInDate] = useState(false);
  const [showCheckOutDate, setShowCheckOutDate] = useState(false);
  const [showCheckInTime, setShowCheckInTime] = useState(false);
  const [showCheckOutTime, setShowCheckOutTime] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    try {
      // Use the helper function that handles permissions automatically
      const { pickImageWithPermissions } = await import('@/lib/utils/imagePermissions');
      const result = await pickImageWithPermissions();
      
      if (result) {
        setFormData((prev) => ({ ...prev, image: result.assets[0].uri }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // Format date for display
  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format time for display
  const formatTime = (timeString: string | number | Date) => {
    if (!timeString) return "";
    const time = new Date(timeString);
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSubmit = async () => {
    if (!isAgent || !agentId) {
      Alert.alert("Error", "Only agents can create packages");
      return;
    }

    if (!formData.name || !formData.price || !formData.departingFrom) {
      Alert.alert(
        "Error",
        "Please fill in required fields (name, price, and departure location)"
      );
      return;
    }

    try {
      setLoading(true);

      // Create package in Firebase
      await createPackage(formData, agentId, formData.image);

      Alert.alert("Success", "Package created successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error creating package:", error);
      Alert.alert("Error", "Failed to create package. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  if (!isAgent) {
    return null; // Don't render anything if not an agent
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="pb-24">
        <CustomHeader title="New Package" />

        <ScrollView
          className="bg-white"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Property Information</Text>
          <View style={styles.section}>
            <Text style={styles.label}>Banner Image</Text>
            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {formData.image ? (
                <Image
                  source={{ uri: formData.image }}
                  style={styles.previewImage}
                />
              ) : (
                <Text style={styles.imageUploadText}>Tap to upload image</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View className="mb-4">
              <Text
                style={styles.label}
                className="text-lg font-semibold text-[#34495E] mb-2"
              >
                Property Type
              </Text>

              <View className="border border-gray-300 rounded-lg px-3">
                <Picker
                  selectedValue={formData.type}
                  onValueChange={(value) => handleChange("type", value)}
                  className="text-[#34495E]"
                  style={{ color: "#34495E", height: 190 }}
                  itemStyle={{ fontSize: 20, color: "#34495E" }}
                >
                  <Picker.Item label="Villa" value="Villa" />
                  <Picker.Item label="Resort" value="Resort" />
                  <Picker.Item label="Hotel" value="Hotel" />
                  <Picker.Item label="Motel" value="Motel" />
                  <Picker.Item label="BnB" value="BnB" />
                </Picker>
              </View>
            </View>
          </View>
          <View>
            {/* Name and Price */}
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Name</Text>
                <CustomInput
                  value={formData.name}
                  onChangeText={(text) => handleChange("name", text)}
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Price</Text>
                <CustomInput
                  value={formData.price}
                  onChangeText={(text) => handleChange("price", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Bedrooms, Bathrooms, Rating */}
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Bedrooms</Text>
                <CustomInput
                  value={formData.bedrooms}
                  onChangeText={(text) => handleChange("bedrooms", text)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Bathrooms</Text>
                <CustomInput
                  value={formData.bathrooms}
                  onChangeText={(text) => handleChange("bathrooms", text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Rating</Text>
                <CustomInput
                  value={formData.rating}
                  onChangeText={(text) => handleChange("rating", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Check-in Date */}
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Check-in Date</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowCheckInDate(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formatDate(formData.checkInDate)}
                  </Text>
                </TouchableOpacity>
                {showCheckInDate && (
                  <DateTimePicker
                    value={new Date(formData.checkInDate)}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowCheckInDate(Platform.OS === "ios");
                      if (selectedDate) {
                        handleChange("checkInDate", selectedDate.toISOString());
                      }
                    }}
                  />
                )}
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Check-out Date</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowCheckOutDate(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formatDate(formData.checkOutDate)}
                  </Text>
                </TouchableOpacity>
                {showCheckOutDate && (
                  <DateTimePicker
                    value={new Date(formData.checkOutDate)}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowCheckOutDate(Platform.OS === "ios");
                      if (selectedDate) {
                        handleChange(
                          "checkOutDate",
                          selectedDate.toISOString()
                        );
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Check-in Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowCheckInTime(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formatTime(formData.checkInTime)}
                  </Text>
                </TouchableOpacity>
                {showCheckInTime && (
                  <DateTimePicker
                    value={new Date(formData.checkInTime)}
                    mode="time"
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowCheckInTime(Platform.OS === "ios");
                      if (selectedTime) {
                        handleChange("checkInTime", selectedTime.toISOString());
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Check-out Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowCheckOutTime(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formatTime(formData.checkOutTime)}
                  </Text>
                </TouchableOpacity>
                {showCheckOutTime && (
                  <DateTimePicker
                    value={new Date(formData.checkOutTime)}
                    mode="time"
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowCheckOutTime(Platform.OS === "ios");
                      if (selectedTime) {
                        handleChange(
                          "checkOutTime",
                          selectedTime.toISOString()
                        );
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <Text style={styles.label}>Travelers</Text>
            <View className="w-14">
              <CustomInput
                height={30}
                value={formData.guestAmount}
                onChangeText={(text) => handleChange("guestAmount", text)}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Package Description</Text>
            <CustomInput
              height={120}
              value={formData.description}
              onChangeText={(text) => handleChange("description", text)}
              multiline={true}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Stay Link</Text>
            <CustomInput
              value={formData.stayLink}
              onChangeText={(text) => handleChange("stayLink", text)}
              placeholder="stay link"
            />
          </View>

          <AmenitySelection formData={formData} handleChange={handleChange} />

          <Text className="mt-5" style={styles.label}>
            Room Type
          </Text>
          <View className="border border-gray-300 rounded-lg px-3">
            <Picker
              selectedValue={formData.roomType}
              onValueChange={(value) => handleChange("roomType", value)}
              style={{ color: "#34495E", height: 190 }}
              itemStyle={{ fontSize: 20, color: "#34495E" }}
            >
              <Picker.Item label="Standard Room" value="Standard Room" />
              <Picker.Item label="Deluxe Room" value="Deluxe Room" />
              <Picker.Item label="Suite" value="Suite" />
              <Picker.Item label="Superior Room" value="Superior Room" />
              <Picker.Item label="Double Room" value="Double Room" />
              <Picker.Item
                label="Presidential Suite"
                value="Presidential Suite"
              />
              <Picker.Item label="Junior Suite" value="Junior Suite" />
            </Picker>
          </View>

          <Text style={styles.label} className="mt-4">
            All-Inclusive
          </Text>
          <Switch
            value={formData.allinclusive}
            onValueChange={(value) => handleChange("allinclusive", value)}
          />

          <FlightInformation formData={formData} handleChange={handleChange} />

          <AuthButton
            title="Create Package"
            onPress={handleSubmit}
            disabled={loading}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreatePackageScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#1ABC9C",
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 15,
    color: "#34495E",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFF",
    marginBottom: 16,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#34495E",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    color: "#1ABC9C",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingVertical: 8,
  },
  imageUpload: {
    width: "100%",
    height: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  imageUploadText: {
    color: "#666",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  flightSection: {
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#1ABC9C",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  requiredText: {
    color: "#666",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    padding: 2,
  },
});
