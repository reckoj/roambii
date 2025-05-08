import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";
import { PackageWithAgent } from "./searchFunctions";

/**
 * Find all agents where the name contains the search term
 *
 * @param searchTerm - The term to search for in agent names
 * @returns Array of agent data that match the search term
 */
export const findAgentsByName = async (searchTerm: string): Promise<any[]> => {
  try {
    const agentsQuery = query(
      collection(firestore, COLLECTIONS.AGENTS),
      where("name", ">=", searchTerm),
      where("name", "<=", searchTerm + "\uf8ff")
    );

    const agentsSnapshot = await getDocs(agentsQuery);
    return agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error finding agents by name:", error);
    return [];
  }
};

/**
 * Get all packages then filter by agent
 * This works around the limitation of not being able to query by agent.$id
 *
 * @param searchTerm - The agent name to search for
 * @returns Array of packages associated with matching agents
 */
export const searchPackagesByAgentName = async (agentName: string): Promise<PackageWithAgent[]> => {
  try {
    // Query agents collection to find matching agent
    const agentsQuery = query(
      collection(firestore, COLLECTIONS.AGENTS),
      where("name", ">=", agentName),
      where("name", "<=", agentName + "\uf8ff")
    );

    const agentsSnapshot = await getDocs(agentsQuery);
    const agentIds = agentsSnapshot.docs.map(doc => doc.id);

    if (agentIds.length === 0) {
      return [];
    }

    // Query packages collection for packages by these agents
    const packagesQuery = query(
      collection(firestore, COLLECTIONS.PACKAGES),
      where("agentId", "in", agentIds)
    );

    const packagesSnapshot = await getDocs(packagesQuery);
    
    // Map the results to match PackageWithAgent interface
    return packagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        price: data.price,
        type: data.type,
        imageUrl: data.image || null,
        agent: {
          name: data.agentName || "Unknown Agent",
          id: data.agentId || null,
          avatar: data.agentAvatar || null
        },
        ...data
      };
    });
  } catch (error) {
    console.error("Error searching packages by agent name:", error);
    return [];
  }
};
