// lib/review-service.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";
import { Review } from "./firebase/models";
import { getUserProfile } from "./user-service";

/**
 * Get all reviews for an agent
 * @param agentId The ID of the agent
 * @returns Array of reviews
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
 * @param userId The ID of the user
 * @param agentId The ID of the agent
 * @returns Boolean indicating if user has reviewed
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
 * @param agentId The ID of the agent
 * @param userId The ID of the user leaving the review
 * @param rating The rating (1-5)
 * @param comment The review text
 * @returns The created review or null
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

    // Use a transaction to create the review and update agent rating
    return await runTransaction(firestore, async (transaction) => {
      // First get the agent document
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
      const agentDoc = await transaction.get(agentRef);

      if (!agentDoc.exists()) {
        throw new Error("Agent not found");
      }

      // Create a new review
      const reviewsRef = collection(firestore, COLLECTIONS.REVIEWS);
      const newReviewRef = doc(reviewsRef);

      const reviewData: Omit<Review, "id"> = {
        agentId,
        userId,
        rating: Math.min(Math.max(rating, 1), 5), // Ensure rating is between 1-5
        comment,
        author: user.name,
        avatar: user.avatar,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate new rating
      const agentData = agentDoc.data();
      const currentRating = agentData.rating || 0;
      const currentReviewCount = agentData.reviewCount || 0;

      // Calculate weighted average
      const newReviewCount = currentReviewCount + 1;
      const newRating =
        (currentRating * currentReviewCount + rating) / newReviewCount;

      // Set the review document
      transaction.set(newReviewRef, {
        ...reviewData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update the agent document
      transaction.update(agentRef, {
        rating: newRating,
        reviewCount: newReviewCount,
        updatedAt: serverTimestamp(),
      });

      // Return the new review
      return {
        id: newReviewRef.id,
        ...reviewData,
      };
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return null;
  }
};

/**
 * Update an existing review
 * @param reviewId The ID of the review to update
 * @param updates The fields to update
 * @returns The updated review or null
 */
export const updateReview = async (
  reviewId: string,
  updates: {
    rating?: number;
    comment?: string;
  }
): Promise<Review | null> => {
  try {
    const reviewRef = doc(firestore, COLLECTIONS.REVIEWS, reviewId);

    // First, get the current review data
    const reviewDoc = await getDoc(reviewRef);
    if (!reviewDoc.exists()) {
      throw new Error("Review not found");
    }

    const reviewData = reviewDoc.data() as Omit<Review, "id">;
    const oldRating = reviewData.rating;
    const agentId = reviewData.agentId;

    // Only proceed with update if rating changed
    if (updates.rating !== undefined && updates.rating !== oldRating) {
      // Use transaction to update both review and agent rating
      return await runTransaction(firestore, async (transaction) => {
        // Get the agent document
        const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
        const agentDoc = await transaction.get(agentRef);

        if (!agentDoc.exists()) {
          throw new Error("Agent not found");
        }

        // Prepare the updates for the review
        const updateData: any = {
          ...updates,
          updatedAt: serverTimestamp(),
        };

        // Ensure rating is between 1-5
        if (updates.rating !== undefined) {
          updateData.rating = Math.min(Math.max(updates.rating, 1), 5);
        }

        transaction.update(reviewRef, updateData);

        // Update agent rating
        const agentData = agentDoc.data();
        const currentRating = agentData.rating || 0;
        const reviewCount = agentData.reviewCount || 0;

        if (reviewCount > 1) {
          // Remove old rating and add new one
          const newRating =
            (currentRating * reviewCount -
              oldRating +
              (updates.rating || oldRating)) /
            reviewCount;

          transaction.update(agentRef, {
            rating: newRating,
            updatedAt: serverTimestamp(),
          });
        }

        // Return the updated review
        return {
          id: reviewId,
          ...reviewData,
          ...updates,
          rating: updates.rating || reviewData.rating,
          updatedAt: new Date(),
        };
      });
    } else {
      // Just update the review without affecting agent rating
      await updateDoc(reviewRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Return the updated review
      return {
        id: reviewId,
        ...reviewData,
        ...updates,
        updatedAt: new Date(),
      };
    }
  } catch (error) {
    console.error("Error updating review:", error);
    return null;
  }
};

/**
 * Delete a review
 * @param reviewId The ID of the review to delete
 * @returns Boolean indicating success
 */
export const deleteReview = async (reviewId: string): Promise<boolean> => {
  try {
    // Use transaction to delete review and update agent rating
    await runTransaction(firestore, async (transaction) => {
      const reviewRef = doc(firestore, COLLECTIONS.REVIEWS, reviewId);
      const reviewDoc = await transaction.get(reviewRef);

      if (!reviewDoc.exists()) {
        throw new Error("Review not found");
      }

      const reviewData = reviewDoc.data() as Omit<Review, "id">;
      const agentId = reviewData.agentId;
      const rating = reviewData.rating;

      // Get the agent document
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
      const agentDoc = await transaction.get(agentRef);

      if (!agentDoc.exists()) {
        throw new Error("Agent not found");
      }

      // Delete the review
      transaction.delete(reviewRef);

      // Update agent rating
      const agentData = agentDoc.data();
      const currentRating = agentData.rating || 0;
      const reviewCount = agentData.reviewCount || 0;

      if (reviewCount <= 1) {
        // If this was the only review, reset rating to 0
        transaction.update(agentRef, {
          rating: 0,
          reviewCount: 0,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Calculate new rating by removing this rating
        const newReviewCount = reviewCount - 1;
        const newRating =
          (currentRating * reviewCount - rating) / newReviewCount;

        transaction.update(agentRef, {
          rating: newRating,
          reviewCount: newReviewCount,
          updatedAt: serverTimestamp(),
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
 * Get reviews by user
 * @param userId The ID of the user
 * @returns Array of reviews created by the user
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
