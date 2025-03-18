import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getPackageById, updatePackage } from "@/lib/appwrite";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import icons from "@/constants/icons";
import AuthButton from "@/components/AuthButton";
import CustomInput from "@/components/CustomInput";
import { useGlobalContext } from "@/lib/global-provider";
import { handlePackageImagePicked } from "@/lib/storage";
import FacilitySelection from "@/components/FacilitySelection";
import FlightInformation from "./FlightInfo";
import { ArrowBigLeft, ArrowLeft } from "lucide-react-native";

const EditPackageScreen = () => {
  const { refetch } = useGlobalContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!id) {
        Alert.alert("Error", "Invalid package ID.");
        router.back();
        return;
      }

      const data = await getPackageById(id);
      if (data) {
        setFormData(data);
      } else {
        Alert.alert("Error", "Package not found.");
        router.back();
      }
      setLoading(false);
    };

    fetchPackage();
  }, [id]);

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

  const handleUpdate = async () => {
    if (!formData?.name || !formData?.price) {
      Alert.alert("Error", "Package Name and Price are required.");
      return;
    }

    try {
      // Ensure only relevant fields are updated
      const updatedData = { ...formData };

      // Remove system fields from Appwrite document
      delete updatedData.$id;
      delete updatedData.$databaseId;
      delete updatedData.$collectionId;
      delete updatedData.$createdAt;
      delete updatedData.$updatedAt;
      delete updatedData.$permissions;

      // Validate and format numeric fields
      if (isNaN(parseInt(formData.price))) {
        Alert.alert("Error", "Price must be a valid integer.");
        return;
      }
      if (isNaN(parseInt(formData.bedrooms))) {
        Alert.alert("Error", "Bedrooms must be a valid integer.");
        return;
      }
      if (isNaN(parseInt(formData.bathrooms))) {
        Alert.alert("Error", "Bathrooms must be a valid integer.");
        return;
      }
      if (isNaN(parseFloat(formData.rating))) {
        Alert.alert("Error", "Rating must be a valid number.");
        return;
      }

      updatedData.price = parseInt(formData.price);
      updatedData.bedrooms = parseInt(formData.bedrooms);
      updatedData.bathrooms = parseInt(formData.bathrooms);
      updatedData.rating = parseFloat(formData.rating);

      // Handle Image Upload if changed
      if (formData.image && !formData.image.startsWith("https://")) {
        updatedData.image = await handlePackageImagePicked(formData.image, id);
      }

      // Perform update
      await updatePackage(id, updatedData);
      refetch();
      Alert.alert("Success", "Package updated successfully!");
      router.back();
    } catch (error) {
      console.error("Error updating package:", error);
      Alert.alert("Error", `Failed to update package: ${error}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <SafeAreaView className=" bg-primary-200">
        <View className="flex flex-row justify-between items-center ">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex flex-row rounded-full size-11 items-center justify-center"
          >
            <ArrowLeft color={"#fff"} />
          </TouchableOpacity>
          <Text className="text-2xl font-rubik-SemiBold text-white">
            Edit Package
          </Text>
          <View></View>
        </View>
        {!loading ? (
          <ScrollView
            className=" bg-white"
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
                  <Text style={styles.imageUploadText}>
                    Tap to upload image
                  </Text>
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
                  value={formData?.price?.toString() || ""}
                  onChangeText={(text) => handleChange("price", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Bedrooms</Text>
                <CustomInput
                  value={formData?.bedrooms?.toString() || ""}
                  onChangeText={(text) => handleChange("bedrooms", text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Bathrooms</Text>
                <CustomInput
                  value={formData?.bathrooms?.toString() || ""}
                  onChangeText={(text) => handleChange("bathrooms", text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Rating</Text>
                <CustomInput
                  value={formData?.rating.toString() || ""}
                  onChangeText={(text) => handleChange("rating", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Description */}
            <Text style={styles.label}>Package Description</Text>
            <CustomInput
              height={120}
              value={formData?.description || ""}
              onChangeText={(text) => handleChange("description", text)}
            />

            {/* Facility Selection */}
            <FacilitySelection
              formData={formData}
              handleChange={handleChange}
            />

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
            <FlightInformation
              formData={formData}
              handleChange={handleChange}
            />

            {/* Update Button */}
            <AuthButton title="Update Package" onPress={handleUpdate} />
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1ABC9C" />
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default EditPackageScreen;

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
  // label: {
  //   fontSize: 16,
  //   fontWeight: "bold",
  //   marginBottom: 5,
  // },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    padding: 2,
  },
});
