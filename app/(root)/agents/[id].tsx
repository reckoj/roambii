import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  avatar,
  config,
  databases,
  getAgentById,
  getLatestProperties,
  getProperties,
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
  const params2 = useLocalSearchParams<{ query?: string; filter?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id; // ✅ Ensure id is a string
  const [agent, setAgent] = useState<any>(null);
  const windowHeight = Dimensions.get("window").height;
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading1, setLoading1] = useState(true);
  const { rawUser } = useGlobalContext();

  const { data: latestProperties, loading: latestPropertiesLoading } =
    useAppwrite({
      fn: getLatestProperties,
    });

  const {
    data: properties,
    refetch,
    loading,
  } = useAppwrite({
    fn: getProperties,
    params: {
      filter: params2.filter!,
      query: params2.query!,
      limit: 6,
    },
    skip: true,
  });

  useEffect(() => {
    refetch({
      filter: params2.filter!,
      query: params2.query!,
      limit: 6,
    });
  }, [params.filter, params.query]);

  useEffect(() => {
    const fetchAgent = async () => {
      if (id) {
        try {
          setLoading1(true);
          const data = await getAgentById({ id: String(id) });

          console.log("[Fetched Agent Data] ==> ", data); // ✅ Debugging output

          if (data) {
            setAgent({
              ...data,
              avatar:
                data.avatar && data.avatar.startsWith("https")
                  ? data.avatar
                  : images.avatar, // ✅ Ensures a valid avatar
            });
          } else {
            console.warn("[No Agent Data Found]");
          }
        } catch (error) {
          console.error("Error fetching agent by ID:", error);
        } finally {
          setLoading1(false);
        }
      }
    };

    fetchAgent();
  }, [id]);

  if (!agent)
    return (
      <View className=" w-full h-full flex justify-center items-center">
        <ActivityIndicator className="text-primary-300" size="large" />
      </View>
    );

  const handleContact = async () => {
    if (!agent || !rawUser) {
      Alert.alert("Error", "Cannot start chat. Missing user or agent data.");
      return;
    }

    const room_id = `${rawUser.$id}_${agent.$id}`; // ✅ Create unique room ID

    try {
      // ✅ Check if a chat room already exists
      const existingRoom = await databases.listDocuments(
        config.databaseId!,
        config.chatRoomsCollectionId!,
        [Query.equal("room_id", room_id)]
      );

      let chatRoomId = room_id; // Default room ID

      if (existingRoom.total === 0) {
        // ✅ No chat room exists, create a new one
        const newRoom = await databases.createDocument(
          config.databaseId!,
          config.chatRoomsCollectionId!,
          ID.unique(),
          {
            room_id,
            user_id: rawUser.$id, // User initiating the chat
            agent_id: agent.$id, // Agent receiving the chat
            last_message: "",
            last_updated: new Date().toISOString(),
          }
        );

        chatRoomId = newRoom.$id; // Use newly created chat room ID
      } else {
        // ✅ Use existing chat room ID
        chatRoomId = existingRoom.documents[0].$id;
      }

      // ✅ Navigate to chat screen with room ID
      router.push({
        pathname: "/chatScreen",
        params: {
          room_id: chatRoomId,
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

  // Sample data - in a real app, this would come from props or API
  const tagent = {
    name: "Sarah Johnson",
    title: "All Inclusive Travel Specialist",
    rating: 4.8,
    reviewCount: 127,
    avatar: "https://placeholder.com/120x120",
    packages: [
      { name: "Basic Tour", price: "$299" },
      { name: "Premium Package", price: "$499" },
      { name: "Luxury Experience", price: "$999" },
    ],
    reviews: [
      {
        id: 1,
        author: "John D.",
        rating: 5,
        comment:
          "Amazing service! Sarah helped us find our perfect home in record time. Her knowledge of the local market was invaluable.",
        avatar: "https://placeholder.com/50x50",
      },
      {
        id: 2,
        author: "Alice M.",
        rating: 5,
        comment:
          "Found my dream home! The virtual tour package was exactly what I needed.",
        avatar: "https://placeholder.com/50x50",
      },
      {
        id: 3,
        author: "Robert K.",
        rating: 4,
        comment: "Very professional and responsive. Great attention to detail.",
        avatar: "https://placeholder.com/50x50",
      },
      {
        id: 4,
        author: "Emma S.",
        rating: 5,
        comment:
          "Best agent ever! Made the whole process smooth and stress-free.",
        avatar: "https://placeholder.com/50x50",
      },
    ],
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
    <SafeAreaView style={styles.container}>
      <View className="flex flex-row items-center p-2 justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex rounded-full size-10 items-center ml-4 justify-center"
        >
          <Image source={icons.backArrow} className="size-8" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {/* Header Section */}

        <View style={styles.header}>
          <Image
            source={{ uri: agent.avatar }} // ✅ Correct agent image
            className="w-32 h-32 rounded-full border-4 border-gray-300"
            onError={(e) =>
              console.error("Failed to load agent avatar", e.nativeEvent.error)
            }
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{agent.name}</Text>
            <Text style={styles.title}>{agent.niche} Travel Specialist</Text>
            <View style={styles.ratingContainer}>
              {renderStars(tagent.rating)}
              <Text style={styles.ratingText}>
                {tagent.rating} ({tagent.reviewCount} reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Button */}
        <TouchableOpacity
          className="bg-primary-300"
          style={styles.contactButton}
          onPress={() => handleContact()}
        >
          <MessageCircle size={20} color="#FFF" />
          <Text style={styles.contactButtonText}>Contact Me</Text>
        </TouchableOpacity>

        {/* Packages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Packages</Text>
        </View>

        <View className="my-2 pl-2">
          {latestPropertiesLoading ? (
            <ActivityIndicator size="large" className="text-primary-300" />
          ) : !latestProperties || latestProperties.length === 0 ? (
            <NoResults />
          ) : (
            <FlatList
              horizontal
              data={latestProperties}
              renderItem={({ item }) => (
                <View className="mr-5 w-64">
                  <Card item={item} onPress={() => handleCardPress(item.$id)} />
                </View>
              )}
              keyExtractor={(item) => item.$id}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="pb-5"
            />
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Reviews</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.reviewsScroll}
          >
            {tagent.reviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewCard}
                onPress={() => {
                  setSelectedReview(review);
                  setIsModalVisible(true);
                }}
              >
                <View style={styles.reviewHeader}>
                  <Image
                    source={{ uri: review.avatar }}
                    style={styles.reviewerAvatar}
                  />
                  <Text style={styles.reviewerName}>{review.author}</Text>
                </View>
                {renderStars(review.rating)}
                <Text numberOfLines={2} style={styles.reviewPreview}>
                  {review.comment}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <ReviewModal
        isModalVisible={isModalVisible}
        setIsModalVisible={setIsModalVisible}
        selectedReview={selectedReview}
        renderStars={renderStars}
      />
    </SafeAreaView>
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
