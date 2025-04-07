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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";
import { amenities } from "@/constants/data";

import { useAppwrite } from "@/lib/useAppwrite";
import { getAgentById, getCurrentUser, getPropertyById } from "@/lib/appwrite";
import FlightInfo from "@/components/FlightInfo";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";

interface AgentProps {
  id: string; // Agent ID
  userId: string; // Current logged-in user ID
}

const Property = () => {
  const params = useLocalSearchParams();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rawUser } = useGlobalContext();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const windowHeight = Dimensions.get("window").height;

  const { data: property } = useAppwrite({
    fn: getPropertyById,
    params: {
      id: id!,
    },
  });
  const [expanded, setExpanded] = useState(false);

  const [agent, setAgent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      if (property?.agent?.$id) {
        try {
          setLoading(true);
          const data = await getAgentById({ id: String(property.agent.$id) });

          if (data) {
            setAgent({
              ...data,
              avatar: data.avatar && data.avatar.startsWith("https"),
            });
          } else {
            console.warn("[No Agent Data Found]");
          }
        } catch (error) {
          console.error("Error fetching agent by ID:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (property?.agent?.$id) {
      fetchAgent();
    }
  }, [property]);

  const handleContact = async () => {
    if (!property?.agent || !rawUser) {
      Alert.alert("Error", "Cannot start chat. Missing user or agent data.");
      return;
    }

    const room_id = `${rawUser.$id}_${property.agent.$id}`;

    try {
      router.push({
        pathname: "/chatScreen",
        params: {
          room_id,
          user: rawUser.$id,
          agentId: property.agent.$id,
          avatar: property.agent.avatar,
        },
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start chat.");
    }
  };

  const formatTime = (timeString: string) => {
    // If the value is empty or undefined
    if (!timeString) return "";

    try {
      // If it's already in a nice format like "2:00 PM", just return it
      if (timeString.includes("AM") || timeString.includes("PM")) {
        return timeString;
      }

      // Handle common time formats
      let hours, minutes, ampm;

      // Check if it's in format HH:MM or HH:MM:SS
      if (timeString.includes(":")) {
        const parts = timeString.split(":");
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);

        // Convert to 12-hour format
        ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        // Format minutes to always have 2 digits
        minutes = minutes < 10 ? "0" + minutes : minutes;

        return `${hours}:${minutes} ${ampm}`;
      }

      // If it's a number (timestamp or hours)
      const num = parseInt(timeString, 10);
      if (!isNaN(num)) {
        // If it looks like hours (0-23)
        if (num >= 0 && num <= 23) {
          hours = num;
          ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${hours}:00 ${ampm}`;
        }
      }

      // If we can't parse it properly, return as is
      return timeString;
    } catch (error) {
      // If any error occurs, return the original string
      return timeString;
    }
  };

  return (
    <View className="flex-1 bg-transparent">
      <CustomHeader title="" />
      <View className="flex flex-row items-center w-full justify-between"></View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 bg-white"
      >
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          <Image
            source={{ uri: property?.image }}
            className="size-full"
            resizeMode="cover"
          />
          <Image
            source={images.whiteGradient}
            className="absolute top-0 w-full z-40"
          />

          <View
            className="z-50 absolute inset-x-7"
            style={{
              top: Platform.OS === "ios" ? 70 : 20,
            }}
          ></View>
        </View>

        <View className="px-5 mt-7 flex gap-2">
          <Text className="text-2xl font-rubik-extrabold">Package Info</Text>
          {/* <Text className="text-xl font-rubik-extrabold">{property?.name}</Text> */}
          <Text className="text-sm font-rubik-extrabold text-black-100">
            {property?.name}
          </Text>
          <View className="flex flex-row items-center justify-between gap-3 ">
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property?.type}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <Image source={icons.star} className="size-5" />
              <Text className="text-black-200 text-sm mt-1 font-rubik-medium">
                {property?.rating} ({property?.reviews.length} reviews)
              </Text>
            </View>
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property?.allinclusive}
              </Text>
            </View>
          </View>
          <View className="flex flex-row justify-between mt-5 ">
            <View className="flex flex-row items-center">
              <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ">
                <Image source={icons.bed} className="size-4" />
              </View>
              <Text className="text-black-300 text-lg font-rubik-medium ml-2">
                {property?.bedrooms} King Bed
              </Text>
            </View>

            <View className="flex flex-row items-center">
              <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ">
                <Image source={icons.area} className="size-4" />
              </View>
              <Text className="text-black-300 text-lg font-rubik-medium ml-2">
                {property?.roomType}
              </Text>
            </View>
          </View>
          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Amenities
            </Text>

            {property?.amenities.length > 0 && (
              <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                {property?.amenities.map((item: string, index: number) => {
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
            {/* <Text className="text-black-300 text-xl font-rubik-bold">
               Info
            </Text> */}

            <View className="flex-row flex-wrap mt-3 justify-between">
              <View
                className="flex-col bg-primary-100 p-4 rounded-xl mb-3"
                style={{ width: "48%" }}
              >
                <Text className="text-black-200 text-xs font-rubik-medium">
                  Check-in Date
                </Text>
                <Text className="text-black-300 text-base font-rubik-bold mt-1">
                  {formatDateTime(property?.checkInDate)}
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
                  {formatDateTime(property?.checkOutDate)}
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
                  {formatDateTime(property?.checkInTime, true) || "2:00 PM"}
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
                  {formatDateTime(property?.checkOutTime, true) || "11:00 AM"}
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
                  {property?.guests || "2"}{" "}
                  {property?.guests === 1 ? "Guest" : "Guests"}
                </Text>
              </View>
            </View>
          </View>

          {/* <FlightInfo /> */}
          <View className="w-full border-t border-accent-100 pt-7 mt-5">
            <View className="flex flex-row items-center justify-between mt-4">
              <View className="flex flex-row items-center">
                <Image
                  source={{ uri: property?.agent.avatar }}
                  className="size-14 rounded-full"
                />

                <View className="flex flex-col items-start justify-center ml-3">
                  <Text className="text-lg text-black-300 text-start font-rubik-bold">
                    {property?.agent.name}
                  </Text>
                  <Text className="text-sm text-black-200 text-start font-rubik-medium">
                    {property?.agent.email}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleContact}
                className="flex flex-row items-center gap-3"
              >
                <MessageCircle color={"#1ABC9C"} />
                {/* <Image source={icons.phone} className="size-7" /> */}
              </TouchableOpacity>
            </View>
          </View>
          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Overview
            </Text>
            {/* <Text className="text-black-200 text-base font-rubik mt-2">
              {property?.description}
              
          
            </Text> */}
            <Text
              numberOfLines={expanded ? undefined : 2}
              className="font-rubik-light text-text"
            >
              {property?.description}
            </Text>

            {/* Toggle Button (Always Visible) */}
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text className="font-rubik-light text-primary-200">
                {expanded ? "See Less" : "Read More"}
              </Text>
            </TouchableOpacity>
          </View>

          {property?.reviews.length > 0 && (
            <View className="mt-7">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center">
                  <Image source={icons.star} className="size-6" />
                  <Text className="text-black-300 text-xl font-rubik-bold ml-2">
                    {property?.rating} ({property?.reviews.length} reviews)
                  </Text>
                </View>

                <TouchableOpacity>
                  <Text className="text-primary-300 text-base font-rubik-bold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-5">
                <Comment item={property?.reviews[0]} />
              </View>
            </View>
          )}
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
              ${property?.price}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/bookingScreen",
                params: {
                  id: property?.$id,
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
