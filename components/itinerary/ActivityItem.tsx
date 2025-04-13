import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Activity } from "@/lib/models";
import {
  Trash2,
  Bus,
  Utensils,
  Bed,
  Palmtree,
  Camera,
} from "lucide-react-native";

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

interface ActivityItemProps {
  activity: Activity;
  isAuthorized: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  isAuthorized,
  onEdit,
  onDelete,
}) => {
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

  return (
    <TouchableOpacity
      style={styles.activityItem}
      onPress={isAuthorized ? onEdit : undefined}
      activeOpacity={isAuthorized ? 0.7 : 1}
    >
      <View style={styles.activityTimeColumn}>
        <Text style={styles.activityTimeText}>{formatTime(activity.time)}</Text>
      </View>

      <View
        style={[
          styles.activityTypeIndicator,
          { backgroundColor: activityColors[activity.type] || COLORS.activity },
        ]}
      >
        {activityIcons[activity.type] || (
          <Camera size={16} color={COLORS.white} />
        )}
      </View>

      <View style={styles.activityContentColumn}>
        <Text style={styles.activityTitleText}>{activity.title}</Text>
        {activity.notes ? (
          <Text style={styles.activityNotesText}>{activity.notes}</Text>
        ) : null}
      </View>

      {isAuthorized && (
        <TouchableOpacity
          style={styles.activityDeleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Trash2 size={16} color={COLORS.food} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});

export default ActivityItem;
