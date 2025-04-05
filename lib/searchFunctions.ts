import { searchPackagesByAgentName } from "./agentSearchHelper";
import { databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";

// Define interfaces for type safety - export for reuse
export interface AgentInfo {
  name: string;
  id: string | null;
  avatar: string | null;
}

export interface PackageWithAgent {
  $id: string;
  $collectionId?: string;
  $databaseId?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
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
 * @param {string} query - Search query string
 * @param {string} region - Region filter (or 'All')
 * @param {string} packageType - Package type filter (or 'All')
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of package documents with agent information
 */
export const searchPackages = async (
  query = "",
  region = "All",
  packageType = "All",
  limit = 20
): Promise<PackageWithAgent[]> => {
  try {
    // Build query filters
    const queryFilters = [];

    // Add search query if provided
    if (query && query.trim() !== "") {
      // We'll search for packages by name and type
      const searchQueries = [
        Query.search("name", query),
        Query.search("type", query),
      ];

      // Get all packages that match the query
      queryFilters.push(Query.or(searchQueries));

      // Note: We'll handle agent name filtering after fetching results
    } else {
      // If no query, just get all packages (limited by other filters)
      // No need to add a specific query filter here
    }

    // Add region filter if selected
    if (region !== "All") {
      queryFilters.push(Query.equal("region", region));
    }

    // Add type filter if selected
    if (packageType !== "All") {
      queryFilters.push(Query.equal("type", packageType));
    }

    // Set default ordering and limit
    queryFilters.push(Query.orderDesc("$createdAt"));
    queryFilters.push(Query.limit(limit));

    // Execute search query
    const result = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      queryFilters
    );

    // First search for packages by name and type
    let enhancedResults = await Promise.all(
      result.documents.map(async (pkg) => {
        // Default agent information
        const agentInfo: AgentInfo = {
          name: "Unknown Agent",
          id: null,
          avatar: null,
        };

        // If package has an agent relationship, fetch agent details
        if (pkg.agent && pkg.agent.$id) {
          try {
            const agentData = await databases.getDocument(
              config.databaseId!,
              config.agentsCollectionId!,
              pkg.agent.$id
            );

            agentInfo.name = agentData.name || "Unknown Agent";
            agentInfo.id = agentData.$id || null;
            agentInfo.avatar = agentData.avatar || null;
          } catch (error) {
            console.error("Error fetching agent data:", error);
          }
        }

        // Get image URL if available
        const imageUrl = pkg.image || null;

        // Create a properly typed object
        const typedPackage: PackageWithAgent = {
          ...pkg,
          agent: agentInfo,
          imageUrl,
          name: pkg.name,
          price: pkg.price,
          type: pkg.type,
        };

        return typedPackage;
      })
    );

    // Then search for packages by agent name
    if (query && query.trim() !== "") {
      try {
        const agentNameResults = await searchPackagesByAgentName(query);

        if (agentNameResults.length > 0) {
          // Combine results, removing duplicates by $id
          const allPackages = [...enhancedResults, ...agentNameResults];
          const uniquePackages: PackageWithAgent[] = [];
          const seenIds = new Set();

          for (const pkg of allPackages) {
            if (!seenIds.has(pkg.$id)) {
              seenIds.add(pkg.$id);
              uniquePackages.push(pkg);
            }
          }

          enhancedResults = uniquePackages;
          console.log(
            `Combined search found ${enhancedResults.length} unique packages`
          );
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
    const result = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      [
        Query.equal("isFeatured", true),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
      ]
    );

    // Process results same as searchPackages
    return await Promise.all(
      result.documents.map(async (pkg) => {
        const agentInfo: AgentInfo = {
          name: "Unknown Agent",
          id: null,
          avatar: null,
        };

        if (pkg.agent && pkg.agent.$id) {
          try {
            const agentData = await databases.getDocument(
              config.databaseId!,
              config.agentsCollectionId!,
              pkg.agent.$id
            );

            agentInfo.name = agentData.name || "Unknown Agent";
            agentInfo.id = agentData.$id || null;
            agentInfo.avatar = agentData.avatar || null;
          } catch (error) {
            console.error("Error fetching agent data:", error);
          }
        }

        const imageUrl = pkg.image || null;

        // Create a properly typed object
        const typedPackage: PackageWithAgent = {
          ...pkg,
          agent: agentInfo,
          imageUrl,
          name: pkg.name,
          price: pkg.price,
          type: pkg.type,
        };

        return typedPackage;
      })
    );
  } catch (error) {
    console.error("Error fetching featured packages:", error);
    return [];
  }
};
