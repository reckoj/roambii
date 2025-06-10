import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore, COLLECTIONS } from "./firebase/firebase-config";
import { Subscription, SubscriptionPlan, SubscriptionStatus } from "./types/subscription";
import { getAgentPackages } from "./agent-service";

// Helper function to safely convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Default subscription plans
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic Plan",
    description: "Perfect for getting started",
    price: 0,
    interval: "month",
    stripePriceId: "free", // No Stripe price for free tier
    features: [
      "Up to 3 package listings",
      "Basic booking management",
      "Email notifications",
      "Community support",
    ],
    isActive: true,
    packageLimit: 3,
  },
  {
    id: "premium",
    name: "Premium Plan", 
    description: "For professional travel agents",
    price: 19.99,
    interval: "month",
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_ID || "price_premium",
    features: [
      "Up to 20 package listings",
      "Advanced booking management",
      "Real-time notifications",
      "Priority customer support",
      "Analytics dashboard",
      "Custom branding options",
    ],
    isActive: true,
    packageLimit: 20,
  },
];

export const subscriptionService = {
  /**
   * Initialize subscription plans in Firestore
   */
  async initializeSubscriptionPlans(): Promise<void> {
    try {
      const plansRef = collection(firestore, "subscriptionPlans");
      const existingPlans = await getDocs(plansRef);

      if (existingPlans.empty) {
        console.log("Initializing subscription plans...");
        for (const plan of DEFAULT_PLANS) {
          await setDoc(doc(plansRef, plan.id), {
            ...plan,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        console.log("Subscription plans initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
      throw error;
    }
  },

  /**
   * Force update subscription plans in Firestore
   */
  async updateSubscriptionPlans(): Promise<void> {
    try {
      console.log("Force updating subscription plans...");
      const plansRef = collection(firestore, "subscriptionPlans");
      
      // Delete existing plans
      const existingPlans = await getDocs(plansRef);
      for (const planDoc of existingPlans.docs) {
        await deleteDoc(planDoc.ref);
      }
      
      // Add current plans
      for (const plan of DEFAULT_PLANS) {
        await setDoc(doc(plansRef, plan.id), {
          ...plan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      console.log("Subscription plans updated successfully");
    } catch (error) {
      console.error("Error updating subscription plans:", error);
      throw error;
    }
  },

  /**
   * Get all available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plansRef = collection(firestore, "subscriptionPlans");
      const querySnapshot = await getDocs(plansRef);
      
      // If no plans exist in database, initialize them once
      if (querySnapshot.empty) {
        console.log("No plans found in database, initializing...");
        await this.initializeSubscriptionPlans();
        
        // Fetch again after initialization
        const newQuerySnapshot = await getDocs(plansRef);
        return newQuerySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan))
          .filter(plan => plan.isActive)
          .sort((a, b) => a.price - b.price);
      }
      
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan))
        .filter(plan => plan.isActive)
        .sort((a, b) => a.price - b.price);
    } catch (error) {
      console.error("Error getting subscription plans:", error);
      return DEFAULT_PLANS;
    }
  },

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscriptionsRef = collection(firestore, "subscriptions");
      const q = query(
        subscriptionsRef, 
        where("userId", "==", userId),
        orderBy("createdAt", "desc") // Get most recent first
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      // Find the most recent active subscription
      for (const subscriptionDoc of querySnapshot.docs) {
        const subscription = {
          id: subscriptionDoc.id,
          ...subscriptionDoc.data(),
        } as Subscription;
        
        console.log("Checking subscription:", subscription.id, "status:", subscription.status, "planId:", subscription.planId);
        
        // Return active subscriptions first
        if (subscription.status === "active") {
          const periodEnd = toDate(subscription.currentPeriodEnd);
          if (periodEnd > new Date() && !subscription.cancelAtPeriodEnd) {
            console.log("Found active subscription:", subscription.id);
            return subscription;
          }
        }
      }
      
      // If no active subscription found, return the most recent one
      const mostRecentDoc = querySnapshot.docs[0];
      const mostRecent = {
        id: mostRecentDoc.id,
        ...mostRecentDoc.data(),
      } as Subscription;
      
      console.log("No active subscription found, returning most recent:", mostRecent.id, "status:", mostRecent.status);
      return mostRecent;
    } catch (error) {
      console.error("Error getting user subscription:", error);
      return null;
    }
  },

  /**
   * Clean up test/invalid subscriptions with placeholder IDs and expired subscriptions
   */
  async cleanupTestSubscriptions(userId: string): Promise<void> {
    try {
      const subscriptionsRef = collection(firestore, "subscriptions");
      const q = query(subscriptionsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      for (const subscriptionDoc of querySnapshot.docs) {
        const data = subscriptionDoc.data();
        
        // Remove subscriptions with placeholder/test IDs
        if (data.stripeSubscriptionId === "payment_intent_success" || 
            data.stripeSubscriptionId === "stripe_subscription" ||
            !data.stripeSubscriptionId ||
            data.stripeSubscriptionId === "test") {
          
          console.log("Removing test subscription:", subscriptionDoc.id);
          await deleteDoc(subscriptionDoc.ref);
        }
        // Remove expired/incomplete subscriptions that are older than 1 hour
        else if (data.status === "incomplete" || data.status === "incomplete_expired") {
          const createdAt = data.createdAt?.toDate() || new Date(0);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (createdAt < oneHourAgo) {
            console.log("Removing expired incomplete subscription:", subscriptionDoc.id);
            await deleteDoc(subscriptionDoc.ref);
          }
        }
      }
    } catch (error) {
      console.error("Error cleaning up test subscriptions:", error);
    }
  },

  /**
   * Check subscription status and package limits
   */
  async checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const plans = await this.getSubscriptionPlans();
      
      // Get current package count
      const packages = await getAgentPackages(userId);
      const currentPackageCount = packages.length;

      if (!subscription) {
        // No subscription = basic plan
        const basicPlan = plans.find(p => p.id === "basic");
        const packageLimit = basicPlan?.packageLimit || 3;
        
        return {
          isActive: false,
          planId: "basic",
          packageLimit,
          currentPackageCount,
          canCreatePackage: currentPackageCount < packageLimit,
          isCancelled: false,
        };
      }

      // Check if subscription is active and not expired
      const periodEnd = toDate(subscription.currentPeriodEnd);
      const isActive = subscription.status === "active" && periodEnd > new Date();

      if (!isActive) {
        // Expired/inactive subscription = basic plan
        const basicPlan = plans.find(p => p.id === "basic");
        const packageLimit = basicPlan?.packageLimit || 3;
        
        return {
          isActive: false,
          planId: "basic",
          packageLimit,
          currentPackageCount,
          canCreatePackage: currentPackageCount < packageLimit,
          isCancelled: false,
        };
      }

      // Active subscription
      const plan = plans.find(p => p.id === subscription.planId);
      const packageLimit = plan?.packageLimit || 20;

      return {
        isActive: true,
        planId: subscription.planId,
        packageLimit,
        currentPackageCount,
        canCreatePackage: currentPackageCount < packageLimit,
        isCancelled: subscription.cancelAtPeriodEnd || false,
        periodEndDate: periodEnd,
      };
    } catch (error) {
      console.error("Error checking subscription status:", error);
      // Return basic plan on error
      return {
        isActive: false,
        planId: "basic",
        packageLimit: 3,
        currentPackageCount: 0,
        canCreatePackage: true,
        isCancelled: false,
      };
    }
  },

  /**
   * Create subscription via Stripe - using real Stripe subscriptions for dashboard visibility
   */
  async createSubscription(
    userId: string,
    planId: string,
    userEmail: string,
    userName: string
  ): Promise<{ clientSecret?: string; success?: boolean; subscriptionId?: string; customerId?: string; status?: string }> {
    try {
      const plans = await this.getSubscriptionPlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error("Plan not found");
      }

      if (plan.price === 0) {
        // Free plan - create subscription record directly
        await this.createFreeSubscription(userId, planId);
        return { success: true };
      }

      // Paid plan - use real Stripe subscriptions for dashboard visibility
      const response = await fetch("http://192.168.4.47:4000/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          planId,
          priceId: plan.stripePriceId,
          email: userEmail,
          name: userName,
        }),
      });

      // Log response details for debugging
      console.log("Server response status:", response.status);
      console.log("Server response headers:", response.headers);
      
      const responseText = await response.text();
      console.log("Server response body:", responseText);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("Server returned invalid JSON response");
      }

      if (data.error) {
        throw new Error(data.error.message);
      }

      return { 
        clientSecret: data.clientSecret,
        subscriptionId: data.subscriptionId,
        customerId: data.customerId,
      };
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  },

  /**
   * Complete subscription after successful payment
   * With Stripe's official confirmation_secret approach, this is simplified
   */
  async completeSubscription(
    userId: string,
    planId: string,
    subscriptionId: string,
    customerId: string
  ): Promise<void> {
    try {
      console.log("Creating local subscription record for successful payment...");

      // Create local subscription record
      const subscriptionRef = doc(collection(firestore, "subscriptions"));
      const now = new Date();
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await setDoc(subscriptionRef, {
        userId,
        planId,
        status: "active",
        stripeSubscriptionId: subscriptionId, // Real Stripe subscription ID
        stripeCustomerId: customerId, // Real Stripe customer ID
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthFromNow,
        cancelAtPeriodEnd: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log("✅ Subscription record created successfully");
    } catch (error) {
      console.error("Error completing subscription:", error);
      throw error;
    }
  },

  /**
   * Create free subscription record
   */
  async createFreeSubscription(userId: string, planId: string): Promise<void> {
    try {
      const subscriptionRef = doc(collection(firestore, "subscriptions"));
      const now = new Date();
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      await setDoc(subscriptionRef, {
        userId,
        planId,
        status: "active",
        stripeSubscriptionId: "free",
        stripeCustomerId: "free",
        currentPeriodStart: now,
        currentPeriodEnd: oneYearFromNow, // Free plan never expires
        cancelAtPeriodEnd: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating free subscription:", error);
      throw error;
    }
  },

  /**
   * Cleanup incomplete subscription from Stripe (complete deletion)
   */
  async cleanupIncompleteSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log("Cleaning up incomplete subscription:", subscriptionId);
      
      const response = await fetch("http://192.168.4.47:4000/cleanup-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          subscriptionId: subscriptionId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to cleanup subscription:", errorData);
        throw new Error(`Failed to cleanup subscription: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log("✅ Incomplete subscription cleaned up successfully:", result);
    } catch (error) {
      console.error("Error cleaning up incomplete subscription:", error);
      // Don't throw error - cleanup is best effort
      console.log("Cleanup failed, but continuing...");
    }
  },

  /**
   * Cancel subscription - cancels in Stripe dashboard AND updates local database
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error("No active subscription found");
      }

      console.log("Found subscription to cancel:", {
        id: subscription.id,
        planId: subscription.planId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status
      });

      if (subscription.planId === "basic") {
        throw new Error("Cannot cancel free Basic plan");
      }

      if (!subscription.stripeSubscriptionId || subscription.stripeSubscriptionId === "free") {
        throw new Error("No Stripe subscription to cancel");
      }

      // Cancel in Stripe - this will show up in Stripe dashboard
      console.log("Cancelling Stripe subscription:", subscription.stripeSubscriptionId);
      const response = await fetch("http://192.168.4.47:4000/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          subscriptionId: subscription.stripeSubscriptionId 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(`Failed to cancel subscription in Stripe: ${errorText}`);
      }

      const cancelResult = await response.json();
      console.log("Stripe cancellation result:", cancelResult);

      // Update local record
      const subscriptionRef = doc(firestore, "subscriptions", subscription.id);
      await updateDoc(subscriptionRef, {
        cancelAtPeriodEnd: true,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("Subscription cancelled in both Stripe dashboard and local database");
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  },

  /**
   * Check if subscription is cancelled (but may still be active)
   */
  async isSubscriptionCancelled(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription?.cancelAtPeriodEnd || false;
    } catch (error) {
      console.error("Error checking cancellation status:", error);
      return false;
    }
  },

  /**
   * Validate and sync subscription status with Stripe
   * Removes invalid subscriptions that don't exist in Stripe
   */
  async validateAndSyncSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !subscription.stripeSubscriptionId) {
        console.log("No subscription to validate");
        return;
      }

      // Skip validation for free subscriptions
      if (subscription.stripeSubscriptionId === "free") {
        console.log("Free subscription, no validation needed");
        return;
      }

      // Remove test/invalid subscriptions
      if (subscription.stripeSubscriptionId.startsWith("payment_intent_") || 
          subscription.stripeSubscriptionId === "test") {
        console.log("Removing invalid test subscription:", subscription.stripeSubscriptionId);
        
        const subscriptionRef = doc(firestore, "subscriptions", subscription.id);
        await deleteDoc(subscriptionRef);
        return;
      }

      // Validate with Stripe
      try {
        const response = await fetch("http://192.168.4.47:4000/validate-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: subscription.stripeSubscriptionId,
          }),
        });

        const data = await response.json();

        if (!data.exists) {
          console.log("Subscription not found in Stripe, removing local record:", subscription.stripeSubscriptionId);
          
          const subscriptionRef = doc(firestore, "subscriptions", subscription.id);
          await deleteDoc(subscriptionRef);
        } else {
          console.log("Subscription validated successfully in Stripe");
        }
      } catch (error) {
        console.error("Error validating subscription with Stripe:", error);
      }
    } catch (error) {
      console.error("Error in validateAndSyncSubscription:", error);
    }
  },
}; 