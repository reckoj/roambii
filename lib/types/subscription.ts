import { Timestamp } from "firebase/firestore";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  isActive: boolean;
  packageLimit: number; // Max packages allowed
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodStart: Timestamp | Date;
  currentPeriodEnd: Timestamp | Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface SubscriptionStatus {
  isActive: boolean;
  planId: string | null;
  packageLimit: number;
  currentPackageCount?: number;
  canCreatePackage: boolean;
} 