import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { router, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { Client } from "../../lib/firebase/models";
import {
  getAgentClients,
  updateClientStatus,
  updateClientNotes,
  formatDate,
  getAgentClientsFromBookings,
} from "../../lib/client-service";
import { useGlobalContext } from "../../lib/global-provider";
import {
  TouchableRipple,
  Menu,
  Divider,
  Button,
  Dialog,
  Portal,
} from "react-native-paper";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "../../lib/firebase/firebase-config";
import { getChatRoomId, findExistingChatRoom } from "../../lib/chat-service";

// Define colors locally to avoid import issues
const colors = {
  primary: "#1ABC9C",
  secondary: "#D9D9D9",
  text: "#333333",
  background: "#F9FAFC",
  white: "#FFFFFF",
  danger: "#FF4C69",
};

// Format currency utility function
const FormatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Display date for UI
const displayDate = (date?: Date | any): string => {
  const formattedDate = formatDate(date);
  return formattedDate ? formattedDate.toLocaleDateString() : "N/A";
};

const ClientsScreen = () => {
  const { rawUser: user, loading: userLoading } = useGlobalContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    "lastBookingDate" | "totalSpent" | "totalBookings"
  >("lastBookingDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchText, setSearchText] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notesDialogVisible, setNotesDialogVisible] = useState(false);
  const [clientNotes, setClientNotes] = useState("");

  // Load clients
  const loadClients = async () => {
    if (!user || !user.isAgent) return;

    setLoading(true);
    try {
      console.log(`Loading clients for agent ID: ${user.id}`);
      let clientsData: Client[] = [];
      let errorMessage = "";

      // First try to get clients from the dedicated clients collection
      try {
        clientsData = await getAgentClients(user.id, {
          sortBy,
          sortDirection,
        });
        console.log(
          `Found ${clientsData.length} clients in dedicated collection`
        );
      } catch (error) {
        console.error("Error fetching from clients collection:", error);
        errorMessage += "Failed to query clients collection. ";
      }

      // Always check for embedded clients to ensure we have the most complete list
      console.log(
        "Checking for embedded clients in bookings"
      );

      try {
        const embeddedClientsData = await getAgentClientsFromBookings(user.id, {
          sortBy,
          sortDirection,
        });
        console.log(
          `Found ${embeddedClientsData.length} clients using embedded approach`
        );

        // Add any embedded clients not already in the main collection
        if (embeddedClientsData.length > 0) {
          // Get the user IDs of clients we already have
          const existingUserIds = new Set(clientsData.map(client => client.userId));
          
          // Filter out any embedded clients we already have
          const newEmbeddedClients = embeddedClientsData.filter(
            client => !existingUserIds.has(client.userId)
          );
          
          if (newEmbeddedClients.length > 0) {
            console.log(`Adding ${newEmbeddedClients.length} new embedded clients to list`);
            clientsData = [...clientsData, ...newEmbeddedClients];
          }
        }
      } catch (error) {
        console.error("Error with embedded approach:", error);
        errorMessage += "Failed to query embedded client relationships. ";

        // Last resort: Try a different way to get bookings with client relationships
        try {
          // Get all the agent's bookings and filter for client relationships client-side
          const bookingsCollection = collection(
            firestore,
            COLLECTIONS.BOOKINGS
          );
          
          // Try multiple query approaches to find all agent bookings
          const bookingDocs = new Map();
          
          // 1. Try with packageDetails.agent.id
          const q1 = query(
            bookingsCollection,
            where("packageDetails.agent.id", "==", user.id)
          );
          const snapshot1 = await getDocs(q1);
          console.log(`Found ${snapshot1.size} bookings with packageDetails.agent.id`);
          snapshot1.forEach(doc => bookingDocs.set(doc.id, doc));
          
          // 2. Try with packageDetails.agentId
          const q2 = query(
            bookingsCollection,
            where("packageDetails.agentId", "==", user.id)
          );
          const snapshot2 = await getDocs(q2);
          console.log(`Found ${snapshot2.size} bookings with packageDetails.agentId`);
          snapshot2.forEach(doc => bookingDocs.set(doc.id, doc));
          
          // 3. Try with package_details.agent_id
          const q3 = query(
            bookingsCollection,
            where("package_details.agent_id", "==", user.id)
          );
          const snapshot3 = await getDocs(q3);
          console.log(`Found ${snapshot3.size} bookings with package_details.agent_id`);
          snapshot3.forEach(doc => bookingDocs.set(doc.id, doc));
          
          // 4. Try with agent_id
          const q4 = query(
            bookingsCollection,
            where("agent_id", "==", user.id)
          );
          const snapshot4 = await getDocs(q4);
          console.log(`Found ${snapshot4.size} bookings with agent_id`);
          snapshot4.forEach(doc => bookingDocs.set(doc.id, doc));
          
          const bookingsSnapshot = Array.from(bookingDocs.values());
          console.log(`Found ${bookingsSnapshot.length} bookings for agent`);

          // Process bookings manually to find client relationships
          const clientMap = new Map<string, Client>();

          bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            
            // Check both camelCase and snake_case formats
            const clientRelationship = booking.clientRelationship || booking.client_relationship;
            if (clientRelationship) {
              const userId = clientRelationship.userId || clientRelationship.user_id;
              if (!userId) return;
              
              const existingClient = clientMap.get(userId);

              const bookingDate =
                booking.createdAt instanceof Timestamp
                  ? booking.createdAt.toDate()
                  : booking.created_at instanceof Timestamp
                    ? booking.created_at.toDate()
                    : new Date();

              const bookingAmount =
                (booking.payment?.amount) || 
                (booking.payment && booking.payment.amount) ||
                (booking.packageDetails?.price) || 
                (booking.packageDetails && booking.packageDetails.price) ||
                (booking.package_details?.price) || 0;

              if (existingClient) {
                // Update existing client
                existingClient.bookings.push(doc.id);
                existingClient.totalBookings++;
                existingClient.totalSpent += bookingAmount;

                // Update last booking date if newer
                const existingDate =
                  existingClient.lastBookingDate instanceof Date
                    ? existingClient.lastBookingDate
                    : new Date(0);

                if (bookingDate > existingDate) {
                  existingClient.lastBookingDate = bookingDate;
                }
              } else {
                // Get contact info from appropriate fields
                const contactInfo = clientRelationship.contactInfo || clientRelationship.contact_info || {
                  name: booking.travelerInfo?.fullName || booking.traveler_info?.full_name || "Unknown",
                  email: booking.travelerInfo?.email || booking.traveler_info?.email || "",
                  phone: booking.travelerInfo?.phone || booking.traveler_info?.phone || "",
                };
                
                // Create new client entry
                clientMap.set(userId, {
                  id: `embedded-${userId}`,
                  agentId: user.id,
                  userId: userId,
                  bookings: [doc.id],
                  totalBookings: 1,
                  totalSpent: bookingAmount,
                  lastBookingDate: bookingDate,
                  status: 'active',
                  createdAt: bookingDate,
                  updatedAt: bookingDate,
                  contactInfo,
                });
              }
            }
          });

          const fallbackClients = Array.from(clientMap.values());
          console.log(
            `Found ${fallbackClients.length} clients using fallback method`
          );
          
          // Merge with existing clients
          if (fallbackClients.length > 0) {
            // Get the user IDs of clients we already have
            const existingUserIds = new Set(clientsData.map(client => client.userId));
            
            // Filter out any fallback clients we already have
            const newFallbackClients = fallbackClients.filter(
              client => !existingUserIds.has(client.userId)
            );
            
            if (newFallbackClients.length > 0) {
              console.log(`Adding ${newFallbackClients.length} new fallback clients to list`);
              clientsData = [...clientsData, ...newFallbackClients];
            }
          }
        } catch (fallbackError) {
          console.error("Fallback approach also failed:", fallbackError);
          errorMessage += "Fallback method also failed. ";
        }
      }

      // Security check: filter to only include clients where this agent is the agent
      clientsData = clientsData.filter((client) => client.agentId === user.id);
      console.log(
        `After security filtering: ${clientsData.length} clients remain`
      );

      // Sort clients by the specified criteria
      if (sortBy === 'lastBookingDate') {
        clientsData.sort((a, b) => {
          const dateA = a.lastBookingDate instanceof Date 
            ? a.lastBookingDate.getTime() 
            : a.lastBookingDate instanceof Timestamp
              ? a.lastBookingDate.toDate().getTime()
              : 0;
          const dateB = b.lastBookingDate instanceof Date 
            ? b.lastBookingDate.getTime() 
            : b.lastBookingDate instanceof Timestamp
              ? b.lastBookingDate.toDate().getTime()
              : 0;
          return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
        });
      } else if (sortBy === 'totalSpent') {
        clientsData.sort((a, b) => {
          return sortDirection === 'desc' 
            ? b.totalSpent - a.totalSpent 
            : a.totalSpent - b.totalSpent;
        });
      } else if (sortBy === 'totalBookings') {
        clientsData.sort((a, b) => {
          return sortDirection === 'desc' 
            ? b.totalBookings - a.totalBookings 
            : a.totalBookings - b.totalBookings;
        });
      }

      setClients(clientsData);

      // Show error if all methods failed and no clients were found
      if (clientsData.length === 0 && errorMessage) {
        console.warn("All client fetch methods failed:", errorMessage);
        Alert.alert(
          "Warning",
          "Some methods to fetch client relationships failed. Results may be incomplete."
        );
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      Alert.alert("Error", "Failed to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update client status
  const handleStatusChange = async (
    clientId: string,
    newStatus: "active" | "inactive"
  ) => {
    try {
      await updateClientStatus(clientId, newStatus);

      // If this was an embedded client, we need to reload the clients list
      // because a new real client record was created with a different ID
      if (clientId.startsWith("embedded-")) {
        Alert.alert(
          "Success",
          "Client status updated successfully. Refreshing client list..."
        );
        loadClients(); // Reload all clients to get the new client record
      } else {
        // Update local state for normal clients
        setClients(
          clients.map((client) =>
            client.id === clientId ? { ...client, status: newStatus } : client
          )
        );
        Alert.alert("Success", "Client status updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating client status:", error);
      // Show the specific error message if available
      Alert.alert(
        "Error",
        error.message || "Failed to update client status. Please try again."
      );
    }
  };

  // Save client notes
  const handleSaveNotes = async () => {
    if (!selectedClient) return;

    try {
      await updateClientNotes(selectedClient.id, clientNotes);

      // If this was an embedded client, we need to reload the clients list
      // because a new real client record was created with a different ID
      if (selectedClient.id.startsWith("embedded-")) {
        setNotesDialogVisible(false);
        Alert.alert(
          "Success",
          "Client notes updated successfully. Refreshing client list..."
        );
        loadClients(); // Reload all clients to get the new client record
      } else {
        // Update local state for normal clients
        setClients(
          clients.map((client) =>
            client.id === selectedClient.id
              ? { ...client, notes: clientNotes }
              : client
          )
        );
        setNotesDialogVisible(false);
        Alert.alert("Success", "Client notes updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating client notes:", error);
      // Show the specific error message if available
      Alert.alert(
        "Error",
        error.message || "Failed to update client notes. Please try again."
      );
    }
  };

  // Open notes dialog
  const openNotesDialog = (client: Client) => {
    setSelectedClient(client);
    setClientNotes(client.notes || "");
    setNotesDialogVisible(true);
  };

  // Filter clients based on search text
  const filteredClients = clients.filter((client) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      client.contactInfo?.name?.toLowerCase().includes(searchLower) ||
      client.contactInfo?.email?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    if (!userLoading && user) {
      loadClients();
    }
  }, [user, userLoading, sortBy, sortDirection]);

  if (userLoading || !user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user.isAgent && !user.isAgentTemp) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clients</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            Only agents can access this page.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state when no clients found
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="users" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Clients Yet</Text>
      <Text style={styles.emptyDescription}>
        When users book your packages, they'll appear here as client relationships.
      </Text>
      <Text style={styles.emptyTip}>
        If a user has booked your package but doesn't appear here:
      </Text>
      <View style={styles.emptySteps}>
        <Text style={styles.emptyStep}>1. Ask them to check their booking confirmation screen</Text>
        <Text style={styles.emptyStep}>2. Have them tap the "Fix Client Relationship" button</Text>
        <Text style={styles.emptyStep}>3. Refresh this list using the refresh button above</Text>
      </View>
      <TouchableOpacity
        style={styles.refreshButtonLarge}
        onPress={loadClients}
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>Refresh Clients List</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Clients</Text>
        
        <View style={styles.headerActions}>
          {/* Refresh button */}
          <TouchableOpacity
            onPress={() => loadClients()}
            style={styles.refreshButton}
            disabled={loading}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color={loading ? colors.secondary : colors.text} 
            />
          </TouchableOpacity>
          
          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.sortButton}
          >
            <Ionicons name="options-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort menu */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 320, y: 50 }}
      >
        <Menu.Item
          onPress={() => {
            setSortBy("lastBookingDate");
            setMenuVisible(false);
          }}
          title="Sort by Last Booking Date"
          leadingIcon="calendar"
        />
        <Menu.Item
          onPress={() => {
            setSortBy("totalSpent");
            setMenuVisible(false);
          }}
          title="Sort by Total Spent"
          leadingIcon="cash"
        />
        <Menu.Item
          onPress={() => {
            setSortBy("totalBookings");
            setMenuVisible(false);
          }}
          title="Sort by Number of Bookings"
          leadingIcon="book"
        />
        <Divider />
        <Menu.Item
          onPress={() => {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
            setMenuVisible(false);
          }}
          title={`Order: ${
            sortDirection === "asc" ? "Ascending" : "Descending"
          }`}
          leadingIcon={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
        />
      </Menu>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Client list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredClients.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableRipple
              onPress={() => router.push(`/client-details?id=${item.id}`)}
              style={[
                styles.clientCard,
                item.status === "inactive" && styles.inactiveCard,
              ]}
            >
              <>
                <View style={styles.clientHeader}>
                  <View style={styles.clientInfo}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>
                        {item.contactInfo?.name?.charAt(0) || "U"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.clientName}>
                        {item.contactInfo?.name || "Unknown"}
                      </Text>
                      <Text style={styles.clientEmail}>
                        {item.contactInfo?.email || "No email"}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <TouchableOpacity
                      onPress={() =>
                        handleStatusChange(
                          item.id,
                          item.status === "active" ? "inactive" : "active"
                        )
                      }
                      style={styles.statusButton}
                    >
                      <Text style={styles.statusText}>
                        {item.status === "active" ? "Active" : "Inactive"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.clientStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{item.totalBookings}</Text>
                    <Text style={styles.statLabel}>Bookings</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {FormatCurrency(item.totalSpent || 0)}
                    </Text>
                    <Text style={styles.statLabel}>Total Spent</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {displayDate(item.lastBookingDate)}
                    </Text>
                    <Text style={styles.statLabel}>Last Booking</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  {/* <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openNotesDialog(item)}
                  >
                    <MaterialIcons
                      name="note-add"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.actionText}>Notes</Text>
                  </TouchableOpacity> */}
                  {/* 
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      // Navigate to client bookings - will be implemented later
                      // router.push(`/client-bookings/${item.id}`);
                    }}
                  >
                    <MaterialIcons
                      name="history"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.actionText}>Bookings</Text>
                  </TouchableOpacity> */}

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                      // Only proceed if we have both the current user ID and the client user ID
                      if (!user?.id || !item.userId) {
                        console.error("Cannot open chat: Missing user IDs", {
                          currentUserId: user?.id,
                          clientUserId: item.userId,
                        });
                        Alert.alert(
                          "Error",
                          "Unable to open chat. Missing user information."
                        );
                        return;
                      }

                      try {
                        // First check if there's an existing chat room between these users
                        const existingRoomId = await findExistingChatRoom(
                          user.id,
                          item.userId
                        );
                        let roomId;

                        if (existingRoomId) {
                          // Use existing room
                          console.log(
                            "Using existing chat room:",
                            existingRoomId
                          );
                          roomId = existingRoomId;
                        } else {
                          // Create a new room
                          console.log(
                            "No existing chat found, creating new room"
                          );
                          roomId = getChatRoomId(user.id, item.userId);
                        }

                        // Navigate to chat screen with all required parameters
                        router.push({
                          pathname: "/chatScreen",
                          params: {
                            room_id: roomId,
                            agentId: user.id,
                            userId: item.userId,
                          },
                        });
                      } catch (error) {
                        console.error("Error opening chat:", error);
                        Alert.alert(
                          "Error",
                          "Unable to open chat. Please try again."
                        );
                      }
                    }}
                  >
                    <MaterialIcons
                      name="chat"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.actionText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              </>
            </TouchableRipple>
          )}
        />
      )}

      {/* Notes Dialog */}
      <Portal>
        <Dialog
          visible={notesDialogVisible}
          onDismiss={() => setNotesDialogVisible(false)}
        >
          <Dialog.Title>Client Notes</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.notesInput}
              placeholder="Add notes about this client..."
              value={clientNotes}
              onChangeText={setClientNotes}
              multiline
              numberOfLines={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setNotesDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveNotes}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    marginRight: 8,
    padding: 8,
  },
  sortButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: "#f8f8f8",
  },
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  clientEmail: {
    fontSize: 14,
    color: "#666",
  },
  statusButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  divider: {
    marginVertical: 12,
  },
  clientStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 300,
  },
  button: {
    marginTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
    minHeight: 100,
    textAlignVertical: "top",
  },
  emptyTip: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySteps: {
    flexDirection: "column",
    marginBottom: 24,
    width: '90%',
  },
  emptyStep: {
    fontSize: 14,
    color: "#666",
    paddingVertical: 4,
  },
  refreshButtonLarge: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default ClientsScreen;
