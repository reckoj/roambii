import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";

// Define interfaces for type safety
export interface DayPlan {
  id: string;
  itineraryId: string;
  dayNumber: number;
  title: string;
  description?: string;
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  dayPlanId: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Itinerary {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  dayPlans: DayPlan[];
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a new itinerary
 */
export const createItinerary = async (itineraryData: Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const itineraryRef = await addDoc(collection(firestore, COLLECTIONS.ITINERARIES), {
      ...itineraryData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return itineraryRef.id;
  } catch (error) {
    console.error("Error creating itinerary:", error);
    throw error;
  }
};

/**
 * Updates an existing itinerary
 */
export const updateItinerary = async (itineraryId: string, updateData: Partial<Itinerary>) => {
  try {
    const itineraryRef = doc(firestore, COLLECTIONS.ITINERARIES, itineraryId);
    await updateDoc(itineraryRef, {
      ...updateData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating itinerary:", error);
    throw error;
  }
};

/**
 * Gets a specific itinerary by ID
 */
export const getItinerary = async (itineraryId: string): Promise<Itinerary | null> => {
  try {
    const itineraryRef = doc(firestore, COLLECTIONS.ITINERARIES, itineraryId);
    const itinerarySnap = await getDoc(itineraryRef);
    if (itinerarySnap.exists()) {
      return { id: itinerarySnap.id, ...itinerarySnap.data() } as Itinerary;
    }
    return null;
  } catch (error) {
    console.error("Error getting itinerary:", error);
    throw error;
  }
};

/**
 * Gets all itineraries for a specific user
 */
export const getUserItineraries = async (userId: string): Promise<Itinerary[]> => {
  try {
    const itinerariesQuery = query(
      collection(firestore, COLLECTIONS.ITINERARIES),
      where("userId", "==", userId)
    );
    const itinerariesSnap = await getDocs(itinerariesQuery);
    return itinerariesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Itinerary[];
  } catch (error) {
    console.error("Error getting user itineraries:", error);
    throw error;
  }
};

/**
 * Deletes an itinerary
 */
export const deleteItinerary = async (itineraryId: string): Promise<boolean> => {
  try {
    const itineraryRef = doc(firestore, COLLECTIONS.ITINERARIES, itineraryId);
    await deleteDoc(itineraryRef);
    return true;
  } catch (error) {
    console.error("Error deleting itinerary:", error);
    throw error;
  }
};

/**
 * Updates a day plan
 */
export const updateDayPlan = async (
  dayPlanId: string,
  updatedData: Partial<Omit<DayPlan, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> => {
  try {
    const dayPlanRef = doc(firestore, COLLECTIONS.DAY_PLANS, dayPlanId);
    await updateDoc(dayPlanRef, {
      ...updatedData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating day plan:", error);
    throw error;
  }
};

/**
 * Creates or updates an activity
 */
export const saveActivity = async (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const activityRef = await addDoc(collection(firestore, COLLECTIONS.ACTIVITIES), {
      ...activity,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return activityRef.id;
  } catch (error) {
    console.error("Error saving activity:", error);
    throw error;
  }
};

/**
 * Share an itinerary with another user
 */
export const shareItinerary = async (
  itineraryId: string,
  userIdToShareWith: string
): Promise<boolean> => {
  try {
    const itineraryRef = doc(firestore, COLLECTIONS.ITINERARIES, itineraryId);
    const itinerarySnap = await getDoc(itineraryRef);
    
    if (!itinerarySnap.exists()) {
      throw new Error("Itinerary not found");
    }

    const itinerary = itinerarySnap.data() as Itinerary;
    const currentSharedWith = Array.isArray(itinerary.sharedWith) ? itinerary.sharedWith : [];

    if (!currentSharedWith.includes(userIdToShareWith)) {
      await updateDoc(itineraryRef, {
        sharedWith: [...currentSharedWith, userIdToShareWith],
        updatedAt: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error("Error sharing itinerary:", error);
    throw error;
  }
};

/**
 * Remove a user's access to an itinerary
 */
export const removeItineraryAccess = async (
  itineraryId: string,
  userIdToRemove: string
): Promise<boolean> => {
  try {
    const itineraryRef = doc(firestore, COLLECTIONS.ITINERARIES, itineraryId);
    const itinerarySnap = await getDoc(itineraryRef);
    
    if (!itinerarySnap.exists()) {
      throw new Error("Itinerary not found");
    }

    const itinerary = itinerarySnap.data() as Itinerary;
    if (!Array.isArray(itinerary.sharedWith)) {
      return true;
    }

    const updatedSharedWith = itinerary.sharedWith.filter(id => id !== userIdToRemove);
    await updateDoc(itineraryRef, {
      sharedWith: updatedSharedWith,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error("Error removing itinerary access:", error);
    throw error;
  }
};
