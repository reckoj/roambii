// Add this helper function at the top of your file
const formatDateTime = (
  dateTimeString: string | number | Date,
  isTime = false
) => {
  if (!dateTimeString) return isTime ? "Not specified" : "Not specified";

  try {
    const date = new Date(dateTimeString);

    if (isNaN(date.getTime())) {
      return isTime ? "Not specified" : "Not specified";
    }

    if (isTime) {
      // Format just the time
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      // Format just the date
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch (error) {
    console.error("Error formatting date/time:", error);
    return isTime ? "Not specified" : "Not specified";
  }
};

import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Earth,
  MessageCircle,
  WholeWord,
} from "lucide-react-native";
import { useSelector, useDispatch } from "react-redux";

import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";
import { amenities } from "@/constants/data";
import CustomHeader from "@/components/HeaderComponent";
import FlightInfo from "@/components/FlightInfo";

// Import Firebase specific functions and Redux
import { getPackageById, getAgentById } from "@/lib/package-service";
import { getChatRoomId } from "@/lib/chat-service";
import { RootState, AppDispatch } from "@/lib/redux/store/store";
import { fetchPackageByIdAsync } from "@/lib/redux/slices/packageSlice";
import React from "react";

const Property = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const packageId = id || "";
  const windowHeight = Dimensions.get("window").height;
  const dispatch = useDispatch<AppDispatch>();

  // Get data from Redux store
  const { currentPackage: property, loading } = useSelector(
    (state: RootState) => state.packages
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [agent, setAgent] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);

  // Fetch property data on component mount
  useEffect(() => {
    if (packageId) {
      dispatch(fetchPackageByIdAsync(packageId));
    }
  }, [dispatch, packageId]);

  // Fetch agent data when property is loaded
  useEffect(() => {
    const fetchAgent = async () => {
      if (property?.agent?.id) {
        try {
          setLoadingAgent(true);
          const agentData = await getAgentById(property.agent.id);
          if (agentData) {
            setAgent(agentData);
          }
        } catch (error) {
          console.error("Error fetching agent data:", error);
        } finally {
          setLoadingAgent(false);
        }
      }
    };

    if (property) {
      fetchAgent();
    }
  }, [property]);

  const handleContact = async () => {
    if (!property?.agent?.id || !user?.id) {
      Alert.alert("Error", "Cannot start chat. Missing user or agent data.");
      return;
    }

    try {
      // Generate a consistent room ID
      const room_id = getChatRoomId(user.id, property.agent.id);

      router.push({
        pathname: "/chatScreen",
        params: {
          room_id,
          user: user.id,
          agentId: property.agent.id,
          avatar: property.agent.avatar || "",
        },
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start chat.");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text className="mt-4 text-gray-600">Loading property details...</Text>
      </View>
    );
  }

  // Show error if property not found
  if (!property) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-xl font-rubik-bold text-black-300">
          Property not found
        </Text>
        <TouchableOpacity
          className="mt-4 bg-primary-300 py-2 px-4 rounded-md"
          onPress={() => router.back()}
        >
          <Text className="text-white font-rubik-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-transparent">
      <CustomHeader title="" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 bg-white"
      >
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          <Image
            source={{ uri: property.image }}
            className="size-full"
            resizeMode="cover"
          />
          <Image
            source={images.whiteGradient}
            className="absolute top-0 w-full z-40"
          />
        </View>

        <View className="px-5 mt-7 flex gap-2">
          <View className="flex flex-row items-center justify-between space-x-2 pb-6">
            <Text className="text-2xl font-rubik-extrabold">
              {property.name}
            </Text>

            <Pressable
              className="flex flex-row  "
              onPress={() => {
                Alert.alert(
                  "You’re Leaving the App",
                  "You’re about to open an external website. Continue?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Continue",
                      onPress: () => Linking.openURL(`${property.stayLink}`),
                      style: "destructive",
                    },
                  ],
                  { cancelable: true }
                );
              }}
            >
              <Earth color={"#1ABC9C"} size={18} />
              <Text className="text-sm font-rubik-extrabold ml-2 text-black-100">
                {property.stayLink}
              </Text>
            </Pressable>
          </View>

          <View className="flex flex-row items-center justify-between gap-3">
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property.type}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <Image source={icons.star} className="size-5" />
              <Text className="text-black-200 text-sm mt-1 font-rubik-medium">
                {property.rating || 4.5}
                reviews
              </Text>
            </View>

            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property.allinclusive ? "All Inclusive" : "Standard"}
              </Text>
            </View>
          </View>

          <View className="flex flex-row justify-between mt-5">
            <View className="flex flex-row items-center">
              <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
                <Image source={icons.bed} className="size-4" />
              </View>
              <Text className="text-black-300 text-lg font-rubik-medium ml-2">
                {property.bedrooms || 1} King Bed
              </Text>
            </View>

            <View className="flex flex-row items-center">
              <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
                <Image source={icons.area} className="size-4" />
              </View>
              <Text className="text-black-300 text-lg font-rubik-medium ml-2">
                {property.roomType || "Standard Room"}
              </Text>
            </View>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Amenities
            </Text>

            {property.amenities && property.amenities.length > 0 && (
              <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                {property.amenities.map((item: string, index: number) => {
                  const amenity = amenities.find(
                    (amenity) => amenity.title === item
                  );

                  return (
                    <View
                      key={index}
                      className="flex flex-1 flex-col items-center min-w-16 max-w-20"
                    >
                      <View className="size-14 bg-primary-100 rounded-full flex items-center justify-center">
                        <Image
                          source={amenity ? amenity.icon : icons.info}
                          className="size-6"
                        />
                      </View>

                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-black-300 text-sm text-center font-rubik mt-1.5"
                      >
                        {item}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View className="mt-2">
            <View className="flex-row flex-wrap mt-3 justify-between">
              <View
                className="flex-col bg-primary-100 p-4 rounded-xl mb-3"
                style={{ width: "48%" }}
              >
                <Text className="text-black-200 text-xs font-rubik-medium">
                  Check-in Date
                </Text>
                <Text className="text-black-300 text-base font-rubik-bold mt-1">
                  {formatDateTime(property.checkInDate!)}
                </Text>
              </View>

              <View
                className="flex-col bg-primary-100 p-4 rounded-xl mb-3"
                style={{ width: "48%" }}
              >
                <Text className="text-black-200 text-xs font-rubik-medium">
                  Check-out Date
                </Text>
                <Text className="text-black-300 text-base font-rubik-bold mt-1">
                  {formatDateTime(property.checkOutDate!)}
                </Text>
              </View>

              <View
                className="flex-col bg-primary-100 p-4 rounded-xl mb-3"
                style={{ width: "48%" }}
              >
                <Text className="text-black-200 text-xs font-rubik-medium">
                  Check-in Time
                </Text>
                <Text className="text-black-300 text-base font-rubik-bold mt-1">
                  {formatDateTime(property.checkInTime!, true) || "2:00 PM"}
                </Text>
              </View>

              <View
                className="flex-col bg-primary-100 p-4 rounded-xl mb-3"
                style={{ width: "48%" }}
              >
                <Text className="text-black-200 text-xs font-rubik-medium">
                  Check-out Time
                </Text>
                <Text className="text-black-300 text-base font-rubik-bold mt-1">
                  {formatDateTime(property.checkOutTime!, true) || "11:00 AM"}
                </Text>
              </View>

              <View
                className="flex-col bg-primary-100 p-4 rounded-xl"
                style={{ width: "100%" }}
              >
                <Text className="text-black-200 text-xs font-rubik-medium">
                  Number of Guests
                </Text>
                <Text className="text-black-300 text-base font-rubik-bold mt-1">
                  {property.guestCount || 2}{" "}
                  {property.guestCount === 1 ? "Guest" : "Guests"}
                </Text>
              </View>
            </View>
          </View>

          <View className="w-full border-t border-accent-100 pt-7 mt-5">
            <View className="flex flex-row items-center justify-between mt-4">
              <View className="flex flex-row items-center">
                {loadingAgent ? (
                  <ActivityIndicator size="small" color="#1ABC9C" />
                ) : (
                  <>
                    <Image
                      source={{
                        uri:
                          property.agent.avatar ||
                          "https://via.placeholder.com/56",
                      }}
                      className="size-14 rounded-full"
                    />

                    <View className="flex flex-col items-start justify-center ml-3">
                      <Text className="text-lg text-black-300 text-start font-rubik-bold">
                        {property.agent.name}
                      </Text>
                      <Text className="text-sm text-black-200 text-start font-rubik-medium">
                        {agent?.email || "Contact agent"}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                onPress={handleContact}
                className="flex flex-row items-center gap-3"
              >
                <MessageCircle color={"#1ABC9C"} />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Overview
            </Text>
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="font-rubik-light text-text"
            >
              {property.description}
            </Text>

            {/* Toggle Button */}
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text className="font-rubik-light text-primary-200">
                {expanded ? "See Less" : "Read More"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* {property.reviews && property.reviews.length > 0 && (
            <View className="mt-7">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center">
                  <Image source={icons.star} className="size-6" />
                  <Text className="text-black-300 text-xl font-rubik-bold ml-2">
                    {property.rating}  reviews)
                  </Text>
                </View>

                <TouchableOpacity>
                  <Text className="text-primary-300 text-base font-rubik-bold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-5">
                <Comment item={property.reviews[0]} />
              </View>
            </View>
          )} */}
        </View>
      </ScrollView>

      <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-accent-200 p-7">
        <View className="flex flex-row items-center justify-between gap-10">
          <View className="flex flex-col items-start">
            <Text className="text-black-200 text-xs font-rubik-medium">
              Price
            </Text>
            <Text
              numberOfLines={1}
              className="text-primary-300 text-start text-2xl font-rubik-bold"
            >
              ${property.price}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/bookingScreen",
                params: {
                  id: property.id,
                },
              })
            }
            className="flex-1 flex flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400"
          >
            <Text className="text-white text-lg text-center font-rubik-bold">
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Property;
