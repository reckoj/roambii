// components/AgentProfileCard.tsx
import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Briefcase, Languages, MapPin } from "lucide-react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store/store";
import { router } from "expo-router";

const AgentProfileCard = () => {
  const { profile } = useSelector((state: RootState) => state.agentProfile);

  if (!profile) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile.name?.charAt(0) || "A"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.agentStatus}>Travel Agent</Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Briefcase size={16} color="#1ABC9C" />
          <Text style={styles.infoText}>
            {profile.yearsOfExperience}{" "}
            {profile.yearsOfExperience === 1 ? "year" : "years"} experience
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MapPin size={16} color="#1ABC9C" />
          <Text style={styles.infoText}>{profile.region}</Text>
        </View>

        <View style={styles.infoItem}>
          <Languages size={16} color="#1ABC9C" />
          <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="tail">
            {profile.languages?.join(", ")}
          </Text>
        </View>
      </View>

      {/* Bio */}
      {profile.bio && (
        <View style={styles.bioContainer}>
          <Text style={styles.bioText} numberOfLines={3} ellipsizeMode="tail">
            {profile.bio}
          </Text>
        </View>
      )}

      {/* Edit Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push("/edit-agent-profile")}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1ABC9C",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  agentStatus: {
    fontSize: 14,
    color: "#1ABC9C",
    fontWeight: "600",
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 8,
  },
  bioContainer: {
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-end",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default AgentProfileCard;
