import { useEffect, useState } from "react";
import { router, useLocalSearchParams,  } from "expo-router";
import { getAgentById } from "@/lib/appwrite"; 
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View,  Dimensions, Platform, } from "react-native";
import icons from "@/constants/icons";

const AgentProfile = () => {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id; // ✅ Ensure id is a string
  const [agent, setAgent] = useState<any>(null);
  const windowHeight = Dimensions.get("window").height;

  useEffect(() => {
    const fetchAgent = async () => {
      if (id) {
        try {
          const data = await getAgentById({ id: String(id) }); // ✅ Convert id to string
          setAgent(data);
        } catch (error) {
          console.error("Error fetching agent by ID:", error);
        }
      }
    };

    fetchAgent();
  }, [id]);

  if (!agent) return <Text>Loading agent details...</Text>;

  return (
    <SafeAreaView className="h-full bg-white">
    <ScrollView showsVerticalScrollIndicator={false}
    contentContainerClassName="pb-32 bg-white">
    <View className="relative w-full" style={{ height: windowHeight / 2 }}>
      <View className="flex flex-row items-center w-full justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex flex-row bg-primary-300 rounded-full size-11 items-center justify-center m-6"
        >
          <Image source={icons.backArrow} className="size-5" />
        </TouchableOpacity>
      </View>
         
          {/* Profile Image */}
          <View className="items-center mb-4">
            <Image
              source={{ uri: agent.avatar }}
              className="w-48 h-48 rounded-full "
            />
            {/* <Text className="mt-2 text-lg text-gray-600">{tagLine}</Text> */}
          </View>

          <View className="flex-col justify-center items-center">
          <Text className="text-2xl text-text font-rubik">{agent.name}</Text>
            <Text className=" text-text font-rubik-bold">Certified Travel Agent</Text>
            <Text className="font-rubik-bold text-text">Tagline</Text>
          </View>
        </View>

        <View className="flex flex-col border-t pt-5 border-primary-200">

        </View>

       
      </ScrollView>
      </SafeAreaView>
    
  );
};

export default AgentProfile;
