// app/(root)/edit-agent-profile.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/redux/store/store";
import { useGlobalContext } from "@/lib/global-provider";
import {
  fetchAgentProfileAsync,
  updateAgentProfileAsync,
} from "@/lib/redux/slices/agentProfileSlice";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Plus,
  Save,
  Check,
  X,
} from "lucide-react-native";
import CustomHeader from "@/components/HeaderComponent";

// Region and language data
const REGIONS = [
  "North America",
  "South America",
  "Caribbean",
  "Europe",
  "Africa",
  "Middle East",
  "Asia",
  "Oceania",
  "Antarctica",
];

const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Mandarin",
  "Japanese",
  "Korean",
  "Russian",
  "Arabic",
  "Hindi",
];

const SPECIALTIES = [
  "Luxury Travel",
  "Adventure Travel",
  "Family Vacations",
  "Honeymoons",
  "Cruises",
  "Solo Travel",
  "Group Travel",
  "Eco Tourism",
  "Cultural Tours",
  "Beach Resorts",
  "City Breaks",
  "Backpacking",
];

const EditAgentProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { rawUser } = useGlobalContext();
  const { profile, loading, error } = useSelector(
    (state: RootState) => state.agentProfile
  );

  // Form state
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [region, setRegion] = useState<string>("");
  const [showRegions, setShowRegions] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);
  const [showLanguages, setShowLanguages] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [showSpecialties, setShowSpecialties] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch agent profile on mount
  useEffect(() => {
    if (rawUser?.id) {
      dispatch(fetchAgentProfileAsync(rawUser.id));
    }
  }, [dispatch, rawUser]);

  // Prefill form with existing data if available
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setYearsOfExperience(
        profile.yearsOfExperience ? profile.yearsOfExperience.toString() : ""
      );
      setRegion(profile.region || "");
      setLanguages(profile.languages || []);
      setSpecialties(profile.specialties || []);
      setPhoneNumber(profile.phoneNumber || "");
      setWebsite(profile.website || "");
      setAvatar(profile.avatar || null);
    }
  }, [profile]);

  // Handle image picking
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Toggle selection for array fields
  const toggleLanguage = (language: string) => {
    if (languages.includes(language)) {
      setLanguages(languages.filter((l) => l !== language));
    } else {
      setLanguages([...languages, language]);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    if (specialties.includes(specialty)) {
      setSpecialties(specialties.filter((s) => s !== specialty));
    } else {
      setSpecialties([...specialties, specialty]);
    }
  };

  // Validation
  const isFormValid = () => {
    return (
      name.trim().length > 0 &&
      bio.trim().length > 0 &&
      yearsOfExperience.trim().length > 0 &&
      !isNaN(Number(yearsOfExperience)) &&
      region.trim().length > 0 &&
      languages.length > 0 &&
      specialties.length > 0
    );
  };

  // Submit profile updates
  const handleSubmit = async () => {
    if (!rawUser?.id || !profile?.id) {
      Alert.alert("Error", "User information missing. Please log in again.");
      return;
    }

    if (!isFormValid()) {
      Alert.alert(
        "Incomplete Information",
        "Please fill in all required fields correctly."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const profileData = {
        name,
        bio,
        yearsOfExperience: parseInt(yearsOfExperience, 10),
        region,
        languages,
        specialties,
        phoneNumber: phoneNumber.trim(),
        website: website.trim(),
      };

      await dispatch(
        updateAgentProfileAsync({
          agentId: profile.id,
          profileData,
          avatarUri: avatar && avatar !== profile.avatar ? avatar : undefined,
        })
      ).unwrap();

      Alert.alert("Success", "Your profile has been updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <CustomHeader title="Edit Profile" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <CustomHeader title="Edit Profile" showBackButton={true} />
        <View style={styles.errorContainer}>
          <X size={56} color="#EF4444" />
          <Text style={styles.errorTitle}>Error Loading Profile</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <CustomHeader
          title="Edit Agent Profile"
          showBackButton={true}
          rightIcon={
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
            >
              <Save
                size={24}
                color={!isFormValid() || isSubmitting ? "#9CA3AF" : "#1ABC9C"}
              />
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={pickImage}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Camera size={32} color="#1ABC9C" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Edit2 size={15} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell travelers about yourself and your expertise"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={250}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Professional Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Details</Text>

            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              placeholder="Number of years"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Region Specialization</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowRegions(!showRegions)}
            >
              <Text
                style={region ? styles.selectText : styles.selectPlaceholder}
              >
                {region || "Select your primary region"}
              </Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {showRegions && (
              <View style={styles.optionsContainer}>
                {REGIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.optionItem,
                      region === r && styles.selectedOption,
                    ]}
                    onPress={() => {
                      setRegion(r);
                      setShowRegions(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        region === r && styles.selectedOptionText,
                      ]}
                    >
                      {r}
                    </Text>
                    {region === r && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Languages You Speak</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowLanguages(!showLanguages)}
            >
              <Text
                style={
                  languages.length > 0
                    ? styles.selectText
                    : styles.selectPlaceholder
                }
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {languages.length > 0
                  ? languages.join(", ")
                  : "Select languages you speak"}
              </Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {showLanguages && (
              <View style={styles.optionsContainer}>
                {COMMON_LANGUAGES.map((language) => (
                  <TouchableOpacity
                    key={language}
                    style={[
                      styles.optionItem,
                      languages.includes(language) && styles.selectedOption,
                    ]}
                    onPress={() => toggleLanguage(language)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        languages.includes(language) &&
                          styles.selectedOptionText,
                      ]}
                    >
                      {language}
                    </Text>
                    {languages.includes(language) && (
                      <Check size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Specialties Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialties & Contact</Text>

            <Text style={styles.label}>Travel Specialties</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowSpecialties(!showSpecialties)}
            >
              <Text
                style={
                  specialties.length > 0
                    ? styles.selectText
                    : styles.selectPlaceholder
                }
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {specialties.length > 0
                  ? specialties.join(", ")
                  : "Select your travel specialties"}
              </Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {showSpecialties && (
              <View style={styles.optionsContainer}>
                {SPECIALTIES.map((specialty) => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.optionItem,
                      specialties.includes(specialty) && styles.selectedOption,
                    ]}
                    onPress={() => toggleSpecialty(specialty)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        specialties.includes(specialty) &&
                          styles.selectedOptionText,
                      ]}
                    >
                      {specialty}
                    </Text>
                    {specialties.includes(specialty) && (
                      <Check size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (123) 456-7890"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Website (Optional)</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isFormValid() || isSubmitting) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  selectInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: "#9CA3AF",
    flex: 1,
  },
  optionsContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 200,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  optionText: {
    fontSize: 16,
    color: "#111827",
  },
  selectedOption: {
    backgroundColor: "#1ABC9C",
  },
  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginVertical: 16,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1ABC9C",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default EditAgentProfile;
