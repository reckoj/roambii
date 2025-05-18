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
  FlatList,
} from "react-native";
import { Snackbar } from "react-native-paper";
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
  shareItinerary,
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
  Landmark,
  Mountain,
  ShoppingBag,
  Music,
  Heart,
  BookOpen,
  Leaf,
  Umbrella,
  Briefcase,
  Coffee,
  Search,
  Share,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

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
  transport: "#3498DB", // Blue
  accommodation: "#9B59B6", // Purple
  activity: "#F39C12", // Orange
  food: "#E74C3C", // Red
  sightseeing: "#1ABC9C", // Turquoise
  tour: "#2ECC71", // Green
  adventure: "#D35400", // Dark Orange
  shopping: "#8E44AD", // Dark Purple
  entertainment: "#16A085", // Dark Turquoise
  wellness: "#27AE60", // Dark Green
  cultural: "#2980B9", // Dark Blue
  nature: "#2ECC71", // Green
  beach: "#F1C40F", // Yellow
  business: "#34495E", // Dark Blue/Gray
  rest: "#95A5A6", // Gray
};

// Activity type icon mapping
const activityIcons: Record<string, React.ReactNode> = {
  transport: <Bus size={16} color={COLORS.white} />,
  accommodation: <Bed size={16} color={COLORS.white} />,
  activity: <Palmtree size={16} color={COLORS.white} />,
  food: <Utensils size={16} color={COLORS.white} />,
  sightseeing: <Landmark size={16} color={COLORS.white} />,
  tour: <MapPin size={16} color={COLORS.white} />,
  adventure: <Mountain size={16} color={COLORS.white} />,
  shopping: <ShoppingBag size={16} color={COLORS.white} />,
  entertainment: <Music size={16} color={COLORS.white} />,
  wellness: <Heart size={16} color={COLORS.white} />,
  cultural: <BookOpen size={16} color={COLORS.white} />,
  nature: <Leaf size={16} color={COLORS.white} />,
  beach: <Umbrella size={16} color={COLORS.white} />,
  business: <Briefcase size={16} color={COLORS.white} />,
  rest: <Coffee size={16} color={COLORS.white} />,
};

// Activity type color mapping
const activityColors: Record<string, string> = {
  transport: "#3498DB", // Blue
  accommodation: "#9B59B6", // Purple
  activity: "#F39C12", // Orange
  food: "#E74C3C", // Red
  sightseeing: "#1ABC9C", // Turquoise
  tour: "#2ECC71", // Green
  adventure: "#D35400", // Dark Orange
  shopping: "#8E44AD", // Dark Purple
  entertainment: "#16A085", // Dark Turquoise
  wellness: "#27AE60", // Dark Green
  cultural: "#2980B9", // Dark Blue
  nature: "#2ECC71", // Green
  beach: "#F1C40F", // Yellow
  business: "#34495E", // Dark Blue/Gray
  rest: "#95A5A6", // Gray
};

// Activity types grouped by category for better organization
const activityTypeGroups = [
  {
    title: "Essentials",
    types: ["transport", "accommodation", "food", "rest"],
  },
  {
    title: "Experiences",
    types: ["activity", "sightseeing", "tour", "adventure", "entertainment"],
  },
  {
    title: "Special Interests",
    types: ["shopping", "wellness", "cultural", "nature", "beach", "business"],
  },
];

// Create a flat list of all activity types with group information
const allActivityTypes = Object.keys(activityIcons).map((type) => ({
  type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
  icon: activityIcons[type],
  color: activityColors[type],
}));

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

  // For activity type filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  // Add this state variable along with your other state declarations
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Add these new state variables at the top with other states
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isDeletingActivity, setIsDeletingActivity] = useState<string | null>(null);
  const [localActivities, setLocalActivities] = useState<Record<string, Activity[]>>({});

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

  // Filtered activity types based on search
  const filteredActivityTypes = allActivityTypes.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchItineraryData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getItineraryWithDetails(id);
      if (!data) {
        Alert.alert("Error", "Failed to load itinerary details");
        return;
      }
      
      setItineraryData(data);
      setEditedTitle(data.itinerary.title);

      // Initialize expanded state and local activities
      const expanded: Record<string, boolean> = {};
      const activities: Record<string, Activity[]> = {};
      data.dayPlans.forEach((dayPlan) => {
        if (dayPlan.id) {
          expanded[dayPlan.id] = true;
          activities[dayPlan.id] = dayPlan.activities;
        }
      });
      setExpandedDays(expanded);
      setLocalActivities(activities);
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
    setSearchQuery("");
  };

  // Save activity
  const handleSaveActivity = async () => {
    if (!selectedDayPlan || !selectedDayPlan.id) return;

    if (!activityTitle.trim()) {
      Alert.alert("Error", "Please enter an activity title");
      return;
    }

    setIsSavingActivity(true);
    try {
      const capitalizedType = activityType.charAt(0).toUpperCase() + activityType.slice(1);
      const activityData: Partial<Activity> = {
        dayPlanId: selectedDayPlan.id,
        time: activityTime,
        title: activityTitle.trim(),
        type: capitalizedType,
        notes: activityNotes.trim(),
        ...(currentActivity?.id ? { id: currentActivity.id } : {}),
      };

      // Optimistically update the UI
      if (currentActivity?.id) {
        // Update existing activity
        setLocalActivities(prev => ({
          ...prev,
          [selectedDayPlan.id]: prev[selectedDayPlan.id].map(activity =>
            activity.id === currentActivity.id ? { ...activity, ...activityData } : activity
          )
        }));
      } else {
        // Add new activity
        setLocalActivities(prev => ({
          ...prev,
          [selectedDayPlan.id]: [...(prev[selectedDayPlan.id] || []), { 
            id: 'temp-' + Date.now(),
            dayPlanId: selectedDayPlan.id,
            time: activityTime,
            title: activityTitle.trim(),
            type: capitalizedType,
            notes: activityNotes.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
          } as Activity]
        }));
      }

      // Save to backend
      const savedActivity = await saveActivity(activityData as Omit<Activity, "createdAt" | "updatedAt"> & { id?: string });
      if (savedActivity) {
        // Update with the real activity data
        setLocalActivities(prev => ({
          ...prev,
          [selectedDayPlan.id]: prev[selectedDayPlan.id].map(activity =>
            activity.id === activityData.id ? savedActivity : activity
          )
        }));
        setActivityModal(false);
      } else {
        // Revert on failure
        fetchItineraryData();
        Alert.alert("Error", "Failed to save activity");
      }
    } catch (error) {
      console.error("Error saving activity:", error);
      fetchItineraryData();
      Alert.alert("Error", "Failed to save activity");
    } finally {
      setIsSavingActivity(false);
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
            setIsDeletingActivity(activity.id);
            try {
              // Optimistically remove from UI
              setLocalActivities(prev => ({
                ...prev,
                [activity.dayPlanId]: prev[activity.dayPlanId].filter(a => a.id !== activity.id)
              }));

              const success = await deleteActivity(activity.id);
              if (!success) {
                // Revert on failure
                fetchItineraryData();
                Alert.alert("Error", "Failed to delete activity");
              }
            } catch (error) {
              console.error("Error deleting activity:", error);
              fetchItineraryData();
              Alert.alert("Error", "Failed to delete activity");
            } finally {
              setIsDeletingActivity(null);
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
              setIsDeleting(true);
              await deleteItinerary(id);
              setIsDeleting(false);

              // Show snackbar instead of Alert
              setSnackbarMessage("Itinerary deleted successfully");
              setSnackbarVisible(true);

              // Navigate back after a short delay
              setTimeout(() => {
                router.back();
              }, 1000);
            } catch (error) {
              setIsDeleting(false);
              console.error("Error deleting itinerary:", error);

              // Show error in snackbar
              setSnackbarMessage("Failed to delete itinerary");
              setSnackbarVisible(true);
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

  // Remove the isAuthorized function and replace its usage with direct comparison
  const canEdit = rawUser && itineraryData && rawUser.id === itineraryData.itinerary.userId;

  // Render activity type item for the grid
  const renderActivityTypeItem = ({
    item,
  }: {
    item: (typeof allActivityTypes)[0];
  }) => (
    <TouchableOpacity
      style={[
        styles.activityTypeGridItem,
        {
          backgroundColor:
            activityType === item.type ? item.color : "transparent",
          borderColor: item.color,
        },
      ]}
      onPress={() => {
        setActivityType(item.type as Activity["type"]);
        setShowTypeSelector(false);
      }}
    >
      <View style={[styles.activityTypeIcon, { backgroundColor: item.color }]}>
        {item.icon}
      </View>
      <Text
        style={[
          styles.activityTypeText,
          {
            color: activityType === item.type ? COLORS.white : COLORS.text,
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  // Update the activities rendering to use localActivities
  const renderActivities = (dayPlan: DayPlan) => {
    const activities = localActivities[dayPlan.id] || [];
    return activities.length === 0 ? (
      <Text style={styles.noActivitiesText}>
        No activities planned for this day
      </Text>
    ) : (
      getSortedActivities(activities).map((activity) => (
        <TouchableOpacity
          key={activity.id || `temp-${Math.random()}`}
          style={styles.activityItem}
          onPress={() => canEdit && openEditActivityModal(activity, dayPlan)}
          activeOpacity={canEdit ? 0.7 : 1}
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
                  activityColors[activity.type.toLowerCase()] ||
                  COLORS.activity,
              },
            ]}
          >
            {activityIcons[activity.type.toLowerCase()] || (
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

          {canEdit && activity.id && (
            <TouchableOpacity
              style={styles.activityDeleteButton}
              onPress={() => handleDeleteActivity(activity)}
              disabled={isDeletingActivity === activity.id}
            >
              {isDeletingActivity === activity.id ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Trash2 size={16} color={COLORS.danger} />
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))
    );
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

  // Add this function to open the share modal
  const openShareModal = () => {
    setShareEmail("");
    setShareModalVisible(true);
  };

  // Add this function to handle the sharing process
  const handleShareItinerary = async () => {
    if (!shareEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (!itineraryData?.itinerary.id) {
      Alert.alert("Error", "Unable to share itinerary");
      return;
    }

    setIsSharing(true);

    try {
      // Here you would typically have a function to resolve email to user ID
      // This is a placeholder - you need to implement this based on your user management
      const userIdToShare = await resolveUserIdFromEmail(shareEmail.trim());

      if (!userIdToShare) {
        Alert.alert("Error", "User not found");
        setIsSharing(false);
        return;
      }

      await shareItinerary(itineraryData.itinerary.id, userIdToShare);
      Alert.alert("Success", "Itinerary shared successfully!");
      setShareModalVisible(false);

      // Refresh the itinerary data to show updated sharing information
      fetchItineraryData();
    } catch (error) {
      console.error("Error sharing itinerary:", error);
      Alert.alert("Error", "Failed to share itinerary. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  // You'll need to implement this function to convert email to user ID
  const resolveUserIdFromEmail = async (
    email: string
  ): Promise<string | null> => {
    // This is a placeholder implementation
    // You need to implement the actual logic to find a user by email
    // This might involve calling your backend or using Appwrite's user lookup
    try {
      // Replace this with your actual implementation
      // Example: Call Appwrite to find user by email
      // const result = await account.listUsers([Query.equal("email", email)]);
      // if (result.total > 0) {
      //   return result.users[0].$id;
      // }

      // For now, just return a mock value to test the UI
      return "user-id-for-" + email;
    } catch (error) {
      console.error("Error resolving user ID from email:", error);
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        title={editing ? "Edit Itinerary" : "Itinerary Details"}
        showBackButton={true}
        rightIcon={
          canEdit ? (
            editing ? (
              <Save color="#FFF" size={20} />
            ) : (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={() => openShareModal()}
                  style={{ marginRight: 15 }}
                >
                  <Share color="#FFF" size={20} />
                </TouchableOpacity>
              </View>
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
                  {renderActivities(dayPlan)}
                  
                  {canEdit && (
                    <TouchableOpacity
                      style={[
                        styles.addActivityButton,
                        isSavingActivity && styles.disabledButton
                      ]}
                      onPress={() => openAddActivityModal(dayPlan)}
                      disabled={isSavingActivity}
                    >
                      {isSavingActivity ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Plus size={16} color={COLORS.white} />
                          <Text style={styles.addActivityButtonText}>
                            Add Activity
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Delete Itinerary Button */}
          {canEdit && (
            <TouchableOpacity
              style={styles.deleteItineraryButton}
              onPress={handleDeleteItinerary}
            >
              {isDeleting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Trash2 size={16} color={COLORS.white} />
                  <Text style={styles.deleteItineraryButtonText}>
                    Delete Itinerary
                  </Text>
                </>
              )}
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

              {/* Selected Type Display */}
              <TouchableOpacity
                style={styles.selectedTypeButton}
                onPress={() => setShowTypeSelector(true)}
              >
                <View
                  style={[
                    styles.activityTypeIndicator,
                    {
                      backgroundColor:
                        activityColors[activityType] || COLORS.activity,
                      marginRight: 12,
                    },
                  ]}
                >
                  {activityIcons[activityType] || (
                    <Camera size={16} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.selectedTypeText}>
                  {activityType.charAt(0).toUpperCase() + activityType.slice(1)}
                </Text>
                <ChevronDown
                  size={16}
                  color={COLORS.text}
                  style={{ marginLeft: "auto" }}
                />
              </TouchableOpacity>

              {/* Type Selector Modal */}
              <Modal
                visible={showTypeSelector}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTypeSelector(false)}
              >
                <TouchableOpacity
                  style={styles.typeSelectorOverlay}
                  activeOpacity={1}
                  onPress={() => setShowTypeSelector(false)}
                >
                  <View style={styles.typeSelectorContent}>
                    <View style={styles.typeSelectorHeader}>
                      <Text style={styles.typeSelectorTitle}>
                        Select Activity Type
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowTypeSelector(false)}
                      >
                        <X size={20} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                      <Search
                        size={16}
                        color={COLORS.textLight}
                        style={styles.searchIcon}
                      />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search activity types..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={COLORS.textLight}
                      />
                      {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                          <X size={16} color={COLORS.textLight} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {searchQuery ? (
                      // Show search results
                      <FlatList
                        data={filteredActivityTypes}
                        renderItem={renderActivityTypeItem}
                        keyExtractor={(item) => item.type}
                        numColumns={3}
                        style={styles.activityTypeGrid}
                        contentContainerStyle={styles.activityTypeGridContent}
                      />
                    ) : (
                      // Show grouped categories
                      <>
                        {activityTypeGroups.map((group, index) => (
                          <View
                            key={group.title}
                            style={styles.typeGroupContainer}
                          >
                            <Text style={styles.typeGroupTitle}>
                              {group.title}
                            </Text>
                            <View style={styles.typeGroupItems}>
                              {group.types.map((type) => {
                                const item = allActivityTypes.find(
                                  (t) => t.type === type
                                );
                                if (!item) return null;
                                return (
                                  <TouchableOpacity
                                    key={item.type}
                                    style={[
                                      styles.activityTypeGridItem,
                                      {
                                        backgroundColor:
                                          activityType === item.type
                                            ? item.color
                                            : "transparent",
                                        borderColor: item.color,
                                      },
                                    ]}
                                    onPress={() => {
                                      setActivityType(
                                        item.type as Activity["type"]
                                      );
                                      setShowTypeSelector(false);
                                    }}
                                  >
                                    <View
                                      style={[
                                        styles.activityTypeIcon,
                                        { backgroundColor: item.color },
                                      ]}
                                    >
                                      {item.icon}
                                    </View>
                                    <Text
                                      style={[
                                        styles.activityTypeText,
                                        {
                                          color:
                                            activityType === item.type
                                              ? COLORS.white
                                              : COLORS.text,
                                        },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {item.label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </Modal>

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
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ backgroundColor: COLORS.primary }}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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

  // New Activity Type Grid Styles
  activityTypeGrid: {
    flex: 1,
  },
  activityTypeGridContent: {
    padding: 8,
  },
  activityTypeGridItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    margin: 4,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    minWidth: (width - 96) / 3, // 3 columns with padding
    maxWidth: (width - 96) / 3,
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
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  // Type Selector Styles
  selectedTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  selectedTypeText: {
    fontSize: 16,
    color: COLORS.text,
  },
  typeSelectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  typeSelectorContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: width - 40,
    maxHeight: height * 0.7,
    padding: 16,
  },
  typeSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  typeSelectorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  typeGroupContainer: {
    marginBottom: 16,
  },
  typeGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: 8,
  },
  typeGroupItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
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
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    width: 200,
  },

  overlayText: {
    color: COLORS.white,
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default ItineraryDetail;
