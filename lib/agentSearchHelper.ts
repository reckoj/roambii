import { databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";
import { PackageWithAgent } from "./searchFunctions";

/**
 * Find all agents where the name contains the search term
 *
 * @param searchTerm - The term to search for in agent names
 * @returns Array of agent data that match the search term
 */
export const findAgentsByName = async (searchTerm: string): Promise<any[]> => {
  try {
    // Get all agents (or as many as reasonable)
    const allAgents = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!,
      [Query.limit(100)]
    );

    // Filter the agents by name manually
    const matchingAgents = allAgents.documents.filter((agent) => {
      if (!agent.name) return false;

      const agentNameLower = agent.name.toLowerCase();
      const searchTermLower = searchTerm.toLowerCase();

      // Check if the agent name contains the search term
      return agentNameLower.includes(searchTermLower);
    });

    console.log(
      `Found ${matchingAgents.length} agents matching "${searchTerm}"`
    );
    return matchingAgents;
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
export const searchPackagesByAgentName = async (
  searchTerm: string
): Promise<PackageWithAgent[]> => {
  try {
    // First find agents with matching names
    const matchingAgents = await findAgentsByName(searchTerm);

    if (matchingAgents.length === 0) {
      console.log("No agents found matching the search term:", searchTerm);
      return [];
    }

    // Create a Set of agent IDs for faster lookups
    const agentIds = new Set(matchingAgents.map((agent) => agent.$id));

    // Get all packages (or a reasonable number)
    const allPackages = await databases.listDocuments(
      config.databaseId!,
      config.packagesCollectionId!,
      [Query.limit(100)]
    );

    // Filter packages by matching agent IDs
    const matchingPackages = allPackages.documents.filter(
      (pkg) => pkg.agent && agentIds.has(pkg.agent.$id)
    );

    console.log(
      `Found ${matchingPackages.length} packages from agents matching "${searchTerm}"`
    );

    // Process packages with agent info
    return matchingPackages.map((pkg) => {
      // Find the matching agent
      const matchingAgent = matchingAgents.find(
        (agent) => agent.$id === pkg.agent?.$id
      );

      return {
        ...pkg,
        agent: {
          name: matchingAgent?.name || "Unknown Agent",
          id: matchingAgent?.$id || null,
          avatar: matchingAgent?.avatar || null,
        },
        imageUrl: pkg.image || null,
      };
    });
  } catch (error) {
    console.error("Error in agent name search:", error);
    return [];
  }
};
