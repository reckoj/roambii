import icons from "@/constants/icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Models } from "react-native-appwrite";
import { storage, config } from "@/lib/appwrite";
import images from "@/constants/images";

interface Props {
  item: Models.Document;
  onPress?: () => void;
}
const getPublicImageUrl = (fileId: string): string => {
  if (!fileId) {
    console.log("======>>>> file id ", fileId);
  }
  return storage.getFilePreview(config.imagesBuket!, fileId).toString(); // ✅ Ensure valid URL
};

const fixImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return "https://via.placeholder.com/150"; // ✅ Fallback for missing images

  if (imageUrl.includes("/files/https://")) {
    imageUrl = imageUrl.split("/files/https://")[1]; // ✅ Extract correct URL
    imageUrl = "https://" + imageUrl; // ✅ Ensure it starts with https://
  }

  return imageUrl;
};

export const FeaturedCard = ({ item, onPress }: Props) => {
  // const imageUrl = getPublicImageUrl(item.image); // ✅ Convert ID to Image URL
  const imageUrl = fixImageUrl(item.image); // ✅ Ensure correct image URL

  console.log("[Final Image URL Used] ==> ", imageUrl); // ✅ Debugging output
  console.log("[Stored Package Data] ==> ", item);
  console.log("[Stored Image ID] ==> ", item.image);
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex flex-col items-start w-60 h-80 relative"
    >
      <Image source={images.jamaica} className="size-full rounded-2xl" />

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
  const imageUrl = getPublicImageUrl(item.image); // ✅ Convert ID to Image URL

  console.log("[Final Image URL Used] ==> ", imageUrl); // ✅ Debugging output
  return (
    <TouchableOpacity
      className="flex-1 w-full mt-4 px-3 py-4 rounded-lg border border-gray-200 shadow-lg shadow-black-100/70 relative"
      onPress={onPress}
    >
      <View className="flex flex-row items-center absolute px-2 top-5 right-5 bg-white/90 p-1 rounded-full z-50">
        <Image source={icons.star} className="size-2.5" />
        <Text className="text-xs font-rubik-bold text-primary-300 ml-0.5">
          {item.rating}
        </Text>
      </View>

      <Image source={images.bahamas} className="w-full h-40 rounded-lg" />

      <View className="flex flex-col mt-2">
        <Text className="text-base font-rubik-bold text-black-300">
          {item.name}
        </Text>
        <Text className="text-xs font-rubik text-black-100">
          {item.address}
        </Text>

        <View className="flex flex-row items-center justify-between mt-2">
          <Text className="text-base font-rubik-bold text-primary-300">
            ${item.price}
          </Text>
          <Image
            source={icons.heart}
            className="w-5 h-5 mr-2"
            tintColor="#191D31"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};
