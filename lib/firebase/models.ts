// lib/firebase/models.ts
import { Timestamp, DocumentReference } from "firebase/firestore";

// Common field interfaces
export interface FirebaseTimestamps {
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface FirebaseDocument extends FirebaseTimestamps {
  id: string;
}

// User models
export interface User extends FirebaseDocument {
  $id: string;
  name: string;
  email: string;
  avatar?: string;
  isAgent: boolean;
  isAgentTemp?: boolean;
  isEmailVerified: boolean;
  legalInformation?: {
    fullName: string;
    dateOfBirth: string | null;
    email: string;
    phoneNumber: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    passportNumber?: string;
    passportExpiryDate?: string | null;
  };
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  niche?: string;
  isProfileComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Add missing properties
  yearsOfExperience?: number;
  region?: string;
  languages?: string[];
  specialties?: string[];
  phoneNumber?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  certifications?: string[];
  isVerified?: boolean;
  isActive?: boolean;
  lastActive?: Date;
  totalBookings?: number;
  totalReviews?: number;
  averageRating?: number;
  responseTime?: number; // in minutes
  preferredLanguages?: string[];
  serviceAreas?: string[];
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  commissionRate?: number;
  paymentMethods?: string[];
  documents?: {
    id: string;
    type: string;
    url: string;
    verified: boolean;
  }[];
}

// Client relationship model
export interface Client extends FirebaseDocument {
  agentId: string;         // ID of the agent
  userId: string;          // ID of the user/traveler
  status: 'active' | 'inactive'; // Status of the client relationship
  bookings: string[];      // Array of booking IDs made by this client with this agent
  lastBookingDate?: Timestamp | Date; // Date of the last booking
  totalBookings: number;   // Total number of bookings made
  totalSpent: number;      // Total amount spent on bookings
  notes?: string;          // Agent's notes about this client
  preferences?: {          // Client's travel preferences
    destinations?: string[];
    accommodationType?: string;
    budgetRange?: string;
    travelStyle?: string[];
    specialRequirements?: string[];
  };
  // Contact info - cached from user for quicker access
  contactInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
}

// Package models
export interface Package extends FirebaseDocument {
  name: string;
  description?: string;
  price: number;
  type: string;
  image?: string;
  rating?: number;
  agent: {
    id: string;
    name: string;
    avatar?: string;
  };
  allinclusive?: boolean;
  roomType?: string;
  amenities?: string[];
  isFeatured?: boolean;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

// Booking models
export interface Booking extends FirebaseDocument {
  userId: string;
  packageId: string;
  packageDetails?: Package;
  amount: number;
  status: "confirmed" | "cancelled" | "pending";
  bookingReference: string;
  bookingDate: Timestamp | Date;
  checkInDate: Timestamp | Date;
  checkOutDate: Timestamp | Date;
  guestCount: number;
  transactionId: string;
  paymentMethod: string;
  travelerInfo?: {
    fullName: string;
    dateOfBirth?: string | null;
    email: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    passportNumber?: string;
    passportExpiryDate?: string | null;
  };
  // Added for embedded client relationships
  clientRelationship?: {
    agentId: string;
    userId: string;
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
    status: 'active' | 'inactive';
    isEmbedded: boolean;
    contactInfo?: {
      name: string;
      email: string;
      phone?: string;
    };
    notes?: string;
    preferences?: {
      destinations?: string[];
      accommodationType?: string;
      budgetRange?: string;
      travelStyle?: string[];
      specialRequirements?: string[];
    };
  };
}

// Review models
export interface Review extends FirebaseDocument {
  agentId: string;
  userId: string;
  rating: number;
  comment: string;
  author: string;
  avatar?: string;
}

// Chat models
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage: string;
  lastUpdated: number;
  unreadCount: { [userId: string]: number };
}

// Itinerary models
export interface Itinerary extends FirebaseDocument {
  title: string;
  userId: string;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  destinations: string[];
  sharedWith?: string[]; // Array of user IDs who can edit this itinerary
}

export interface DayPlan extends FirebaseDocument {
  itineraryId: string;
  day: number;
  date: Timestamp | Date;
}

export interface Activity extends FirebaseDocument {
  dayPlanId: string;
  time: string; // Format like "09:00", "14:30", etc.
  title: string;
  type: string;
  notes?: string;
}

export interface ItineraryWithDetails {
  itinerary: Itinerary;
  dayPlans: (DayPlan & { activities: Activity[] })[];
}
