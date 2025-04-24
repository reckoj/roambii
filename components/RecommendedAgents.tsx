import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  View,
} from "react-native";
import { getAllAgents } from "@/lib/agent-service";

// Import Firebase service instead of Appwrite

const RecommendedAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        // Use Firebase function to get all agents, limit to 10 for recommended list
        const data = await getAllAgents({ limit: 10 });
        setAgents(data || []);
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleAgentPress = (agentId: string) => {
    console.log("Navigating to:", `/agents/${agentId}`);
    router.push({
      pathname: "/agents/[id]",
      params: { id: agentId },
    });
  };

  if (loading) {
    return (
      <View className="py-4 flex items-center justify-center">
        <ActivityIndicator size="small" color="#1ABC9C" />
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View className="py-4 px-2">
        <Text className="text-gray-500 text-center">
          No agents available at the moment
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-5 mb-5"
    >
      {agents.map((agent) => (
        <TouchableOpacity
          key={agent.id} // Firebase uses 'id' instead of '$id'
          onPress={() => handleAgentPress(agent.id)}
          className="flex flex-col items-center mr-4 px-4"
        >
          <Image
            source={
              agent.avatar // Use a placeholder if no avatar
            }
            className="size-16 rounded-full"
          />
          <Text className="text-sm text-text font-rubik">
            {agent.name ? agent.name.split(" ")[0] : "Agent"}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default RecommendedAgents;
