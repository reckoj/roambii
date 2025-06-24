// lib/firebase/package-service.ts
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
  startAfter,
  Timestamp,
  DocumentSnapshot,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { v4 as uuidv4 } from "uuid";
import uuid from "react-native-uuid";
import {
  firestore,
  storage,
  COLLECTIONS,
  auth,
} from "./firebase/firebase-config";

/**
 * Upload package image to Firebase Storage
 */
export const uploadPackageImage = async (
  imageUri: string,
  userId: string
): Promise<string> => {
  try {
    // Fetch the file from the URI
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Generate a unique file name
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `package_${uuid.v4()}.${fileExtension}`;

    // Upload to Firebase Storage
    const imageRef = ref(storage, `package_images/${userId}/${fileName}`);
    await uploadBytes(imageRef, blob);

    // Get download URL
    const downloadUrl = await getDownloadURL(imageRef);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading package image:", error);
    throw error;
  }
};

// Safe date conversion function
const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  try {
    // If it's a Firestore Timestamp
    if (timestamp?.toDate && typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }

    // If it's already a Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // If it's a number or string that can be parsed
    if (typeof timestamp === "number" || typeof timestamp === "string") {
      const date = new Date(timestamp);
      // Check if valid date
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // If we got here, we couldn't convert to a valid date
    console.warn("Could not convert to date:", timestamp);
    return null;
  } catch (error) {
    console.error("Error converting timestamp to date:", error);
    return null;
  }
};

// Safe date creation for Firestore
const safeCreateDate = (date: any): Date | null => {
  try {
    if (!date) return null;

    const parsedDate = safeToDate(date);
    if (parsedDate) return parsedDate;

    return null;
  } catch (error) {
    console.error("Error creating date for Firestore:", error);
    return null;
  }
};

/**
 * Create a new flight info document
 */
export const createFlightInfo = async (flightInfoData: any) => {
  try {
    const flightInfoRef = collection(firestore, COLLECTIONS.FLIGHT_INFO);
    const flightInfoDoc = await addDoc(flightInfoRef, {
      departing_from: flightInfoData.departingFrom || "",
      arriving_to: flightInfoData.arrivingTo || "",
      returning_from: flightInfoData.returningFrom || "",
      returning_to: flightInfoData.returningTo || "",
      departing_time: safeCreateDate(flightInfoData.departingTime),
      arriving_to_time: safeCreateDate(flightInfoData.arrivingToTime),
      returning_from_time: safeCreateDate(flightInfoData.returningFromTime),
      returning_to_time: safeCreateDate(flightInfoData.returningToTime),
      departure_date: safeCreateDate(flightInfoData.departureDate),
      return_date: safeCreateDate(flightInfoData.returnDate),
    });

    return flightInfoDoc.id;
  } catch (error) {
    console.error("Error creating flight info:", error);
    throw error;
  }
};

/**
 * Create a new package listing
 */
export const createPackage = async (
  packageData: any,
  agentId: string,
  imageUri?: string
): Promise<string> => {
  try {
    // Upload image if provided
    let imageUrl = "";
    if (imageUri) {
      imageUrl = await uploadPackageImage(imageUri, agentId);
    }

    // Create flight info document
    const flightInfoId = await createFlightInfo(packageData);

    // Get agent reference
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      throw new Error("Agent not found");
    }

    // Create package document
    const packageRef = collection(firestore, COLLECTIONS.PACKAGES);
    const now = new Date();

    const newPackage = {
      name: packageData.name,
      description: packageData.description || "",
      price: Number(packageData.price) || 0,
      type: packageData.type || "Hotel",
      banner_image: imageUrl,
      rating: Number(packageData.rating) || 0,
      agent: agentRef,
      is_all_inclusive: packageData.allinclusive || false,
      room_type: packageData.roomType || "Standard Room",
      amenities: packageData.amenities || [],
      is_featured_package: false,
      baths: Number(packageData.bathrooms) || 0,
      beds: Number(packageData.bedrooms) || 0,
      sleeps: Number(packageData.bedrooms) || 0,
      guest_amount: Number(packageData.guestAmount) || 1,
      check_in_date: safeCreateDate(packageData.checkInDate) || now,
      check_out_date: safeCreateDate(packageData.checkOutDate) || now,
      check_in_time: safeCreateDate(packageData.checkInTime) || now,
      check_out_time: safeCreateDate(packageData.checkOutTime) || now,
      stay_link: packageData.stayLink || "",
      flight_info: doc(firestore, COLLECTIONS.FLIGHT_INFO, flightInfoId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const packageDoc = await addDoc(packageRef, newPackage);
    console.log("Package created with ID:", packageDoc.id);
    return packageDoc.id;
  } catch (error) {
    console.error("Error creating package:", error);
    throw error;
  }
};

/**
 * Get package by ID
 */
export const getPackageById = async (
  packageId: string
): Promise<DocumentData | null> => {
  try {
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    const packageDoc = await getDoc(packageRef);

    if (!packageDoc.exists()) {
      return null;
    }

    const packageData = packageDoc.data() as DocumentData;
    console.log("Raw package data:", JSON.stringify(packageData, null, 2));

    // Get flight info
    let flightInfoData: DocumentData | null = null;
    if (packageData.flight_info) {
      try {
        // Check if flight_info is a DocumentReference or a plain object
        if (typeof packageData.flight_info === 'object' && 'path' in packageData.flight_info) {
          // It's a DocumentReference
          const flightInfoDoc = await getDoc(packageData.flight_info);
          if (flightInfoDoc.exists()) {
            const flightInfo = flightInfoDoc.data() as DocumentData;
            flightInfoData = {
              id: flightInfoDoc.id,
              ...(flightInfo || {}),
              // Safely convert dates
              departing_time: safeToDate(flightInfo.departing_time),
              arriving_to_time: safeToDate(flightInfo.arriving_to_time),
              returning_from_time: safeToDate(flightInfo.returning_from_time),
              returning_to_time: safeToDate(flightInfo.returning_to_time),
              departure_date: safeToDate(flightInfo.departure_date),
              return_date: safeToDate(flightInfo.return_date),
            };
          }
        } else {
          // It's a plain object
          flightInfoData = {
            ...packageData.flight_info,
            // Safely convert dates
            departing_time: safeToDate(packageData.flight_info.departing_time),
            arriving_to_time: safeToDate(packageData.flight_info.arriving_to_time),
            returning_from_time: safeToDate(packageData.flight_info.returning_from_time),
            returning_to_time: safeToDate(packageData.flight_info.returning_to_time),
            departure_date: safeToDate(packageData.flight_info.departure_date),
            return_date: safeToDate(packageData.flight_info.return_date),
          };
        }
      } catch (error) {
        console.error("Error fetching flight info:", error);
        // Continue without flight info
      }
    }

    // Get agent data
    let agentData: DocumentData | null = null;
    if (packageData.agent) {
      try {
        if (typeof packageData.agent === 'object' && 'path' in packageData.agent) {
          // It's a DocumentReference
          const agentDoc = await getDoc(packageData.agent);
          if (agentDoc.exists()) {
            agentData = agentDoc.data() as DocumentData;
          }
        } else {
          // It's a plain object
          agentData = packageData.agent;
        }
      } catch (error) {
        console.error("Error fetching agent data:", error);
      }
    }

    // Return the package data with resolved references
    return {
      id: packageDoc.id,
      ...packageData,
      flight_info: flightInfoData,
      agent: agentData,
      // Safely convert dates
      check_in_date: safeToDate(packageData.check_in_date),
      check_out_date: safeToDate(packageData.check_out_date),
      check_in_time: safeToDate(packageData.check_in_time),
      check_out_time: safeToDate(packageData.check_out_time),
      createdAt: safeToDate(packageData.createdAt),
      updatedAt: safeToDate(packageData.updatedAt),
    };
  } catch (error) {
    console.error("Error fetching package:", error);
    return null;
  }
};

/**
 * Update an existing package
 */
export const updatePackage = async (
  packageId: string,
  updates: any,
  imageUri?: string
): Promise<boolean> => {
  try {
    // Get the existing package
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    const packageDoc = await getDoc(packageRef);

    if (!packageDoc.exists()) {
      throw new Error("Package not found");
    }

    const packageData = packageDoc.data() as DocumentData;

    // Upload image if provided
    let imageUrl = packageData.banner_image;
    if (imageUri && !imageUri.startsWith("http")) {
      // Get agent ID from agent reference
      const agentRef = packageData.agent;
      const agentDoc = await getDoc(agentRef);
      if (!agentDoc.exists()) {
        throw new Error("Agent not found");
      }

      imageUrl = await uploadPackageImage(imageUri, agentDoc.id);
    }

    // Update flight info if it exists
    if (packageData.flight_info && updates.departingFrom) {
      const flightInfoRef = packageData.flight_info;
      const flightInfoDoc = await getDoc(flightInfoRef);

      if (flightInfoDoc.exists()) {
        const flightData = flightInfoDoc.data() as DocumentData;
        await updateDoc(flightInfoRef, {
          departing_from:
            updates.departingFrom || flightData.departing_from || "",
          arriving_to: updates.arrivingTo || flightData.arriving_to || "",
          returning_from:
            updates.returningFrom || flightData.returning_from || "",
          returning_to: updates.returningTo || flightData.returning_to || "",
          departing_time:
            safeCreateDate(updates.departingTime) ||
            flightData.departing_time ||
            null,
          arriving_to_time:
            safeCreateDate(updates.arrivingToTime) ||
            flightData.arriving_to_time ||
            null,
          returning_from_time:
            safeCreateDate(updates.returningFromTime) ||
            flightData.returning_from_time ||
            null,
          returning_to_time:
            safeCreateDate(updates.returningToTime) ||
            flightData.returning_to_time ||
            null,
          departure_date:
            safeCreateDate(updates.departureDate) ||
            flightData.departure_date ||
            null,
          return_date:
            safeCreateDate(updates.returnDate) ||
            flightData.return_date ||
            null,
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.price !== undefined)
      updateData.price = Number(updates.price) || 0;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (imageUrl) updateData.banner_image = imageUrl;
    if (updates.rating !== undefined)
      updateData.rating = Number(updates.rating) || 0;
    if (updates.allinclusive !== undefined)
      updateData.is_all_inclusive = updates.allinclusive;
    if (updates.roomType !== undefined) updateData.room_type = updates.roomType;
    if (updates.amenities !== undefined)
      updateData.amenities = updates.amenities;
    if (updates.bathrooms !== undefined)
      updateData.baths = Number(updates.bathrooms) || 0;
    if (updates.bedrooms !== undefined) {
      updateData.beds = Number(updates.bedrooms) || 0;
      updateData.sleeps = Number(updates.bedrooms) || 0;
    }
    if (updates.guestAmount !== undefined)
      updateData.guest_amount = Number(updates.guestAmount) || 1;
    if (updates.checkInDate)
      updateData.check_in_date = safeCreateDate(updates.checkInDate);
    if (updates.checkOutDate)
      updateData.check_out_date = safeCreateDate(updates.checkOutDate);
    if (updates.checkInTime)
      updateData.check_in_time = safeCreateDate(updates.checkInTime);
    if (updates.checkOutTime)
      updateData.check_out_time = safeCreateDate(updates.checkOutTime);
    if (updates.stayLink !== undefined)
      updateData.stay_link = updates.stayLink;

    console.log("Updating package with data:", updateData);

    // Update in Firestore
    await updateDoc(packageRef, updateData);
    console.log(`Package ${packageId} updated successfully`);

    return true;
  } catch (error) {
    console.error("Error updating package:", error);
    throw error;
  }
};

/**
 * Delete a package
 */
export const deletePackage = async (packageId: string): Promise<boolean> => {
  try {
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    const packageDoc = await getDoc(packageRef);

    if (packageDoc.exists()) {
      const packageData = packageDoc.data() as DocumentData;

      // Delete flight info if it exists
      if (packageData.flight_info) {
        await deleteDoc(packageData.flight_info);
      }

      // Delete package
      await deleteDoc(packageRef);
    }

    return true;
  } catch (error) {
    console.error("Error deleting package:", error);
    return false;
  }
};

/**
 * Fetch featured packages
 */
export const getFeaturedPackages = async (
  limitCount = 5
): Promise<DocumentData[]> => {
  try {
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
    const q = query(
      packagesRef,
      where("is_featured_package", "==", true),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const packages: DocumentData[] = [];

    for (const doc of querySnapshot.docs) {
      const packageData = doc.data() as DocumentData;

      // Get agent data
      let agentData: DocumentData | null = null;
      if (packageData.agent) {
        const agentDoc = await getDoc(packageData.agent);
        if (agentDoc.exists()) {
          const agentDocData = agentDoc.data() as DocumentData;
          agentData = {
            id: agentDoc.id,
            ...(agentDocData || {}),
          };
        }
      }

      packages.push({
        id: doc.id,
        ...(packageData || {}),
        agent: agentData,
        createdAt: packageData?.createdAt?.toDate?.(),
        updatedAt: packageData?.updatedAt?.toDate?.(),
        check_in_date: packageData?.check_in_date?.toDate?.(),
        check_out_date: packageData?.check_out_date?.toDate?.(),
        check_in_time: packageData?.check_in_time?.toDate?.(),
        check_out_time: packageData?.check_out_time?.toDate?.(),
      });
    }

    return packages;
  } catch (error) {
    console.error("Error fetching featured packages:", error);
    return [];
  }
};

/**
 * Search packages by various criteria
 */
export const searchPackages = async (
  searchTerm?: string,
  packageType?: string,
  limitCount = 20
): Promise<DocumentData[]> => {
  try {
    // Start with base query
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
    let queryConstraints: any[] = [orderBy("createdAt", "desc")];

    // Add package type filter if provided
    if (packageType && packageType !== "All") {
      queryConstraints.push(where("type", "==", packageType));
    }

    // Add limit
    queryConstraints.push(limit(Number(limitCount)));

    const q = query(packagesRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    let packages: DocumentData[] = [];

    for (const doc of querySnapshot.docs) {
      const packageData = doc.data() as DocumentData;

      // Get agent data
      let agentData: DocumentData | null = null;
      if (packageData.agent) {
        try {
          // If agent data is already in the correct format (has id, name, avatar), use it directly
          if (typeof packageData.agent === 'object' && 
              'id' in packageData.agent && 
              'name' in packageData.agent) {
            agentData = packageData.agent;
          } else {
            // Handle DocumentReference case
            let agentRef;
            if (typeof packageData.agent === 'object' && 'path' in packageData.agent) {
              agentRef = packageData.agent;
              const agentDoc = await getDoc(agentRef);
              if (agentDoc.exists()) {
                const agentDocData = agentDoc.data() as DocumentData;
                agentData = {
                  id: agentDoc.id,
                  ...(agentDocData || {}),
                };
              }
            } else {
              console.warn('Invalid agent reference format:', packageData.agent);
            }
          }
        } catch (error) {
          console.error("Error fetching agent data:", error);
        }
      }

      packages.push({
        id: doc.id,
        ...(packageData || {}),
        agent: agentData,
        createdAt: packageData?.createdAt?.toDate?.(),
        updatedAt: packageData?.updatedAt?.toDate?.(),
        check_in_date: packageData?.check_in_date?.toDate?.(),
        check_out_date: packageData?.check_out_date?.toDate?.(),
        check_in_time: packageData?.check_in_time?.toDate?.(),
        check_out_time: packageData?.check_out_time?.toDate?.(),
      });
    }

    // If search term is provided, filter results client-side
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();

      packages = packages.filter((pkg) => {
        const nameMatch = pkg.name?.toLowerCase?.()?.includes(searchTermLower);
        const typeMatch = pkg.type?.toLowerCase?.()?.includes(searchTermLower);
        const agentMatch = pkg.agent?.name
          ?.toLowerCase?.()
          ?.includes(searchTermLower);

        return nameMatch || typeMatch || agentMatch;
      });
    }

    return packages;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

/**
 * Get agent by ID
 */
export const getAgentById = async (
  agentId: string
): Promise<DocumentData | null> => {
  try {
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      return null;
    }

    const agentData = agentDoc.data() as DocumentData;

    return {
      id: agentDoc.id,
      ...(agentData || {}),
      createdAt: agentData?.createdAt?.toDate?.(),
      updatedAt: agentData?.updatedAt?.toDate?.(),
    };
  } catch (error) {
    console.error("Error fetching agent:", error);
    return null;
  }
};

/**
 * Get current user's agent profile
 */
export const getCurrentUserAgent = async (
  userId: string
): Promise<DocumentData | null> => {
  try {
    console.log("Checking agent status for userId:", userId);

    // Method 1: Try to get the agent by userId field
    const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
    const q = query(agentsRef, where("userId", "==", userId), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const agentDoc = querySnapshot.docs[0];
      const agentData = agentDoc.data() as DocumentData;
      console.log("Found agent via userId field:", agentDoc.id);
      return {
        id: agentDoc.id,
        ...(agentData || {}),
        createdAt: agentData?.createdAt?.toDate?.(),
        updatedAt: agentData?.updatedAt?.toDate?.(),
      };
    }

    // Method 2: Check if the user's email matches an agent
    const user = auth.currentUser;
    if (user?.email) {
      const emailQuery = query(
        agentsRef,
        where("email", "==", user.email),
        limit(1)
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const agentDoc = emailSnapshot.docs[0];
        const agentData = agentDoc.data() as DocumentData;
        console.log("Found agent via email field:", agentDoc.id);
        return {
          id: agentDoc.id,
          ...(agentData || {}),
          createdAt: agentData?.createdAt?.toDate?.(),
          updatedAt: agentData?.updatedAt?.toDate?.(),
        };
      }
    }

    // Method 3: As a last resort, try to get the agent document directly using the userId
    try {
      const directAgentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
      const directAgentDoc = await getDoc(directAgentRef);

      if (directAgentDoc.exists()) {
        const agentData = directAgentDoc.data() as DocumentData;
        console.log("Found agent via direct ID match:", directAgentDoc.id);
        return {
          id: directAgentDoc.id,
          ...(agentData || {}),
          createdAt: agentData?.createdAt?.toDate?.(),
          updatedAt: agentData?.updatedAt?.toDate?.(),
        };
      }
    } catch (innerError) {
      console.log("Error trying direct ID match:", innerError);
    }

    console.log("No agent found for user");
    return null;
  } catch (error) {
    console.error("Error fetching current user agent:", error);
    return null;
  }
};
