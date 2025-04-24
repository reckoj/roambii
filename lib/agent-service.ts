// lib/firebase/agentService.ts
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
import {
  firestore,
  database,
  COLLECTIONS,
} from "../lib/firebase/firebase-config";
import { Agent } from "./firebase/models";
import { uploadProfileImage } from "../lib/storage-service";

/**
 * Get agent profile by ID
 */
export const getAgentById = async (agentId: string): Promise<Agent | null> => {
  try {
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      return null;
    }

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
      avatarUrl = await uploadProfileImage(agentId, avatarUri);
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
      isAgent: true,
      isEmailVerified: userData.isEmailVerified,
      niche: agentData.niche || "",
      bio: agentData.bio || "",
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      $id: userData.id,
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

    // Get the agent reference
    const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);

    // Query packages where agent field points to this agent
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
    const q = query(packagesRef, where("agent", "==", agentRef));

    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} packages for this agent`);

    const packages: DocumentData[] = [];

    for (const doc of querySnapshot.docs) {
      const packageData = doc.data();

      // Format data to match the expected format in the UI
      packages.push({
        $id: doc.id,
        name: packageData.name,
        type: packageData.type,
        price: packageData.price,
        image: packageData.banner_image,
        rating: packageData.rating,
        bedrooms: packageData.beds,
        bathrooms: packageData.baths,
        guestAmount: packageData.guest_amount,
        checkInDate: packageData.check_in_date?.toDate?.(),
        checkOutDate: packageData.check_out_date?.toDate?.(),
        is_all_inclusive: packageData.is_all_inclusive,
        description: packageData.description,
        room_type: packageData.room_type,
        amenities: packageData.amenities,
      });
    }

    return packages;
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
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    const packageDoc = await getDoc(packageRef);

    if (packageDoc.exists()) {
      const packageData = packageDoc.data();

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
