import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { config, databases, storage, uploadPimage } from "../lib/appwrite";
import { ID } from "react-native-appwrite";

const CreatePackageScreen = () => {
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
    type: "luxury", // Default enum
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
  });

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      let imageUrl;
      if (formData.image) {
        imageUrl = await uploadPimage(formData.image, config.packageImagesId!);
      }

      const packageData = {
        ...formData,
        price: parseInt(formData.price),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        rating: parseFloat(formData.rating),
        image: imageUrl,
      };

      await databases.createDocument(
        "your_database_id",
        "packages",
        ID.unique(),
        packageData
      );
      Alert.alert("Success", "Package created successfully!");
    } catch (error) {
      console.error("Failed to create package:", error);
      Alert.alert("Error", "Failed to create package. Please try again.");
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text>Package Name</Text>
      <TextInput
        value={formData.name}
        onChangeText={(text) => handleChange("name", text)}
        style={styles.input}
      />

      <Text>Departure From</Text>
      <TextInput
        value={formData.departingFrom}
        onChangeText={(text) => handleChange("departingFrom", text)}
        style={styles.input}
      />

      <Text>Arrival To</Text>
      <TextInput
        value={formData.arrivingTo}
        onChangeText={(text) => handleChange("arrivingTo", text)}
        style={styles.input}
      />

      <Text>Return From</Text>
      <TextInput
        value={formData.returningFrom}
        onChangeText={(text) => handleChange("returningFrom", text)}
        style={styles.input}
      />

      <Text>Return To</Text>
      <TextInput
        value={formData.returningTo}
        onChangeText={(text) => handleChange("returningTo", text)}
        style={styles.input}
      />

      <Text>Type</Text>
      <Picker
        selectedValue={formData.type}
        onValueChange={(value) => handleChange("type", value)}
      >
        <Picker.Item label="Villa" value="villa" />
        <Picker.Item label="Condo" value="condo" />
      </Picker>

      <Text>Price</Text>
      <TextInput
        value={formData.price}
        onChangeText={(text) => handleChange("price", text)}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button title="Create Package" onPress={handleSubmit} />
    </ScrollView>
  );
};

const styles = {
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
};

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

// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Platform,
//   Image,
//   Alert,
//   KeyboardAvoidingView
// } from 'react-native';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { Picker } from '@react-native-picker/picker';
// import * as ImagePicker from 'expo-image-picker';
// import { useNavigation } from '@react-navigation/native';
// import { ID, Query } from 'appwrite';
// import { config, databases, storage } from '../lib/appwrite';
// import { CheckBox } from 'react-native-elements';
// import { Ionicons } from '@expo/vector-icons';

// // Define enum types
// const PACKAGE_TYPES = ['Hotel', 'Resort', 'Villa', 'Apartment'];
// const FACILITIES = ['WiFi', 'Parking', 'Pool', 'Gym', 'Restaurant', 'Beach Access', 'Spa', 'Room Service'];
// const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Family', 'Presidential'];

// const CreatePackageScreen = () => {
//   const navigation = useNavigation();

//   // Form state
//   const [packageData, setPackageData] = useState({
//     name: '',
//     type: PACKAGE_TYPES[0],
//     description: '',
//     price: '',
//     bedrooms: '',
//     bathrooms: '',
//     rating: '5.0',
//     facilities: [],
//     image: '',
//     geolocation: '',
//     allInclusive: false,
//     roomType: ROOM_TYPES[0],
//     departingFrom: '',
//     arrivingTo: '',
//     returningFrom: '',
//     returningTo: '',
//     departingTime: '',
//     arrivingToTime: '',
//     returningFromTime: '',
//     returningToTime: '',
//   });

//   // Date state
//   const [departureDate, setDepartureDate] = useState(new Date());
//   const [returnDate, setReturnDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 1 week later
//   const [showDeparturePicker, setShowDeparturePicker] = useState(false);
//   const [showReturnPicker, setShowReturnPicker] = useState(false);

//   // Image upload state
//   const [uploading, setUploading] = useState(false);
//   const [imagePreview, setImagePreview] = useState(null);

//   // Loading state
//   const [loading, setLoading] = useState(false);

//   // Agents state
//   const [agents, setAgents] = useState([]);
//   const [selectedAgentId, setSelectedAgentId] = useState('');

//   // Get agents for the dropdown
//   useEffect(() => {
//     fetchAgents();
//   }, []);

//   const fetchAgents = async () => {
//     try {
//       const response = await databases.listDocuments(
//         config.databaseId!,
//         config.agentsCollectionId!
//       );
//       setAgents(response.documents);
//       if (response.documents.length > 0) {
//         setSelectedAgentId(response.documents[0].$id);
//       }
//     } catch (error) {
//       console.error('Error fetching agents:', error);
//       Alert.alert('Error', 'Failed to load agents');
//     }
//   };

//   // Handle field changes
//   const handleChange = (name: string, value: string | boolean) => {
//     setPackageData({ ...packageData, [name]: value });
//   };

//   // Toggle facility selection
//   const toggleFacility = (facility: string) => {
//     if (packageData.facilities.includes(facility)) {
//       setPackageData({
//         ...packageData,
//         facilities: packageData.facilities.filter(f => f !== facility)
//       });
//     } else {
//       setPackageData({
//         ...packageData,
//         facilities: [...packageData.facilities, facility]
//       });
//     }
//   };

//   // Date picker handlers
//   const onDepartureDateChange = (event: any, selectedDate: Date) => {
//     const currentDate = selectedDate || departureDate;
//     setShowDeparturePicker(Platform.OS === 'ios');
//     setDepartureDate(currentDate);
//   };

//   const onReturnDateChange = (event: any, selectedDate: Date) => {
//     const currentDate = selectedDate || returnDate;
//     setShowReturnPicker(Platform.OS === 'ios');
//     setReturnDate(currentDate);
//   };

//   // Image picker
//   const pickImage = async () => {
//     try {
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         aspect: [16, 9],
//         quality: 0.8,
//       });

//       if (!result.canceled) {
//         setImagePreview(result.assets[0].uri);
//       }
//     } catch (error) {
//       console.error('Error picking image:', error);
//       Alert.alert('Error', 'Failed to select image');
//     }
//   };

//   // Upload image to Appwrite storage
//   const uploadImage = async () => {
//     if (!imagePreview) return null;

//     try {
//       setUploading(true);

//       // For Expo, we need to first get the blob from the URI
//       const response = await fetch(imagePreview);
//       const blob = await response.blob();

//       // Create a File object from the blob
//       const file = new File([blob], `package_${Date.now()}.jpg`, { type: 'image/jpeg' });

//       // Upload to Appwrite Storage
//       const uploadResult = await storage.createFile(
//         config.storageId,
//         ID.unique(),
//         file
//       );

//       // Get file preview URL
//       const fileUrl = storage.getFileView(
//         config.storageId,
//         uploadResult.$id
//       );

//       setUploading(false);
//       return fileUrl;
//     } catch (error) {
//       setUploading(false);
//       console.error('Error uploading image:', error);
//       Alert.alert('Error', 'Failed to upload image');
//       return null;
//     }
//   };

//   // Create package in database
//   const createPackage = async () => {
//     // Validate form
//     const requiredFields = ['name', 'type', 'description', 'price', 'bedrooms', 'bathrooms', 'rating', 'geolocation'];
//     for (const field of requiredFields) {
//       if (!packageData[field]) {
//         Alert.alert('Error', `${field} is required`);
//         return;
//       }
//     }

//     if (!imagePreview) {
//       Alert.alert('Error', 'Please select an image');
//       return;
//     }

//     if (!selectedAgentId) {
//       Alert.alert('Error', 'Please select an agent');
//       return;
//     }

//     setLoading(true);

//     try {
//       // Upload image
//       const imageUrl = await uploadImage();
//       if (!imageUrl) {
//         setLoading(false);
//         return;
//       }

//       // Create package document
//       const packageId = ID.unique();
//       await database.createDocument(
//         config.databaseId,
//         config.packageCollectionId,
//         packageId,
//         {
//           name: packageData.name,
//           type: packageData.type,
//           description: packageData.description,
//           price: parseInt(packageData.price),
//           bedrooms: parseInt(packageData.bedrooms),
//           bathrooms: parseInt(packageData.bathrooms),
//           rating: parseFloat(packageData.rating),
//           facilities: packageData.facilities,
//           image: imageUrl,
//           geolocation: packageData.geolocation,
//           agent: selectedAgentId,
//           allinclusive: packageData.allInclusive,
//           'room-type': packageData.roomType,
//           departureDate: departureDate.toISOString(),
//           returnDate: returnDate.toISOString(),
//           'departing-from': packageData.departingFrom,
//           'arriving-to': packageData.arrivingTo,
//           'returning-from': packageData.returningFrom,
//           'returning-to': packageData.returningTo,
//           'departing-time': packageData.departingTime,
//           'arriving-to-time': packageData.arrivingToTime,
//           'returning-from-time': packageData.returningFromTime,
//           'returning-to-time': packageData.returningToTime,
//         }
//       );

//       setLoading(false);
//       Alert.alert('Success', 'Package created successfully', [
//         { text: 'OK', onPress: () => navigation.goBack() }
//       ]);
//     } catch (error) {
//       setLoading(false);
//       console.error('Error creating package:', error);
//       Alert.alert('Error', 'Failed to create package');
//     }
//   };

//   const updatePackage = async (packageId: any) => {
//     setLoading(true);

//     try {
//       let imageUrl = packageData.image;

//       // Upload new image if selected
//       if (imagePreview && !imagePreview.startsWith('http')) {
//         imageUrl = await uploadImage();
//         if (!imageUrl) {
//           setLoading(false);
//           return;
//         }
//       }

//       // Update package document
//       await databases.updateDocument(
//         config.databaseId!,
//         config.packageImagesId!,
//         packageId,
//         {
//           name: packageData.name,
//           type: packageData.type,
//           description: packageData.description,
//           price: parseInt(packageData.price),
//           bedrooms: parseInt(packageData.bedrooms),
//           bathrooms: parseInt(packageData.bathrooms),
//           rating: parseFloat(packageData.rating),
//           facilities: packageData.facilities,
//           image: imageUrl,
//           geolocation: packageData.geolocation,
//           agent: selectedAgentId,
//           allinclusive: packageData.allInclusive,
//           'room-type': packageData.roomType,
//           departureDate: departureDate.toISOString(),
//           returnDate: returnDate.toISOString(),
//           'departing-from': packageData.departingFrom,
//           'arriving-to': packageData.arrivingTo,
//           'returning-from': packageData.returningFrom,
//           'returning-to': packageData.returningTo,
//           'departing-time': packageData.departingTime,
//           'arriving-to-time': packageData.arrivingToTime,
//           'returning-from-time': packageData.returningFromTime,
//           'returning-to-time': packageData.returningToTime,
//         }
//       );

//       setLoading(false);
//       Alert.alert('Success', 'Package updated successfully', [
//         { text: 'OK', onPress: () => navigation.goBack() }
//       ]);
//     } catch (error) {
//       setLoading(false);
//       console.error('Error updating package:', error);
//       Alert.alert('Error', 'Failed to update package');
//     }
//   };

//   // Fetch package data for editing
//   const fetchPackage = async (packageId: any) => {
//     try {
//       const response = await databases.getDocument(
//         config.databaseId!,
//         config.packageImagesId!,
//         packageId
//       );

//       // Set form data from response
//       setPackageData({
//         name: response.name,
//         type: response.type,
//         description: response.description,
//         price: response.price.toString(),
//         bedrooms: response.bedrooms.toString(),
//         bathrooms: response.bathrooms.toString(),
//         rating: response.rating.toString(),
//         facilities: response.facilities || [],
//         image: response.image,
//         geolocation: response.geolocation,
//         allInclusive: response.allinclusive || false,
//         roomType: response['room-type'] || ROOM_TYPES[0],
//         departingFrom: response['departing-from'] || '',
//         arrivingTo: response['arriving-to'] || '',
//         returningFrom: response['returning-from'] || '',
//         returningTo: response['returning-to'] || '',
//         departingTime: response['departing-time'] || '',
//         arrivingToTime: response['arriving-to-time'] || '',
//         returningFromTime: response['returning-from-time'] || '',
//         returningToTime: response['returning-to-time'] || '',
//       });

//       setSelectedAgentId(response.agent);
//       setImagePreview(response.image);

//       if (response.departureDate) {
//         setDepartureDate(new Date(response.departureDate));
//       }

//       if (response.returnDate) {
//         setReturnDate(new Date(response.returnDate));
//       }
//     } catch (error) {
//       console.error('Error fetching package:', error);
//       Alert.alert('Error', 'Failed to load package data');
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       style={styles.container}
//     >
//       <ScrollView style={styles.scrollView}>
//         <View style={styles.header}>
//           <Text style={styles.headerText}>Create New Package</Text>
//         </View>

//         {/* Basic Info Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Basic Information</Text>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Package Name*</Text>
//             <TextInput
//               style={styles.input}
//               value={packageData.name}
//               onChangeText={(text) => handleChange('name', text)}
//               placeholder="Enter package name"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Package Type*</Text>
//             <View style={styles.pickerContainer}>
//               <Picker
//                 selectedValue={packageData.type}
//                 onValueChange={(value) => handleChange('type', value)}
//                 style={styles.picker}
//               >
//                 {PACKAGE_TYPES.map((type) => (
//                   <Picker.Item key={type} label={type} value={type} />
//                 ))}
//               </Picker>
//             </View>
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Description*</Text>
//             <TextInput
//               style={[styles.input, styles.textArea]}
//               value={packageData.description}
//               onChangeText={(text) => handleChange('description', text)}
//               placeholder="Enter package description"
//               multiline
//               numberOfLines={4}
//             />
//           </View>

//           <View style={styles.rowContainer}>
//             <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
//               <Text style={styles.label}>Price*</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.price}
//                 onChangeText={(text) => handleChange('price', text.replace(/[^0-9]/g, ''))}
//                 placeholder="Price"
//                 keyboardType="numeric"
//               />
//             </View>

//             <View style={[styles.inputGroup, { flex: 1 }]}>
//               <Text style={styles.label}>Rating*</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.rating}
//                 onChangeText={(text) => {
//                   const value = parseFloat(text);
//                   if (!isNaN(value) && value >= 0 && value <= 5) {
//                     handleChange('rating', text);
//                   }
//                 }}
//                 placeholder="Rating (0-5)"
//                 keyboardType="numeric"
//               />
//             </View>
//           </View>

//           <View style={styles.rowContainer}>
//             <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
//               <Text style={styles.label}>Bedrooms*</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.bedrooms}
//                 onChangeText={(text) => handleChange('bedrooms', text.replace(/[^0-9]/g, ''))}
//                 placeholder="Bedrooms"
//                 keyboardType="numeric"
//               />
//             </View>

//             <View style={[styles.inputGroup, { flex: 1 }]}>
//               <Text style={styles.label}>Bathrooms*</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.bathrooms}
//                 onChangeText={(text) => handleChange('bathrooms', text.replace(/[^0-9]/g, ''))}
//                 placeholder="Bathrooms"
//                 keyboardType="numeric"
//               />
//             </View>
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Room Type</Text>
//             <View style={styles.pickerContainer}>
//               <Picker
//                 selectedValue={packageData.roomType}
//                 onValueChange={(value) => handleChange('roomType', value)}
//                 style={styles.picker}
//               >
//                 {ROOM_TYPES.map((type) => (
//                   <Picker.Item key={type} label={type} value={type} />
//                 ))}
//               </Picker>
//             </View>
//           </View>

//           <View style={styles.checkboxContainer}>
//             <CheckBox
//               title="All Inclusive"
//               checked={packageData.allInclusive}
//               onPress={() => handleChange('allInclusive', !packageData.allInclusive)}
//             />
//           </View>
//         </View>

//         {/* Travel Details Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Travel Details</Text>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Departing From</Text>
//             <TextInput
//               style={styles.input}
//               value={packageData.departingFrom}
//               onChangeText={(text) => handleChange('departingFrom', text)}
//               placeholder="Departure location"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Arriving To</Text>
//             <TextInput
//               style={styles.input}
//               value={packageData.arrivingTo}
//               onChangeText={(text) => handleChange('arrivingTo', text)}
//               placeholder="Arrival location"
//             />
//           </View>

//           <View style={styles.rowContainer}>
//             <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
//               <Text style={styles.label}>Departing Time</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.departingTime}
//                 onChangeText={(text) => handleChange('departingTime', text)}
//                 placeholder="e.g. 09:00 AM"
//               />
//             </View>

//             <View style={[styles.inputGroup, { flex: 1 }]}>
//               <Text style={styles.label}>Arriving Time</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.arrivingToTime}
//                 onChangeText={(text) => handleChange('arrivingToTime', text)}
//                 placeholder="e.g. 12:00 PM"
//               />
//             </View>
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Returning From</Text>
//             <TextInput
//               style={styles.input}
//               value={packageData.returningFrom}
//               onChangeText={(text) => handleChange('returningFrom', text)}
//               placeholder="Return departure location"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Returning To</Text>
//             <TextInput
//               style={styles.input}
//               value={packageData.returningTo}
//               onChangeText={(text) => handleChange('returningTo', text)}
//               placeholder="Return arrival location"
//             />
//           </View>

//           <View style={styles.rowContainer}>
//             <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
//               <Text style={styles.label}>Return Departure Time</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.returningFromTime}
//                 onChangeText={(text) => handleChange('returningFromTime', text)}
//                 placeholder="e.g. 10:00 AM"
//               />
//             </View>

//             <View style={[styles.inputGroup, { flex: 1 }]}>
//               <Text style={styles.label}>Return Arrival Time</Text>
//               <TextInput
//                 style={styles.input}
//                 value={packageData.returningToTime}
//                 onChangeText={(text) => handleChange('returningToTime', text)}
//                 placeholder="e.g. 01:00 PM"
//               />
//             </View>
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Departure Date</Text>
//             <TouchableOpacity
//               style={styles.dateButton}
//               onPress={() => setShowDeparturePicker(true)}
//             >
//               <Text>{departureDate.toDateString()}</Text>
//               <Ionicons name="calendar-outline" size={24} color="gray" />
//             </TouchableOpacity>
//             {showDeparturePicker && (
//               <DateTimePicker
//                 value={departureDate}
//                 mode="date"
//                 display="default"
//                 onChange={onDepartureDateChange}
//                 minimumDate={new Date()}
//               />
//             )}
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Return Date</Text>
//             <TouchableOpacity
//               style={styles.dateButton}
//               onPress={() => setShowReturnPicker(true)}
//             >
//               <Text>{returnDate.toDateString()}</Text>
//               <Ionicons name="calendar-outline" size={24} color="gray" />
//             </TouchableOpacity>
//             {showReturnPicker && (
//               <DateTimePicker
//                 value={returnDate}
//                 mode="date"
//                 display="default"
//                 onChange={onReturnDateChange}
//                 minimumDate={departureDate}
//               />
//             )}
//           </View>
//         </View>

//         {/* Facilities Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Facilities</Text>
//           <View style={styles.facilitiesContainer}>
//             {FACILITIES.map((facility) => (
//               <TouchableOpacity
//                 key={facility}
//                 style={[
//                   styles.facilityChip,
//                   packageData.facilities.includes(facility) && styles.facilityChipSelected
//                 ]}
//                 onPress={() => toggleFacility(facility)}
//               >
//                 <Text
//                   style={[
//                     styles.facilityChipText,
//                     packageData.facilities.includes(facility) && styles.facilityChipTextSelected
//                   ]}
//                 >
//                   {facility}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {/* Location and Image Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Location and Image</Text>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Geolocation*</Text>
//             <TextInput
//               style={styles.input}
//               value={packageData.geolocation}
//               onChangeText={(text) => handleChange('geolocation', text)}
//               placeholder="Enter geolocation (e.g. latitude,longitude)"
//             />
//           </View>

//           <View style={styles.inputGroup}>
//             <Text style={styles.label}>Main Image*</Text>
//             <TouchableOpacity
//               style={styles.imagePickerButton}
//               onPress={pickImage}
//               disabled={uploading}
//             >
//               <Text style={styles.imagePickerText}>
//                 {imagePreview ? 'Change Image' : 'Choose Image'}
//               </Text>
//               <Ionicons name="image-outline" size={24} color="white" />
//             </TouchableOpacity>
//             {imagePreview && (
//               <Image
//                 source={{ uri: imagePreview }}
//                 style={styles.imagePreview}
//               />
//             )}
//           </View>
//         </View>

//         {/* Assign Agent Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Assign Agent</Text>
//           <View style={styles.pickerContainer}>
//             <Picker
//               selectedValue={selectedAgentId}
//               onValueChange={(value) => setSelectedAgentId(value)}
//               style={styles.picker}
//             >
//               {agents.map((agent) => (
//                 <Picker.Item key={agent.$id} label={agent.name} value={agent.$id} />
//               ))}
//             </Picker>
//           </View>
//         </View>

//         {/* Submit Button */}
//         <TouchableOpacity
//           style={[styles.submitButton, (loading || uploading) && styles.disabledButton]}
//           onPress={createPackage}
//           disabled={loading || uploading}
//         >
//           <Text style={styles.submitButtonText}>
//             {loading || uploading ? 'Processing...' : 'Create Package'}
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   scrollView: {
//     padding: 16,
//   },
//   header: {
//     marginBottom: 20,
//   },
//   headerText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   section: {
//     backgroundColor: 'white',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.2,
//     shadowRadius: 1.41,
//     elevation: 2,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 16,
//     color: '#333',
//   },
//   inputGroup: {
//     marginBottom: 16,
//   },
//   label: {
//     fontSize: 14,
//     marginBottom: 8,
//     color: '#555',
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 4,
//     padding: 10,
//     fontSize: 16,
//   },
//   textArea: {
//     height: 100,
//     textAlignVertical: 'top',
//   },
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 4,
//     overflow: 'hidden',
//   },
//   picker: {
//     height: 50,
//   },
//   rowContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   facilitiesContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginTop: 8,
//   },
//   facilityChip: {
//     backgroundColor: '#f0f0f0',
//     borderRadius: 20,
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     margin: 4,
//   },
//   facilityChipSelected: {
//     backgroundColor: '#007bff',
//   },
//   facilityChipText: {
//     color: '#555',
//   },
//   facilityChipTextSelected: {
//     color: 'white',
//   },
//   checkboxContainer: {
//     backgroundColor: 'transparent',
//     borderWidth: 0,
//     padding: 0,
//     marginLeft: -10,
//   },
//   dateButton: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 4,
//     padding: 10,
//   },
//   imagePickerButton: {
//     backgroundColor: '#007bff',
//     borderRadius: 4,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 12,
//     marginBottom: 12,
//   },
//   imagePickerText: {
//     color: 'white',
//     fontWeight: 'bold',
//     marginRight: 8,
//   },
//   imagePreview: {
//     width: '100%',
//     height: 200,
//     borderRadius: 4,
//     marginBottom: 8,
//   },
//   submitButton: {
//     backgroundColor: '#28a745',
//     borderRadius: 4,
//     padding: 16,
//     alignItems: 'center',
//     marginVertical: 16,
//   },
//   submitButtonText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   disabledButton: {
//     backgroundColor: '#93c5a0',
//   },
// });

// export default CreatePackageScreen;
