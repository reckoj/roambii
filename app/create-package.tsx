import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  Image,
  Alert,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import icons from "@/constants/icons";

interface PackageFormData {
  image: string;
  description: string;
  price: string;
  accommodationType: string;
  isAllInclusive: boolean;
  roomType: string;
  departureInfo: {
    from: string;
    time: Date;
  };
  arrivalInfo: {
    to: string;
    time: Date;
  };
  returnTime: Date;
}

interface DatePickerState {
  departure: boolean;
  arrival: boolean;
  return: boolean;
}

const PackageForm = () => {
  const [formData, setFormData] = useState<PackageFormData>({
    image: "",
    description: "",
    price: "",
    accommodationType: "",
    isAllInclusive: false,
    roomType: "",
    departureInfo: {
      from: "",
      time: new Date(),
    },
    arrivalInfo: {
      to: "",
      time: new Date(),
    },
    returnTime: new Date(),
  });

  const [showDatePicker, setShowDatePicker] = useState<DatePickerState>({
    departure: false,
    arrival: false,
    return: false,
  });

  const showDatePickerFor = (pickerName: keyof DatePickerState) => {
    setShowDatePicker((prev) => ({ ...prev, [pickerName]: true }));
  };

  const handleDateChange = (
    pickerName: keyof DatePickerState,
    selectedDate: Date | undefined,
    field: "departureInfo" | "arrivalInfo" | "returnTime"
  ) => {
    setShowDatePicker((prev) => ({
      ...prev,
      [pickerName]: Platform.OS === "ios",
    }));

    if (selectedDate) {
      if (field === "returnTime") {
        setFormData((prev) => ({ ...prev, returnTime: selectedDate }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: { ...prev[field], time: selectedDate },
        }));
      }
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        setFormData((prev) => ({ ...prev, image: result.assets[0].uri }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (
      !formData.description ||
      !formData.price ||
      !formData.accommodationType ||
      !formData.roomType
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Here you would typically send the data to your backend
    console.log("Form submitted:", formData);
    Alert.alert("Success", "Package listing created successfully!");
  };

  const renderDatePicker = (
    pickerName: keyof DatePickerState,
    value: Date,
    field: "departureInfo" | "arrivalInfo" | "returnTime"
  ) => {
    if (showDatePicker[pickerName]) {
      return (
        <DateTimePicker
          value={value}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            handleDateChange(pickerName, selectedDate, field);
          }}
        />
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex flex-row items-center w-full justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex flex-row rounded-full size-11 ml-4 items-center justify-center"
        >
          <Image source={icons.backArrow} className="size-8" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Create New Package Listing</Text>

        {/* Image Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>Package Banner Image</Text>
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

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Property Description *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, description: text }))
            }
            placeholder="Describe the package..."
          />
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Package Price *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.price}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, price: text }))
            }
            placeholder="Enter price"
          />
        </View>

        {/* Accommodation Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Accommodation Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.accommodationType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, accommodationType: value }))
              }
            >
              <Picker.Item label="Select type..." value="" />
              <Picker.Item label="Hotel" value="hotel" />
              <Picker.Item label="Resort" value="resort" />
              <Picker.Item label="Villa" value="villa" />
              <Picker.Item label="Apartment" value="apartment" />
            </Picker>
          </View>
        </View>

        {/* All Inclusive Toggle */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>All Inclusive</Text>
          <Switch
            value={formData.isAllInclusive}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, isAllInclusive: value }))
            }
          />
        </View>

        {/* Room Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Room Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.roomType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, roomType: value }))
              }
              style={styles.picker} // Apply styles
              // dropdownIconColor="white" // Change dropdown icon color (Android)
            >
              <Picker.Item label="Select room type..." value="" />
              <Picker.Item label="Single" value="single" />
              <Picker.Item label="Double" value="double" />
              <Picker.Item label="Suite" value="suite" />
              <Picker.Item label="Penthouse" value="penthouse" />
            </Picker>
          </View>
        </View>

        {/* Flight Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>

          {/* Departure */}
          <View style={styles.flightSection}>
            <Text style={styles.label}>Departing From</Text>
            <TextInput
              style={styles.input}
              value={formData.departureInfo.from}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  departureInfo: { ...prev.departureInfo, from: text },
                }))
              }
              placeholder="City"
            />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor("departure")}
            >
              <Text style={styles.dateButtonText}>
                Select Departure Time:{" "}
                {formData.departureInfo.time.toLocaleString()}
              </Text>
            </TouchableOpacity>

            {renderDatePicker(
              "departure",
              formData.departureInfo.time,
              "departureInfo"
            )}
          </View>

          {/* Arrival */}
          <View style={styles.flightSection}>
            <Text style={styles.label}>Arriving To</Text>
            <TextInput
              style={styles.input}
              value={formData.arrivalInfo.to}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  arrivalInfo: { ...prev.arrivalInfo, to: text },
                }))
              }
              placeholder="City"
            />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor("arrival")}
            >
              <Text style={styles.dateButtonText}>
                Select Arrival Time:{" "}
                {formData.arrivalInfo.time.toLocaleString()}
              </Text>
            </TouchableOpacity>

            {renderDatePicker(
              "arrival",
              formData.arrivalInfo.time,
              "arrivalInfo"
            )}
          </View>

          {/* Return */}
          <View style={styles.flightSection}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerFor("return")}
            >
              <Text style={styles.dateButtonText}>
                Select Return Time: {formData.returnTime.toLocaleString()}
              </Text>
            </TouchableOpacity>

            {renderDatePicker("return", formData.returnTime, "returnTime")}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Create Package Listing</Text>
        </TouchableOpacity>

        <Text style={styles.requiredText}>* Required fields</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
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
});

export default PackageForm;
