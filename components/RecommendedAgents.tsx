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

const RecommendedAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          {/* Avatar with error handling */}
          <View className="size-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            <Image
              source={getAvatarSource(agent)}
              className="size-16 rounded-full"
              defaultSource={images.avatar}
              onError={() =>
                console.log(`Failed to load avatar for agent ${agent.id}`)
              }
            />
          </View>
          <Text className="text-sm text-text font-rubik mt-1">
            {agent.name ? agent.name.split(" ")[0] : "Agent"}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default RecommendedAgents;
