// lib/redux/slices/agentProfileSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "@/lib/firebase/firebase-config";
import { uploadProfileImage } from "@/lib/storage-service";

// Interface for agent profile
export interface AgentProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  yearsOfExperience: number;
  region: string;
  languages: string[];
  bio: string;
  specialties: string[];
  phoneNumber?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  certifications?: string[];
  rating?: number;
  reviewCount?: number;
  isProfileComplete: boolean;
  createdAt: any;
  updatedAt: any;
}

interface AgentProfileState {
  profile: AgentProfile | null;
  loading: boolean;
  error: string | null;
  isNewAgent: boolean;
}

const initialState: AgentProfileState = {
  profile: null,
  loading: false,
  error: null,
  isNewAgent: false,
};

// Helper function to convert Firestore data to AgentProfile
const convertToAgentProfile = (id: string, data: any): AgentProfile => {
  // Convert Firebase Timestamp to milliseconds
  const convertTimestamp = (timestamp: any) => {
    if (!timestamp) return Date.now();
    if (timestamp.seconds) {
      return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    }
    return timestamp;
  };

  // Helper to check if a value is empty
  const isEmpty = (value: any): boolean => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };

  // Create base profile with required fields
  const profile: AgentProfile = {
    id,
    userId: data.userId || id,
    name: data.name || "Unnamed Agent",
    email: data.email || "",
    yearsOfExperience: data.yearsOfExperience || 0,
    region: data.region || "",
    languages: data.languages || [],
    bio: data.bio || "",
    specialties: data.specialties || [],
    isProfileComplete: data.isProfileComplete || false,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };

  // Add optional fields only if they have values
  if (!isEmpty(data.avatar)) profile.avatar = data.avatar;
  if (!isEmpty(data.phoneNumber)) profile.phoneNumber = data.phoneNumber;
  if (!isEmpty(data.website)) profile.website = data.website;
  if (!isEmpty(data.socialLinks)) profile.socialLinks = data.socialLinks;
  if (!isEmpty(data.certifications)) profile.certifications = data.certifications;
  if (!isEmpty(data.rating)) profile.rating = data.rating;
  if (!isEmpty(data.reviewCount)) profile.reviewCount = data.reviewCount;

  return profile;
};

// Get agent profile from Firestore
export const fetchAgentProfileAsync = createAsyncThunk(
  "agentProfile/fetchProfile",
  async (userId: string, { rejectWithValue }) => {
    try {
      // First try by direct ID
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, userId);
      const agentDoc = await getDoc(agentRef);

      if (agentDoc.exists()) {
        const agentData = agentDoc.data();
        const profile = convertToAgentProfile(agentDoc.id, agentData);
        return {
          ...profile,
          isNewAgent: !agentData.isProfileComplete,
        };
      }

      // Try searching by userId field
      const agentsRef = collection(firestore, COLLECTIONS.AGENTS);
      const q = query(agentsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const agentDoc = querySnapshot.docs[0];
        const agentData = agentDoc.data();
        const profile = convertToAgentProfile(agentDoc.id, agentData);
        return {
          ...profile,
          isNewAgent: !agentData.isProfileComplete,
        };
      }

      // No agent profile found
      return rejectWithValue("Agent profile not found");
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Complete agent profile
export const completeAgentProfileAsync = createAsyncThunk(
  "agentProfile/completeProfile",
  async (
    {
      agentId,
      profileData,
      avatarUri,
    }: {
      agentId: string;
      profileData: Partial<AgentProfile>;
      avatarUri?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      let avatarUrl = profileData.avatar;

      // Upload avatar if provided
      //   if (avatarUri) {
      //     avatarUrl = await uploadProfileImage(agentId, avatarUri);
      //   }

      // Handle null to undefined conversion for optional fields
      const sanitizedData = { ...profileData };
      if (sanitizedData.avatar === null) sanitizedData.avatar = undefined;
      if (sanitizedData.phoneNumber === null)
        sanitizedData.phoneNumber = undefined;
      if (sanitizedData.website === null) sanitizedData.website = undefined;
      if (sanitizedData.socialLinks === null)
        sanitizedData.socialLinks = undefined;
      if (sanitizedData.certifications === null)
        sanitizedData.certifications = undefined;

      // Prepare update data with avatar URL
      const updateData = {
        ...sanitizedData,
        avatar: avatarUrl || sanitizedData.avatar,
        isProfileComplete: true,
        updatedAt: serverTimestamp(),
      };

      // Update agent document
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
      await updateDoc(agentRef, updateData);

      // Fetch and return the updated profile
      const updatedDoc = await getDoc(agentRef);
      if (!updatedDoc.exists()) {
        return rejectWithValue("Failed to update agent profile");
      }

      const updatedData = updatedDoc.data();
      const profile = convertToAgentProfile(agentId, updatedData);

      return {
        ...profile,
        isNewAgent: false,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update agent profile
export const updateAgentProfileAsync = createAsyncThunk(
  "agentProfile/updateProfile",
  async (
    {
      agentId,
      profileData,
      avatarUri,
    }: {
      agentId: string;
      profileData: Partial<AgentProfile>;
      avatarUri?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      if (!agentId) {
        return rejectWithValue("Agent ID is required");
      }

      // First verify the agent exists
      const agentRef = doc(firestore, COLLECTIONS.AGENTS, agentId);
      const agentDoc = await getDoc(agentRef);
      
      if (!agentDoc.exists()) {
        return rejectWithValue("Agent profile not found");
      }

      let avatarUrl: string | undefined = profileData.avatar;

      // Upload avatar if provided
      if (avatarUri) {
        try {
          const uploadedUrl = await uploadProfileImage(agentId, avatarUri);
          avatarUrl = uploadedUrl || undefined;
        } catch (error) {
          console.error("Error uploading avatar:", error);
          return rejectWithValue("Failed to upload profile image");
        }
      }

      // Sanitize and validate the update data
      const sanitizedData: Partial<AgentProfile> = {};
      
      // Only include fields that are actually being updated and have values
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          sanitizedData[key as keyof AgentProfile] = value;
        }
      });

      // Prepare update data
      const updateData = {
        ...sanitizedData,
        avatar: avatarUrl,
        updatedAt: serverTimestamp(),
      };

      // Remove any undefined or null values to prevent Firestore errors
      Object.keys(updateData).forEach(key => {
        const value = updateData[key as keyof typeof updateData];
        if (value === undefined || value === null || value === "") {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Update agent document
      await updateDoc(agentRef, updateData);

      // Fetch and return the updated profile
      const updatedDoc = await getDoc(agentRef);
      if (!updatedDoc.exists()) {
        return rejectWithValue("Failed to fetch updated profile");
      }

      const updatedData = updatedDoc.data();
      const profile = convertToAgentProfile(agentId, updatedData);

      return {
        ...profile,
        isNewAgent: false,
      };
    } catch (error: any) {
      console.error("Error updating agent profile:", error);
      return rejectWithValue(error.message || "Failed to update agent profile");
    }
  }
);

const agentProfileSlice = createSlice({
  name: "agentProfile",
  initialState,
  reducers: {
    clearAgentProfileError: (state) => {
      state.error = null;
    },
    setIsNewAgent: (state, action) => {
      state.isNewAgent = action.payload;
    },
    resetAgentProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.isNewAgent = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile cases
      .addCase(fetchAgentProfileAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgentProfileAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.isNewAgent = action.payload.isNewAgent;
      })
      .addCase(fetchAgentProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Complete profile cases
      .addCase(completeAgentProfileAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeAgentProfileAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.isNewAgent = false;
      })
      .addCase(completeAgentProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update profile cases
      .addCase(updateAgentProfileAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAgentProfileAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateAgentProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAgentProfileError, setIsNewAgent, resetAgentProfile } =
  agentProfileSlice.actions;
export default agentProfileSlice.reducer;
