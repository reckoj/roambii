import { searchPackagesByAgentName } from "./agentSearchHelper";
import { collection, query, where, getDocs, orderBy, QueryConstraint } from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";

// Define interfaces for type safety - export for reuse
export interface AgentInfo {
  name: string;
  id: string | null;
  avatar: string | null;
}

export interface PackageWithAgent {
  id: string;
  name?: string;
  price?: number;
  type?: string;
  image?: string;
  imageUrl?: string | null;
  agent: AgentInfo;
  [key: string]: any; // Allow for additional properties
}

/**
 * Search packages by query, region, and package type
 * @param {string} searchQuery - Search query string
 * @param {string} region - Region filter (or 'All')
 * @param {string} packageType - Package type filter (or 'All')
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of package documents with agent information
 */
export const searchPackages = async (
  searchQuery = "",
  region = "All",
  packageType = "All",
  limit = 20
): Promise<PackageWithAgent[]> => {
  try {
    // Build query constraints
    const queryConstraints: QueryConstraint[] = [];

    // Add search query if provided
    if (searchQuery && searchQuery.trim() !== "") {
      queryConstraints.push(where("name", ">=", searchQuery));
      queryConstraints.push(where("name", "<=", searchQuery + "\uf8ff"));
    }

    // Add region filter if selected
    if (region !== "All") {
      queryConstraints.push(where("region", "==", region));
    }

    // Add type filter if selected
    if (packageType !== "All") {
      queryConstraints.push(where("type", "==", packageType));
    }

    // Set default ordering and limit
    queryConstraints.push(orderBy("createdAt", "desc"));

    // Execute search query
    const packagesQuery = query(
      collection(firestore, COLLECTIONS.PACKAGES),
      ...queryConstraints
    );
    const result = await getDocs(packagesQuery);

    // Process results
    let enhancedResults = await Promise.all(
      result.docs.map(async (pkg) => {
        const data = pkg.data();
        // Default agent information
        const agentInfo: AgentInfo = {
          name: "Unknown Agent",
          id: null,
          avatar: null,
        };

        // If package has an agent relationship, fetch agent details
        if (data.agentId) {
          try {
            const agentDoc = await getDocs(
              query(collection(firestore, COLLECTIONS.AGENTS), where("id", "==", data.agentId))
            );
            if (!agentDoc.empty) {
              const agentData = agentDoc.docs[0].data();
              agentInfo.name = agentData.name || "Unknown Agent";
              agentInfo.id = agentData.id || null;
              agentInfo.avatar = agentData.avatar || null;
            }
          } catch (error) {
            console.error("Error fetching agent data:", error);
          }
        }

        // Create a properly typed object
        const typedPackage: PackageWithAgent = {
          id: pkg.id,
          name: data.name,
          price: data.price,
          type: data.type,
          imageUrl: data.image || null,
          agent: agentInfo,
          ...data
        };

        return typedPackage;
      })
    );

    // Then search for packages by agent name
    if (searchQuery && searchQuery.trim() !== "") {
      try {
        const agentNameResults = await searchPackagesByAgentName(searchQuery);
        if (agentNameResults.length > 0) {
          // Combine results, removing duplicates by id
          const allPackages = [...enhancedResults, ...agentNameResults];
          const uniquePackages: PackageWithAgent[] = [];
          const seenIds = new Set();

          for (const pkg of allPackages) {
            if (!seenIds.has(pkg.id)) {
              seenIds.add(pkg.id);
              uniquePackages.push(pkg);
            }
          }

          enhancedResults = uniquePackages;
        }
      } catch (error) {
        console.error("Error in agent name search:", error);
      }
    }

    return enhancedResults;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

/**
 * Get featured packages with agent information
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of featured package documents
 */
export const getFeaturedPackages = async (
  limit = 5
): Promise<PackageWithAgent[]> => {
  try {
    const featuredQuery = query(
      collection(firestore, COLLECTIONS.PACKAGES),
      where("isFeatured", "==", true),
      orderBy("createdAt", "desc")
    );

    const result = await getDocs(featuredQuery);
    const limitedResults = result.docs.slice(0, limit);

    return await Promise.all(
      limitedResults.map(async (pkg) => {
        const data = pkg.data();
        const agentInfo: AgentInfo = {
          name: "Unknown Agent",
          id: null,
          avatar: null,
        };

        if (data.agentId) {
          try {
            const agentDoc = await getDocs(
              query(collection(firestore, COLLECTIONS.AGENTS), where("id", "==", data.agentId))
            );
            if (!agentDoc.empty) {
              const agentData = agentDoc.docs[0].data();
              agentInfo.name = agentData.name || "Unknown Agent";
              agentInfo.id = agentData.id || null;
              agentInfo.avatar = agentData.avatar || null;
            }
          } catch (error) {
            console.error("Error fetching agent data:", error);
          }
        }

        return {
          id: pkg.id,
          name: data.name,
          price: data.price,
          type: data.type,
          imageUrl: data.image || null,
          agent: agentInfo,
          ...data
        };
      })
    );
  } catch (error) {
    console.error("Error fetching featured packages:", error);
    return [];
  }
};
