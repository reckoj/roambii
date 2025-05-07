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
import images from "@/constants/images"; // Import default images
import { useAuth } from "@/lib/auth-context";

const RecommendedAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        // Use Firebase function to get all agents, limit to 10 for recommended list
        const data = await getAllAgents({ limit: 10 });
        console.log("Fetched agents:", data.length);
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

  // Helper function to get avatar image source with fallback
  const getAvatarSource = (agent: any) => {
    // Check for avatar in various potential property names
    if (
      agent.avatar &&
      typeof agent.avatar === "string" &&
      agent.avatar.startsWith("http")
    ) {
      return { uri: agent.avatar };
    }

    // Check for avatarUrl as alternative property name
    if (
      agent.avatarUrl &&
      typeof agent.avatarUrl === "string" &&
      agent.avatarUrl.startsWith("http")
    ) {
      return { uri: agent.avatarUrl };
    }

    // If no valid avatar URL found, use default avatar image
    return images.avatar; // Make sure you have a default avatar in your images constants
  };

  // Helper function to get initials for fallback display
  const getInitials = (name?: string): string => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-center text-gray-500">No agents found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row"
    >
      {agents.map((agent) => (
        <TouchableOpacity
          key={agent.id}
          onPress={() => handleAgentPress(agent.id)}
          className="mr-4 w-40"
        >
          <Image
            source={getAvatarSource(agent)}
            className="w-40 h-40 rounded-lg mb-2"
            resizeMode="cover"
          />
          <Text className="font-rubik-medium text-base" numberOfLines={1}>
            {agent.name}
          </Text>
          {agent.niche && (
            <Text className="text-gray-500 text-sm" numberOfLines={1}>
              {agent.niche}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default RecommendedAgents;
