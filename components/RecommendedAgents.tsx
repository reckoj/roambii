import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, ScrollView, TouchableOpacity, Image } from "react-native";

import { getAgents } from "@/lib/appwrite"; // Fetch all agents
import images from "@/constants/images";

const RecommendedAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await getAgents(); // ✅ Fetch all agents instead of a single one
        setAgents(data?.documents || []); // ✅ Ensure it's an array
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };

    fetchAgents();
  }, []);

  const handleAgentPress = (agentId: string) => {
    console.log("Navigating to:", `/agents/${agentId}`);
    router.push({
      pathname: "/agents/[id]",
      params: { id: agentId }, // ✅ Use "id" (must match `[id].tsx`)
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-5 mb-5"
    >
      {agents.map((agent) => (
        <TouchableOpacity
          key={agent.$id} // ✅ Use document ID
          onPress={() => handleAgentPress(agent.$id)} // ✅ Pass correct ID
          className="flex flex-col items-center  mr-4 px-4"
        >
          <Image
            source={{ uri: agent.avatar || images.avatar }} // ✅ Use actual image from Appwrite
            className="size-16 rounded-full"
          />
          <Text className="text-sm text-text font-rubik">
            {/* {agent.name.split(" ")[1]} */}
            {agent.name.split(" ")[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default RecommendedAgents;
