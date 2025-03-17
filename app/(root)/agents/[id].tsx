import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  avatar,
  config,
  databases,
  getAgentById,
  getAgentPackages,
  getAgentPackagesProfile,
} from "@/lib/appwrite";
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import icons from "@/constants/icons";
import { Star, X, MessageCircle, ChevronRight } from "lucide-react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import ReviewModal from "@/components/ReviewModal";
import images from "@/constants/images";
import { useGlobalContext } from "@/lib/global-provider";
import { ID, Query } from "react-native-appwrite";

type Package = {
  name: string;
  price: string;
};

type Review = {
  id: number;
  author: string;
  rating: number;
  comment: string;
  avatar: string;
};

const AgentProfile = () => {
  const params = useLocalSearchParams();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [agent, setAgent] = useState<any>(null);
  const { rawUser } = useGlobalContext();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fakeReviews: Review[] = [
    {
      id: 1,
      author: "John Doe",
      rating: 5,
      comment:
        "Absolutely amazing experience! The agent was super helpful and the package was perfect.",
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    },
    {
      id: 2,
      author: "Jane Smith",
      rating: 4,
      comment:
        "Great service and communication! The trip was well-organized and stress-free.",
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    },
    {
      id: 3,
      author: "Mike Johnson",
      rating: 5,
      comment:
        "Highly recommend! Everything was arranged perfectly and exceeded my expectations.",
      avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    },
  ];

  // const { data: latestProperties, loading: latestPropertiesLoading } =
  //   useAppwrite({
  //     fn: getLatestProperties,
  //   });
  useEffect(() => {
    const fetchAgent = async () => {
      if (agentId) {
        try {
          setLoading(true);
          const data = await getAgentById({ id: String(agentId) });

          if (data) {
            setAgent({
              ...data,
              avatar:
                data.avatar && data.avatar.startsWith("https")
                  ? data.avatar
                  : images.avatar,
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

    fetchAgent();
  }, [agentId]);

  useEffect(() => {
    const fetchPackages = async () => {
      if (agentId) {
        try {
          setLoadingPackages(true);
          const agentPackages = await getAgentPackagesProfile(agentId);

          setPackages(agentPackages);
        } catch (error) {
          console.error("Error fetching agent's packages:", error);
        } finally {
          setLoadingPackages(false);
        }
      }
    };

    fetchPackages();
  }, [agentId]);

  if (!agent)
    return (
      <View className="w-full h-full flex justify-center items-center">
        <ActivityIndicator className="text-primary-300" size="large" />
      </View>
    );

  const handleContact = async () => {
    if (!agent || !rawUser) {
      Alert.alert("Error", "Cannot start chat. Missing user or agent data.");
      return;
    }

    const room_id = `${rawUser.$id}_${agent.$id}`;

    try {
      router.push({
        pathname: "/chatScreen",
        params: {
          room_id,
          user: rawUser.$id,
          agentId: agent.$id,
          avatar: agent.avatar,
        },
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start chat.");
    }
  };

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starContainer}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            color={i < Math.floor(rating) ? "#FDB814" : "#D1D5DB"}
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View className="flex flex-row items-center p-2 justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex rounded-full size-2 items-center ml-4 justify-center"
          >
            <Image source={icons.backArrow} className="size-8" />
          </TouchableOpacity>
        </View>
        <ScrollView>
          {/* Header Section */}
          <View className="items-center mt-6">
            <Image
              source={{ uri: agent.avatar }}
              className="w-32 h-32 rounded-full border-4 border-gray-300"
            />
            <Text className="text-2xl font-bold mt-2">{agent.name}</Text>
            <Text className="text-lg text-gray-500">
              {agent.niche} Specialist
            </Text>
          </View>

          {/* Contact Button */}
          <TouchableOpacity
            className="mx-4 mt-4 bg-primary-300 py-3 rounded-lg flex flex-row items-center justify-center"
            onPress={handleContact}
          >
            <MessageCircle size={20} color="#FFF" />
            <Text className="ml-2 text-white text-lg font-semibold">
              Contact Me
            </Text>
          </TouchableOpacity>

          {/* Agent's Packages Section */}
          <View className="px-2 mt-6">
            <Text className="text-lg font-rubik-bold text-text">
              Available Packages
            </Text>
            {loadingPackages ? (
              <ActivityIndicator
                className="text-primary-300 mt-3"
                size="large"
              />
            ) : packages.length === 0 ? (
              <NoResults />
            ) : (
              <FlatList
                horizontal
                data={packages}
                renderItem={({ item }) => (
                  <View className="mr-5 w-64">
                    <Card
                      item={item}
                      onPress={() => handleCardPress(item.$id)}
                    />
                  </View>
                )}
                keyExtractor={(item) => item.$id}
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="pb-5"
              />
            )}
          </View>
          <View className="px-2 mt-6">
            <Text className="text-lg font-rubik-bold text-text">
              Client Reviews
            </Text>
            <FlatList
              data={fakeReviews}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled // ✅ Fixes nested FlatList inside ScrollView issue
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reviewCard}
                  onPress={() => {
                    setSelectedReview(item);
                    setIsModalVisible(true);
                  }}
                >
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: item.avatar }}
                      style={styles.reviewerAvatar}
                    />
                    <Text style={styles.reviewerName}>{item.author}</Text>
                  </View>
                  {renderStars(item.rating)}
                  <Text numberOfLines={2} style={styles.reviewPreview}>
                    {item.comment}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </ScrollView>

        <ReviewModal
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          selectedReview={selectedReview}
          renderStars={renderStars}
        />
      </SafeAreaView>
    </>
  );
};

export default AgentProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  title: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  starContainer: {
    flexDirection: "row",
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  contactButton: {
    flexDirection: "row",

    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  contactButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  section: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "400",
    color: "#1F2937",
  },
  packageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  packagePrice: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1ABC9C",
    marginRight: 8,
  },
  reviewsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  reviewCard: {
    width: 200,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginRight: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  reviewPreview: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewText: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
  },
});
