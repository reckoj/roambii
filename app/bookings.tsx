import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import TripCard from "@/components/TripCard";
import TripDetailView from "@/components/TripDetailView";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Swipeable } from "react-native-gesture-handler";
import { PlusCircleIcon, Trash2 } from "lucide-react-native";
import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { deletePackage, getAgentPackages } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { agents } from "@/constants/data";
import images from "@/constants/images";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import CustomHeader from "@/components/HeaderComponent";

type FlightDetails = {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  flightNumber: string;
};

type BookedTrip = {
  id: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  amount: number;
  bookingReference: string;
  passengers: number;
  paymentMethod: string;
  flightDetails: {
    outbound: FlightDetails;
    return: FlightDetails;
  };
};

const Bookings = () => {
  const { rawUser, isAgent } = useGlobalContext();
  const [packages, setPackages] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  /** Fetch packages function that can be reused */
  const fetchPackages = async () => {
    if (!isAgent || !rawUser?.$id) {
      setInitialLoading(false);
      return;
    }

    try {
      const data = await getAgentPackages(rawUser.$id);
      setPackages(data);
    } catch (error) {
      console.error("Error fetching packages:", error);
      // Optionally show an error alert
      // Alert.alert("Error", "Failed to load packages");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  /** Initial fetch when screen loads */
  useEffect(() => {
    fetchPackages();
  }, [rawUser?.$id]);

  /** Handle pull to refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPackages();
  }, [rawUser?.$id]);

  /** Handle deleting a package */
  const handleDelete = async (packageId: string) => {
    Alert.alert(
      "Delete Package",
      "Are you sure you want to delete this package?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deletePackage(packageId);
            if (success) {
              setPackages(packages.filter((pkg) => pkg.$id !== packageId));
              // Alert.alert("Success", "Package deleted.");
            } else {
              Alert.alert("Error", "Failed to delete package.");
            }
          },
        },
      ]
    );
  };

  // Render right actions for Swipeable
  const renderRightActions = (packageId: string) => (
    <TouchableOpacity
      onPress={() => handleDelete(packageId)}
      style={styles.deleteButton}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  // Gesture handler style for swipe animation
  const animatedSwipeStyle = (translateX: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateX: withSpring(translateX.value, {
              damping: 20,
              stiffness: 100,
            }),
          },
        ],
      };
    });

  // Show loader only on initial load
  if (initialLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1">
        <CustomHeader
          title="Active Packages"
          showBackButton={false}
          rightIcon={
            packages.length > 0 ? (
              <PlusCircleIcon color="white" size={34} />
            ) : undefined
          }
          onRightIconPress={
            packages.length > 0
              ? () => router.push("/create-package")
              : undefined
          }
        />

        <ScrollView
          className="flex-1 p-4 mb-14 bg-white"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1ABC9C"]}
              tintColor="#1ABC9C"
            />
          }
        >
          {packages.length === 0 ? (
            <View>
              <View className="flex items-center justify-center">
                <Text className="flex items-center text-lg text-gray-600 text-center">
                  No packages found.
                </Text>
                <Image source={images.blank} className="w-full h-96" />

                <TouchableOpacity
                  className="flex bg-primary-200 w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-black/25 z-50"
                  onPress={() => router.push("/create-package")}
                  activeOpacity={0.8}
                >
                  <PlusCircleIcon color="white" size={24} />
                </TouchableOpacity>
                <Text className="flex items-center text-lg text-text font-rubik-bold text-center">
                  Create a new package listing
                </Text>
              </View>
            </View>
          ) : (
            packages.map((pkg) => (
              <Swipeable
                key={pkg.$id}
                renderRightActions={() => renderRightActions(pkg.$id)}
              >
                <View className="flex-row bg-gray-100 p-4 rounded-lg mb-3 items-center">
                  <Image
                    source={{
                      uri: pkg.image || "https://via.placeholder.com/100",
                    }}
                    className="w-20 h-20 rounded-lg mr-4"
                  />

                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">
                      {pkg.name}
                    </Text>
                    <Text className="text-sm text-gray-600">${pkg.price}</Text>
                    <Text className="text-sm text-gray-600">{pkg.type}</Text>
                  </View>

                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/editPackage",
                          params: { id: pkg.$id },
                        })
                      }
                      className="p-2"
                    >
                      <Pencil size={20} color="#1ABC9C" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(pkg.$id)}
                      className="p-2"
                    >
                      <Trash2 size={20} color="#F75555" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Swipeable>
            ))
          )}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  deleteButton: {
    backgroundColor: "#F75555",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  deleteText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default Bookings;
