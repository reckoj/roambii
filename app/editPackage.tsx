import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// Components
import AuthButton from "@/components/AuthButton";
import CustomInput from "@/components/CustomInput";

import AmenitySelection from "@/components/AmenitySelection";

// Firebase
import { auth } from "@/lib/firebase/firebase-config";
import { getPackageById, updatePackage } from "@/lib/package-service";
import CustomHeader from "@/components/HeaderComponent";
import FlightInformation from "./FlightInfo";

const EditPackageScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [formData, setFormData] = useState<any>(null);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Date picker states
  const [showCheckInDate, setShowCheckInDate] = useState(false);
  const [showCheckOutDate, setShowCheckOutDate] = useState(false);
  const [showCheckInTime, setShowCheckInTime] = useState(false);
  const [showCheckOutTime, setShowCheckOutTime] = useState(false);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!id) {
        Alert.alert("Error", "Invalid package ID.");
        router.back();
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        Alert.alert(
          "Authentication Error",
          "You must be logged in to edit a package"
        );
        router.back();
        return;
      }

      try {
        const packageData = await getPackageById(id);
        if (!packageData) {
          Alert.alert("Error", "Package not found.");
          router.back();
          return;
        }

        // Check if the current user is the agent who created this package
        // This would depend on your data structure, adjust as needed
        // if (packageData.agent?.userId !== user.uid) {
        //   Alert.alert(
        //     "Access Denied",
        //     "You don't have permission to edit this package"
        //   );
        //   router.back();
        //   return;
        // }

        const userIsAgent =
          packageData.agent?.userId === user.uid || // Check userId field
          packageData.agent?.id === user.uid || // Check agent document ID
          (user.email && packageData.agent?.email === user.email); // Check email

        if (!userIsAgent) {
          console.log(
            "Permission denied: Current user is not the package creator"
          );
          console.log("User ID:", user.uid);
          console.log("User Email:", user.email);
          console.log("Agent data:", packageData.agent);
          Alert.alert(
            "Access Denied",
            "You don't have permission to edit this package"
          );
          router.back();
          return;
        }

        // Transform data to match form structure
        const transformedData = {
          name: packageData.name || "",
          description: packageData.description || "",
          price: packageData.price ? packageData.price.toString() : "",
          type: packageData.type || "Hotel",
          image: packageData.banner_image || "",
          rating: packageData.rating ? packageData.rating.toString() : "",
          amenities: packageData.amenities || [],
          allinclusive: packageData.is_all_inclusive || false,
          roomType: packageData.room_type || "Standard Room",
          bedrooms: packageData.beds ? packageData.beds.toString() : "",
          bathrooms: packageData.baths ? packageData.baths.toString() : "",
          guestAmount: packageData.guest_amount
            ? packageData.guest_amount.toString()
            : "",
          checkInDate: packageData.check_in_date
            ? new Date(packageData.check_in_date).toISOString()
            : new Date().toISOString(),
          checkOutDate: packageData.check_out_date
            ? new Date(packageData.check_out_date).toISOString()
            : new Date().toISOString(),
          checkInTime: packageData.check_in_time
            ? new Date(packageData.check_in_time).toISOString()
            : new Date().toISOString(),
          checkOutTime: packageData.check_out_time
            ? new Date(packageData.check_out_time).toISOString()
            : new Date().toISOString(),

          // Flight info
          departingFrom: packageData.flight_info?.departing_from || "",
          arrivingTo: packageData.flight_info?.arriving_to || "",
          returningFrom: packageData.flight_info?.returning_from || "",
          returningTo: packageData.flight_info?.returning_to || "",
          departingTime: packageData.flight_info?.departing_time
            ? new Date(packageData.flight_info.departing_time).toISOString()
            : "",
          arrivingToTime: packageData.flight_info?.arriving_to_time
            ? new Date(packageData.flight_info.arriving_to_time).toISOString()
            : "",
          returningFromTime: packageData.flight_info?.returning_from_time
            ? new Date(
                packageData.flight_info.returning_from_time
              ).toISOString()
            : "",
          returningToTime: packageData.flight_info?.returning_to_time
            ? new Date(packageData.flight_info.returning_to_time).toISOString()
            : "",
          departureDate: packageData.flight_info?.departure_date
            ? new Date(packageData.flight_info.departure_date).toISOString()
            : "",
          returnDate: packageData.flight_info?.return_date
            ? new Date(packageData.flight_info.return_date).toISOString()
            : "",
        };

        setFormData(transformedData);
        setOriginalFormData(transformedData); // Keep original data for comparison
      } catch (error) {
        console.error("Error fetching package:", error);
        Alert.alert("Error", "Failed to load package data");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id, router]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setFormData((prev: any) => ({ ...prev, image: result.assets[0].uri }));
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

  const handleUpdate = async () => {
    if (!formData?.name || !formData?.price) {
      Alert.alert("Error", "Package Name and Price are required.");
      return;
    }

    try {
      setSubmitLoading(true);

      // Check if anything has changed
      const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(originalFormData);

      if (!hasChanges) {
        Alert.alert("No Changes", "No changes were made to the package.");
        setSubmitLoading(false);
        return;
      }

      // Update package in Firebase
      const success = await updatePackage(
        id as string,
        formData,
        formData.image
      );

      if (success) {
        Alert.alert("Success", "Package updated successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error("Failed to update package");
      }
    } catch (error) {
      console.error("Error updating package:", error);
      Alert.alert("Error", "Failed to update package. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="pb-24">
        <CustomHeader title="Edit Package" />

        <ScrollView
          className="bg-white"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Upload */}
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

          {/* Property Type */}
          <Text style={styles.label}>Property Type</Text>
          <View className="border border-gray-300 rounded-lg px-3 mb-4">
            <Picker
              selectedValue={formData?.type}
              onValueChange={(value) => handleChange("type", value)}
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

          {/* Text Inputs */}
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Package Name</Text>
              <CustomInput
                value={formData?.name || ""}
                onChangeText={(text) => handleChange("name", text)}
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Price</Text>
              <CustomInput
                value={formData?.price || ""}
                onChangeText={(text) => handleChange("price", text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Bedrooms</Text>
              <CustomInput
                value={formData?.bedrooms || ""}
                onChangeText={(text) => handleChange("bedrooms", text)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Bathrooms</Text>
              <CustomInput
                value={formData?.bathrooms || ""}
                onChangeText={(text) => handleChange("bathrooms", text)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Rating</Text>
              <CustomInput
                value={formData?.rating || ""}
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
                      handleChange("checkOutDate", selectedDate.toISOString());
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
                      handleChange("checkOutTime", selectedTime.toISOString());
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
              value={formData?.guestAmount || ""}
              onChangeText={(text) => handleChange("guestAmount", text)}
              keyboardType="numeric"
            />
          </View>

          {/* Description */}
          <Text style={styles.label}>Package Description</Text>
          <CustomInput
            height={120}
            value={formData?.description || ""}
            onChangeText={(text) => handleChange("description", text)}
            multiline={true}
            textAlignVertical="top"
          />

          {/* Amenity Selection */}
          <AmenitySelection formData={formData} handleChange={handleChange} />

          {/* Room Type */}
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

          {/* All-Inclusive Toggle */}
          <Text style={styles.label} className="mt-4">
            All-Inclusive
          </Text>
          <Switch
            value={formData.allinclusive}
            onValueChange={(value) => handleChange("allinclusive", value)}
          />

          {/* Flight Information */}
          <FlightInformation formData={formData} handleChange={handleChange} />

          {/* Update Button */}
          <AuthButton
            title="Update Package"
            onPress={handleUpdate}
            disabled={submitLoading}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default EditPackageScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
