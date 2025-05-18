import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useGlobalContext } from "@/lib/global-provider";
import {
  getItineraryWithDetails,
  updateItinerary,
  updateDayPlan,
  saveActivity,
  deleteItinerary,
  deleteActivity,
} from "@/lib/itinerary-service";
import {
  Itinerary,
  DayPlan,
  Activity,
  ItineraryWithDetails,
} from "@/lib/firebase/models";
import CustomHeader from "@/components/HeaderComponent";
import {
  Calendar,
  Clock,
  Edit2,
  Plus,
  Trash2,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Save,
  Bus,
  Utensils,
  Bed,
  Palmtree,
  Camera,
  MoreVertical,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#36d6ba",
  secondary: "#D9D9D9",
  background: "#F9FAFC",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  danger: "#FF4C69",
  divider: "#EEEEEE",
  transport: "#3498DB",
  accommodation: "#9B59B6",
  activity: "#F39C12",
  food: "#E74C3C",
};

// Activity type icon mapping
const activityIcons: Record<string, React.ReactNode> = {
  transport: <Bus size={16} color={COLORS.white} />,
  accommodation: <Bed size={16} color={COLORS.white} />,
  activity: <Palmtree size={16} color={COLORS.white} />,
  food: <Utensils size={16} color={COLORS.white} />,
};

// Activity type color mapping
const activityColors: Record<string, string> = {
  transport: COLORS.transport,
  accommodation: COLORS.accommodation,
  activity: COLORS.activity,
  food: COLORS.food,
};

const ItineraryDetail = () => {
  const { rawUser } = useGlobalContext();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [itineraryData, setItineraryData] =
    useState<ItineraryWithDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Modal states
  const [activityModal, setActivityModal] = useState(false);
  const [selectedDayPlan, setSelectedDayPlan] = useState<DayPlan | null>(null);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);

  // New activity form data
  const [activityTitle, setActivityTitle] = useState("");
  const [activityTime, setActivityTime] = useState("12:00");
  const [activityType, setActivityType] =
    useState<Activity["type"]>("activity");
  const [activityNotes, setActivityNotes] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch itinerary data
  useEffect(() => {
    fetchItineraryData();
  }, [id]);

  // Animation effect
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fetchItineraryData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getItineraryWithDetails(id);
      if (!data) {
        throw new Error("Failed to load itinerary data");
      }
      
      setItineraryData(data);
      setEditedTitle(data.itinerary.title);

      // Initialize expanded state for all days
      const expanded: Record<string, boolean> = {};
      data.dayPlans.forEach((dayPlan) => {
        if (dayPlan.id) {
          expanded[dayPlan.id] = true; // Start with all days expanded
        }
      });
      setExpandedDays(expanded);
    } catch (error) {
      console.error("Error fetching itinerary:", error);
      Alert.alert("Error", "Failed to load itinerary details");
    } finally {
      setLoading(false);
    }
  };

  // Handle activity time change from picker
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setActivityTime(`${hours}:${minutes}`);
    }
  };

  // Toggle day expansion
  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Open add activity modal
  const openAddActivityModal = (dayPlan: DayPlan) => {
    setSelectedDayPlan(dayPlan);
    setCurrentActivity(null);
    resetActivityForm();
    setActivityModal(true);
  };

  // Open edit activity modal
  const openEditActivityModal = (activity: Activity, dayPlan: DayPlan) => {
    setSelectedDayPlan(dayPlan);
    setCurrentActivity(activity);
    setActivityTitle(activity.title);
    setActivityTime(activity.time);
    setActivityType(activity.type);
    setActivityNotes(activity.notes || "");
    setActivityModal(true);
  };

  // Reset activity form
  const resetActivityForm = () => {
    setActivityTitle("");
    setActivityTime("12:00");
    setActivityType("activity");
    setActivityNotes("");
  };

  // Save activity
  const handleSaveActivity = async () => {
    if (!selectedDayPlan || !selectedDayPlan.id) return;

    if (!activityTitle.trim()) {
      Alert.alert("Error", "Please enter an activity title");
      return;
    }

    try {
      const activityData = {
        dayPlanId: selectedDayPlan.id,
        time: activityTime,
        title: activityTitle.trim(),
        type: activityType,
        notes: activityNotes.trim(),
        ...(currentActivity?.id ? { id: currentActivity.id } : {}),
      } as Omit<Activity, "createdAt" | "updatedAt"> & { id?: string };

      await saveActivity(activityData);
      setActivityModal(false);
      fetchItineraryData(); // Refresh data
    } catch (error) {
      console.error("Error saving activity:", error);
      Alert.alert("Error", "Failed to save activity");
    }
  };

  // Delete activity
  const handleDeleteActivity = async (activity: Activity) => {
    if (!activity.id) return;

    Alert.alert(
      "Delete Activity",
      "Are you sure you want to delete this activity?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteActivity(activity.id);
              fetchItineraryData(); // Refresh data
            } catch (error) {
              console.error("Error deleting activity:", error);
              Alert.alert("Error", "Failed to delete activity");
            }
          },
        },
      ]
    );
  };

  // Save edited itinerary
  const handleSaveItinerary = async () => {
    if (!itineraryData || !id) return;

    if (!editedTitle.trim()) {
      Alert.alert("Error", "Itinerary title cannot be empty");
      return;
    }

    try {
      const updatedItinerary = await updateItinerary(id, {
        title: editedTitle.trim(),
      });

      if (updatedItinerary) {
        setEditing(false);
        fetchItineraryData(); // Refresh data
      } else {
        throw new Error("Failed to update itinerary");
      }
    } catch (error) {
      console.error("Error updating itinerary:", error);
      Alert.alert("Error", "Failed to update itinerary");
    }
  };

  // Delete itinerary
  const handleDeleteItinerary = () => {
    Alert.alert(
      "Delete Itinerary",
      "Are you sure you want to delete this entire itinerary? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteItinerary(id);
              Alert.alert("Success", "Itinerary deleted successfully");
              router.back();
            } catch (error) {
              console.error("Error deleting itinerary:", error);
              Alert.alert("Error", "Failed to delete itinerary");
            }
          },
        },
      ]
    );
  };

  // Get sorted activities for a day plan
  const getSortedActivities = (activities: Activity[]) => {
    return [...activities].sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  };

  // Format time for display
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));

      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return time;
    }
  };

  // Check if user is authorized
  const isAuthorized = () => {
    if (!rawUser || !itineraryData) return false;
    return rawUser.id === itineraryData.itinerary.userId;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }

  if (!itineraryData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Itinerary not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title={editing ? "Edit Itinerary" : "Itinerary Details"}
        showBackButton={true}
        rightIcon={
          isAuthorized() ? (
            editing ? (
              <Save color="#FFF" size={20} />
            ) : (
              <Edit2 color="#FFF" size={20} />
            )
          ) : undefined
        }
        onRightIconPress={
          editing ? handleSaveItinerary : () => setEditing(true)
        }
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Itinerary Header */}
        <View style={styles.itineraryHeader}>
          {editing ? (
            <TextInput
              style={styles.titleInput}
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder="Itinerary Title"
              placeholderTextColor="#95A5A6"
            />
          ) : (
            <Text style={styles.itineraryTitle}>
              {itineraryData.itinerary.title}
            </Text>
          )}

          <View style={styles.dateRangeContainer}>
            <Calendar size={16} color={COLORS.primary} />
            <Text style={styles.dateRangeText}>
              {formatDate(itineraryData.itinerary.startDate.toString())} -{" "}
              {formatDate(itineraryData.itinerary.endDate.toString())}
            </Text>
          </View>

          <View style={styles.destinationsContainer}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.destinationsText}>
              {itineraryData.itinerary.destinations.join(", ")}
            </Text>
          </View>
        </View>

        {/* Days List */}
        <ScrollView
          style={styles.daysScrollView}
          showsVerticalScrollIndicator={false}
        >
          {itineraryData.dayPlans.map((dayPlan, index) => (
            <View key={dayPlan.id || index} style={styles.dayCard}>
              {/* Day Header */}
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => dayPlan.id && toggleDayExpansion(dayPlan.id)}
              >
                <View style={styles.dayNumberBadge}>
                  <Text style={styles.dayNumberText}>Day {dayPlan.day}</Text>
                </View>

                <View style={styles.dayHeaderContent}>
                  <Text style={styles.dayDateText}>
                    {formatDate(dayPlan.date.toString())}
                  </Text>

                  <View style={styles.dayHeaderRight}>
                    <Text style={styles.activitiesCountText}>
                      {dayPlan.activities.length}{" "}
                      {dayPlan.activities.length === 1
                        ? "activity"
                        : "activities"}
                    </Text>
                    {dayPlan.id && expandedDays[dayPlan.id] ? (
                      <ChevronUp size={16} color={COLORS.textLight} />
                    ) : (
                      <ChevronDown size={16} color={COLORS.textLight} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Activities List */}
              {dayPlan.id && expandedDays[dayPlan.id] && (
                <View style={styles.activitiesContainer}>
                  {dayPlan.activities.length === 0 ? (
                    <Text style={styles.noActivitiesText}>
                      No activities planned for this day
                    </Text>
                  ) : (
                    getSortedActivities(dayPlan.activities).map((activity) => (
                      <TouchableOpacity
                        key={activity.id || `temp-${Math.random()}`}
                        style={styles.activityItem}
                        onPress={() =>
                          isAuthorized() &&
                          openEditActivityModal(activity, dayPlan)
                        }
                        activeOpacity={isAuthorized() ? 0.7 : 1}
                      >
                        <View style={styles.activityTimeColumn}>
                          <Text style={styles.activityTimeText}>
                            {formatTime(activity.time)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.activityTypeIndicator,
                            {
                              backgroundColor:
                                activityColors[activity.type] ||
                                COLORS.activity,
                            },
                          ]}
                        >
                          {activityIcons[activity.type] || (
                            <Camera size={16} color={COLORS.white} />
                          )}
                        </View>

                        <View style={styles.activityContentColumn}>
                          <Text style={styles.activityTitleText}>
                            {activity.title}
                          </Text>
                          {activity.notes ? (
                            <Text style={styles.activityNotesText}>
                              {activity.notes}
                            </Text>
                          ) : null}
                        </View>

                        {isAuthorized() && activity.id && (
                          <TouchableOpacity
                            style={styles.activityDeleteButton}
                            onPress={() => handleDeleteActivity(activity)}
                          >
                            <Trash2 size={16} color={COLORS.danger} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))
                  )}

                  {isAuthorized() && (
                    <TouchableOpacity
                      style={styles.addActivityButton}
                      onPress={() => openAddActivityModal(dayPlan)}
                    >
                      <Plus size={16} color={COLORS.white} />
                      <Text style={styles.addActivityButtonText}>
                        Add Activity
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Delete Itinerary Button */}
          {isAuthorized() && (
            <TouchableOpacity
              style={styles.deleteItineraryButton}
              onPress={handleDeleteItinerary}
            >
              <Trash2 size={16} color={COLORS.white} />
              <Text style={styles.deleteItineraryButtonText}>
                Delete Itinerary
              </Text>
            </TouchableOpacity>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* Activity Modal */}
      <Modal
        visible={activityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActivityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentActivity ? "Edit Activity" : "Add Activity"}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setActivityModal(false)}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              {/* Activity Type Selection */}
              <Text style={styles.modalLabel}>Activity Type</Text>
              <View style={styles.activityTypeContainer}>
                {Object.keys(activityIcons).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.activityTypeButton,
                      {
                        backgroundColor:
                          activityType === type
                            ? activityColors[type]
                            : "transparent",
                      },
                    ]}
                    onPress={() => setActivityType(type as Activity["type"])}
                  >
                    <View
                      style={[
                        styles.activityTypeIcon,
                        { backgroundColor: activityColors[type] },
                      ]}
                    >
                      {activityIcons[type]}
                    </View>
                    <Text
                      style={[
                        styles.activityTypeText,
                        {
                          color:
                            activityType === type ? COLORS.white : COLORS.text,
                        },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Activity Time */}
              <Text style={styles.modalLabel}>Time</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={18} color={COLORS.primary} />
                <Text style={styles.timePickerText}>
                  {formatTime(activityTime)}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={(() => {
                    const [hours, minutes] = activityTime.split(":");
                    const date = new Date();
                    date.setHours(parseInt(hours), parseInt(minutes));
                    return date;
                  })()}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}

              {/* Activity Title */}
              <Text style={styles.modalLabel}>Activity Title</Text>
              <TextInput
                style={styles.modalInput}
                value={activityTitle}
                onChangeText={setActivityTitle}
                placeholder="Enter activity title"
                placeholderTextColor="#95A5A6"
              />

              {/* Activity Notes */}
              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.notesInput]}
                value={activityNotes}
                onChangeText={setActivityNotes}
                placeholder="Add any additional details..."
                placeholderTextColor="#95A5A6"
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setActivityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveActivity}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  itineraryHeader: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itineraryTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
    padding: 0,
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dateRangeText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  destinationsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  destinationsText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  daysScrollView: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dayNumberBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  dayNumberText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  dayHeaderContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayDateText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  activitiesCountText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 8,
  },
  activitiesContainer: {
    padding: 16,
  },
  noActivitiesText: {
    textAlign: "center",
    padding: 16,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  activityItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  activityTimeColumn: {
    width: 60,
    marginRight: 8,
  },
  activityTimeText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  activityTypeIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContentColumn: {
    flex: 1,
  },
  activityTitleText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 4,
  },
  activityNotesText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  activityDeleteButton: {
    padding: 8,
  },
  addActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  addActivityButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  deleteItineraryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  deleteItineraryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollContent: {
    padding: 16,
    maxHeight: height * 0.6,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  notesInput: {
    height: 100,
    textAlignVertical: "top",
  },
  activityTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  activityTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  activityTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  activityTypeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  timePickerText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});

export default ItineraryDetail;
