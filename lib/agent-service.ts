// lib/agent-service.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  DocumentData,
} from "firebase/firestore";
import { ref, get, update } from "firebase/database";
import { firestore, firebaseDb as database, COLLECTIONS } from "./firebase/firebase-config";
import { Agent } from "./firebase/models";
import { uploadProfileImage } from "./storage-service";
import { auth } from "./firebase/firebase-config";

/**
 * Get agent profile by ID with enhanced error handling
 */
export const getAgentById = async (agentId: string): Promise<Agent | null> => {
  try {
    console.log("Fetching agent with ID:", agentId);

    // Primary approach: Direct document lookup
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      console.log("Found agent by direct ID lookup");
      const agentData = agentDoc.data() as Omit<Agent, "id">;

      return {
        id: agentId,
        ...agentData,
        createdAt:
          agentData.createdAt instanceof Timestamp
            ? agentData.createdAt.toDate()
            : agentData.createdAt,
        updatedAt:
          agentData.updatedAt instanceof Timestamp
            ? agentData.updatedAt.toDate()
            : agentData.updatedAt,
      };
    }

    // Fallback 1: Try finding by userId field
    console.log("Agent not found by direct ID, trying userId field...");
    try {
      const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
      const userIdQuery = query(agentsRef, where("userId", "==", agentId));
      const userIdSnapshot = await getDocs(userIdQuery);

      if (!userIdSnapshot.empty) {
        const doc = userIdSnapshot.docs[0];
        const agentData = doc.data() as Omit<Agent, "id">;
        console.log("Found agent by userId field lookup");

        return {
          id: doc.id,
          ...agentData,
          createdAt:
            agentData.createdAt instanceof Timestamp
              ? agentData.createdAt.toDate()
              : agentData.createdAt,
          updatedAt:
            agentData.updatedAt instanceof Timestamp
              ? agentData.updatedAt.toDate()
              : agentData.updatedAt,
        };
      }
    } catch (error) {
      console.log("Error in userId lookup fallback:", error);
    }

    // Fallback 2: Try searching for email
    console.log("Agent not found by userId, trying email lookup...");
    try {
      const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
      const emailQuery = query(agentsRef, where("email", "==", agentId));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const doc = emailSnapshot.docs[0];
        const agentData = doc.data() as Omit<Agent, "id">;
        console.log("Found agent by email lookup");

        return {
          id: doc.id,
          ...agentData,
          createdAt:
            agentData.createdAt instanceof Timestamp
              ? agentData.createdAt.toDate()
              : agentData.createdAt,
          updatedAt:
            agentData.updatedAt instanceof Timestamp
              ? agentData.updatedAt.toDate()
              : agentData.updatedAt,
        };
      }
    } catch (error) {
      console.log("Error in email lookup fallback:", error);
    }

    console.error("Agent not found with ID:", agentId);
    return null;
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    return null;
  }
};

/**
 * Get all agents with optional filtering and pagination
 */
export const getAllAgents = async (options?: {
  limit?: number;
  niche?: string;
  searchTerm?: string;
}): Promise<Agent[]> => {
  try {
    const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
    const queryConstraints: any[] = [];

    // Add niche filter if provided
    if (options?.niche) {
      queryConstraints.push(where("niche", "==", options.niche));
    }

    // Add sorting and limit
    queryConstraints.push(orderBy("rating", "desc"));
    queryConstraints.push(limit(options?.limit || 50));

    const q = query(agentsRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    let agents: Agent[] = [];

    querySnapshot.forEach((doc) => {
      const agentData = doc.data() as Omit<Agent, "id">;

      agents.push({
        id: doc.id,
        ...agentData,
        createdAt:
          agentData.createdAt instanceof Timestamp
            ? agentData.createdAt.toDate()
            : agentData.createdAt,
        updatedAt:
          agentData.updatedAt instanceof Timestamp
            ? agentData.updatedAt.toDate()
            : agentData.updatedAt,
      });
    });

    // Client-side filtering by search term if provided
    if (options?.searchTerm) {
      const searchTermLower = options.searchTerm.toLowerCase();
      agents = agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchTermLower) ||
          (agent.niche &&
            agent.niche.toLowerCase().includes(searchTermLower)) ||
          (agent.bio && agent.bio.toLowerCase().includes(searchTermLower))
      );
    }

    return agents;
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

/**
 * Update agent profile with optional avatar upload
 */
export const updateAgentProfile = async (
  agentId: string,
  updates: Partial<Omit<Agent, "id" | "createdAt" | "updatedAt">>,
  avatarUri?: string
): Promise<Agent | null> => {
  try {
    // Upload avatar if provided
    let avatarUrl = updates.avatar;
    if (avatarUri) {
      const uploadedUrl = await uploadProfileImage(agentId, avatarUri);
      if (uploadedUrl !== null) {
        avatarUrl = uploadedUrl;
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      avatar: avatarUrl || updates.avatar,
      updatedAt: new Date(),
    };

    // Update in Firestore
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
    await updateDoc(agentRef, updateData);

    // Sync to Realtime Database for real-time features
    const userStatusRef = ref(database, `user_statuses/${agentId}`);
    await update(userStatusRef, {
      name: updates.name,
      avatar: avatarUrl || updates.avatar,
      updated_at: Date.now(),
    });

    // Return updated agent profile
    return getAgentById(agentId);
  } catch (error) {
    console.error("Error updating agent profile:", error);
    return null;
  }
};

/**
 * Convert a regular user to an agent
 */
export const convertUserToAgent = async (
  userId: string,
  agentData: {
    niche?: string;
    bio?: string;
  }
): Promise<Agent | null> => {
  try {
    // Check if user already exists
    const userRef = doc(firestore, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();

    // Update user document to mark as agent
    await updateDoc(userRef, {
      isAgent: true,
      updatedAt: new Date(),
    });

    // Create agent document
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);

    const newAgentData: Omit<Agent, "id"> = {
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      isVerified: userData.isEmailVerified,
      niche: agentData.niche || "",
      bio: agentData.bio || "",
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(agentRef, newAgentData);

    return {
      id: userId,
      ...newAgentData,
    };
  } catch (error) {
    console.error("Error converting user to agent:", error);
    return null;
  }
};

/**
 * Find agents by name
 */
export const findAgentsByName = async (name: string): Promise<Agent[]> => {
  try {
    const agents = await getAllAgents({
      limit: 100,
      searchTerm: name,
    });

    return agents;
  } catch (error) {
    console.error("Error finding agents by name:", error);
    return [];
  }
};

/**
 * Get top-rated agents
 */
export const getTopAgents = async (count: number = 5): Promise<Agent[]> => {
  try {
    const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
    const q = query(
      agentsRef,
      orderBy("rating", "desc"),
      where("reviewCount", ">", 0),
      limit(count)
    );

    const querySnapshot = await getDocs(q);
    const agents: Agent[] = [];

    querySnapshot.forEach((doc) => {
      const agentData = doc.data() as Omit<Agent, "id">;

      agents.push({
        id: doc.id,
        ...agentData,
        createdAt:
          agentData.createdAt instanceof Timestamp
            ? agentData.createdAt.toDate()
            : agentData.createdAt,
        updatedAt:
          agentData.updatedAt instanceof Timestamp
            ? agentData.updatedAt.toDate()
            : agentData.updatedAt,
      });
    });

    return agents;
  } catch (error) {
    console.error("Error fetching top agents:", error);
    return [];
  }
};

/**
 * Get agents by niche/specialty
 */
export const getAgentsByNiche = async (niche: string): Promise<Agent[]> => {
  try {
    const agents = await getAllAgents({
      niche,
      limit: 50,
    });

    return agents;
  } catch (error) {
    console.error("Error fetching agents by niche:", error);
    return [];
  }
};

/**
 * Get all packages created by a specific agent
 */
export const getAgentPackages = async (
  agentId: string
): Promise<DocumentData[]> => {
  try {
    console.log("Fetching packages for agent ID:", agentId);
    let packages: DocumentData[] = [];

    // Try method 1: Using the 'packages' collection (original method)
    try {
      console.log("Checking 'packages' collection...");
      // Get the agent reference
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);

      // Query packages where agent field points to this agent
      const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
      const q = query(packagesRef, where("agent", "==", agentRef));

      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} packages in 'packages' collection`);

      // If packages found, process them
      if (querySnapshot.size > 0) {
        for (const doc of querySnapshot.docs) {
          const packageData = doc.data();
          // Check if we already added this package (to avoid duplicates)
          if (!packages.some(p => p.$id === doc.id)) {
            // Format data to match the expected format in the UI
            packages.push({
              $id: doc.id,
              name: packageData.name || "Untitled Package",
              type: packageData.type || "Accommodation",
              price: packageData.price || 0,
              image: packageData.banner_image || packageData.image,
              rating: packageData.rating || 0,
              bedrooms: packageData.beds || packageData.bedrooms || 0,
              bathrooms: packageData.baths || packageData.bathrooms || 0,
              guestAmount: packageData.guest_amount || packageData.guestAmount || 0,
              checkInDate:
                packageData.check_in_date?.toDate?.() || packageData.checkInDate,
              checkOutDate:
                packageData.check_out_date?.toDate?.() || packageData.checkOutDate,
              is_all_inclusive:
                packageData.is_all_inclusive || packageData.allinclusive || false,
              description: packageData.description || "",
              room_type: packageData.room_type || packageData.roomType || "",
              amenities: packageData.amenities || [],
            });
          }
        }
      }

      // Always try with agentId field (not just when first query is empty)
      console.log("Trying 'packages' collection with agentId field...");
      const secondQuery = query(packagesRef, where("agentId", "==", agentId));
      const secondSnapshot = await getDocs(secondQuery);

      console.log(`Found ${secondSnapshot.size} packages with agentId field in 'packages'`);

      for (const doc of secondSnapshot.docs) {
        const packageData = doc.data();
        // Check if we already added this package (to avoid duplicates)
        if (!packages.some(p => p.$id === doc.id)) {
          packages.push({
            $id: doc.id,
            name: packageData.name || "Untitled Package",
            type: packageData.type || "Accommodation",
            price: packageData.price || 0,
            image: packageData.banner_image || packageData.image,
            rating: packageData.rating || 0,
            bedrooms: packageData.beds || packageData.bedrooms || 0,
            bathrooms: packageData.baths || packageData.bathrooms || 0,
            guestAmount:
              packageData.guest_amount || packageData.guestAmount || 0,
            checkInDate:
              packageData.check_in_date?.toDate?.() || packageData.checkInDate,
            checkOutDate:
              packageData.check_out_date?.toDate?.() ||
              packageData.checkOutDate,
            is_all_inclusive:
              packageData.is_all_inclusive || packageData.allinclusive || false,
            description: packageData.description || "",
            room_type: packageData.room_type || packageData.roomType || "",
            amenities: packageData.amenities || [],
          });
        }
      }
    } catch (error) {
      console.error("Error querying 'packages' collection:", error);
    }

    // Try method 2: Using the 'package_info' collection (CMS method)
    try {
      console.log("Checking 'package_info' collection...");
      const packageInfoRef = collection(firestore, "package_info");
      
      // Try with both agent.id and agentId fields
      const packageInfoQuery1 = query(packageInfoRef, where("agent.id", "==", agentId));
      const packageInfoSnapshot1 = await getDocs(packageInfoQuery1);
      
      console.log(`Found ${packageInfoSnapshot1.size} packages with agent.id in 'package_info'`);
      
      // Process results from agent.id query
      for (const doc of packageInfoSnapshot1.docs) {
        const packageData = doc.data();
        // Check if we already added this package from any collection (to avoid duplicates)
        if (!packages.some(p => p.$id === doc.id)) {
          packages.push({
            $id: doc.id,
            name: packageData.name || "Untitled Package",
            type: packageData.type || "Accommodation",
            price: packageData.price || 0,
            image: packageData.banner_image || packageData.image,
            rating: packageData.rating || 0,
            bedrooms: packageData.beds || packageData.bedrooms || 0,
            bathrooms: packageData.baths || packageData.bathrooms || 0,
            guestAmount: packageData.guest_amount || packageData.guestAmount || 0,
            checkInDate: packageData.check_in_date?.toDate?.() || packageData.checkInDate,
            checkOutDate: packageData.check_out_date?.toDate?.() || packageData.checkOutDate,
            is_all_inclusive: packageData.is_all_inclusive || packageData.allinclusive || false,
            description: packageData.description || "",
            room_type: packageData.room_type || packageData.roomType || "",
            amenities: packageData.amenities || [],
          });
        }
      }
      
      // Try with agentId field
      const packageInfoQuery2 = query(packageInfoRef, where("agentId", "==", agentId));
      const packageInfoSnapshot2 = await getDocs(packageInfoQuery2);
      
      console.log(`Found ${packageInfoSnapshot2.size} packages with agentId in 'package_info'`);
      
      // Process results from agentId query
      for (const doc of packageInfoSnapshot2.docs) {
        const packageData = doc.data();
        // Check if we already added this package from any collection (to avoid duplicates)
        if (!packages.some(p => p.$id === doc.id)) {
          packages.push({
            $id: doc.id,
            name: packageData.name || "Untitled Package",
            type: packageData.type || "Accommodation",
            price: packageData.price || 0,
            image: packageData.banner_image || packageData.image,
            rating: packageData.rating || 0,
            bedrooms: packageData.beds || packageData.bedrooms || 0,
            bathrooms: packageData.baths || packageData.bathrooms || 0,
            guestAmount: packageData.guest_amount || packageData.guestAmount || 0,
            checkInDate: packageData.check_in_date?.toDate?.() || packageData.checkInDate,
            checkOutDate: packageData.check_out_date?.toDate?.() || packageData.checkOutDate,
            is_all_inclusive: packageData.is_all_inclusive || packageData.allinclusive || false,
            description: packageData.description || "",
            room_type: packageData.room_type || packageData.roomType || "",
            amenities: packageData.amenities || [],
          });
        }
      }
    } catch (error) {
      console.error("Error querying 'package_info' collection:", error);
    }

    // Final deduplication and logging
    const uniquePackages = packages.filter((pkg, index, self) => 
      index === self.findIndex(p => p.$id === pkg.$id)
    );
    
    console.log(`Total packages found across all collections: ${packages.length}`);
    console.log(`Unique packages after filtering: ${uniquePackages.length}`);
    return uniquePackages;
  } catch (error) {
    console.error("Error fetching agent packages:", error);
    return [];
  }
};

/**
 * Delete a package by ID
 */
export const deletePackage = async (packageId: string): Promise<boolean> => {
  try {
    console.log(`Starting package deletion process for ID: ${packageId}`);
    
    // Get current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No authenticated user found when trying to delete package");
      return false;
    }
    
    console.log(`Authenticated user: ${currentUser.uid}`);
    
    // Try to delete from 'packages' collection
    try {
      console.log(`Attempting to delete package ${packageId} from 'packages' collection`);
      const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
      const packageDoc = await getDoc(packageRef);

      if (packageDoc.exists()) {
        const packageData = packageDoc.data();
        console.log(`Package found, data:`, packageData);
        
        // Check if current user is the agent for this package
        let isAuthorized = false;
        
        // Check different ways the agent might be referenced
        if (packageData.agentId === currentUser.uid) {
          console.log(`User is authorized: agentId matches current user`);
          isAuthorized = true;
        } else if (packageData.agent && typeof packageData.agent === 'object') {
          // Check if agent is a document reference
          if ('id' in packageData.agent && packageData.agent.id === currentUser.uid) {
            console.log(`User is authorized: agent.id matches current user`);
            isAuthorized = true;
          }
          // Check if it's a Firestore reference
          else if ('path' in packageData.agent) {
            const agentPath = packageData.agent.path;
            const agentId = agentPath.split('/').pop();
            if (agentId === currentUser.uid) {
              console.log(`User is authorized: agent reference path matches current user`);
              isAuthorized = true;
            }
          }
        }
        
        if (!isAuthorized) {
          console.log(`Current user ${currentUser.uid} is not authorized to delete this package`);
          // Try to get the user document to check if they're an agent/admin
          const userRef = doc(firestore, COLLECTIONS.USERS, currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isAgent || userData.isAgentTemp) {
              console.log(`User is ${userData.isAgent ? 'a permanent agent' : 'in temporary agent mode'}`);
              isAuthorized = true;
            }
          }
        }
        
        if (!isAuthorized) {
          console.error(`User ${currentUser.uid} is not authorized to delete package ${packageId}`);
          return false;
        }

        // Delete flight info if it exists
        if (packageData.flight_info) {
          try {
            // Check what type of reference we're dealing with
            if (typeof packageData.flight_info === 'string' && packageData.flight_info.trim() !== '') {
              // If it's a string ID, use it directly
              await deleteDoc(doc(firestore, "flight_info", packageData.flight_info));
              console.log("Deleted associated flight info document by ID");
            } else if (packageData.flight_info && typeof packageData.flight_info === 'object') {
              // If it's a reference object
              if ('path' in packageData.flight_info && packageData.flight_info.path) {
                // For a document reference with path
                const pathParts = packageData.flight_info.path.split('/');
                if (pathParts.length >= 2) {
                  const flightId = pathParts[pathParts.length - 1];
                  await deleteDoc(doc(firestore, "flight_info", flightId));
                  console.log("Deleted associated flight info document by reference path");
                } else {
                  console.log("Flight info path format invalid:", packageData.flight_info.path);
                }
              } else if ('id' in packageData.flight_info && packageData.flight_info.id) {
                // For an object with just an ID
                await deleteDoc(doc(firestore, "flight_info", packageData.flight_info.id));
                console.log("Deleted associated flight info document by object ID");
              } else {
                console.log("Flight info reference format not recognized:", packageData.flight_info);
              }
            } else {
              console.log("Skipping flight info deletion - invalid reference format");
            }
          } catch (error) {
            console.error("Error deleting flight info:", error);
            // Continue with package deletion even if flight info deletion fails
          }
        }

        // Delete package
        await deleteDoc(packageRef);
        console.log("Successfully deleted package from 'packages' collection");
        return true;
      } else {
        console.log("Package not found in 'packages' collection");
      }
    } catch (error) {
      console.error("Error deleting from 'packages' collection:", error);
    }

    // If not found or failed, try 'package_info' collection
    try {
      console.log(`Attempting to delete package ${packageId} from 'package_info' collection`);
      const packageInfoRef = doc(firestore, "package_info", packageId);
      const packageInfoDoc = await getDoc(packageInfoRef);

      if (packageInfoDoc.exists()) {
        const packageData = packageInfoDoc.data();
        console.log(`Package found in package_info collection, data:`, packageData);
        
        // Check if current user is the agent for this package
        let isAuthorized = false;
        
        if (packageData.agentId === currentUser.uid) {
          console.log(`User is authorized: agentId matches current user`);
          isAuthorized = true;
        } else if (packageData.agent && typeof packageData.agent === 'object' && 'id' in packageData.agent) {
          if (packageData.agent.id === currentUser.uid) {
            console.log(`User is authorized: agent.id matches current user`);
            isAuthorized = true;
          }
        }
        
        if (!isAuthorized) {
          console.log(`Current user ${currentUser.uid} is not listed as agent for package_info`);
          // Try to get the user document to check if they're an agent/admin
          const userRef = doc(firestore, COLLECTIONS.USERS, currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isAgent || userData.isAgentTemp) {
              console.log(`User is ${userData.isAgent ? 'a permanent agent' : 'in temporary agent mode'}`);
              isAuthorized = true;
            }
          }
        }
        
        if (!isAuthorized) {
          console.error(`User ${currentUser.uid} is not authorized to delete package info ${packageId}`);
          return false;
        }

        // Delete flight info if it exists and is a reference to another document
        if (packageData.flight_info) {
          try {
            // Check what type of reference we're dealing with
            if (typeof packageData.flight_info === 'string' && packageData.flight_info.trim() !== '') {
              // If it's a string ID, use it directly
              await deleteDoc(doc(firestore, "flight_info", packageData.flight_info));
              console.log("Deleted associated flight info document by ID");
            } else if (packageData.flight_info && typeof packageData.flight_info === 'object') {
              // If it's a reference object
              if ('path' in packageData.flight_info && packageData.flight_info.path) {
                // For a document reference with path
                const pathParts = packageData.flight_info.path.split('/');
                if (pathParts.length >= 2) {
                  const flightId = pathParts[pathParts.length - 1];
                  await deleteDoc(doc(firestore, "flight_info", flightId));
                  console.log("Deleted associated flight info document by reference path");
                } else {
                  console.log("Flight info path format invalid:", packageData.flight_info.path);
                }
              } else if ('id' in packageData.flight_info && packageData.flight_info.id) {
                // For an object with just an ID
                await deleteDoc(doc(firestore, "flight_info", packageData.flight_info.id));
                console.log("Deleted associated flight info document by object ID");
              } else {
                console.log("Flight info reference format not recognized:", packageData.flight_info);
              }
            } else {
              console.log("Skipping flight info deletion - invalid reference format");
            }
          } catch (error) {
            console.error("Error deleting flight info:", error);
            // Continue with package deletion even if flight info deletion fails
          }
        }

        // Delete package
        await deleteDoc(packageInfoRef);
        console.log("Successfully deleted package from 'package_info' collection");
        return true;
      } else {
        console.log("Package not found in 'package_info' collection either");
      }
    } catch (error) {
      console.error("Error deleting from 'package_info' collection:", error);
    }

    // If we've reached this point, we weren't able to delete the package
    console.log("Could not delete package - not found or not authorized");
    return false;
  } catch (error) {
    console.error("Error deleting package:", error);
    return false;
  }
};
