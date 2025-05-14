// lib/client-service.ts
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
  Timestamp,
  addDoc,
  serverTimestamp,
  deleteDoc,
  DocumentData,
  limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";
import { Client, Booking } from "./firebase/models";
import { getUserProfile } from "./user-service";

/**
 * Utility function to safely format dates from various sources
 */
export const formatDate = (date?: Date | Timestamp | any): Date | undefined => {
  if (!date) return undefined;
  
  // Handle Firestore Timestamp
  if (typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // Handle string dates
  if (typeof date === 'string') {
    return new Date(date);
  }
  
  // Handle milliseconds
  if (typeof date === 'number') {
    return new Date(date);
  }
  
  // If it's already a Date, return it
  if (date instanceof Date) {
    return date;
  }
  
  // For unknown types, return undefined
  return undefined;
};

/**
 * Test function to check permissions on clients collection
 */
export const testClientCollectionPermissions = async (): Promise<any> => {
  try {
    // Get current user from Firebase Auth directly
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        error: "User not authenticated",
        auth: null
      };
    }
    
    const results = {
      auth: {
        uid: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        email: currentUser.email,
        providerId: currentUser.providerId
      },
      reads: {
        listCollection: false,
        readOwnClient: false,
        readAgentClient: false
      },
      writes: {
        createClient: false,
        updateOwnClient: false,
        deleteOwnClient: false
      },
      details: {} as Record<string, any>
    };
    
    // Test 1: List clients collection
    try {
      const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
      const snapshot = await getDocs(clientsRef);
      results.reads.listCollection = true;
      results.details.listCollection = {
        success: true,
        count: snapshot.size
      };
    } catch (error: any) {
      results.details.listCollection = {
        success: false,
        error: error.message,
        code: error.code
      };
    }
    
    // Test 2: Test creating a minimal client document
    try {
      const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
      const testClientData = {
        agentId: "test-agent-id",
        userId: currentUser.uid,
        bookings: ["test-booking-id"],
        status: "active",
        totalBookings: 1,
        totalSpent: 100,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const testDocRef = await addDoc(clientsRef, testClientData);
      results.writes.createClient = true;
      results.details.createClient = {
        success: true,
        id: testDocRef.id
      };
      
      // Clean up - delete the test document
      await deleteDoc(testDocRef);
    } catch (error: any) {
      results.details.createClient = {
        success: false,
        error: error.message,
        code: error.code
      };
    }
    
    return results;
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a new client relationship or update if it already exists
 */
export const createOrUpdateClientRelationship = async (
  agentId: string,
  userId: string,
  bookingId: string,
  bookingAmount: number
): Promise<string> => {
  try {
    // Validate inputs
    if (!agentId || !userId || !bookingId) {
      console.error("Missing required parameters for client relationship:", {
        agentId, userId, bookingId
      });
      throw new Error("Missing required parameters");
    }

    // Check current user authentication
    const auth = getAuth();
    const currentUser = auth.currentUser;

    console.log("DEBUG - createOrUpdateClientRelationship - Auth state:", {
      currentUser: currentUser?.uid,
      isAnonymous: currentUser?.isAnonymous,
      providerId: currentUser?.providerId,
    });
    
    // Security rule check - current user must be either the userId or agentId
    if (!currentUser) {
      console.warn("User not authenticated, creating client relationship may fail");
    } else if (currentUser.uid !== userId && currentUser.uid !== agentId) {
      console.warn("Warning: Current user doesn't match userId or agentId - this might fail due to security rules");
      console.log("DEBUG - Auth mismatch details:", {
        currentUser: currentUser.uid,
        requestedUserId: userId,
        requestedAgentId: agentId
      });
    }

    // Check if this client relationship already exists
    const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
    const q = query(
      clientsRef,
      where("agentId", "==", agentId),
      where("userId", "==", userId)
    );
    
    console.log("DEBUG - createOrUpdateClientRelationship - Checking for existing relationship with query:", {
      collection: COLLECTIONS.CLIENTS,
      agentId,
      userId
    });
    
    const querySnapshot = await getDocs(q);
    console.log("DEBUG - createOrUpdateClientRelationship - Query results:", {
      empty: querySnapshot.empty,
      size: querySnapshot.size
    });

    // Get user details to cache in the client record
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      console.error("User not found for client relationship:", userId);
      throw new Error("User not found");
    }

    const now = new Date();
    
    // Prepare contact info from user profile
    const contactInfo = {
      name: userProfile.name,
      email: userProfile.email,
      phone: userProfile.legalInformation?.phoneNumber,
    };
    
    console.log("DEBUG - createOrUpdateClientRelationship - Contact info prepared:", contactInfo);

    // If client relationship exists, update it
    if (!querySnapshot.empty) {
      const clientDoc = querySnapshot.docs[0];
      const clientData = clientDoc.data() as Client;
      
      // Security rule check - only the agent can update an existing client relationship
      if (currentUser && currentUser.uid !== agentId) {
        console.error("DEBUG - createOrUpdateClientRelationship - Current user is not the agent, cannot update client relationship");
        throw new Error("Permission denied: Only the agent can update client relationships");
      }
      
      // Only add booking ID if it's not already in the array
      const bookings = clientData.bookings || [];
      if (!bookings.includes(bookingId)) {
        bookings.push(bookingId);
      }

      const updateData = {
        bookings,
        lastBookingDate: now,
        totalBookings: bookings.length,
        totalSpent: (clientData.totalSpent || 0) + bookingAmount,
        status: 'active',
        updatedAt: serverTimestamp(),
        contactInfo,
      };

      console.log("DEBUG - createOrUpdateClientRelationship - Updating existing relationship:", {
        id: clientDoc.id,
        updateData
      });

      try {
        await updateDoc(doc(firestore, COLLECTIONS.CLIENTS, clientDoc.id), updateData);
        console.log("DEBUG - createOrUpdateClientRelationship - Relationship updated successfully");
        return clientDoc.id;
      } catch (updateError) {
        console.error("DEBUG - createOrUpdateClientRelationship - Error updating:", updateError);
        throw updateError;
      }
    }

    // Create new client relationship - ensure it complies with security rules
    // (current user must be either the userId or agentId)
    let newClientData = {
      agentId,
      userId,
      bookings: [bookingId],
      lastBookingDate: now,
      totalBookings: 1,
      totalSpent: bookingAmount,
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      contactInfo,
    };

    console.log("DEBUG - createOrUpdateClientRelationship - Creating new relationship:", newClientData);

    try {
      const clientDoc = await addDoc(clientsRef, newClientData);
      console.log("DEBUG - createOrUpdateClientRelationship - New relationship created with ID:", clientDoc.id);
      return clientDoc.id;
    } catch (addError: any) {
      console.error("DEBUG - createOrUpdateClientRelationship - Error creating:", addError);
      if (addError.code) {
        console.error("DEBUG - Error code:", addError.code);
      }
      if (addError.message) {
        console.error("DEBUG - Error message:", addError.message);
      }
      
      // If we get a permission error and the current user doesn't match
      // what we're trying to set, try to create a valid entry
      if (currentUser && addError.code === 'permission-denied' && 
          currentUser.uid !== userId && 
          currentUser.uid !== agentId) {
        console.log("DEBUG - Attempting to create a client relationship with current user as user");
        
        // Try creating with current user as the user
        try {
          const adaptedClientData = {
            ...newClientData,
            userId: currentUser.uid,
          };
          
          console.log("DEBUG - Creating adapted client relationship:", adaptedClientData);
          const adaptedClientDoc = await addDoc(clientsRef, adaptedClientData);
          console.log("DEBUG - Adapted client relationship created with ID:", adaptedClientDoc.id);
          return adaptedClientDoc.id;
        } catch (adaptedError) {
          console.error("DEBUG - Error creating adapted client relationship:", adaptedError);
          throw adaptedError;
        }
      }
      
      throw addError;
    }
  } catch (error) {
    console.error("Error creating/updating client relationship:", error);
    throw error;
  }
};

/**
 * Get all clients for a specific agent
 */
export const getAgentClients = async (
  agentId: string,
  options?: {
    limit?: number;
    sortBy?: 'lastBookingDate' | 'totalSpent' | 'totalBookings';
    sortDirection?: 'asc' | 'desc';
  }
): Promise<Client[]> => {
  try {
    const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
    const queryConstraints: any[] = [where("agentId", "==", agentId)];

    // Add sorting options
    const sortField = options?.sortBy || 'lastBookingDate';
    const sortDir = options?.sortDirection || 'desc';
    queryConstraints.push(orderBy(sortField, sortDir));
    
    // Add limit if provided
    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }

    const q = query(clientsRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const clients: Client[] = [];
    
    querySnapshot.forEach((doc) => {
      const clientData = doc.data() as Omit<Client, 'id'>;
      
      clients.push({
        id: doc.id,
        ...clientData,
        lastBookingDate: clientData.lastBookingDate instanceof Timestamp
          ? clientData.lastBookingDate.toDate()
          : clientData.lastBookingDate,
        createdAt: clientData.createdAt instanceof Timestamp
          ? clientData.createdAt.toDate()
          : clientData.createdAt,
        updatedAt: clientData.updatedAt instanceof Timestamp
          ? clientData.updatedAt.toDate()
          : clientData.updatedAt,
      });
    });
    
    return clients;
  } catch (error) {
    console.error("Error fetching agent clients:", error);
    return [];
  }
};

/**
 * Get client details by ID
 */
export const getClientById = async (clientId: string): Promise<Client | null> => {
  try {
    const clientRef = doc(firestore, COLLECTIONS.CLIENTS, clientId);
    const clientDoc = await getDoc(clientRef);
    
    if (!clientDoc.exists()) {
      return null;
    }
    
    const clientData = clientDoc.data() as Omit<Client, 'id'>;
    
    return {
      id: clientDoc.id,
      ...clientData,
      lastBookingDate: clientData.lastBookingDate instanceof Timestamp
        ? clientData.lastBookingDate.toDate()
        : clientData.lastBookingDate,
      createdAt: clientData.createdAt instanceof Timestamp
        ? clientData.createdAt.toDate()
        : clientData.createdAt,
      updatedAt: clientData.updatedAt instanceof Timestamp
        ? clientData.updatedAt.toDate()
        : clientData.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching client details:", error);
    return null;
  }
};

/**
 * Get all agents for a specific client/user
 */
export const getUserAgentRelationships = async (userId: string): Promise<Client[]> => {
  try {
    const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
    const q = query(
      clientsRef,
      where("userId", "==", userId),
      orderBy("lastBookingDate", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const clients: Client[] = [];
    
    querySnapshot.forEach((doc) => {
      const clientData = doc.data() as Omit<Client, 'id'>;
      
      clients.push({
        id: doc.id,
        ...clientData,
        lastBookingDate: clientData.lastBookingDate instanceof Timestamp
          ? clientData.lastBookingDate.toDate()
          : clientData.lastBookingDate,
        createdAt: clientData.createdAt instanceof Timestamp
          ? clientData.createdAt.toDate()
          : clientData.createdAt,
        updatedAt: clientData.updatedAt instanceof Timestamp
          ? clientData.updatedAt.toDate()
          : clientData.updatedAt,
      });
    });
    
    return clients;
  } catch (error) {
    console.error("Error fetching user's agent relationships:", error);
    return [];
  }
};

/**
 * Update client preferences
 */
export const updateClientPreferences = async (
  clientId: string,
  preferences: Client['preferences']
): Promise<boolean> => {
  try {
    const clientRef = doc(firestore, COLLECTIONS.CLIENTS, clientId);
    
    await updateDoc(clientRef, {
      preferences,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating client preferences:", error);
    return false;
  }
};

/**
 * Update client notes
 */
export const updateClientNotes = async (
  clientId: string,
  notes: string
): Promise<boolean> => {
  try {
    const clientRef = doc(firestore, COLLECTIONS.CLIENTS, clientId);
    
    await updateDoc(clientRef, {
      notes,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating client notes:", error);
    return false;
  }
};

/**
 * Change client status (active/inactive)
 */
export const updateClientStatus = async (
  clientId: string,
  status: 'active' | 'inactive'
): Promise<boolean> => {
  try {
    const clientRef = doc(firestore, COLLECTIONS.CLIENTS, clientId);
    
    await updateDoc(clientRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating client status:", error);
    return false;
  }
};

/**
 * Delete client relationship
 */
export const deleteClientRelationship = async (clientId: string): Promise<boolean> => {
  try {
    const clientRef = doc(firestore, COLLECTIONS.CLIENTS, clientId);
    await deleteDoc(clientRef);
    return true;
  } catch (error) {
    console.error("Error deleting client relationship:", error);
    return false;
  }
};

/**
 * Create a minimal client record for debugging
 */
export const createMinimalClientRecord = async (
  agentId: string,
  userId: string,
  bookingId: string
): Promise<string | null> => {
  try {
    // Check if user is authenticated using static import
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error("DEBUG - Not authenticated when creating minimal client record");
      return null;
    }
    
    console.log("DEBUG - Creating minimal client record with auth:", {
      currentUser: currentUser.uid,
      isCreatingForSelf: currentUser.uid === userId,
      isCreatingAsAgent: currentUser.uid === agentId
    });
    
    // Create a minimal client document - only required fields
    const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
    const minimalClient = {
      agentId: agentId,
      userId: userId,
      bookings: [bookingId],
      status: 'active' as const,
      totalBookings: 1,
      totalSpent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Use the current user's ID for either userId or agentId to ensure permission
    if (currentUser.uid !== userId && currentUser.uid !== agentId) {
      console.log("DEBUG - Current user doesn't match either userId or agentId - using current user as userId");
      minimalClient.userId = currentUser.uid;
    }
    
    console.log("DEBUG - Minimal client record data:", minimalClient);
    
    const clientDoc = await addDoc(clientsRef, minimalClient);
    console.log("DEBUG - Minimal client record created with ID:", clientDoc.id);
    return clientDoc.id;
  } catch (error) {
    console.error("DEBUG - Error creating minimal client record:", error);
    return null;
  }
};

/**
 * Simplified version to create a client relationship without auth checks 
 * (for use during debugging)
 */
export const createBasicClientRelationship = async (
  agentId: string,
  userId: string,
  bookingId: string,
  bookingAmount: number = 0
): Promise<string | null> => {
  try {
    console.log("DEBUG - Creating basic client relationship (no auth checks):", {
      agentId, userId, bookingId, amount: bookingAmount
    });
    
    // Check if user profile exists
    const userProfile = await getUserProfile(userId);
    
    // Create a basic client document
    const clientsRef = collection(firestore, COLLECTIONS.CLIENTS);
    
    // Prepare the minimal data needed
    const now = new Date();
    const contactInfo = userProfile ? {
      name: userProfile.name,
      email: userProfile.email,
      phone: userProfile.legalInformation?.phoneNumber,
    } : {
      name: "Unknown User",
      email: "unknown@example.com"
    };
    
    const clientData = {
      agentId,
      userId,
      bookings: [bookingId],
      lastBookingDate: now,
      totalBookings: 1,
      totalSpent: bookingAmount,
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      contactInfo,
      // Add a flag to indicate this was created in debug mode
      _debug_created: true
    };
    
    console.log("DEBUG - Basic client record data:", clientData);
    
    const clientDoc = await addDoc(clientsRef, clientData);
    console.log("DEBUG - Basic client relationship created with ID:", clientDoc.id);
    return clientDoc.id;
  } catch (error) {
    console.error("DEBUG - Error creating basic client relationship:", error);
    return null;
  }
};

/**
 * Get all clients for a specific agent from bookings with embedded client relationships
 */
export const getAgentClientsFromBookings = async (
  agentId: string,
  options?: {
    limit?: number;
    sortBy?: 'lastBookingDate' | 'totalSpent' | 'totalBookings';
    sortDirection?: 'asc' | 'desc';
  }
): Promise<Client[]> => {
  try {
    const bookingsRef = collection(firestore, COLLECTIONS.BOOKINGS);
    
    // Simplified query to avoid needing a composite index
    // Just get all bookings for this agent
    const q = query(
      bookingsRef,
      where("packageDetails.agent.id", "==", agentId),
      orderBy("createdAt", options?.sortDirection || "desc")
    );
    
    console.log(`DEBUG - Querying bookings for agent ${agentId}`);
    
    const querySnapshot = await getDocs(q);
    console.log(`DEBUG - Found ${querySnapshot.size} bookings for agent`);
    
    // Group bookings by user to create client records
    const clientsMap = new Map<string, Client>();
    
    // Filter for bookings with client relationships in memory
    querySnapshot.forEach((doc) => {
      const bookingData = doc.data();
      
      // Skip if this booking doesn't have clientRelationship data
      if (!bookingData.clientRelationship) {
        return;
      }
      
      // Skip if the relationship doesn't match our agent
      if (bookingData.clientRelationship.agentId !== agentId) {
        return;
      }
      
      const userId = bookingData.clientRelationship.userId;
      const existingClient = clientsMap.get(userId);
      
      // Calculate booking amount - either from payment or from package price
      const bookingAmount = 
        (bookingData.payment?.amount) || 
        (bookingData.packageDetails?.price) || 0;
      
      const bookingDate = bookingData.createdAt instanceof Timestamp 
        ? bookingData.createdAt.toDate() 
        : new Date(bookingData.createdAt);
      
      if (existingClient) {
        // Update existing client record
        existingClient.bookings.push(doc.id);
        existingClient.totalBookings = existingClient.bookings.length;
        existingClient.totalSpent += bookingAmount;
        
        // Update last booking date if this booking is newer
        const existingDate = existingClient.lastBookingDate instanceof Date
          ? existingClient.lastBookingDate
          : existingClient.lastBookingDate instanceof Timestamp
            ? existingClient.lastBookingDate.toDate()
            : new Date(0); // Default to epoch if undefined
          
        if (bookingDate > existingDate) {
          existingClient.lastBookingDate = bookingDate;
        }
      } else {
        // Create new client record
        const newClient: Client = {
          id: `embedded-${userId}`, // Virtual ID for embedded relationships
          agentId: agentId,
          userId: userId,
          bookings: [doc.id],
          lastBookingDate: bookingDate,
          totalBookings: 1,
          totalSpent: bookingAmount,
          status: 'active',
          contactInfo: bookingData.clientRelationship.contactInfo || {
            name: bookingData.travelerInfo?.fullName || "Unknown",
            email: bookingData.travelerInfo?.email || "",
          },
          createdAt: bookingDate,
          updatedAt: bookingDate,
        };
        
        clientsMap.set(userId, newClient);
      }
    });
    
    // Convert map to array and sort if needed
    let clients = Array.from(clientsMap.values());
    console.log(`DEBUG - Created ${clients.length} client records from bookings`);
    
    // Apply sorting
    if (options?.sortBy) {
      const direction = options.sortDirection === 'asc' ? 1 : -1;
      clients.sort((a, b) => {
        if (options.sortBy === 'totalSpent') {
          return (a.totalSpent - b.totalSpent) * direction;
        } else if (options.sortBy === 'totalBookings') {
          return (a.totalBookings - b.totalBookings) * direction;
        } else {
          // lastBookingDate
          const dateA = a.lastBookingDate instanceof Date 
            ? a.lastBookingDate.getTime() 
            : a.lastBookingDate instanceof Timestamp
              ? a.lastBookingDate.toDate().getTime()
              : 0; // Use 0 as fallback for undefined
          const dateB = b.lastBookingDate instanceof Date 
            ? b.lastBookingDate.getTime() 
            : b.lastBookingDate instanceof Timestamp
              ? b.lastBookingDate.toDate().getTime()
              : 0; // Use 0 as fallback for undefined
          return (dateA - dateB) * direction;
        }
      });
    }
    
    // Apply limit
    if (options?.limit && options.limit > 0) {
      clients = clients.slice(0, options.limit);
    }
    
    return clients;
  } catch (error) {
    console.error("Error fetching agent clients from bookings:", error);
    return [];
  }
};

/**
 * Get client details from bookings
 */
export const getClientDetailsFromBookings = async (
  agentId: string, 
  userId: string
): Promise<Client | null> => {
  try {
    const bookingsRef = collection(firestore, COLLECTIONS.BOOKINGS);
    
    // Simple query that doesn't require a complex index
    const q = query(
      bookingsRef,
      where("packageDetails.agent.id", "==", agentId)
    );
    
    console.log(`DEBUG - Querying bookings for agent ${agentId}`);
    
    const querySnapshot = await getDocs(q);
    console.log(`DEBUG - Found ${querySnapshot.size} bookings for agent, filtering for user ${userId}`);
    
    // Filter for the specific user in memory
    const matchingBookings = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.clientRelationship && 
             data.clientRelationship.userId === userId;
    });
    
    console.log(`DEBUG - Found ${matchingBookings.length} bookings for client details`);
    
    if (matchingBookings.length === 0) {
      return null;
    }
    
    // Build client record from all matching bookings
    let clientData: Partial<Client> = {
      id: `embedded-${userId}`,
      agentId: agentId,
      userId: userId,
      bookings: [],
      totalBookings: 0,
      totalSpent: 0,
      status: 'active',
    };
    
    let lastBookingDate: Date | null = null;
    
    matchingBookings.forEach((doc) => {
      const bookingData = doc.data();
      
      // Add booking ID
      clientData.bookings?.push(doc.id);
      
      // Update total bookings
      if (clientData.totalBookings !== undefined) {
        clientData.totalBookings += 1;
      }
      
      // Add booking amount to total spent
      const bookingAmount = 
        (bookingData.payment?.amount) || 
        (bookingData.packageDetails?.price) || 0;
        
      if (clientData.totalSpent !== undefined) {
        clientData.totalSpent += bookingAmount;
      }
      
      // Get contact info from first booking (they should all be the same)
      if (!clientData.contactInfo && bookingData.clientRelationship?.contactInfo) {
        clientData.contactInfo = bookingData.clientRelationship.contactInfo;
      }
      
      // Track latest booking date
      const bookingDate = bookingData.createdAt instanceof Timestamp 
        ? bookingData.createdAt.toDate() 
        : new Date(bookingData.createdAt);
        
      if (!lastBookingDate || bookingDate > lastBookingDate) {
        lastBookingDate = bookingDate;
        clientData.lastBookingDate = bookingDate;
      }
    });
    
    // Return complete client record
    return clientData as Client;
  } catch (error) {
    console.error("Error fetching client details from bookings:", error);
    return null;
  }
}; 