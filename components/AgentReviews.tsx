import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Star } from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { ID, Query, Permission, Role } from "react-native-appwrite";
import { config, databases } from "@/lib/appwrite";
import CustomInput from "./CustomInput";

interface Review {
  $id: string;
  users: string[];
  agentId: any;
  agentRating: number;
  comment: string;
  createdAt: string;
  author: string;
  avatar: string;
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
  const [debugMode, setDebugMode] = useState(true);
  const [debugInfo, setDebugInfo] = useState({
    agentId: "",
    totalReviews: 0,
    nonNullReviews: 0,
    matchingReviews: 0,
    reviewDetails: [] as any[],
  });

  useEffect(() => {
    if (agentId) {
      console.log("🔍 Component mounted with agentId:", agentId);
      fetchReviews();
    }
  }, [agentId]);

  const fetchReviews = async () => {
    try {
      console.log("\n=== FETCHING REVIEWS ===");
      setLoading(true);

      // Get all reviews
      const response = await databases.listDocuments(
        config.databaseId!,
        config.agentReviewsCollectionId!,
        [Query.limit(100)]
      );

      console.log(`Found ${response.documents.length} total reviews`);

      // Check how many reviews have non-null agentId
      const reviewsWithNonNullAgentId = response.documents.filter(
        (doc) => doc.agentId !== null
      );
      console.log(
        `Found ${reviewsWithNonNullAgentId.length} reviews with non-null agentId`
      );

      // Log the details of each review with non-null agentId
      const reviewDetails = reviewsWithNonNullAgentId.map((doc) => {
        return {
          id: doc.$id,
          agentId: doc.agentId,
          agentIdType: typeof doc.agentId,
          isExactMatch: doc.agentId === agentId,
          agentRating: doc.agentRating,
          comment: doc.comment?.substring(0, 20) + "...",
        };
      });

      console.log(
        "Reviews with non-null agentId:",
        JSON.stringify(reviewDetails, null, 2)
      );

      // IMPORTANT FIX: Check for direct string match with the agentId field
      // This is the case when we create reviews with the direct format
      const matchingReviews = response.documents.filter((doc) => {
        // Check for direct string equality
        if (doc.agentId === agentId) {
          console.log(
            `✅ MATCH found for review ${doc.$id} - direct string match`
          );
          return true;
        }

        // For array format
        if (
          Array.isArray(doc.agentId) &&
          doc.agentId.some((id) =>
            typeof id === "string" ? id === agentId : id?.$id === agentId
          )
        ) {
          console.log(
            `✅ MATCH found for review ${doc.$id} - array contains match`
          );
          return true;
        }

        // For object format
        if (
          typeof doc.agentId === "object" &&
          doc.agentId !== null &&
          doc.agentId.$id === agentId
        ) {
          console.log(
            `✅ MATCH found for review ${doc.$id} - object $id match`
          );
          return true;
        }

        return false;
      });

      console.log(
        `Found ${matchingReviews.length} matching reviews for agent ${agentId}`
      );

      // Update debug info
      setDebugInfo({
        agentId,
        totalReviews: response.documents.length,
        nonNullReviews: reviewsWithNonNullAgentId.length,
        matchingReviews: matchingReviews.length,
        reviewDetails,
      });

      // Sort by date, newest first
      matchingReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Process reviews to include user data
      const processedReviews = await Promise.all(
        matchingReviews.map(async (doc) => {
          console.log(`Processing review: ${doc.$id}`);

          // Default user data
          let userData = {
            name: "Anonymous",
            avatar: "https://via.placeholder.com/40",
          };

          // Try to get user info
          let userId = null;

          // Check permissions as main source of user ID
          if (doc.$permissions && Array.isArray(doc.$permissions)) {
            const userPerm = doc.$permissions.find((p) => p.includes("user:"));
            if (userPerm) {
              const match = userPerm.match(/user:([^")\s]+)/);
              if (match) {
                userId = match[1];
                console.log(`Found user ID in permissions: ${userId}`);
              }
            }
          }

          // Check users array as fallback
          if (
            !userId &&
            doc.users &&
            Array.isArray(doc.users) &&
            doc.users.length > 0
          ) {
            userId =
              typeof doc.users[0] === "string"
                ? doc.users[0]
                : doc.users[0]?.$id;
            if (userId) {
              console.log(`Found user ID in users array: ${userId}`);
            }
          }

          // If we found a user ID, try to get user info
          if (userId) {
            try {
              // Try direct lookup by ID
              const userDoc = await databases.getDocument(
                config.databaseId!,
                config.usersCollectionId!,
                userId
              );

              if (userDoc) {
                console.log(`Found user by ID: ${userDoc.name}`);
                userData = {
                  name: userDoc.name || "Anonymous",
                  avatar: userDoc.avatar || "https://via.placeholder.com/40",
                };
              }
            } catch (error) {
              console.log(
                `Error fetching user by ID, trying userId field: ${error}`
              );

              // Try userId field as fallback
              try {
                const usersResponse = await databases.listDocuments(
                  config.databaseId!,
                  config.usersCollectionId!,
                  [Query.equal("userId", userId)]
                );

                if (usersResponse.documents.length > 0) {
                  console.log(
                    `Found user by userId field: ${usersResponse.documents[0].name}`
                  );
                  userData = {
                    name: usersResponse.documents[0].name || "Anonymous",
                    avatar:
                      usersResponse.documents[0].avatar ||
                      "https://via.placeholder.com/40",
                  };
                }
              } catch (secondError) {
                console.log(`Error fetching user by userId field: ${error}`);
              }
            }
          }

          // Return formatted review
          return {
            $id: doc.$id,
            users: doc.users || [],
            agentId: doc.agentId || agentId,
            agentRating: doc.agentRating || 0,
            comment: doc.comment || "",
            createdAt: doc.createdAt || new Date().toISOString(),
            author: userData.name,
            avatar: userData.avatar,
          };
        })
      );

      console.log(
        `Processed ${processedReviews.length} reviews with user data`
      );

      // Set final reviews state
      setReviews(processedReviews);
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
      console.log("\n=== SUBMITTING REVIEW ===");
      console.log(`Agent ID: ${agentId}`);
      console.log(`User ID: ${rawUser.$id}`);

      // Create with direct agentId format (which we know works)
      console.log("Creating review with direct agentId format");

      const reviewData = {
        agentId: agentId, // Direct string assignment
        agentRating: rating,
        comment,
        createdAt: new Date().toISOString(),
      };

      console.log("Review data:", JSON.stringify(reviewData));

      const newReview = await databases.createDocument(
        config.databaseId!,
        config.agentReviewsCollectionId!,
        ID.unique(),
        reviewData,
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(rawUser.$id)),
          Permission.delete(Role.user(rawUser.$id)),
        ]
      );

      console.log(`Review created successfully with ID: ${newReview.$id}`);

      // Format for display
      const formattedReview: Review = {
        $id: newReview.$id,
        users: [rawUser.$id],
        agentId: agentId,
        agentRating: rating,
        comment,
        createdAt: new Date().toISOString(),
        author: rawUser.name || "Anonymous",
        avatar: rawUser.avatar || "https://via.placeholder.com/40",
      };

      // Update local state
      setReviews((prevReviews) => [formattedReview, ...prevReviews]);

      // Reset form and close modal
      setIsModalVisible(false);
      setRating(0);
      setComment("");

      Alert.alert("Success", "Your review has been submitted!");

      // Refresh reviews after a short delay
      setTimeout(() => {
        fetchReviews();
      }, 1000);
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    }
  };

  const renderStars = (rating: number) => (
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

  // Debug info component
  //   const renderDebugInfo = () => {
  //     if (!debugMode) return null;

  //     return (
  //       <View style={styles.debugPanel}>
  //         <Text style={styles.debugTitle}>DEBUG INFO</Text>
  //         <Text style={styles.debugText}>Agent ID: {debugInfo.agentId}</Text>
  //         <Text style={styles.debugText}>
  //           Total Reviews: {debugInfo.totalReviews}
  //         </Text>
  //         <Text style={styles.debugText}>
  //           Non-Null Reviews: {debugInfo.nonNullReviews}
  //         </Text>
  //         <Text style={styles.debugText}>
  //           Matching Reviews: {debugInfo.matchingReviews}
  //         </Text>
  //         <Text style={styles.debugText}>
  //           Current State Reviews: {reviews.length}
  //         </Text>

  //         {debugInfo.reviewDetails.length > 0 && (
  //           <>
  //             <Text style={styles.debugSubtitle}>Review Details:</Text>
  //             {debugInfo.reviewDetails.map((review, index) => (
  //               <View key={index} style={styles.debugReviewItem}>
  //                 <Text style={styles.debugText}>ID: {review.id}</Text>
  //                 <Text style={styles.debugText}>
  //                   AgentID:{" "}
  //                   {typeof review.agentId === "object"
  //                     ? JSON.stringify(review.agentId)
  //                     : review.agentId}
  //                 </Text>
  //                 <Text style={styles.debugText}>Type: {review.agentIdType}</Text>
  //                 <Text style={styles.debugText}>
  //                   Match: {review.isExactMatch ? "Yes" : "No"}
  //                 </Text>
  //               </View>
  //             ))}
  //           </>
  //         )}
  //       </View>
  //     );
  //   };

  return (
    <View>
      {/* Leave a Review Button */}
      {/* <View>
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Text className="text-text text-center">Leave a Review</Text>
        </TouchableOpacity>
      </View> */}

      {/* Debug Toggle */}
      {/* <TouchableOpacity
        style={styles.debugToggle}
        onPress={() => setDebugMode(!debugMode)}
      >
        <Text style={styles.debugToggleText}>
          {debugMode ? "Hide Debug" : "Show Debug"}
        </Text>
      </TouchableOpacity> */}

      {/* Debug Info */}
      {/* {renderDebugInfo()} */}

      {/* Loading state */}
      {loading && (
        <View className="py-4 flex items-center">
          <ActivityIndicator size="small" color="#1ABC9C" />
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
        <>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.$id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16 }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item, index }) => (
              <View style={styles.reviewCard}>
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
                {/* {debugMode && (
                  <Text style={styles.reviewId}>
                    ID: {item.$id.substring(0, 8)}...
                  </Text>
                )} */}
              </View>
            )}
          />
        </>
      )}

      {/* Review Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-white/10 bg-opacity-50">
          <View className="m-8 w-full h-1/2 px-4">
            <View className="bg-white p-4 rounded-lg w-full">
              <Text className="text-lg font-bold mb-3">Leave a Review</Text>
              <View className="flex flex-row mb-4">
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
              <CustomInput
                placeholder="Write your review..."
                value={comment}
                onChangeText={setComment}
                height={90}
              />
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
                  className="p-2 bg-primary-300 rounded"
                >
                  <Text className="text-white">Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Refresh Button */}
      {/* <TouchableOpacity onPress={fetchReviews} style={styles.refreshButton}>
        <Text style={styles.refreshButtonText}>Refresh Reviews</Text>
      </TouchableOpacity> */}
      <View className="bg-primary-100">
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Text className="text-text text-center">Leave a Review</Text>
        </TouchableOpacity>
      </View>
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
  debugToggle: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  debugToggleText: {
    fontSize: 10,
    color: "#4B5563",
  },
  debugPanel: {
    margin: 8,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4B5563",
    marginBottom: 4,
  },
  debugSubtitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#4B5563",
    marginTop: 6,
    marginBottom: 2,
  },
  debugText: {
    fontSize: 10,
    color: "#4B5563",
    marginBottom: 2,
  },
  debugReviewItem: {
    marginLeft: 8,
    marginBottom: 4,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: "#D1D5DB",
  },
  reviewId: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: "#EEF2FF",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    margin: 8,
  },
  refreshButtonText: {
    color: "#4F46E5",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",

    marginTop: 8,
  },
});
