import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getPackageById, updatePackage } from "@/lib/appwrite";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import icons from "@/constants/icons";
import AuthButton from "@/components/AuthButton";
import CustomInput from "@/components/CustomInput";
import { useGlobalContext } from "@/lib/global-provider";

const EditPackageScreen = () => {
  const { refetch } = useGlobalContext();
  const { id } = useLocalSearchParams<{ id: string }>(); // ✅ Get Package ID from URL
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /** ✅ Fetch package data when the screen loads */
  useEffect(() => {
    const fetchPackage = async () => {
      if (!id) {
        Alert.alert("Error", "Invalid package ID.");
        router.back();
        return;
      }

      const data = await getPackageById(id);
      // console.log("[Fetched Package] ==> ", data);

      if (data) {
        setFormData(data); // ✅ Pre-populate form with existing data
      } else {
        Alert.alert("Error", "Package not found.");
        router.back();
      }

      setLoading(false);
    };

    fetchPackage();
  }, [id]);

  /** ✅ Handle form field updates */
  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  /** ✅ Handle Image Upload */
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions."
        );
        return;
      }

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

  /** ✅ Handle package update */
  const handleUpdate = async () => {
    if (!formData?.name || !formData?.price) {
      Alert.alert("Error", "Package Name and Price are required.");
      return;
    }

    const updatedPackage = await updatePackage(id, {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      price: parseInt(formData.price),
      bedrooms: parseInt(formData.bedrooms),
      bathrooms: parseInt(formData.bathrooms),
      rating: parseFloat(formData.rating),
      facilities: formData.facilities,
      image: formData.image,
      allinclusive: formData.allinclusive,
      roomType: formData.roomType,

      // ✅ Flight Information
      flightInfo: {
        departingFrom: formData.flightInfo?.departingFrom,
        arrivingTo: formData.flightInfo?.arrivingTo,
        returningFrom: formData.flightInfo?.returningFrom,
        returningTo: formData.flightInfo?.returningTo,
        departingTime: formData.flightInfo?.departingTime,
        arrivingToTime: formData.flightInfo?.arrivingToTime,
        returningFromTime: formData.flightInfo?.returningFromTime,
        returningToTime: formData.flightInfo?.returningToTime,
        departureDate: formData.flightInfo?.departureDate,
        returnDate: formData.flightInfo?.returnDate,
      },
    });

    if (updatedPackage) {
      Alert.alert("Success", "Package updated successfully!");

      // router.back();
    } else {
      Alert.alert("Error", "Failed to update package.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex flex-row items-center w-full justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex flex-row rounded-full size-11 ml-4 items-center justify-center"
        >
          <Image source={icons.backArrow} className="size-8" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold">Edit Package</Text>
        <View></View>
      </View>

      <ScrollView className="p-4">
        {/* ✅ Image Upload */}

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

        {/* ✅ Name */}
        {/* ✅ Property Type */}

        {/* Label */}
        <Text
          style={styles.label}
          className="text-lg font-semibold text-[#34495E] mb-2"
        >
          Property Type
        </Text>
        <View className="border border-gray-300 rounded-lg mb-4">
          <Picker
            selectedValue={formData?.type}
            onValueChange={(value) => handleChange("type", value)}
            style={{ color: "#34495E", height: 190 }} // ✅ Picker text color
            itemStyle={{ fontSize: 20, color: "#34495E" }} // ✅ iOS support
          >
            <Picker.Item label="Luxury" value="Luxury" />
            <Picker.Item label="Budget" value="Budget" />
            <Picker.Item label="Standard" value="Standard" />
            <Picker.Item label="House" value="House" />
            <Picker.Item label="Condo" value="Condo" />
          </Picker>
        </View>

        <Text style={styles.label}>Package Name</Text>
        <CustomInput
          value={formData?.name || ""}
          onChangeText={(text) => handleChange("name", text)}
        />

        <Text style={styles.label}>Description</Text>
        <CustomInput
          value={formData.description}
          onChangeText={(text) => handleChange("description", text)}
          // style={styles.input}
          // multiline
        />

        <Text style={styles.label}>Price</Text>
        <CustomInput
          value={formData?.price?.toString() || ""}
          onChangeText={(text) => handleChange("price", text)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Bedrooms</Text>
        <CustomInput
          value={formData?.bedrooms?.toString() || ""}
          onChangeText={(text) => handleChange("bedrooms", text)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Bathrooms</Text>
        <CustomInput
          value={formData?.bathrooms?.toString() || ""}
          onChangeText={(text) => handleChange("bathrooms", text)}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Rating</Text>
        <CustomInput
          value={formData?.rating || ""}
          onChangeText={(text) => handleChange("rating", text)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Facilities</Text>
        <CustomInput
          value={formData.facilities.join(", ")}
          onChangeText={(text) => handleChange("facilities", text.split(", "))}
        />

        <Text className="mt-5" style={styles.label}>
          Room Type
        </Text>
        <View className="border border-gray-300 rounded-lg  px-3">
          <Picker
            selectedValue={formData.roomType}
            onValueChange={(value) => handleChange("roomType", value)}
            style={{ color: "#34495E", height: 190 }} // ✅ Picker text color
            itemStyle={{ fontSize: 20, color: "#34495E" }} // ✅ iOS support
          >
            <Picker.Item label="Standard" value="Standard Room" />
            <Picker.Item label="Deluxe" value="Deluxe Room" />
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

        <View style={styles.section} className="mt-6">
          <Text style={styles.sectionTitle}>Flight Information</Text>

          <Text style={styles.label}>Departure From</Text>
          <CustomInput
            value={formData.flightInfo?.departingFrom}
            onChangeText={(text) =>
              handleChange("flightInfo", {
                ...formData.flightInfo,
                departingFrom: text,
              })
            }
          />

          <Text style={styles.label}>Arrival To</Text>
          <CustomInput
            value={formData.flightInfo?.arrivingTo}
            onChangeText={(text) =>
              handleChange("flightInfo", {
                ...formData.flightInfo,
                arrivingTo: text,
              })
            }
            // style={styles.input}
          />

          <Text style={styles.label}>Return From</Text>
          <CustomInput
            value={formData.flightInfo?.returningFrom}
            onChangeText={(text) =>
              handleChange("flightInfo", {
                ...formData.flightInfo,
                returningFrom: text,
              })
            }
          />

          <Text style={styles.label}>Return To</Text>
          <CustomInput
            value={formData.flightInfo?.returningTo}
            onChangeText={(text) =>
              handleChange("flightInfo", {
                ...formData.flightInfo,
                returningTo: text,
              })
            }
          />

          <Text style={styles.label}>Departure Date</Text>
          <CustomInput
            value={formData.flightInfo?.departureDate}
            onChangeText={(text) =>
              handleChange("flightInfo", {
                ...formData.flightInfo,
                departureDate: text,
              })
            }
            // style={styles.input}
          />

          <Text style={styles.label}>Return Date</Text>
          <CustomInput
            value={formData.flightInfo?.returnDate}
            onChangeText={(text) =>
              handleChange("flightInfo", {
                ...formData.flightInfo,
                returnDate: text,
              })
            }
          />
        </View>

        {/* ✅ Submit Button */}
        <AuthButton title="Update Package" onPress={handleUpdate} />
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
});

export default EditPackageScreen;
