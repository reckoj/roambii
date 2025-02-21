import React, { useState } from "react";
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from "react-native";
import TripCard from "@/components/TripCard";
import TripDetailView from "@/components/TripDetailView";
import { PlusCircleIcon } from "lucide-react-native";
import { router } from "expo-router";

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
  const [selectedTrip, setSelectedTrip] = useState<BookedTrip | null>(null);

   const pastTrips= [
    {
      id: '1',
      destination: 'Paris, France',
      departureDate: '2024-01-15',
      returnDate: '2024-01-22',
      amount: 1250.00,
      bookingReference: 'BOK123456',
      passengers: 2,
      paymentMethod: 'VISA •••• 4242',
      flightDetails: {
        outbound: {
          from: 'JFK',
          to: 'CDG',
          departure: '10:00 AM',
          arrival: '11:30 PM',
          flightNumber: 'AF1234'
        },
        return: {
          from: 'CDG',
          to: 'JFK',
          departure: '1:00 PM',
          arrival: '3:30 PM',
          flightNumber: 'AF1235'
        }
      }
    },
    {
      id: '2',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '3',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '4',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '5',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '6',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '7',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '8',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '9',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
    {
      id: '10',
      destination: 'Tokyo, Japan',
      departureDate: '2023-11-20',
      returnDate: '2023-11-30',
      amount: 2100.00,
      bookingReference: 'BOK789012',
      passengers: 1,
      paymentMethod: 'Mastercard •••• 5555',
      flightDetails: {
        outbound: {
          from: 'LAX',
          to: 'NRT',
          departure: '11:00 AM',
          arrival: '4:30 PM',
          flightNumber: 'JL123'
        },
        return: {
          from: 'NRT',
          to: 'LAX',
          departure: '10:00 AM',
          arrival: '4:00 AM',
          flightNumber: 'JL124'
        }
      }
    },
  ];


  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        {!selectedTrip ? (
          <>
           <View className="w-full flex justify-center items-center">
            <Text className=" text-2xl font-bold mb-4 ">Bookings</Text>

          </View>
            <ScrollView  showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24 pr-7">
            {pastTrips.map((trip) => (
  <TripCard key={trip.id} trip={trip} onPress={() => setSelectedTrip(trip)} />
))}
            </ScrollView>
          </>
        ) : (
          <TripDetailView trip={selectedTrip} onBack={() => setSelectedTrip(null)} />
        )}
      </View>
      <View>
      <TouchableOpacity 
     className="absolute bottom-32 right-5 bg-primary-200 w-14 h-14 rounded-full justify-center items-center shadow-lg shadow-black/25 z-50"
      onPress={() => router.push("/create-package")}
      activeOpacity={0.8}
    >
      <PlusCircleIcon color="white" size={24} />
    </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Bookings;


