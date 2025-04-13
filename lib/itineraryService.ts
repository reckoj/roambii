import { databases, config, account } from "./appwrite";
import { ID, Query } from "react-native-appwrite";
import { Itinerary, DayPlan, Activity, ItineraryWithDetails } from "./models";

/**
 * Creates a new itinerary with optional day plans and activities
 * @param itinerary The itinerary data
 * @param dayPlans Optional array of day plans to create
 * @param activities Optional activities mapped to day plans by index
 * @returns The created itinerary with IDs filled in
 */
export const createItinerary = async (
  itinerary: Itinerary,
  dayPlans?: Omit<DayPlan, "itineraries_Id">[],
  activities?: { [dayPlanIndex: number]: Omit<Activity, "dayPlansId">[] }
): Promise<Itinerary> => {
  try {
    console.log("Creating itinerary with modified userId as array");

    /// Remove any existing $id if present to prevent conflicts
    const { $id, userId, ...otherItineraryData } = itinerary;

    // Create a modified version of the itinerary data with userId as an array
    // This handles the case where the relationship is configured to expect an array
    const modifiedData = {
      ...otherItineraryData,
      userId: [userId], // Convert single ID to array of IDs
      sharedWith: [], // Initialize empty sharedWith array
      createdAt: new Date().toISOString(),
    };
    console.log("Creating itinerary with user ID: Chii", userId);
    console.log(
      "Attempting to create itinerary with userId as array:",
      modifiedData
    );

    // Try creating with userId as array
    const createdItinerary = (await databases.createDocument(
      config.databaseId!,
      config.itinerariesCollectionId!,
      ID.unique(),
      modifiedData
    )) as unknown as Itinerary;

    console.log(
      "Successfully created itinerary with ID:",
      createdItinerary.$id
    );

    // If we get here, creation was successful

    // 2. Create day plans if provided
    if (dayPlans && dayPlans.length > 0) {
      console.log(`Creating ${dayPlans.length} day plans`);

      for (let i = 0; i < dayPlans.length; i++) {
        const dayPlan = dayPlans[i];

        // Remove any existing $id if present
        const { $id: dayPlanId, ...dayPlanData } = dayPlan as any;

        try {
          console.log(`Creating day plan ${i + 1}`);

          const createdDayPlan = (await databases.createDocument(
            config.databaseId!,
            config.dayPlansCollectionId!,
            ID.unique(),
            {
              ...dayPlanData,
              itineraries_Id: createdItinerary.$id,
            }
          )) as unknown as DayPlan;

          console.log(`Created day plan with ID: ${createdDayPlan.$id}`);

          // 3. Create activities for this day plan if provided
          if (activities && activities[i] && activities[i].length > 0) {
            console.log(
              `Creating ${activities[i].length} activities for day plan ${
                i + 1
              }`
            );

            for (const activity of activities[i]) {
              // Remove any existing $id if present
              const { $id: activityId, ...activityData } = activity as any;

              try {
                const createdActivity = await databases.createDocument(
                  config.databaseId!,
                  config.activitiesCollectionId!,
                  ID.unique(),
                  {
                    ...activityData,
                    dayPlansId: createdDayPlan.$id,
                  }
                );

                console.log(`Created activity with ID: ${createdActivity.$id}`);
              } catch (activityError) {
                console.error(`Error creating activity: ${activityError}`);
              }
            }
          }
        } catch (dayPlanError) {
          console.error(`Error creating day plan: ${dayPlanError}`);
        }
      }
    }

    return createdItinerary;
  } catch (error) {
    console.error("Error creating itinerary:", error);
    throw error;
  }
};

/**
 * Updates an existing itinerary
 * @param itineraryId The ID of the itinerary to update
 * @param updatedData The updated itinerary data
 * @returns The updated itinerary
 */
export const updateItinerary = async (
  itineraryId: string,
  updatedData: Partial<Omit<Itinerary, "$id" | "createdAt">>
): Promise<Itinerary> => {
  try {
    const updatedItinerary = (await databases.updateDocument(
      config.databaseId!,
      config.itinerariesCollectionId!,
      itineraryId,
      updatedData
    )) as unknown as Itinerary;

    return updatedItinerary;
  } catch (error) {
    console.error("Error updating itinerary:", error);
    throw error;
  }
};

/**
 * Fetches an itinerary with all its day plans and activities
 * @param itineraryId The ID of the itinerary to fetch
 * @returns The itinerary with day plans and activities
 */
export const getItineraryWithDetails = async (
  itineraryId: string
): Promise<ItineraryWithDetails> => {
  try {
    // 1. Fetch the itinerary
    const itinerary = (await databases.getDocument(
      config.databaseId!,
      config.itinerariesCollectionId!,
      itineraryId
    )) as unknown as Itinerary;

    // 2. Fetch day plans for this itinerary
    const dayPlansResult = await databases.listDocuments(
      config.databaseId!,
      config.dayPlansCollectionId!,
      [Query.equal("itineraries_Id", itineraryId), Query.orderAsc("day")]
    );

    const dayPlans = dayPlansResult.documents as unknown as DayPlan[];
    const dayPlansWithActivities: (DayPlan & { activities: Activity[] })[] = [];

    // 3. Fetch activities for each day plan
    for (const dayPlan of dayPlans) {
      if (dayPlan.$id) {
        // Check if $id exists before using it
        const activitiesResult = await databases.listDocuments(
          config.databaseId!,
          config.activitiesCollectionId!,
          [Query.equal("dayPlansId", dayPlan.$id)]
        );

        const activities = activitiesResult.documents as unknown as Activity[];

        dayPlansWithActivities.push({
          ...dayPlan,
          activities,
        });
      }
    }

    return {
      itinerary,
      dayPlans: dayPlansWithActivities,
    };
  } catch (error) {
    console.error("Error fetching itinerary details:", error);
    throw error;
  }
};

/**
 * Fetches all itineraries for a specific user
 * @param userId The ID of the user
 * @returns Array of itineraries
 */
export const getUserItineraries = async (
  userId: string
): Promise<Itinerary[]> => {
  try {
    console.log(`Fetching itineraries for user: ${userId}`);

    // First, try to update older itineraries to add the proper userId
    try {
      await updateOldItineraries(userId);
    } catch (updateError) {
      console.error("Error updating old itineraries:", updateError);
    }

    // Fetch all itineraries since we can't filter by permissions
    const result = await databases.listDocuments(
      config.databaseId!,
      config.itinerariesCollectionId!,
      [] // No filters for now
    );

    console.log(`Fetched ${result.documents.length} total itineraries`);

    // Filter itineraries client-side based on permissions
    const userItineraries = result.documents.filter((doc) => {
      // Check if this document has permissions for the current user
      const hasPermission = doc.$permissions?.some((permission) =>
        permission.includes(`user:${userId}`)
      );

      // Check if userId field contains the current user (as fallback)
      const isInUserIdArray =
        Array.isArray(doc.userId) && doc.userId.includes(userId);

      // Check if userId field equals the current user (as fallback)
      const isUserIdEqual = doc.userId === userId;

      // Check if the user is in sharedWith array
      const isSharedWith =
        Array.isArray(doc.sharedWith) && doc.sharedWith.includes(userId);

      return hasPermission || isInUserIdArray || isUserIdEqual || isSharedWith;
    });

    console.log(
      `Filtered to ${userItineraries.length} itineraries for user ${userId}`
    );

    // Sort by createdAt, newest first
    userItineraries.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.$createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.$createdAt || 0).getTime();
      return dateB - dateA;
    });

    return userItineraries as unknown as Itinerary[];
  } catch (error) {
    console.error("Error fetching user itineraries:", error);
    return [];
  }
};
/**
 * Helper function to update older itineraries with the proper userId
 * This will iterate through all itineraries and set the userId field if it's empty
 */
const updateOldItineraries = async (userId: string): Promise<void> => {
  try {
    console.log("Attempting to update old itineraries with missing userId");

    // Fetch all itineraries
    const result = await databases.listDocuments(
      config.databaseId!,
      config.itinerariesCollectionId!,
      [] // No filters
    );

    // Find itineraries with empty userIds
    const emptyUserIdItineraries = result.documents.filter((doc) => {
      // Check if userId is empty array
      return Array.isArray(doc.userId) && doc.userId.length === 0;
    });

    console.log(
      `Found ${emptyUserIdItineraries.length} itineraries with empty userId arrays`
    );

    // Update each itinerary
    for (const itinerary of emptyUserIdItineraries) {
      try {
        console.log(`Updating itinerary ${itinerary.$id} to set userId`);

        await databases.updateDocument(
          config.databaseId!,
          config.itinerariesCollectionId!,
          itinerary.$id,
          {
            userId: [userId], // Set userId as an array with the current userId
          }
        );

        console.log(`Successfully updated itinerary ${itinerary.$id}`);
      } catch (updateError) {
        console.error(
          `Error updating itinerary ${itinerary.$id}:`,
          updateError
        );
      }
    }

    console.log("Finished updating old itineraries");
  } catch (error) {
    console.error("Error in updateOldItineraries:", error);
    throw error;
  }
};

/**
 * Updates a day plan
 * @param dayPlanId The ID of the day plan to update
 * @param updatedData The updated day plan data
 * @returns The updated day plan
 */
export const updateDayPlan = async (
  dayPlanId: string,
  updatedData: Partial<Omit<DayPlan, "$id" | "itineraries_Id">>
): Promise<DayPlan> => {
  try {
    const updatedDayPlan = (await databases.updateDocument(
      config.databaseId!,
      config.dayPlansCollectionId!,
      dayPlanId,
      updatedData
    )) as unknown as DayPlan;

    return updatedDayPlan;
  } catch (error) {
    console.error("Error updating day plan:", error);
    throw error;
  }
};

/**
 * Creates or updates an activity
 * @param activity The activity data
 * @returns The created or updated activity
 */
export const saveActivity = async (activity: Activity): Promise<Activity> => {
  try {
    if (activity.$id) {
      // Update existing activity
      const { $id, ...activityData } = activity;
      return (await databases.updateDocument(
        config.databaseId!,
        config.activitiesCollectionId!,
        $id,
        activityData
      )) as unknown as Activity;
    } else {
      // Create new activity
      const { $id, ...activityData } = activity;
      return (await databases.createDocument(
        config.databaseId!,
        config.activitiesCollectionId!,
        ID.unique(),
        activityData
      )) as unknown as Activity;
    }
  } catch (error) {
    console.error("Error saving activity:", error);
    throw error;
  }
};

/**
 * Deletes an itinerary and all related day plans and activities
 * @param itineraryId The ID of the itinerary to delete
 */
export const deleteItinerary = async (itineraryId: string): Promise<void> => {
  try {
    // 1. Fetch all day plans for this itinerary
    const dayPlansResult = await databases.listDocuments(
      config.databaseId!,
      config.dayPlansCollectionId!,
      [Query.equal("itineraries_Id", itineraryId)]
    );

    const dayPlans = dayPlansResult.documents as unknown as DayPlan[];

    // 2. Delete all activities for each day plan
    for (const dayPlan of dayPlans) {
      if (dayPlan.$id) {
        // Check if $id exists before using it
        const activitiesResult = await databases.listDocuments(
          config.databaseId!,
          config.activitiesCollectionId!,
          [Query.equal("dayPlansId", dayPlan.$id)]
        );

        const activities = activitiesResult.documents as unknown as Activity[];

        // Delete each activity
        for (const activity of activities) {
          if (activity.$id) {
            // Check if $id exists before using it
            await databases.deleteDocument(
              config.databaseId!,
              config.activitiesCollectionId!,
              activity.$id
            );
          }
        }

        // Delete the day plan
        await databases.deleteDocument(
          config.databaseId!,
          config.dayPlansCollectionId!,
          dayPlan.$id
        );
      }
    }

    // 3. Delete the itinerary
    await databases.deleteDocument(
      config.databaseId!,
      config.itinerariesCollectionId!,
      itineraryId
    );
  } catch (error) {
    console.error("Error deleting itinerary:", error);
    throw error;
  }
};

/**
 * Share an itinerary with another user
 * @param itineraryId The ID of the itinerary to share
 * @param userIdToShareWith The ID of the user to share with
 * @returns The updated itinerary
 */
export const shareItinerary = async (
  itineraryId: string,
  userIdToShareWith: string
): Promise<Itinerary> => {
  try {
    // First, get the current itinerary to check existing sharedWith
    const itinerary = (await databases.getDocument(
      config.databaseId!,
      config.itinerariesCollectionId!,
      itineraryId
    )) as unknown as Itinerary;

    // Initialize sharedWith array if it doesn't exist
    const currentSharedWith = Array.isArray(itinerary.sharedWith)
      ? itinerary.sharedWith
      : [];

    // Add the new user ID if not already in the list
    if (!currentSharedWith.includes(userIdToShareWith)) {
      const updatedSharedWith = [...currentSharedWith, userIdToShareWith];

      // Update the itinerary with the new sharedWith list
      const updatedItinerary = await updateItinerary(itineraryId, {
        sharedWith: updatedSharedWith,
      });

      return updatedItinerary;
    }

    return itinerary; // Return unchanged if user already has access
  } catch (error) {
    console.error("Error sharing itinerary:", error);
    throw error;
  }
};

/**
 * Remove a user's access to an itinerary
 * @param itineraryId The ID of the itinerary
 * @param userIdToRemove The ID of the user to remove access for
 * @returns The updated itinerary
 */
export const removeItineraryAccess = async (
  itineraryId: string,
  userIdToRemove: string
): Promise<Itinerary> => {
  try {
    // First, get the current itinerary
    const itinerary = (await databases.getDocument(
      config.databaseId!,
      config.itinerariesCollectionId!,
      itineraryId
    )) as unknown as Itinerary;

    // If there's no sharedWith array, nothing to do
    if (!Array.isArray(itinerary.sharedWith)) {
      return itinerary;
    }

    // Remove the user ID from the sharedWith list
    const updatedSharedWith = itinerary.sharedWith.filter(
      (id) => id !== userIdToRemove
    );

    // Update the itinerary with the modified sharedWith list
    const updatedItinerary = await updateItinerary(itineraryId, {
      sharedWith: updatedSharedWith,
    });

    return updatedItinerary;
  } catch (error) {
    console.error("Error removing itinerary access:", error);
    throw error;
  }
};
