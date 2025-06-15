import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import {
  Button,
  Divider,
  TextInput,
  Dialog,
  Portal,
  Chip,
} from "react-native-paper";
import { Client, Booking } from "../../lib/firebase/models";
import {
  getClientById,
  updateClientPreferences,
  updateClientNotes,
  formatDate,
  getClientDetailsFromBookings,
} from "../../lib/client-service";
import { getUserBookings } from "../../lib/booking-service";
import { useGlobalContext } from "../../lib/global-provider";
import { getChatRoomId, findExistingChatRoom } from "../../lib/chat-service";
import CustomHeader from "@/components/HeaderComponent";

// Define theme colors (should match your app's theme)
const colors = {
  primary: "#1ABC9C",
  secondary: "#D9D9D9",
  text: "#333333",
  textLight: "#8A8D9F",
  background: "#F9FAFC",
  white: "#FFFFFF",
  danger: "#FF4C69",
  success: "#00D27A",
  divider: "#EEEEEE",
};

// Display date for UI
const displayDate = (date?: Date | any): string => {
  const formattedDate = formatDate(date);
  return formattedDate ? formattedDate.toLocaleDateString() : "N/A";
};

// Format currency utility function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const ClientDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rawUser } = useGlobalContext();
  const [client, setClient] = useState<Client | null>(null);
  const [clientBookings, setClientBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesDialogVisible, setNotesDialogVisible] = useState(false);
  const [clientNotes, setClientNotes] = useState("");
  const [preferencesDialogVisible, setPreferencesDialogVisible] =
    useState(false);
  const [clientPreferences, setClientPreferences] = useState<
    Client["preferences"]
  >({
    destinations: [],
    accommodationType: "",
    budgetRange: "",
    travelStyle: [],
    specialRequirements: [],
  });
  const [newDestination, setNewDestination] = useState("");
  const [newTravelStyle, setNewTravelStyle] = useState("");
  const [newRequirement, setNewRequirement] = useState("");

  // Load client data
  const loadClientData = async () => {
    if (!id || !rawUser) return;

    setLoading(true);
    try {
      // First try to get client from dedicated collection
      let clientData = await getClientById(id);

      // If client data doesn't have a standard ID or it's embedded format, use the embedded approach
      if (!clientData || id.startsWith("embedded-")) {
        // Extract userId from embedded ID format
        const userId = id.startsWith("embedded-")
          ? id.replace("embedded-", "")
          : null;

        if (userId) {
          console.log("Using embedded approach to get client details");
          clientData = await getClientDetailsFromBookings(rawUser.id, userId);
        }
      }

      if (clientData) {
        // Security check: Only allow viewing if current user is the agent
        if (clientData.agentId !== rawUser.id) {
          console.error(
            "Security error: Attempt to view client relationship for another agent"
          );
          setLoading(false);
          Alert.alert(
            "Access Denied",
            "You don't have permission to view this client relationship."
          );
          router.back();
          return;
        }

        setClient(clientData);
        setClientNotes(clientData.notes || "");
        setClientPreferences(
          clientData.preferences || {
            destinations: [],
            accommodationType: "",
            budgetRange: "",
            travelStyle: [],
            specialRequirements: [],
          }
        );

        // Fetch client's bookings
        if (clientData.userId) {
          const bookings = await getUserBookings(clientData.userId);
          const agentBookings = bookings.filter(
            (booking) => booking.packageDetails?.agent?.id === rawUser.id
          );
          setClientBookings(agentBookings);
        }
      } else {
        Alert.alert("Not Found", "Client details could not be found.");
        router.back();
      }
    } catch (error) {
      console.error("Error loading client data:", error);
      Alert.alert("Error", "Failed to load client data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save client notes
  const handleSaveNotes = async () => {
    if (!client) return;

    try {
      await updateClientNotes(client.id, clientNotes);

      // If this was an embedded client, we need to reload the data
      // because a new real client record was created
      if (client.id.startsWith("embedded-")) {
        // Show success message but then reload
        Alert.alert(
          "Success",
          "Client notes updated successfully. Refreshing client data..."
        );
        await loadClientData(); // Reload data to get the new client record
        setNotesDialogVisible(false);
      } else {
        // For normal clients, just update the local state
        setClient({
          ...client,
          notes: clientNotes,
        });
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

  // Save client preferences
  const handleSavePreferences = async () => {
    if (!client) return;

    try {
      await updateClientPreferences(client.id, clientPreferences);

      // If this was an embedded client, we need to reload the data
      // because a new real client record was created
      if (client.id.startsWith("embedded-")) {
        // Show success message but then reload
        Alert.alert(
          "Success",
          "Client preferences updated successfully. Refreshing client data..."
        );
        await loadClientData(); // Reload data to get the new client record
        setPreferencesDialogVisible(false);
      } else {
        // For normal clients, just update the local state
        setClient({
          ...client,
          preferences: clientPreferences,
        });
        setPreferencesDialogVisible(false);
        Alert.alert("Success", "Client preferences updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating client preferences:", error);
      // Show the specific error message if available
      Alert.alert(
        "Error",
        error.message ||
          "Failed to update client preferences. Please try again."
      );
    }
  };

  // Add a new destination to preferences
  const addDestination = () => {
    if (!newDestination.trim()) return;

    const destinations = [...(clientPreferences?.destinations || [])];
    if (!destinations.includes(newDestination)) {
      destinations.push(newDestination);
      setClientPreferences({
        ...clientPreferences,
        destinations,
      });
      setNewDestination("");
    }
  };

  // Remove a destination from preferences
  const removeDestination = (destination: string) => {
    const destinations =
      clientPreferences?.destinations?.filter((d) => d !== destination) || [];
    setClientPreferences({
      ...clientPreferences,
      destinations,
    });
  };

  // Add a new travel style to preferences
  const addTravelStyle = () => {
    if (!newTravelStyle.trim()) return;

    const travelStyle = [...(clientPreferences?.travelStyle || [])];
    if (!travelStyle.includes(newTravelStyle)) {
      travelStyle.push(newTravelStyle);
      setClientPreferences({
        ...clientPreferences,
        travelStyle,
      });
      setNewTravelStyle("");
    }
  };

  // Remove a travel style from preferences
  const removeTravelStyle = (style: string) => {
    const travelStyle =
      clientPreferences?.travelStyle?.filter((s) => s !== style) || [];
    setClientPreferences({
      ...clientPreferences,
      travelStyle,
    });
  };

  // Add a new requirement to preferences
  const addRequirement = () => {
    if (!newRequirement.trim()) return;

    const specialRequirements = [
      ...(clientPreferences?.specialRequirements || []),
    ];
    if (!specialRequirements.includes(newRequirement)) {
      specialRequirements.push(newRequirement);
      setClientPreferences({
        ...clientPreferences,
        specialRequirements,
      });
      setNewRequirement("");
    }
  };

  // Remove a requirement from preferences
  const removeRequirement = (requirement: string) => {
    const specialRequirements =
      clientPreferences?.specialRequirements?.filter(
        (r) => r !== requirement
      ) || [];
    setClientPreferences({
      ...clientPreferences,
      specialRequirements,
    });
  };

  useEffect(() => {
    if (id) {
      loadClientData();
    } else {
      router.back();
    }
  }, [id, rawUser]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Client not found.</Text>
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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Header */}

      <CustomHeader
        title="Client Details"
        showBackButton
        rightIcon={
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color={colors.primary}
          />
        }
        onRightIconPress={async () => {
          // Only navigate if we have valid IDs
          if (!rawUser?.id || !client?.userId) {
            console.error("Cannot open chat: Missing user IDs", {
              agentId: rawUser?.id,
              clientUserId: client?.userId,
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
              rawUser.id,
              client.userId
            );
            let roomId;

            if (existingRoomId) {
              // Use existing room
              console.log("Using existing chat room:", existingRoomId);
              roomId = existingRoomId;
            } else {
              // Create a new room
              console.log("No existing chat found, creating new room");
              roomId = getChatRoomId(rawUser.id, client.userId);
            }

            // Navigate to chat screen with all required parameters
            router.push({
              pathname: "/chatScreen",
              params: {
                room_id: roomId,
                agentId: rawUser.id,
                userId: client.userId,
              },
            });
          } catch (error) {
            console.error("Error opening chat:", error);
            Alert.alert("Error", "Unable to open chat. Please try again.");
          }
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Client Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {client.contactInfo?.name?.charAt(0) || "C"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.clientName}>
                {client.contactInfo?.name || "Unknown"}
              </Text>
              <Text style={styles.clientEmail}>
                {client.contactInfo?.email || "No email"}
              </Text>
              <Text style={styles.clientPhone}>
                {client.contactInfo?.phone || "No phone number"}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{client.totalBookings}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(client.totalSpent || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {displayDate(client.lastBookingDate)}
              </Text>
              <Text style={styles.statLabel}>Last Booking</Text>
            </View>
          </View>
        </View>

        {/* Client Notes */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TouchableOpacity
              onPress={() => setNotesDialogVisible(true)}
              style={styles.editButton}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.notesText}>
            {client.notes || "No notes added yet."}
          </Text>
        </View>

        {/* Client Preferences */}
        {/* 
         
         //TODO: implement later
         */}
        {/* <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Travel Preferences</Text>
            <TouchableOpacity
              onPress={() => setPreferencesDialogVisible(true)}
              style={styles.editButton}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Destinations:</Text>
            <View style={styles.chipContainer}>
              {client.preferences?.destinations &&
              client.preferences.destinations.length > 0 ? (
                client.preferences.destinations.map((destination, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {destination}
                  </Chip>
                ))
              ) : (
                <Text style={styles.emptyPreferenceText}>
                  No preferred destinations set
                </Text>
              )}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Accommodation:</Text>
            <Text style={styles.preferenceValue}>
              {client.preferences?.accommodationType || "Not specified"}
            </Text>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Budget Range:</Text>
            <Text style={styles.preferenceValue}>
              {client.preferences?.budgetRange || "Not specified"}
            </Text>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Travel Style:</Text>
            <View style={styles.chipContainer}>
              {client.preferences?.travelStyle &&
              client.preferences.travelStyle.length > 0 ? (
                client.preferences.travelStyle.map((style, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {style}
                  </Chip>
                ))
              ) : (
                <Text style={styles.emptyPreferenceText}>
                  No travel styles set
                </Text>
              )}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Special Requirements:</Text>
            <View style={styles.chipContainer}>
              {client.preferences?.specialRequirements &&
              client.preferences.specialRequirements.length > 0 ? (
                client.preferences.specialRequirements.map((req, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {req}
                  </Chip>
                ))
              ) : (
                <Text style={styles.emptyPreferenceText}>
                  No special requirements
                </Text>
              )}
            </View>
          </View>
        </View> */}

        {/* Client Bookings */}
        {/* 
         
         //TODO: implement later
         */}
        {/* <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bookings History</Text>

          {clientBookings.length === 0 ? (
            <View style={styles.emptyBookingsContainer}>
              <FontAwesome5 name="calendar-alt" size={40} color="#ccc" />
              <Text style={styles.emptyBookingsText}>No bookings found</Text>
            </View>
          ) : (
            clientBookings.map((booking, index) => (
              <View key={booking.id} style={styles.bookingItem}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingName}>
                    {booking.packageDetails?.name || "Unknown Package"}
                  </Text>
                  <Text
                    style={[
                      styles.bookingStatus,
                      booking.status === "confirmed"
                        ? styles.confirmedStatus
                        : booking.status === "cancelled"
                        ? styles.cancelledStatus
                        : styles.pendingStatus,
                    ]}
                  >
                    {booking.status.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.bookingDetail}>
                    <MaterialIcons
                      name="date-range"
                      size={16}
                      color={colors.textLight}
                    />
                    <Text style={styles.bookingDetailText}>
                      {displayDate(booking.bookingDate)}
                    </Text>
                  </View>

                  <View style={styles.bookingDetail}>
                    <MaterialIcons
                      name="attach-money"
                      size={16}
                      color={colors.textLight}
                    />
                    <Text style={styles.bookingDetailText}>
                      {formatCurrency(booking.amount)}
                    </Text>
                  </View>
                </View>

                {index < clientBookings.length - 1 && (
                  <Divider style={styles.bookingDivider} />
                )}
              </View>
            ))
          )}
        </View> */}
      </ScrollView>

      {/* Notes Dialog */}
      <Portal>
        <Dialog
          visible={notesDialogVisible}
          onDismiss={() => setNotesDialogVisible(false)}
        >
          <Dialog.Title>Client Notes</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.dialogInput}
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

      {/* Preferences Dialog */}
      <Portal>
        <Dialog
          visible={preferencesDialogVisible}
          onDismiss={() => setPreferencesDialogVisible(false)}
          style={styles.preferencesDialog}
        >
          <Dialog.Title>Travel Preferences</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.preferencesScrollContent}>
              {/* Destinations */}
              <Text style={styles.dialogSectionTitle}>
                Preferred Destinations
              </Text>
              <View style={styles.chipInputContainer}>
                <TextInput
                  style={styles.chipInput}
                  placeholder="Add destination..."
                  value={newDestination}
                  onChangeText={setNewDestination}
                />
                <Button
                  mode="contained"
                  onPress={addDestination}
                  disabled={!newDestination.trim()}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>
              <View style={styles.dialogChipContainer}>
                {clientPreferences?.destinations?.map((destination, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                    onClose={() => removeDestination(destination)}
                  >
                    {destination}
                  </Chip>
                ))}
              </View>

              {/* Accommodation Type */}
              <Text style={styles.dialogSectionTitle}>Accommodation Type</Text>
              <TextInput
                style={styles.dialogInputField}
                placeholder="E.g. Luxury, Budget, Mid-range..."
                value={clientPreferences?.accommodationType || ""}
                onChangeText={(text) =>
                  setClientPreferences({
                    ...clientPreferences,
                    accommodationType: text,
                  })
                }
              />

              {/* Budget Range */}
              <Text style={styles.dialogSectionTitle}>Budget Range</Text>
              <TextInput
                style={styles.dialogInputField}
                placeholder="E.g. $1000-$2000, Budget, Premium..."
                value={clientPreferences?.budgetRange || ""}
                onChangeText={(text) =>
                  setClientPreferences({
                    ...clientPreferences,
                    budgetRange: text,
                  })
                }
              />

              {/* Travel Style */}
              <Text style={styles.dialogSectionTitle}>Travel Style</Text>
              <View style={styles.chipInputContainer}>
                <TextInput
                  style={styles.chipInput}
                  placeholder="Add travel style..."
                  value={newTravelStyle}
                  onChangeText={setNewTravelStyle}
                />
                <Button
                  mode="contained"
                  onPress={addTravelStyle}
                  disabled={!newTravelStyle.trim()}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>
              <View style={styles.dialogChipContainer}>
                {clientPreferences?.travelStyle?.map((style, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                    onClose={() => removeTravelStyle(style)}
                  >
                    {style}
                  </Chip>
                ))}
              </View>

              {/* Special Requirements */}
              <Text style={styles.dialogSectionTitle}>
                Special Requirements
              </Text>
              <View style={styles.chipInputContainer}>
                <TextInput
                  style={styles.chipInput}
                  placeholder="Add requirement..."
                  value={newRequirement}
                  onChangeText={setNewRequirement}
                />
                <Button
                  mode="contained"
                  onPress={addRequirement}
                  disabled={!newRequirement.trim()}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>
              <View style={styles.dialogChipContainer}>
                {clientPreferences?.specialRequirements?.map((req, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                    onClose={() => removeRequirement(req)}
                  >
                    {req}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setPreferencesDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleSavePreferences}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  button: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  chatButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: colors.textLight,
  },
  divider: {
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 12,
  },
  editButton: {
    padding: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  preferenceRow: {
    marginBottom: 12,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 6,
  },
  preferenceValue: {
    fontSize: 14,
    color: colors.textLight,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  emptyPreferenceText: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: "italic",
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  chipText: {
    fontSize: 12,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
    minHeight: 100,
    textAlignVertical: "top",
  },
  preferencesDialog: {
    maxHeight: "80%",
  },
  preferencesScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dialogSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  dialogInputField: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  chipInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  chipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
  },
  addButton: {
    borderRadius: 4,
  },
  dialogChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  emptyBookingsContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyBookingsText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 16,
  },
  bookingItem: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confirmedStatus: {
    backgroundColor: "#E6F7ED",
    color: colors.success,
  },
  cancelledStatus: {
    backgroundColor: "#FFEBEE",
    color: colors.danger,
  },
  pendingStatus: {
    backgroundColor: "#FFF8E1",
    color: "#FFA000",
  },
  bookingDetails: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bookingDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  bookingDetailText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 4,
  },
  bookingDivider: {
    marginVertical: 12,
  },
});

export default ClientDetailsScreen;
