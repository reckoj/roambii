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
  return {
    id,
    userId: data.userId || id,
    name: data.name || "",
    email: data.email || "",
    avatar: data.avatar === null ? undefined : data.avatar, // Convert null to undefined
    yearsOfExperience: data.yearsOfExperience || 0,
    region: data.region || "",
    languages: data.languages || [],
    bio: data.bio || "",
    specialties: data.specialties || [],
    phoneNumber: data.phoneNumber === null ? undefined : data.phoneNumber, // Convert null to undefined
    website: data.website === null ? undefined : data.website, // Convert null to undefined
    socialLinks: data.socialLinks === null ? undefined : data.socialLinks, // Convert null to undefined
    certifications:
      data.certifications === null ? undefined : data.certifications, // Convert null to undefined
    rating: data.rating || 0,
    reviewCount: data.reviewCount || 0,
    isProfileComplete: data.isProfileComplete || false,
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: data.updatedAt || serverTimestamp(),
  };
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
      return convertToAgentProfile(agentId, updatedData);
    } catch (error: any) {
      return rejectWithValue(error.message);
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
