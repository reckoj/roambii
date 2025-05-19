import { searchPackagesByAgentName } from "./agentSearchHelper";
import { collection, query, where, getDocs, orderBy, QueryConstraint, limit as firestoreLimit } from "firebase/firestore";
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
 * @param {number} limitCount - Maximum number of results to return
 * @returns {Promise<Array>} - Array of package documents with agent information
 */
export const searchPackages = async (
  searchQuery = "",
  region = "All",
  packageType = "All",
  limitCount = 20
): Promise<PackageWithAgent[]> => {
  console.log('searchPackages called with:', { searchQuery, region, packageType, limitCount });
  
  try {
    // Build query constraints
    const queryConstraints: QueryConstraint[] = [];

    console.log('Building query constraints');
    
    // Add region filter if selected
    if (region !== "All") {
      console.log('Adding region filter:', region);
      queryConstraints.push(where("region", "==", region));
    }

    // Add type filter if selected
    if (packageType !== "All") {
      console.log('Adding package type filter:', packageType);
      queryConstraints.push(where("type", "==", packageType));
    }

    // Set default ordering and limit
    console.log('Adding ordering and limit:', limitCount);
    queryConstraints.push(orderBy("createdAt", "desc"));
    queryConstraints.push(firestoreLimit(limitCount));

    // Execute search query
    console.log('Executing Firestore query with constraints:', queryConstraints.length);
    const packagesQuery = query(
      collection(firestore, COLLECTIONS.PACKAGES),
      ...queryConstraints
    );
    
    console.log('Getting documents from Firestore');
    const result = await getDocs(packagesQuery);
    console.log('Received', result.docs.length, 'documents from Firestore');

    // Process results
    console.log('Processing results');
    let enhancedResults = await Promise.all(
      result.docs.map(async (pkg, index) => {
        console.log(`Processing package ${index + 1}/${result.docs.length}: ${pkg.id}`);
        const data = pkg.data();
        console.log(`Package name: ${data.name}, data keys:`, Object.keys(data));
        console.log(`Image fields in data:`, {image: data.image, imagePath: data.imagePath, imageURL: data.imageURL, imageUrl: data.imageUrl});

        // Default agent information
        const agentInfo: AgentInfo = {
          name: "Unknown Agent",
          id: null,
          avatar: null,
        };

        // If package has an agent relationship, fetch agent details
        if (data.agentId) {
          try {
            console.log(`Fetching agent data for agentId: ${data.agentId}`);
            const agentDoc = await getDocs(
              query(collection(firestore, COLLECTIONS.AGENTS), where("id", "==", data.agentId))
            );
            if (!agentDoc.empty) {
              const agentData = agentDoc.docs[0].data();
              agentInfo.name = agentData.name || "Unknown Agent";
              agentInfo.id = agentData.id || null;
              agentInfo.avatar = agentData.avatar || null;
              console.log(`Found agent: ${agentInfo.name}`);
            } else {
              console.log(`No agent found for agentId: ${data.agentId}`);
            }
          } catch (error) {
            console.error("Error fetching agent data:", error);
          }
        } else {
          console.log('No agentId found for package');
        }

        // Get image from any available field
        const packageImage = data.image || data.imagePath || data.imageURL || data.imageUrl || null;

        // Create a properly typed object
        const typedPackage: PackageWithAgent = {
          id: pkg.id,
          name: data.name || "Unnamed Package",
          price: data.price || 0,
          type: data.type || "Unknown Type",
          image: packageImage,
          imageUrl: packageImage, // Use same image for both fields for compatibility
          agent: agentInfo,
          ...data
        };

        console.log(`Package ${pkg.id} image fields:`, {
          originalImage: data.image,
          originalImageUrl: data.imageUrl,
          packageImage: packageImage,
          finalImage: typedPackage.image,
          finalImageUrl: typedPackage.imageUrl
        });

        return typedPackage;
      })
    );

    // If search query is provided, filter results client-side
    if (searchQuery && searchQuery.trim() !== "") {
      console.log(`Filtering results client-side for search query: "${searchQuery}"`);
      const searchTermLower = searchQuery.toLowerCase().trim();
      
      const beforeFilterCount = enhancedResults.length;
      enhancedResults = enhancedResults.filter((pkg) => {
        const nameMatch = pkg.name?.toLowerCase().includes(searchTermLower);
        const typeMatch = pkg.type?.toLowerCase().includes(searchTermLower);
        const agentMatch = pkg.agent?.name?.toLowerCase().includes(searchTermLower);
        const descriptionMatch = pkg.description?.toLowerCase().includes(searchTermLower);

        const isMatch = nameMatch || typeMatch || agentMatch || descriptionMatch;
        console.log(`Package ${pkg.id} (${pkg.name}) match: ${isMatch ? 'YES' : 'NO'}`);
        return isMatch;
      });
      
      console.log(`Client-side filtering reduced results from ${beforeFilterCount} to ${enhancedResults.length}`);
    }

    console.log(`Returning ${enhancedResults.length} final results`);
    return enhancedResults;
  } catch (error) {
    console.error("Search error in searchPackages:", error);
    return [];
  }
};

/**
 * Get featured packages with agent information
 * @param {number} limitCount - Maximum number of results
 * @returns {Promise<Array>} - Array of featured package documents
 */
export const getFeaturedPackages = async (
  limitCount = 5
): Promise<PackageWithAgent[]> => {
  try {
    console.log(`Getting up to ${limitCount} featured packages`);
    
    const featuredQuery = query(
      collection(firestore, COLLECTIONS.PACKAGES),
      where("isFeatured", "==", true),
      orderBy("createdAt", "desc"),
      firestoreLimit(limitCount)
    );

    const result = await getDocs(featuredQuery);
    console.log(`Retrieved ${result.docs.length} featured packages`);

    return await Promise.all(
      result.docs.map(async (pkg) => {
        const data = pkg.data();
        console.log(`Featured package: ${pkg.id}, name: ${data.name}`);
        console.log(`Image fields:`, {image: data.image, imagePath: data.imagePath, imageURL: data.imageURL, imageUrl: data.imageUrl});
        
        // Get image from any available field
        const packageImage = data.image || data.imagePath || data.imageURL || data.imageUrl || null;
        
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
          name: data.name || "Unnamed Package",
          price: data.price || 0,
          type: data.type || "Unknown Type",
          image: packageImage,
          imageUrl: packageImage,
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
