import React, { useState, useEffect } from "react";
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
import { firestore } from "@/lib/firebase/firebase-config";
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc, addDoc, orderBy, limit } from "firebase/firestore"; 
import CustomInput from "./CustomInput";
import images from "@/constants/images";

interface Review {
  id: string;
  users: string[];
  agentId: any;
  agentRating: number;
  comment: string;
  createdAt: string;
  author: string;
  avatar: string;
  // Firebase uses security rules instead of permissions field
  permissions?: string[];
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
  const [userHasReviewed, setUserHasReviewed] = useState(false);
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

  // Check if current user has already reviewed this agent
  useEffect(() => {
    if (rawUser && reviews.length > 0) {
      const userReview = reviews.find(
        (review) =>
          // Check if user ID is in users array
          Array.isArray(review.users) && review.users.includes(rawUser.id)
      );

      setUserHasReviewed(!!userReview);
      console.log("User has already reviewed this agent:", !!userReview);
    }
  }, [reviews, rawUser]);

  const fetchReviews = async () => {
    try {
      console.log("\n=== FETCHING REVIEWS ===");
      setLoading(true);

      // Get all reviews using Firebase
      const reviewsRef = collection(firestore, 'agentReviews');
      const reviewsQuery = query(
        reviewsRef,
        where('agentId', '==', agentId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(reviewsQuery);
      const allReviews = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Review));

      console.log(`Found ${allReviews.length} total reviews`);

      // Check how many reviews have non-null agentId
      const reviewsWithNonNullAgentId = allReviews.filter(
        (doc) => doc.agentId !== null
      );
      console.log(
        `Found ${reviewsWithNonNullAgentId.length} reviews with non-null agentId`
      );

      // Log the details of each review with non-null agentId
      const reviewDetails = reviewsWithNonNullAgentId.map((doc) => {
        return {
          id: doc.id,
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

      // Process reviews to include user data
      const processedReviews = await Promise.all(
        allReviews.map(async (review) => {
          console.log(`Processing review: ${review.id}`);

          // Default user data
          let userData = {
            name: "Anonymous",
            avatar: "https://via.placeholder.com/40",
          };

          // Try to get user info
          let userId = null;

          // Check users array for user ID
          if (review.users && Array.isArray(review.users) && review.users.length > 0) {
            userId = typeof review.users[0] === "string" 
              ? review.users[0] 
              : (review.users[0] as any)?.id;
            if (userId) {
              console.log(`Found user ID in users array: ${userId}`);
            }
          }

          // If we found a user ID, try to get user info
          if (userId) {
            try {
              // Get user document from Firestore
              const userDocRef = firestoreDoc(firestore, 'users', userId);
              const userSnapshot = await getDoc(userDocRef);
              
              if (userSnapshot.exists()) {
                const userDoc = userSnapshot.data() as any;
                console.log(`Found user by ID: ${userDoc.name}`);
                userData = {
                  name: userDoc.name || "Anonymous",
                  avatar: userDoc.avatar || "https://via.placeholder.com/40",
                };
              }
            } catch (error) {
              console.log(`Error fetching user by ID: ${error}`);
              
              // Try querying by userId field as fallback
              try {
                const usersRef = collection(firestore, 'users');
                const userQuery = query(usersRef, where('userId', '==', userId));
                const userQuerySnapshot = await getDocs(userQuery);
                
                if (!userQuerySnapshot.empty) {
                  const userDoc = userQuerySnapshot.docs[0].data() as any;
                  console.log(`Found user by userId field: ${userDoc.name}`);
                  userData = {
                    name: userDoc.name || "Anonymous",
                    avatar: userDoc.avatar || "https://via.placeholder.com/40",
                  };
                }
              } catch (secondError) {
                console.log(`Error fetching user by userId field: ${error}`);
              }
            }
          }

          // Return formatted review
          return {
            id: review.id,
            users: review.users || [],
            agentId: review.agentId || agentId,
            agentRating: review.agentRating || 0,
            comment: review.comment || "",
            createdAt: review.createdAt || new Date().toISOString(),
            author: userData.name,
            avatar: userData.avatar,
            permissions: [], // Firebase doesn't use $permissions
          };
        })
      );

      console.log(`Processed ${processedReviews.length} reviews with user data`);

      // Check if current user has already reviewed
      if (rawUser) {
        const hasReviewed = processedReviews.some(
          (review) => 
            // Check if user ID is in users array
            Array.isArray(review.users) && review.users.includes(rawUser.id)
        );

        setUserHasReviewed(hasReviewed);
        console.log("User has already reviewed this agent:", hasReviewed);
      }

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

    if (!rawUser || !rawUser.id) {
      Alert.alert("Error", "You must be logged in to leave a review.");
      return;
    }

    // Check if user has already reviewed this agent
    if (userHasReviewed) {
      Alert.alert("Error", "You have already reviewed this agent.");
      setIsModalVisible(false);
      return;
    }

    try {
      console.log("\n=== SUBMITTING REVIEW ===");
      console.log(`Agent ID: ${agentId}`);
      console.log(`User ID: ${rawUser.id}`);

      // Create review with Firebase
      const reviewData = {
        agentId: agentId,
        agentRating: rating,
        comment,
        createdAt: new Date().toISOString(),
        users: [rawUser.id], // Add user ID to the users array
      };

      console.log("Review data:", JSON.stringify(reviewData));

      // Add review to Firestore
      const reviewsRef = collection(firestore, 'agentReviews');
      const newReviewDoc = await addDoc(reviewsRef, reviewData);

      console.log(`Review created successfully with ID: ${newReviewDoc.id}`);

      // Format for display
      const formattedReview: Review = {
        id: newReviewDoc.id,
        users: [rawUser.id],
        agentId: agentId,
        agentRating: rating,
        comment,
        createdAt: new Date().toISOString(),
        author: rawUser.name || "Anonymous",
        avatar: rawUser.avatar!,
        permissions: [],
      };

      // Update local state
      setReviews((prevReviews) => [formattedReview, ...prevReviews]);
      setUserHasReviewed(true); // Update the flag to indicate user has reviewed

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

  return (
    <View>
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
            keyExtractor={(item) => item.id}
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

      {/* Leave Review or View Your Review Button */}
      <View className="bg-primary-100">
        {!userHasReviewed ? (
          <TouchableOpacity onPress={() => setIsModalVisible(true)}>
            <Text className="text-text text-center">Leave a Review</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-text text-center opacity-70">
            You've already reviewed this agent
          </Text>
        )}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
  },
});
