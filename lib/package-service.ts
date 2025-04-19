// lib/firebase/packageService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  firestore,
  storage,
  COLLECTIONS,
} from "../lib/firebase/firebase-config";
import { Package, Agent } from "./firebase/models";
import { getUserProfile } from "../lib/user-service";

/**
 * Fetch featured packages
 */
export const getFeaturedPackages = async (
  limitCount = 5
): Promise<Package[]> => {
  try {
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
    const q = query(
      packagesRef,
      where("isFeatured", "==", true),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const packages: Package[] = [];

    for (const doc of querySnapshot.docs) {
      const packageData = doc.data() as Omit<Package, "id">;

      packages.push({
        id: doc.id,
        ...packageData,
        createdAt:
          packageData.createdAt instanceof Timestamp
            ? packageData.createdAt.toDate()
            : packageData.createdAt,
        updatedAt:
          packageData.updatedAt instanceof Timestamp
            ? packageData.updatedAt.toDate()
            : packageData.updatedAt,
      });
    }

    return packages;
  } catch (error) {
    console.error("Error fetching featured packages:", error);
    return [];
  }
};

/**
 * Get all packages with optional filtering
 */
export const getAllPackages = async ({
  filter,
  query: searchQuery,
  limit: limitCount = 10,
  startAfterDoc = null,
}: {
  filter?: string;
  query?: string;
  limit?: number;
  startAfterDoc?: DocumentSnapshot | null;
}): Promise<{ packages: Package[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);

    // Start building the query
    let queryConstraints: any[] = [orderBy("createdAt", "desc")];

    // Add filter if provided
    if (filter && filter !== "All") {
      queryConstraints.push(where("type", "==", filter));
    }

    // Add limit
    queryConstraints.push(limit(limitCount));

    // Add pagination if document is provided
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }

    const q = query(packagesRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    const packages: Package[] = [];
    let lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    for (const doc of querySnapshot.docs) {
      const packageData = doc.data() as Omit<Package, "id">;

      // If there's a search query, filter client-side (not ideal for large datasets)
      if (searchQuery) {
        const searchTermLower = searchQuery.toLowerCase();
        const nameMatches = packageData.name
          ?.toLowerCase()
          .includes(searchTermLower);
        const typeMatches = packageData.type
          ?.toLowerCase()
          .includes(searchTermLower);
        const agentMatches = packageData.agent?.name
          ?.toLowerCase()
          .includes(searchTermLower);

        if (!nameMatches && !typeMatches && !agentMatches) {
          continue;
        }
      }

      packages.push({
        id: doc.id,
        ...packageData,
        createdAt:
          packageData.createdAt instanceof Timestamp
            ? packageData.createdAt.toDate()
            : packageData.createdAt,
        updatedAt:
          packageData.updatedAt instanceof Timestamp
            ? packageData.updatedAt.toDate()
            : packageData.updatedAt,
      });
    }

    return { packages, lastDoc: lastVisible };
  } catch (error) {
    console.error("Error fetching packages:", error);
    return { packages: [], lastDoc: null };
  }
};

/**
 * Get package by ID
 */
export const getPackageById = async (
  packageId: string
): Promise<Package | null> => {
  try {
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    const packageDoc = await getDoc(packageRef);

    if (!packageDoc.exists()) {
      return null;
    }

    const packageData = packageDoc.data() as Omit<Package, "id">;

    return {
      id: packageDoc.id,
      ...packageData,
      createdAt:
        packageData.createdAt instanceof Timestamp
          ? packageData.createdAt.toDate()
          : packageData.createdAt,
      updatedAt:
        packageData.updatedAt instanceof Timestamp
          ? packageData.updatedAt.toDate()
          : packageData.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching package:", error);
    return null;
  }
};

/**
 * Get packages by agent ID
 */
export const getAgentPackages = async (agentId: string): Promise<Package[]> => {
  try {
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
    const q = query(
      packagesRef,
      where("agent.id", "==", agentId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const packages: Package[] = [];

    querySnapshot.forEach((doc) => {
      const packageData = doc.data() as Omit<Package, "id">;

      packages.push({
        id: doc.id,
        ...packageData,
        createdAt:
          packageData.createdAt instanceof Timestamp
            ? packageData.createdAt.toDate()
            : packageData.createdAt,
        updatedAt:
          packageData.updatedAt instanceof Timestamp
            ? packageData.updatedAt.toDate()
            : packageData.updatedAt,
      });
    });

    return packages;
  } catch (error) {
    console.error("Error fetching agent packages:", error);
    return [];
  }
};

/**
 * Upload package image to Firebase Storage
 */
export const uploadPackageImage = async (
  imageUri: string
): Promise<string | undefined> => {
  try {
    // Fetch the file from the URI
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Generate a unique file name
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `package_${uuidv4()}.${fileExtension}`;

    // Upload to Firebase Storage
    const imageRef = ref(storage, `package_images/${fileName}`);
    await uploadBytes(imageRef, blob);

    // Get download URL
    const downloadUrl = await getDownloadURL(imageRef);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading package image:", error);
    return undefined;
  }
};

/**
 * Create a new package listing
 */
export const createPackage = async (
  packageData: Omit<Package, "id" | "createdAt" | "updatedAt">,
  imageUri?: string
): Promise<Package | null> => {
  try {
    // Upload image if provided
    let imageUrl = packageData.image;
    if (imageUri) {
      imageUrl = await uploadPackageImage(imageUri);
    }

    // Create a new document reference
    const packageRef = doc(collection(firestore, COLLECTIONS.PACKAGES));

    // Prepare package data
    const newPackage: Omit<Package, "id"> = {
      ...packageData,
      image: imageUrl || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    await setDoc(packageRef, newPackage);

    // Return the created package
    return {
      id: packageRef.id,
      ...newPackage,
    };
  } catch (error) {
    console.error("Error creating package:", error);
    return null;
  }
};

/**
 * Update an existing package
 */
export const updatePackage = async (
  packageId: string,
  updates: Partial<Omit<Package, "id" | "createdAt" | "updatedAt">>,
  imageUri?: string
): Promise<Package | null> => {
  try {
    // Get the existing package
    const existingPackage = await getPackageById(packageId);
    if (!existingPackage) {
      throw new Error("Package not found");
    }

    // Upload image if provided
    let imageUrl = existingPackage.image;
    if (imageUri) {
      const newImageUrl = await uploadPackageImage(imageUri);
      if (newImageUrl) {
        imageUrl = newImageUrl;
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      image: updates.image || imageUrl,
      updatedAt: new Date(),
    };

    // Update in Firestore
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    await updateDoc(packageRef, updateData);

    // Return the updated package
    return {
      ...existingPackage,
      ...updateData,
      id: packageId,
    };
  } catch (error) {
    console.error("Error updating package:", error);
    return null;
  }
};

/**
 * Delete a package
 */
export const deletePackage = async (packageId: string): Promise<boolean> => {
  try {
    const packageRef = doc(firestore, COLLECTIONS.PACKAGES, packageId);
    await deleteDoc(packageRef);
    return true;
  } catch (error) {
    console.error("Error deleting package:", error);
    return false;
  }
};

/**
 * Search packages by various criteria
 */
export const searchPackages = async (
  searchTerm?: string,
  packageType?: string,
  p0?: string,
  limitCount = 20
): Promise<Package[]> => {
  try {
    // Start with base query
    const packagesRef = collection(firestore, COLLECTIONS.PACKAGES);
    let queryConstraints: any[] = [orderBy("createdAt", "desc")];

    // Add package type filter if provided
    if (packageType && packageType !== "All") {
      queryConstraints.push(where("type", "==", packageType));
    }

    // Add limit
    queryConstraints.push(limit(limitCount));

    const q = query(packagesRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    let packages: Package[] = [];

    querySnapshot.forEach((doc) => {
      const packageData = doc.data() as Omit<Package, "id">;

      packages.push({
        id: doc.id,
        ...packageData,
        createdAt:
          packageData.createdAt instanceof Timestamp
            ? packageData.createdAt.toDate()
            : packageData.createdAt,
        updatedAt:
          packageData.updatedAt instanceof Timestamp
            ? packageData.updatedAt.toDate()
            : packageData.updatedAt,
      });
    });

    // If search term is provided, filter results client-side
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();

      packages = packages.filter((pkg) => {
        const nameMatch = pkg.name?.toLowerCase().includes(searchTermLower);
        const typeMatch = pkg.type?.toLowerCase().includes(searchTermLower);
        const agentMatch = pkg.agent?.name
          ?.toLowerCase()
          .includes(searchTermLower);

        return nameMatch || typeMatch || agentMatch;
      });

      // If there are agent name matches, add packages by those agents
      if (searchTerm.length > 2) {
        // Search for agents by name
        const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
        const agentsQuery = query(agentsRef, limit(10));
        const agentsSnapshot = await getDocs(agentsQuery);

        const matchingAgents: Agent[] = [];
        agentsSnapshot.forEach((doc) => {
          const agentData = doc.data() as Omit<Agent, "id">;
          if (agentData.name?.toLowerCase().includes(searchTermLower)) {
            matchingAgents.push({
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
          }
        });

        // Find packages by matching agents
        for (const agent of matchingAgents) {
          const agentPackages = await getAgentPackages(agent.id);

          // Add packages that aren't already in the results
          for (const pkg of agentPackages) {
            if (!packages.some((p) => p.id === pkg.id)) {
              packages.push(pkg);
            }
          }
        }
      }
    }

    return packages;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};
