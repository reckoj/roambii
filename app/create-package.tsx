import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";

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
import FacilitySelection from "@/components/FacilitySelection";
import FlightInformation from "./FlightInfo";
import { ArrowLeft } from "lucide-react-native";
import CustomHeader from "@/components/HeaderComponent";

const CreatePackageScreen = () => {
  const { rawUser, isLogged, isAgent, refetch } = useGlobalContext();
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
    type: "Villa", // Default enum
    description: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    rating: "",
    facilities: [],
    image: "",
    geolocation: "",
    agent: "",
    gallery: "",
    reviews: "",
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
        // await handlePackageImagePicked(result.assets[0].uri, rawUser!.$id);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSubmit = async () => {
    try {
      const userId = (await account.get()).$id;
      if (!isAgent || !rawUser || !rawUser.$id) {
        alert("You must be logged in to create a package");
        // console.log("Exit: User is not an agent or not logged in"); // passes
        return;
      }

      const agentData = await databases.listDocuments(
        config.databaseId!,
        config.agentsCollectionId!,
        [Query.equal("userId", userId)] // Assuming "userId" links agents to users
      );
      const agentId = agentData.documents[0].$id; // ✅ Get agent document ID

      if (agentData.total === 0) {
        alert("Only agents can create packages.");

        return;
      }

      // console.log("Using agent ID:", rawUser.$id);
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
          facilities: formData.facilities,
          image: uploadedFileId,
          // geolocation: formData.geolocation,
          agent: agentId, // ✅ Single document ID, no array
          gallery: [],
          reviews: formData.reviews || null, // ✅ Single document ID or null
          allinclusive: formData.allinclusive,
          roomType: formData.roomType,
          flightInfo: flightInfo.$id, // ✅ Make this an array
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
              package: packageData.$id, // ✅ Link image to package
              imageUrl: image, // ✅ Store image URL
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
            gallery: galleryIds, // ✅ Now linking images
          }
        );
      }

      refetch();
      alert("Package created successfully!");
      router.back();
      console.log("[Refetching Data After Submit]..."); // ✅ Debugging
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
          // style={styles.container}
        >
          {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
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
              {/* Label */}
              <Text
                style={styles.label}
                className="text-lg font-semibold text-[#34495E] mb-2"
              >
                Property Type
              </Text>

              {/* Picker Container */}
              <View className="border border-gray-300 rounded-lg px-3">
                <Picker
                  selectedValue={formData.type}
                  onValueChange={(value) => handleChange("type", value)}
                  className="text-[#34495E]"
                  style={{ color: "#34495E", height: 190 }} // ✅ Picker text color
                  itemStyle={{ fontSize: 20, color: "#34495E" }} // ✅ iOS support
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
            <Text style={styles.label}>Package Description</Text>
            <CustomInput
              height={120}
              value={formData.description}
              onChangeText={(text) => handleChange("description", text)}
            />
          </View>

          <FacilitySelection formData={formData} handleChange={handleChange} />

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
          {/* </TouchableWithoutFeedback> */}
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

export default CreatePackageScreen;
// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Platform,
//   Switch,
//   Image,
//   Alert,
//   SafeAreaView,
// } from "react-native";
// import * as ImagePicker from "expo-image-picker";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import { Picker } from "@react-native-picker/picker";
// import { router } from "expo-router";
// import icons from "@/constants/icons";

// interface PackageFormData {
//   image: string;
//   description: string;
//   price: string;
//   accommodationType: string;
//   isAllInclusive: boolean;
//   roomType: string;
//   departureInfo: {
//     from: string;
//     time: Date;
//   };
//   arrivalInfo: {
//     to: string;
//     time: Date;
//   };
//   returnTime: Date;
// }

// interface DatePickerState {
//   departure: boolean;
//   arrival: boolean;
//   return: boolean;
// }

// const PackageForm = () => {
//   const [formData, setFormData] = useState<PackageFormData>({
//     image: "",
//     description: "",
//     price: "",
//     accommodationType: "",
//     isAllInclusive: false,
//     roomType: "",
//     departureInfo: {
//       from: "",
//       time: new Date(),
//     },
//     arrivalInfo: {
//       to: "",
//       time: new Date(),
//     },
//     returnTime: new Date(),
//   });

//   const [showDatePicker, setShowDatePicker] = useState<DatePickerState>({
//     departure: false,
//     arrival: false,
//     return: false,
//   });

//   const showDatePickerFor = (pickerName: keyof DatePickerState) => {
//     setShowDatePicker((prev) => ({ ...prev, [pickerName]: true }));
//   };

//   const handleDateChange = (
//     pickerName: keyof DatePickerState,
//     selectedDate: Date | undefined,
//     field: "departureInfo" | "arrivalInfo" | "returnTime"
//   ) => {
//     setShowDatePicker((prev) => ({
//       ...prev,
//       [pickerName]: Platform.OS === "ios",
//     }));

//     if (selectedDate) {
//       if (field === "returnTime") {
//         setFormData((prev) => ({ ...prev, returnTime: selectedDate }));
//       } else {
//         setFormData((prev) => ({
//           ...prev,
//           [field]: { ...prev[field], time: selectedDate },
//         }));
//       }
//     }
//   };

//   const pickImage = async () => {
//     try {
//       const { status } =
//         await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (status !== "granted") {
//         Alert.alert(
//           "Permission Required",
//           "Sorry, we need camera roll permissions to make this work!"
//         );
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         aspect: [16, 9],
//         quality: 1,
//       });

//       if (!result.canceled) {
//         setFormData((prev) => ({ ...prev, image: result.assets[0].uri }));
//       }
//     } catch (error) {
//       Alert.alert("Error", "Failed to pick image");
//     }
//   };

//   const handleSubmit = () => {
//     // Validate required fields
//     if (
//       !formData.description ||
//       !formData.price ||
//       !formData.accommodationType ||
//       !formData.roomType
//     ) {
//       Alert.alert("Error", "Please fill in all required fields");
//       return;
//     }

//     // Here you would typically send the data to your backend
//     console.log("Form submitted:", formData);
//     Alert.alert("Success", "Package listing created successfully!");
//   };

//   const renderDatePicker = (
//     pickerName: keyof DatePickerState,
//     value: Date,
//     field: "departureInfo" | "arrivalInfo" | "returnTime"
//   ) => {
//     if (showDatePicker[pickerName]) {
//       return (
//         <DateTimePicker
//           value={value}
//           mode="datetime"
//           display="default"
//           onChange={(event, selectedDate) => {
//             handleDateChange(pickerName, selectedDate, field);
//           }}
//         />
//       );
//     }
//     return null;
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <View className="flex flex-row items-center w-full justify-between">
//         <TouchableOpacity
//           onPress={() => router.back()}
//           className="flex flex-row rounded-full size-11 ml-4 items-center justify-center"
//         >
//           <Image source={icons.backArrow} className="size-8" />
//         </TouchableOpacity>
//       </View>
//       <ScrollView style={styles.container}>
//         <Text style={styles.title}>Create New Package Listing</Text>

//         {/* Image Upload */}
//         <View style={styles.section}>
//           <Text style={styles.label}>Package Banner Image</Text>
//           <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
//             {formData.image ? (
//               <Image
//                 source={{ uri: formData.image }}
//                 style={styles.previewImage}
//               />
//             ) : (
//               <Text style={styles.imageUploadText}>Tap to upload image</Text>
//             )}
//           </TouchableOpacity>
//         </View>

//         {/* Description */}
//         <View style={styles.section}>
//           <Text style={styles.label}>Property Description *</Text>
//           <TextInput
//             style={styles.textArea}
//             multiline
//             numberOfLines={4}
//             value={formData.description}
//             onChangeText={(text) =>
//               setFormData((prev) => ({ ...prev, description: text }))
//             }
//             placeholder="Describe the package..."
//           />
//         </View>

//         {/* Price */}
//         <View style={styles.section}>
//           <Text style={styles.label}>Package Price *</Text>
//           <TextInput
//             style={styles.input}
//             keyboardType="numeric"
//             value={formData.price}
//             onChangeText={(text) =>
//               setFormData((prev) => ({ ...prev, price: text }))
//             }
//             placeholder="Enter price"
//           />
//         </View>

//         {/* Accommodation Type */}
//         <View style={styles.section}>
//           <Text style={styles.label}>Accommodation Type *</Text>
//           <View style={styles.pickerContainer}>
//             <Picker
//               selectedValue={formData.accommodationType}
//               onValueChange={(value) =>
//                 setFormData((prev) => ({ ...prev, accommodationType: value }))
//               }
//             >
//               <Picker.Item label="Select type..." value="" />
//               <Picker.Item label="Hotel" value="hotel" />
//               <Picker.Item label="Resort" value="resort" />
//               <Picker.Item label="Villa" value="villa" />
//               <Picker.Item label="Apartment" value="apartment" />
//             </Picker>
//           </View>
//         </View>

//         {/* All Inclusive Toggle */}
//         <View style={styles.switchContainer}>
//           <Text style={styles.label}>All Inclusive</Text>
//           <Switch
//             value={formData.isAllInclusive}
//             onValueChange={(value) =>
//               setFormData((prev) => ({ ...prev, isAllInclusive: value }))
//             }
//           />
//         </View>

//         {/* Room Type */}
//         <View style={styles.section}>
//           <Text style={styles.label}>Room Type *</Text>
//           <View style={styles.pickerContainer}>
//             <Picker
//               selectedValue={formData.roomType}
//               onValueChange={(value) =>
//                 setFormData((prev) => ({ ...prev, roomType: value }))
//               }
//               style={styles.picker} // Apply styles
//               // dropdownIconColor="white" // Change dropdown icon color (Android)
//             >
//               <Picker.Item label="Select room type..." value="" />
//               <Picker.Item label="Single" value="single" />
//               <Picker.Item label="Double" value="double" />
//               <Picker.Item label="Suite" value="suite" />
//               <Picker.Item label="Penthouse" value="penthouse" />
//             </Picker>
//           </View>
//         </View>

//         {/* Flight Information */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Flight Information</Text>

//           {/* Departure */}
//           <View style={styles.flightSection}>
//             <Text style={styles.label}>Departing From</Text>
//             <TextInput
//               style={styles.input}
//               value={formData.departureInfo.from}
//               onChangeText={(text) =>
//                 setFormData((prev) => ({
//                   ...prev,
//                   departureInfo: { ...prev.departureInfo, from: text },
//                 }))
//               }
//               placeholder="City"
//             />

//             <TouchableOpacity
//               style={styles.dateButton}
//               onPress={() => showDatePickerFor("departure")}
//             >
//               <Text style={styles.dateButtonText}>
//                 Select Departure Time:{" "}
//                 {formData.departureInfo.time.toLocaleString()}
//               </Text>
//             </TouchableOpacity>

//             {renderDatePicker(
//               "departure",
//               formData.departureInfo.time,
//               "departureInfo"
//             )}
//           </View>

//           {/* Arrival */}
//           <View style={styles.flightSection}>
//             <Text style={styles.label}>Arriving To</Text>
//             <TextInput
//               style={styles.input}
//               value={formData.arrivalInfo.to}
//               onChangeText={(text) =>
//                 setFormData((prev) => ({
//                   ...prev,
//                   arrivalInfo: { ...prev.arrivalInfo, to: text },
//                 }))
//               }
//               placeholder="City"
//             />

//             <TouchableOpacity
//               style={styles.dateButton}
//               onPress={() => showDatePickerFor("arrival")}
//             >
//               <Text style={styles.dateButtonText}>
//                 Select Arrival Time:{" "}
//                 {formData.arrivalInfo.time.toLocaleString()}
//               </Text>
//             </TouchableOpacity>

//             {renderDatePicker(
//               "arrival",
//               formData.arrivalInfo.time,
//               "arrivalInfo"
//             )}
//           </View>

//           {/* Return */}
//           <View style={styles.flightSection}>
//             <TouchableOpacity
//               style={styles.dateButton}
//               onPress={() => showDatePickerFor("return")}
//             >
//               <Text style={styles.dateButtonText}>
//                 Select Return Time: {formData.returnTime.toLocaleString()}
//               </Text>
//             </TouchableOpacity>

//             {renderDatePicker("return", formData.returnTime, "returnTime")}
//           </View>
//         </View>

//         {/* Submit Button */}
//         <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
//           <Text style={styles.submitButtonText}>Create Package Listing</Text>
//         </TouchableOpacity>

//         <Text style={styles.requiredText}>* Required fields</Text>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 16,
//     backgroundColor: "#fff",
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 20,
//   },
//   section: {
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: "500",
//     marginBottom: 8,
//     color: "#1ABC9C",
//   },

//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     backgroundColor: "#fff",
//   },
//   textArea: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     height: 100,
//     textAlignVertical: "top",
//     backgroundColor: "#fff",
//   },
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     overflow: "hidden",
//     backgroundColor: "#fff",
//   },
//   picker: {
//     color: "#1ABC9C",
//   },
//   switchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 20,
//     paddingVertical: 8,
//   },
//   imageUpload: {
//     width: "100%",
//     height: 200,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f9f9f9",
//     overflow: "hidden",
//   },
//   imageUploadText: {
//     color: "#666",
//   },
//   previewImage: {
//     width: "100%",
//     height: "100%",
//     borderRadius: 8,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 16,
//   },
//   flightSection: {
//     marginBottom: 16,
//   },
//   dateButton: {
//     backgroundColor: "#f0f0f0",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 8,
//   },
//   dateButtonText: {
//     fontSize: 16,
//     color: "#333",
//   },
//   submitButton: {
//     backgroundColor: "#1ABC9C",
//     padding: 16,
//     borderRadius: 8,
//     alignItems: "center",
//     marginVertical: 20,
//   },
//   submitButtonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   requiredText: {
//     color: "#666",
//     fontSize: 14,
//     marginBottom: 20,
//     textAlign: "center",
//   },
// });

// export default PackageForm;
