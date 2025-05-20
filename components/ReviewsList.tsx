import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Star, X } from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore, COLLECTIONS } from "@/lib/firebase/firebase-config";
import CustomInput from "@/components/CustomInput";
import ReviewModal, { ReviewDetails } from "./ReviewModal";
import { getClientDetailsFromBookings } from "@/lib/client-service";

// Using the ReviewDetails interface imported from ReviewModal.tsx

interface ReviewsListProps {
  agentId: string;
}

interface ReviewData {
  id: string;
  userId: string;
  agentId: string;
  agentRating: number;
  comment: string;
  createdAt: any;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ agentId }) => {
  const { rawUser } = useGlobalContext();
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<ReviewDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewDetails | null>(null);
  const [hasPurchasedPackage, setHasPurchasedPackage] = useState(false);
  const [checkingPurchaseStatus, setCheckingPurchaseStatus] = useState(false);

  useEffect(() => {
    if (agentId) {
      console.log("Fetching reviews for agent:", agentId);
      fetchReviews();
      
      // Check if user has purchased a package from this agent
      if (rawUser && rawUser.id) {
        checkUserPurchaseStatus(rawUser.id, agentId);
      }
    }
  }, [agentId, rawUser]);

  const checkUserPurchaseStatus = async (userId: string, agentId: string) => {
    try {
      setCheckingPurchaseStatus(true);
      console.log(`Checking if user ${userId} has purchased a package from agent ${agentId}`);
      
      // Use getClientDetailsFromBookings to check if there's a client relationship
      const clientDetails = await getClientDetailsFromBookings(agentId, userId);
      
      // If clientDetails is not null and they have at least one booking, they've purchased a package
      const hasPurchased = !!clientDetails && 
                          !!clientDetails.bookings && 
                          clientDetails.bookings.length > 0;
      
      console.log(`User has${hasPurchased ? '' : ' not'} purchased a package from this agent`);
      setHasPurchasedPackage(hasPurchased);
    } catch (error) {
      console.error("Error checking purchase status:", error);
      setHasPurchasedPackage(false);
    } finally {
      setCheckingPurchaseStatus(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      console.log("Fetching reviews for agent ID:", agentId);

      // Get all reviews for this agent
      const reviewsQuery = query(
        collection(firestore, COLLECTIONS.REVIEWS),
        where("agentId", "==", agentId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const matchingReviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReviewData[];

      console.log(`Found ${matchingReviews.length} reviews for agent ${agentId}`);

      // Sort by date, newest first
      matchingReviews.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt.toDate()).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt.toDate()).getTime() : 0;
        return dateB - dateA;
      });

      // Process reviews to include user data
      const processedReviews = await Promise.all(
        matchingReviews.map(async (review) => {
          // Default user data
          let userData = {
            name: "Anonymous",
            avatar: "https://via.placeholder.com/40",
          };

          // Try to get user info
          if (review.userId) {
            try {
              const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, review.userId));
              if (userDoc.exists()) {
                const userDataFromDoc = userDoc.data();
                userData = {
                  name: userDataFromDoc.name || "Anonymous",
                  avatar: userDataFromDoc.avatar || "https://via.placeholder.com/40",
                };
              }
            } catch (error) {
              console.log("Error fetching user data:", error);
            }
          }

          // Return formatted review
          return {
            id: review.id,
            userId: review.userId,
            agentId: review.agentId || agentId,
            agentRating: review.agentRating || 0,
            comment: review.comment || "",
            createdAt: review.createdAt ? review.createdAt.toDate().toISOString() : new Date().toISOString(),
            author: userData.name,
            avatar: userData.avatar,
          };
        })
      );

      // Check if current user has already reviewed
      if (rawUser) {
        const hasReviewed = processedReviews.some(
          (review) => review.userId === rawUser.id
        );
        setUserHasReviewed(hasReviewed);
      }

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

    if (userHasReviewed) {
      Alert.alert("Error", "You have already reviewed this agent.");
      setIsReviewModalVisible(false);
      return;
    }

    if (!hasPurchasedPackage) {
      Alert.alert(
        "Not Eligible", 
        "You need to purchase a package from this agent before leaving a review."
      );
      setIsReviewModalVisible(false);
      return;
    }

    try {
      console.log("Submitting review for agent:", agentId);

      const reviewData = {
        agentId: agentId,
        agentRating: rating,
        comment,
        createdAt: serverTimestamp(),
        userId: rawUser.id,
      };

      const newReview = await addDoc(collection(firestore, COLLECTIONS.REVIEWS), reviewData);

      // Refresh reviews after submission
      await fetchReviews();
      setIsReviewModalVisible(false);
      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    }
  };

  const renderRatingStars = (value: number) => (
    <View style={styles.starContainer}>
      {[...Array(5)].map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i + 1)}
          style={{ padding: 2 }}
        >
          <Star
            size={24}
            color={i < value ? "#FDB814" : "#D1D5DB"}
            fill={i < value ? "#FDB814" : "none"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleReviewPress = (review: ReviewDetails) => {
    setSelectedReview(review);
    setIsDetailsModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header with review count and add button */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
        {!userHasReviewed && !checkingPurchaseStatus && hasPurchasedPackage && (
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => setIsReviewModalVisible(true)}
          >
            <Text style={styles.addReviewText}>Add Review</Text>
          </TouchableOpacity>
        )}
        {!userHasReviewed && !checkingPurchaseStatus && !hasPurchasedPackage && rawUser && (
          <Text style={styles.notEligibleText}>
            Purchase Required to Review
          </Text>
        )}
      </View>

      {/* Loading indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1ABC9C" size="small" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>
            No reviews yet. Be the first to leave a review!
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reviewsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.reviewCard}
              onPress={() => handleReviewPress(item)}
            >
              <View style={styles.reviewHeader}>
                <Image
                  source={{ uri: item.avatar }}
                  style={styles.reviewerAvatar}
                />
                <Text style={styles.reviewerName}>{item.author}</Text>
              </View>
              <View style={styles.starContainer}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    color={i < item.agentRating ? "#FDB814" : "#D1D5DB"}
                    fill={i < item.agentRating ? "#FDB814" : "none"}
                  />
                ))}
              </View>
              <Text numberOfLines={3} style={styles.reviewPreview}>
                {item.comment}
              </Text>
              <Text style={styles.reviewDate}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "Recent"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Review Modal */}
      <Modal visible={isReviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave a Review</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setIsReviewModalVisible(false);
                  setRating(0);
                  setComment("");
                }}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              {renderRatingStars(rating)}
              <Text style={styles.commentLabel}>Your Review</Text>
              <CustomInput
                placeholder="Write your review..."
                value={comment}
                onChangeText={setComment}
                multiline
                height={120}
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleReviewSubmit}
              >
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Detail Modal */}
      <ReviewModal
        isModalVisible={isDetailsModalVisible}
        setIsModalVisible={setIsDetailsModalVisible}
        selectedReview={selectedReview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  addReviewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
  },
  addReviewText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: "#8A8D9F",
  },
  noReviewsContainer: {
    padding: 20,
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    alignItems: "center",
  },
  noReviewsText: {
    color: "#8A8D9F",
    textAlign: "center",
  },
  reviewsList: {
    paddingVertical: 8,
  },
  reviewCard: {
    width: 220,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontWeight: "600",
    color: "#333333",
  },
  starContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  reviewPreview: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: "#8A8D9F",
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "100%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    gap: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: "#1ABC9C",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  notEligibleText: {
    color: "#8A8D9F",
    fontSize: 12,
    fontStyle: "italic",
  },
});

// This is needed for the Modal component
const Modal = require("react-native").Modal;

export default ReviewsList;
