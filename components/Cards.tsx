import icons from "@/constants/icons";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";

// Firebase document interface to replace Appwrite Models.Document
interface FirebaseDocument {
  id: string;
  [key: string]: any;
};
import { storage } from "@/lib/firebase/firebase-config";
import images from "@/constants/images";

interface Props {
  item: FirebaseDocument;
  onPress?: () => void;
}

export const FeaturedCard = ({ item, onPress }: Props) => {
  // const imageUrl = getPublicImageUrl(item.image); // ✅ Convert ID to Image URL
  // const imageUrl = fixImageUrl(item.image); // ✅ Ensure correct image URL

  console.log("[Final Image URL Used] ==> "); // ✅ Debugging output
  console.log("[Stored Package Data] ==> ", item);
  console.log("[Stored Image ID] ==> ", item.image);
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex flex-col items-start w-60 h-80 relative  rounded-lg border border-gray-200 shadow-lg shadow-black-100/70  bg-white/55"
    >
      <Image source={{ uri: item.image }} className="size-full rounded-2xl" />

      {/* <Image
        source={images.bahamas}
        className="size-full rounded-2xl absolute bottom-0"
      /> */}

      {/* <View className="flex flex-row items-center bg-white/90 px-3 py-1.5 rounded-full absolute top-5 right-5">
        <Image source={icons.star} className="size-3.5" />
        <Text className="text-xs font-rubik-bold text-primary-300 ml-1">
          {item.rating}
        </Text>
      </View> */}

      <View className="flex flex-col items-start absolute bottom-5 inset-x-5">
        <Text
          className="text-xl font-rubik-extrabold text-white"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-base font-rubik text-white" numberOfLines={1}>
          {item.address}
        </Text>

        <View className="flex flex-row items-center justify-between p-1 rounded-xl  bg-white">
          <Text className="text-lg font-rubik-extrabold text-text">
            ${item.price}
          </Text>
          {/* <Image source={icons.heart} className="size-5" /> */}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const Card = ({ item, onPress }: Props) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.cardImage} 
      />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardType} numberOfLines={1}>
          {item.type}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            ${item.price}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: "100%",
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
  },
  cardContent: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  cardType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1ABC9C",
  },
});
