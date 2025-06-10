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
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "price_premium",
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
      // Force update plans to ensure they match the current DEFAULT_PLANS
      await this.updateSubscriptionPlans();
      
      const plansRef = collection(firestore, "subscriptionPlans");
      const querySnapshot = await getDocs(plansRef);
      
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
      const q = query(subscriptionsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const subscriptionDoc = querySnapshot.docs[0];
      return {
        id: subscriptionDoc.id,
        ...subscriptionDoc.data(),
      } as Subscription;
    } catch (error) {
      console.error("Error getting user subscription:", error);
      return null;
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
        };
      }

      // Check if subscription is active and not expired
      const isActive = subscription.status === "active" && 
        toDate(subscription.currentPeriodEnd) > new Date();

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
      };
    }
  },

  /**
   * Create subscription via Stripe - using payment intent like bookings
   */
  async createSubscription(
    userId: string,
    planId: string,
    userEmail: string,
    userName: string
  ): Promise<{ clientSecret?: string; success?: boolean }> {
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

      // Paid plan - use payment intent like bookings
      const amountInCents = Math.round(plan.price * 100);
      
      const response = await fetch("http://192.168.4.47:4000/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency: "usd",
          packageId: `subscription_${planId}`, // Use subscription as package ID
          email: userEmail,
          name: userName,
          description: `${plan.name} subscription payment`,
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

      return { clientSecret: data.clientSecret };
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  },

  /**
   * Complete subscription after successful payment
   */
  async completeSubscription(
    userId: string,
    planId: string,
    paymentIntentId: string
  ): Promise<void> {
    try {
      const subscriptionRef = doc(collection(firestore, "subscriptions"));
      const now = new Date();
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await setDoc(subscriptionRef, {
        userId,
        planId,
        status: "active",
        stripeSubscriptionId: paymentIntentId, // Use payment intent ID
        stripeCustomerId: "payment_intent", // Not a real customer for one-time payments
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthFromNow,
        cancelAtPeriodEnd: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch("http://192.168.4.47:4000/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      // Update local record
      await updateDoc(doc(firestore, "subscriptions", subscriptionId), {
        cancelAtPeriodEnd: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  },
}; 