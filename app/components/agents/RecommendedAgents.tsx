import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import { agentService } from "@/lib/services";
import { useAuth } from "@/lib/context/auth-context";
import { User2 } from "lucide-react-native";

const RecommendedAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        // Use Firebase function to get all agents, limit to 10 for recommended list
        const data = await agentService.getAllAgents({ limit: 10 });
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
      return { uri: agent.avatar, isImage: true };
    }

    // Check for avatarUrl as alternative property name
    if (
      agent.avatarUrl &&
      typeof agent.avatarUrl === "string" &&
      agent.avatarUrl.startsWith("http")
    ) {
      return { uri: agent.avatarUrl, isImage: true };
    }

    // Return flag indicating no image available
    return { isImage: false };
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No agents found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {agents.map((agent) => (
        <TouchableOpacity
          key={agent.id}
          onPress={() => handleAgentPress(agent.id)}
          style={styles.agentCard}
        >
          {getAvatarSource(agent).isImage ? (
            <Image
              source={{ uri: getAvatarSource(agent).uri }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.iconContainer}>
              <User2 size={30} color="#95A5A6" />
            </View>
          )}
          <Text style={styles.agentName} numberOfLines={1}>
            {agent.name}
          </Text>
          {agent.niche && (
            <Text style={styles.agentNiche} numberOfLines={1}>
              {agent.niche}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 16
  },
  emptyContainer: {
    paddingVertical: 16
  },
  emptyText: {
    textAlign: "center",
    color: "#95A5A6"
  },
  agentCard: {
    marginRight: 16,
    alignItems: "center",
    width: 100
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f1f1f1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8
  },
  agentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495E",
    textAlign: "center"
  },
  agentNiche: {
    fontSize: 12,
    color: "#95A5A6",
    textAlign: "center"
  }
});

export default RecommendedAgents;
