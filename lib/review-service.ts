// lib/firebase/reviewService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";
import { Review } from "./firebase/models";
import { getUserProfile } from "./user-service";

/**
 * Get all reviews for an agent
 */
export const getAgentReviews = async (agentId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(firestore, COLLECTIONS.REVIEWS);
    const q = query(
      reviewsRef,
      where("agentId", "==", agentId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const reviews: Review[] = [];

    querySnapshot.forEach((doc) => {
      const reviewData = doc.data() as Omit<Review, "id">;

      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt:
          reviewData.createdAt instanceof Timestamp
            ? reviewData.createdAt.toDate()
            : reviewData.createdAt,
        updatedAt:
          reviewData.updatedAt instanceof Timestamp
            ? reviewData.updatedAt.toDate()
            : reviewData.updatedAt,
      });
    });

    return reviews;
  } catch (error) {
    console.error("Error fetching agent reviews:", error);
    return [];
  }
};

/**
 * Check if a user has already reviewed an agent
 */
export const hasUserReviewedAgent = async (
  userId: string,
  agentId: string
): Promise<boolean> => {
  try {
    const reviewsRef = collection(firestore, COLLECTIONS.REVIEWS);
    const q = query(
      reviewsRef,
      where("userId", "==", userId),
      where("agentId", "==", agentId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking if user has reviewed agent:", error);
    return false;
  }
};

/**
 * Create a new review for an agent
 * This function also updates the agent's rating
 */
export const createReview = async (
  agentId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<Review | null> => {
  try {
    // Check if user has already reviewed this agent
    const alreadyReviewed = await hasUserReviewedAgent(userId, agentId);
    if (alreadyReviewed) {
      throw new Error("You have already reviewed this agent");
    }

    // Get user details for the review
    const user = await getUserProfile(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create a new review document
    const reviewRef = doc(collection(firestore, COLLECTIONS.REVIEWS));

    const reviewData: Omit<Review, "id"> = {
      agentId,
      userId,
      rating,
      comment,
      author: user.name,
      avatar: user.avatar || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use a transaction to update the review and the agent's rating
    await runTransaction(firestore, async (transaction) => {
      // Add the review
      transaction.set(reviewRef, reviewData);

      // Get the agent document
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
      const agentDoc = await transaction.get(agentRef);

      if (!agentDoc.exists()) {
        throw new Error("Agent not found");
      }

      // Calculate new rating
      const agentData = agentDoc.data();
      const currentRating = agentData.rating || 0;
      const reviewCount = agentData.reviewCount || 0;

      // Calculate new average rating
      const newReviewCount = reviewCount + 1;
      const newRating = (currentRating * reviewCount + rating) / newReviewCount;

      // Update agent document
      transaction.update(agentRef, {
        rating: newRating,
        reviewCount: newReviewCount,
        updatedAt: new Date(),
      });
    });

    return {
      id: reviewRef.id,
      ...reviewData,
    };
  } catch (error) {
    console.error("Error creating review:", error);
    return null;
  }
};

/**
 * Update a review
 * This function also updates the agent's rating
 */
export const updateReview = async (
  reviewId: string,
  updatedData: {
    rating?: number;
    comment?: string;
  }
): Promise<Review | null> => {
  try {
    const reviewRef = doc(firestore, COLLECTIONS.REVIEWS, reviewId);

    // Use a transaction to update the review and the agent's rating
    const reviewData = await runTransaction(firestore, async (transaction) => {
      // Get the current review
      const reviewDoc = await transaction.get(reviewRef);

      if (!reviewDoc.exists()) {
        throw new Error("Review not found");
      }

      const currentReviewData = reviewDoc.data() as Omit<Review, "id">;
      const agentId = currentReviewData.agentId;

      // Update review document
      const updateData: any = {
        ...updatedData,
        updatedAt: new Date(),
      };

      transaction.update(reviewRef, updateData);

      // If rating has changed, update agent's rating
      if (
        updatedData.rating !== undefined &&
        updatedData.rating !== currentReviewData.rating
      ) {
        // Get agent document
        const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
        const agentDoc = await transaction.get(agentRef);

        if (!agentDoc.exists()) {
          throw new Error("Agent not found");
        }

        // Calculate new rating
        const agentData = agentDoc.data();
        const currentAgentRating = agentData.rating || 0;
        const reviewCount = agentData.reviewCount || 0;

        if (reviewCount > 0) {
          // Subtract old rating and add new rating
          const oldRatingContribution = currentReviewData.rating / reviewCount;
          const newRatingContribution = updatedData.rating / reviewCount;
          const newRating =
            currentAgentRating - oldRatingContribution + newRatingContribution;

          // Update agent document with new rating
          transaction.update(agentRef, {
            rating: newRating,
            updatedAt: new Date(),
          });
        }
      }

      // Return updated review data
      return {
        ...currentReviewData,
        ...updateData,
      };
    });

    // Return complete review object
    return {
      id: reviewId,
      ...reviewData,
      createdAt:
        reviewData.createdAt instanceof Timestamp
          ? reviewData.createdAt.toDate()
          : reviewData.createdAt,
      updatedAt:
        reviewData.updatedAt instanceof Timestamp
          ? reviewData.updatedAt.toDate()
          : reviewData.updatedAt,
    };
  } catch (error) {
    console.error("Error updating review:", error);
    return null;
  }
};

/**
 * Delete a review
 * This function also updates the agent's rating
 */
export const deleteReview = async (reviewId: string): Promise<boolean> => {
  try {
    const reviewRef = doc(firestore, COLLECTIONS.REVIEWS, reviewId);

    // Use a transaction to delete the review and update the agent's rating
    await runTransaction(firestore, async (transaction) => {
      // Get the current review
      const reviewDoc = await transaction.get(reviewRef);

      if (!reviewDoc.exists()) {
        throw new Error("Review not found");
      }

      const reviewData = reviewDoc.data() as Review;
      const agentId = reviewData.agentId;

      // Delete the review
      transaction.delete(reviewRef);

      // Get agent document
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
      const agentDoc = await transaction.get(agentRef);

      if (!agentDoc.exists()) {
        throw new Error("Agent not found");
      }

      // Calculate new rating
      const agentData = agentDoc.data();
      const currentRating = agentData.rating || 0;
      const reviewCount = agentData.reviewCount || 0;

      if (reviewCount <= 1) {
        // If this was the only review, reset rating to 0
        transaction.update(agentRef, {
          rating: 0,
          reviewCount: 0,
          updatedAt: new Date(),
        });
      } else {
        // Calculate new average by removing this rating
        const newReviewCount = reviewCount - 1;
        const newRating =
          (currentRating * reviewCount - reviewData.rating) / newReviewCount;

        // Update agent document
        transaction.update(agentRef, {
          rating: newRating,
          reviewCount: newReviewCount,
          updatedAt: new Date(),
        });
      }
    });

    return true;
  } catch (error) {
    console.error("Error deleting review:", error);
    return false;
  }
};

/**
 * Get a specific review by ID
 */
export const getReviewById = async (
  reviewId: string
): Promise<Review | null> => {
  try {
    const reviewRef = doc(firestore, COLLECTIONS.REVIEWS, reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return null;
    }

    const reviewData = reviewDoc.data() as Omit<Review, "id">;

    return {
      id: reviewId,
      ...reviewData,
      createdAt:
        reviewData.createdAt instanceof Timestamp
          ? reviewData.createdAt.toDate()
          : reviewData.createdAt,
      updatedAt:
        reviewData.updatedAt instanceof Timestamp
          ? reviewData.updatedAt.toDate()
          : reviewData.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching review:", error);
    return null;
  }
};

/**
 * Get all reviews submitted by a user
 */
export const getUserReviews = async (userId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(firestore, COLLECTIONS.REVIEWS);
    const q = query(
      reviewsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const reviews: Review[] = [];

    querySnapshot.forEach((doc) => {
      const reviewData = doc.data() as Omit<Review, "id">;

      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt:
          reviewData.createdAt instanceof Timestamp
            ? reviewData.createdAt.toDate()
            : reviewData.createdAt,
        updatedAt:
          reviewData.updatedAt instanceof Timestamp
            ? reviewData.updatedAt.toDate()
            : reviewData.updatedAt,
      });
    });

    return reviews;
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return [];
  }
};
