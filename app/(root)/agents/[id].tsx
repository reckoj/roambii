import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Star,
  ArrowLeft,
  MessageCircle,
  Globe,
  MapPin,
  User2,
  Share2,
  Award,
} from "lucide-react-native";
import NoResults from "@/components/NoResults";
import { Card } from "@/components/Cards";
import images from "@/constants/images";
import { useGlobalContext } from "@/lib/global-provider";
import { getAgentById, getAgentPackages } from "@/lib/agent-service";
import { Agent } from "@/lib/firebase/models";
import ReviewsList from "@/components/ReviewsList";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#36d6ba",
  secondary: "#D9D9D9",
  tertiary: "#FF8F70",
  background: "#F9FAFC",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  danger: "#FF4C69",
  success: "#00D27A",
  lightGray: "#F0F2F5",
  divider: "#EEEEEE",
  messagePreview: "#666666",
  unreadBadge: "#7F5DF0",
  gold: "#FDB814",
  lightGold: "#FFF8E7",
};

const { width } = Dimensions.get("window");

const AgentProfile = () => {
  const params = useLocalSearchParams();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [agent, setAgent] = useState<Agent | null>(null);
  const { rawUser } = useGlobalContext();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const fetchAgent = async () => {
      if (agentId) {
        try {
          setLoading(true);
          const data = await getAgentById(String(agentId));

          if (data) {
            setAgent(data);
          } else {
            setError("Agent not found");
            console.warn("[No Agent Data Found]");
            Alert.alert(
              "Agent Not Found",
              "The requested agent profile could not be found.",
              [{ text: "Go Back", onPress: () => router.back() }]
            );
          }
        } catch (error) {
          console.error("Error fetching agent by ID:", error);
          setError("Failed to load agent data");
          Alert.alert(
            "Error",
            "Failed to load agent profile. Please try again later.",
            [{ text: "Go Back", onPress: () => router.back() }]
          );
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAgent();
  }, [agentId]);

  useEffect(() => {
    const fetchPackages = async () => {
      if (agentId) {
        try {
          setLoadingPackages(true);
          const agentPackages = await getAgentPackages(agentId);
          setPackages(agentPackages);
        } catch (error) {
          console.error("Error fetching agent's packages:", error);
          // Don't show an alert for packages failure to avoid multiple alerts
        } finally {
          setLoadingPackages(false);
        }
      }
    };

    fetchPackages();
  }, [agentId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || "Failed to load agent profile"}
        </Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleContact = async () => {
    if (!agent || !rawUser) {
      Alert.alert("Error", "Cannot start chat. Missing user or agent data.");
      return;
    }

    try {
      // Generate consistent room ID between user and agent
      const userID = rawUser.id;
      const agentID = agent.id;

      router.push({
        pathname: "/chatScreen",
        params: {
          room_id:
            userID < agentID ? `${userID}_${agentID}` : `${agentID}_${userID}`,
          user: userID,
          agentId: agentID,
          avatar: agent.avatar || "",
          from: "agentprofile",
        },
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start chat.");
    }
  };

  const handleCardPress = (id: string) => {
    console.log("Original ID received:", id);
    console.log("Type of ID:", typeof id);

    // Check if id exists and is a string
    if (!id) {
      console.error("ID is undefined or null");
      Alert.alert("Error", "Cannot navigate - package ID is missing");
      return;
    }

    // Get the ID in the correct format
    const propertyId = id.startsWith("$") ? id.substring(1) : id;
    console.log("Processed property ID:", propertyId);

    // Log the full item for debugging
    // console.log("Full item data structure:", JSON.stringify(item, null, 2));

    // Try direct navigation
    console.log("Attempting navigation to:", `/properties/${propertyId}`);
    router.push(`/properties/${propertyId}`);
  };

  const handleShareProfile = () => {
    // Implement share functionality here
    Alert.alert("Share", "Share agent profile functionality coming soon!");
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starContainer}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            color={i < Math.floor(rating) ? COLORS.gold : COLORS.secondary}
            fill={i < Math.floor(rating) ? COLORS.gold : "none"}
          />
        ))}
      </View>
    );
  };

  const getAvatarUri = () => {
    if (!agent.avatar) {
      return images.avatar;
    }

    // Check if the avatar is a valid URL
    if (typeof agent.avatar === "string" && agent.avatar.startsWith("http")) {
      return { uri: agent.avatar };
    }

    // Default fallback
    return images.avatar;
  };

  const getAgentExperience = () => {
    return "3+ years";
  };

  const getAgentLocation = () => {
    return "International";
  };

  const getAgentLanguages = () => {
    return "English, Spanish";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <SafeAreaView style={{ width: "100%" }}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Agent Profile</Text>
            </View>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareProfile}
            >
              <Share2 size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Agent info section with profile picture */}
        <View style={styles.profileInfoContainer}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getAvatarUri()}
              style={styles.profileImage}
              defaultSource={images.avatar}
            />
          </View>

          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentSpecialty}>
            {agent.niche || "Travel"} Specialist
          </Text>

          <View style={styles.agentRatingContainer}>
            <View style={styles.badgeContainer}>
              <Award size={14} color={COLORS.gold} />
              <Text style={styles.badgeText}>Top Agent</Text>
            </View>
            {renderStars(agent.rating || 4.5)}
            <Text style={styles.ratingText}>
              {agent.rating || 4.5} ({agent.reviewCount || 0} reviews)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContact}
            activeOpacity={0.9}
          >
            <MessageCircle size={20} color={COLORS.white} />
            <Text style={styles.contactButtonText}>Contact Me</Text>
          </TouchableOpacity>
        </View>

        {/* Agent details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <User2 size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Experience</Text>
              <Text style={styles.detailValue}>{getAgentExperience()}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <MapPin size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{getAgentLocation()}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Globe size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Languages</Text>
              <Text style={styles.detailValue}>{getAgentLanguages()}</Text>
            </View>
          </View>
        </View>

        {/* Agent's Packages Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Available Packages</Text>
          {loadingPackages ? (
            <View style={styles.loadingPackages}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.loadingText}>Loading packages...</Text>
            </View>
          ) : packages.length === 0 ? (
            <NoResults />
          ) : (
            <FlatList
              horizontal
              data={packages}
              renderItem={({ item }) => (
                <View style={styles.packageCard}>
                  <Card
                    item={item}
                    onPress={() => {
                      console.log("Card pressed with ID:", item.$id || item.id);
                      handleCardPress(item.$id || item.id);
                    }}
                  />
                </View>
              )}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.packagesList}
            />
          )}
        </View>

        {/* Reviews Section - Now uses the ReviewsList component */}
        <View style={styles.sectionContainer}>
          {agent && <ReviewsList agentId={agent.id} />}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  goBackButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  goBackText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  contentContainer: {
    paddingTop: 30,
    paddingBottom: 30,
  },
  profileInfoContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -20,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: COLORS.white,
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: COLORS.white,
  },
  agentName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  agentSpecialty: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  agentRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gold,
    marginLeft: 4,
  },
  starContainer: {
    flexDirection: "row",
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  contactButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  contactButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 8,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  loadingPackages: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textLight,
  },
  packageCard: {
    marginRight: 16,
    width: width * 0.7,
  },
  packagesList: {
    paddingBottom: 8,
    paddingRight: 20,
  },
});

export default AgentProfile;
