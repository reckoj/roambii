import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Star } from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { ID } from "react-native-appwrite";
import { config, databases } from "@/lib/appwrite";

interface Review {
  $id: string;
  users: string[];
  agentId: string[];
  agentRating: number;
  comment: string;
  createdAt: string;
  author?: string;
  avatar?: string;
}

interface AgentReviewsProps {
  agentId: string;
}

const AgentReviews: React.FC<AgentReviewsProps> = ({ agentId }) => {
  const { rawUser } = useGlobalContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchReviews();
    }
  }, [agentId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);

      // Fetch all reviews from the collection
      const response = await databases.listDocuments(
        config.databaseId!,
        config.agentReviewsCollectionId!
      );

      // Filter reviews for the specific agent on the client side
      const filteredReviews = response.documents.filter((doc: any) => {
        // Check if agentId exists and is an array containing our agentId
        return (
          doc.agentId &&
          Array.isArray(doc.agentId) &&
          doc.agentId.includes(agentId)
        );
      });

      // Process user data for each review
      const reviewsWithUserData = await Promise.all(
        filteredReviews.map(async (doc: any) => {
          let userData = {
            name: "Anonymous",
            avatar: "https://via.placeholder.com/40",
          };

          // Try to fetch user data if available
          if (doc.users && Array.isArray(doc.users) && doc.users.length > 0) {
            try {
              const userResponse = await databases.getDocument(
                config.databaseId!,
                config.usersCollectionId!,
                doc.users[0]
              );

              if (userResponse) {
                userData = {
                  name: userResponse.name || "Anonymous",
                  avatar:
                    userResponse.avatar || "https://via.placeholder.com/40",
                };
              }
            } catch (error) {
              console.warn("Error fetching user data:", error);
            }
          }

          return {
            $id: doc.$id,
            users: doc.users || [],
            agentId: doc.agentId || [],
            agentRating: doc.agentRating || 0,
            comment: doc.comment || "",
            createdAt: doc.createdAt || new Date().toISOString(),
            author: userData.name,
            avatar: userData.avatar,
          };
        })
      );

      // Sort reviews by date (newest first)
      reviewsWithUserData.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReviews(reviewsWithUserData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      Alert.alert("Error", "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!rating || !comment.trim()) {
      Alert.alert("Error", "Please provide both a rating and a comment.");
      return;
    }

    if (!rawUser || !rawUser.$id) {
      Alert.alert("Error", "You must be logged in to leave a review.");
      return;
    }

    try {
      await databases.createDocument(
        config.databaseId!,
        config.agentReviewsCollectionId!,
        ID.unique(),
        {
          users: [rawUser.$id], // Store user ID as an array
          agentId: [agentId], // Store agent ID as an array
          agentRating: rating,
          comment,
          createdAt: new Date().toISOString(),
        }
      );

      // After successfully submitting a review, refetch all reviews
      await fetchReviews();

      Alert.alert("Success", "Review submitted successfully.");
      setIsModalVisible(false);
      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review.");
    }
  };

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
    <View>
      {/* Leave a Review Button */}
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        className="bg-blue-500 p-3 rounded-md mt-4"
      >
        <Text className="text-white text-center">Leave a Review</Text>
      </TouchableOpacity>

      {/* Loading state */}
      {loading && (
        <View className="py-4 flex items-center">
          <ActivityIndicator size="small" color="#0000ff" />
        </View>
      )}

      {/* No reviews message */}
      {!loading && reviews.length === 0 && (
        <View className="py-4 flex items-center">
          <Text>No reviews yet. Be the first to review!</Text>
        </View>
      )}

      {/* Reviews list */}
      {!loading && reviews.length > 0 && (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.$id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image
                  source={{ uri: item.avatar }}
                  style={styles.reviewerAvatar}
                />
                <Text style={styles.reviewerName}>{item.author}</Text>
              </View>
              {renderStars(item.agentRating)}
              <Text numberOfLines={3} style={styles.reviewPreview}>
                {item.comment}
              </Text>
              <Text style={styles.reviewDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Review Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white p-5 rounded-lg w-3/4">
            <Text className="text-lg font-bold mb-3">Leave a Review</Text>
            {/* Rating Selection */}
            <View className="flex flex-row justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={{ padding: 4 }}
                >
                  <Star
                    size={24}
                    color={star <= rating ? "#FDB814" : "#D1D5DB"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {/* Comment Input */}
            <TextInput
              placeholder="Write your review..."
              className="border border-gray-300 rounded p-2 mt-3"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {/* Buttons */}
            <View className="flex flex-row justify-between mt-4">
              <TouchableOpacity
                onPress={() => {
                  setIsModalVisible(false);
                  setRating(0);
                  setComment("");
                }}
                className="p-2 bg-gray-300 rounded"
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReviewSubmit}
                className="p-2 bg-blue-500 rounded"
              >
                <Text className="text-white">Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AgentReviews;

const styles = StyleSheet.create({
  reviewCard: {
    width: 220,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "right",
  },
  starContainer: {
    flexDirection: "row",
    marginRight: 8,
  },
});
