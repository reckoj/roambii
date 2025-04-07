import React, { useState } from "react";
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  account,
  config,
  databases,
  storage,
  uploadPimage,
} from "../lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import icons from "@/constants/icons";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import AuthButton from "@/components/AuthButton";
import { handlePackageImagePicked } from "@/lib/storage";

import FlightInformation from "./FlightInfo";
import { ArrowLeft } from "lucide-react-native";
import CustomHeader from "@/components/HeaderComponent";
import AmenitySelection from "@/components/AmenitySelection";

const CreatePackageScreen = () => {
  const { rawUser, isLogged, isAgent, refetch } = useGlobalContext();

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
    geolocation: "",
    agent: "",
    gallery: "",
    reviews: "",
    checkInTime: defaultCheckInTime.toISOString(),
    checkOutTime: defaultCheckOutTime.toISOString(),
    checkInDate: defaultCheckInDate.toISOString(),
    checkOutDate: defaultCheckOutDate.toISOString(),
    allinclusive: false,
    roomType: "standard", // Default enum
    flightInfo: {
      departingFrom: "",
      arrivingTo: "",
      returningFrom: "",
      returningTo: "",
      departureDate: "",
      returnDate: "",
    },
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
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
    try {
      const userId = (await account.get()).$id;
      if (!isAgent || !rawUser || !rawUser.$id) {
        alert("You must be logged in to create a package");
        return;
      }

      const agentData = await databases.listDocuments(
        config.databaseId!,
        config.agentsCollectionId!,
        [Query.equal("userId", userId)]
      );
      const agentId = agentData.documents[0].$id;

      if (agentData.total === 0) {
        alert("Only agents can create packages.");
        return;
      }

      if (!formData.name || !formData.price || !formData.departingFrom) {
        alert("Please fill in required fields");
        return;
      }

      if (!isAgent || !rawUser || !rawUser.$id) {
        alert("You must be logged in to create a package");
        return;
      }

      const flightInfo = await databases.createDocument(
        config.databaseId!,
        config.flightInfoCollectionId!,
        ID.unique(),
        {
          departingFrom: formData.departingFrom,
          arrivingTo: formData.arrivingTo,
          returningFrom: formData.returningFrom,
          returningTo: formData.returningTo,
          departingTime: formData.departingTime,
          arrivingToTime: formData.arrivingToTime,
          returningFromTime: formData.returningFromTime,
          returningToTime: formData.returningToTime,
          departureDate: formData.departureDate,
          returnDate: formData.returnDate,
        }
      );
      const uploadedFileId = await handlePackageImagePicked(
        formData.image,
        rawUser.$id
      );

      const packageData = await databases.createDocument(
        config.databaseId!,
        config.packagesCollectionId!,
        ID.unique(),
        {
          name: formData.name,
          type: formData.type,
          description: formData.description,
          price: parseInt(formData.price),
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          rating: parseFloat(formData.rating),
          amenities: formData.amenities,
          image: uploadedFileId,
          agent: agentId,
          gallery: [],
          reviews: formData.reviews || null,
          allinclusive: formData.allinclusive,
          roomType: formData.roomType,
          flightInfo: flightInfo.$id,
          checkInTime: formData.checkInTime,
          checkOutTime: formData.checkOutTime,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
        }
      );

      console.log("[Image Before Saving] ==> ", formData.image);

      // Step 3: Add Images to Gallery and Link to Package
      if (formData.gallery && formData.gallery.length > 0) {
        const galleryIds = [];

        for (const image of formData.gallery) {
          const galleryItem = await databases.createDocument(
            config.databaseId!,
            config.galleriesCollectionId!,
            ID.unique(),
            {
              package: packageData.$id,
              imageUrl: image,
            }
          );
          galleryIds.push(galleryItem.$id);
        }

        // Step 4: Update Package with Gallery References
        await databases.updateDocument(
          config.databaseId!,
          config.packagesCollectionId!,
          packageData.$id,
          {
            gallery: galleryIds,
          }
        );
      }

      refetch();
      alert("Package created successfully!");
      router.back();
      console.log("[Refetching Data After Submit]...");
    } catch (error) {
      console.log(error);
      alert(`Failed to create package: ${error}`);
    }
  };

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

            <Text style={styles.label}>Package Description</Text>
            <CustomInput
              height={120}
              value={formData.description}
              onChangeText={(text) => handleChange("description", text)}
            />
          </View>

          <AmenitySelection formData={formData} handleChange={handleChange} />

          <Text className="mt-5" style={styles.label}>
            Room Type
          </Text>
          <View className="border border-gray-300 rounded-lg  px-3">
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

          <AuthButton title="Create Package" onPress={handleSubmit} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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

export default CreatePackageScreen;
