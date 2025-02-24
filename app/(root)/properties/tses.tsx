// import React, { useState } from "react";
// import { View, Text, TextInput, Button, Image, TouchableOpacity, Alert } from "react-native";
// import * as ImagePicker from "expo-image-picker";
// import { Client, Databases, Storage, ID } from "appwrite";

// const client = new Client()
//   .setEndpoint("https://cloud.appwrite.io/v1") // Replace with your Appwrite endpoint
//   .setProject("YOUR_PROJECT_ID"); // Replace with your project ID

// const databases = new Databases(client);
// const storage = new Storage(client);

// const CreatePackageScreen = () => {
//   const [description, setDescription] = useState("");
//   const [price, setPrice] = useState("");
//   const [image, setImage] = useState(null);
//   const [departureInfo, setDepartureInfo] = useState({ from: "", time: "" });
//   const [arrivalInfo, setArrivalInfo] = useState({ to: "", time: "" });
//   const [returnTime, setReturnTime] = useState("");

//   const pickImage = async () => {
//     let result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true,
//       quality: 1,
//     });
//     if (!result.canceled) {
//       setImage(result.uri);
//     }
//   };

//   const uploadImage = async (imageUri) => {
//     try {
//       const response = await fetch(imageUri);
//       const blob = await response.blob();
//       const file = await storage.createFile("YOUR_BUCKET_ID", ID.unique(), blob);
//       return file.$id;
//     } catch (error) {
//       console.error("Image upload failed:", error);
//       return null;
//     }
//   };

//   const handleSubmit = async () => {
//     try {
//       let imageId = "";
//       if (image) {
//         imageId = await uploadImage(image);
//         if (!imageId) throw new Error("Image upload failed");
//       }

//       const flightInfo = await databases.createDocument(
//         "YOUR_DATABASE_ID",
//         "flight-info",
//         ID.unique(),
//         {
//           departure_from: departureInfo.from,
//           departure_time: departureInfo.time,
//           arrival_to: arrivalInfo.to,
//           arrival_time: arrivalInfo.time,
//           return_time: returnTime,
//         }
//       );

//       await databases.createDocument("YOUR_DATABASE_ID", "package-info", ID.unique(), {
//         description,
//         price: parseInt(price),
//         image: imageId,
//         flight_info: flightInfo.$id,
//       });

//       Alert.alert("Success", "Package listing created successfully!");
//     } catch (error) {
//       console.error("Failed to create package:", error);
//       Alert.alert("Error", "Failed to create package listing.");
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text>Description:</Text>
//       <TextInput value={description} onChangeText={setDescription} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <Text>Price:</Text>
//       <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <Text>Departure From:</Text>
//       <TextInput value={departureInfo.from} onChangeText={(text) => setDepartureInfo({ ...departureInfo, from: text })} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <Text>Departure Time:</Text>
//       <TextInput value={departureInfo.time} onChangeText={(text) => setDepartureInfo({ ...departureInfo, time: text })} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <Text>Arrival To:</Text>
//       <TextInput value={arrivalInfo.to} onChangeText={(text) => setArrivalInfo({ ...arrivalInfo, to: text })} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <Text>Arrival Time:</Text>
//       <TextInput value={arrivalInfo.time} onChangeText={(text) => setArrivalInfo({ ...arrivalInfo, time: text })} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <Text>Return Time:</Text>
//       <TextInput value={returnTime} onChangeText={setReturnTime} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

//       <TouchableOpacity onPress={pickImage} style={{ marginBottom: 10 }}>
//         <Text>Pick an Image</Text>
//       </TouchableOpacity>
//       {image && <Image source={{ uri: image }} style={{ width: 100, height: 100, marginBottom: 10 }} />}

//       <Button title="Submit" onPress={handleSubmit} />
//     </View>
//   );
// };

// export default CreatePackageScreen;
