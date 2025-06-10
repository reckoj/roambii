import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/subscription";
import { subscriptionService } from "@/lib/subscription-service";
import { useGlobalContext } from "@/lib/global-provider";
import CustomHeader from "@/components/HeaderComponent";
import {
  Check,
  Crown,
  Package,
  Star,
  ArrowRight,
} from "lucide-react-native";

const SubscriptionPlansScreen = () => {
  const { rawUser } = useGlobalContext();
  const stripe = useStripe();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!rawUser?.id) return;

    try {
      setLoading(true);
      const [plansData, statusData] = await Promise.all([
        subscriptionService.getSubscriptionPlans(),
        subscriptionService.checkSubscriptionStatus(rawUser.id),
      ]);
      setPlans(plansData);
      setCurrentStatus(statusData);
    } catch (error) {
      console.error("Error loading subscription data:", error);
      Alert.alert("Error", "Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!rawUser?.id || !rawUser?.email || !rawUser?.name) {
      Alert.alert("Error", "User information missing");
      return;
    }

    if (plan.price === 0) {
      // Free plan
      try {
        setPurchasing(plan.id);
        await subscriptionService.createFreeSubscription(rawUser.id, plan.id);
        Alert.alert("Success", "You're now on the Basic Plan!");
        loadData();
      } catch (error) {
        console.error("Error creating free subscription:", error);
        Alert.alert("Error", "Failed to activate Basic Plan");
      } finally {
        setPurchasing(null);
      }
      return;
    }

    // Paid plan - use payment intent flow like bookings
    try {
      setPurchasing(plan.id);
      
      const result = await subscriptionService.createSubscription(
        rawUser.id,
        plan.id,
        rawUser.email,
        rawUser.name
      );

      if (result.clientSecret) {
        // Initialize and present the payment sheet
        const { error: initError } = await stripe.initPaymentSheet({
          merchantDisplayName: "Roambii Travel",
          paymentIntentClientSecret: result.clientSecret,
          defaultBillingDetails: {
            name: rawUser.name,
            email: rawUser.email,
          },
          returnURL: "roambii://stripe-redirect",
          style: "automatic",
          appearance: {
            colors: {
              primary: "#1ABC9C",
            },
          },
        });

        if (initError) {
          throw new Error(initError.message);
        }

        // Present the payment sheet
        const { error: presentError } = await stripe.presentPaymentSheet();

        if (presentError) {
          if (presentError.code === "Canceled") {
            console.log("Payment was canceled by user");
            return;
          }
          throw new Error(presentError.message);
        }

        // Payment successful - complete the subscription
        await subscriptionService.completeSubscription(
          rawUser.id,
          plan.id,
          "payment_intent_success" // In a real app, you'd get the actual payment intent ID
        );

        Alert.alert(
          "Success", 
          "Subscription activated successfully!",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else if (result.success) {
        // Free plan success
        Alert.alert(
          "Success", 
          "Subscription activated successfully!",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      Alert.alert("Error", "Failed to create subscription");
    } finally {
      setPurchasing(null);
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentStatus?.planId === plan.id;
    const isPremium = plan.id === "premium";
    const isLoading = purchasing === plan.id;

    return (
      <View 
        key={plan.id} 
        style={[
          styles.planCard,
          isPremium && styles.premiumCard,
          isCurrentPlan && styles.currentPlanCard,
        ]}
      >
        {isPremium && (
          <View style={styles.popularBadge}>
            <Crown size={16} color="#FFF" />
            <Text style={styles.popularText}>POPULAR</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={[styles.planName, isPremium && styles.premiumText]}>
            {plan.name}
          </Text>
          <Text style={styles.planDescription}>{plan.description}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={[styles.price, isPremium && styles.premiumText]}>
            {plan.price === 0 ? "Free" : `$${plan.price}`}
          </Text>
          {plan.price > 0 && (
            <Text style={styles.priceInterval}>/{plan.interval}</Text>
          )}
        </View>

        <View style={styles.packageLimit}>
          <Package size={16} color={isPremium ? "#1ABC9C" : "#95A5A6"} />
          <Text style={styles.packageLimitText}>
            Up to {plan.packageLimit} packages
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={16} color="#1ABC9C" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isPremium && styles.premiumButton,
            isCurrentPlan && styles.currentButton,
            isLoading && styles.loadingButton,
          ]}
          onPress={() => handlePurchase(plan)}
          disabled={isCurrentPlan || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={[styles.buttonText, isPremium && styles.premiumButtonText]}>
                {isCurrentPlan ? "Current Plan" : `Get ${plan.name}`}
              </Text>
              {!isCurrentPlan && <ArrowRight size={16} color="#FFF" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Filter plans based on user's current status
  const getVisiblePlans = () => {
    if (!currentStatus) return plans;
    
    if (currentStatus.planId === "premium") {
      // User has premium - only show premium plan
      return plans.filter(plan => plan.id === "premium");
    } else {
      // User has basic - show both plans (basic as current, premium for upgrade)
      return plans;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Subscription Plans" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ABC9C" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Subscription Plans" showBackButton={true} />
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>
              {currentStatus?.planId === "premium" ? "Your Premium Plan" : "Choose Your Plan"}
            </Text>
            <Text style={styles.subtitle}>
              {currentStatus?.planId === "premium" 
                ? "You're on the Premium plan with full access to all features"
                : "Select the perfect plan for your travel agent business"
              }
            </Text>
            
            {currentStatus && (
              <View style={styles.currentStatusCard}>
                <Star size={20} color="#1ABC9C" />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusTitle}>Current Status</Text>
                  <Text style={styles.statusText}>
                    {currentStatus.planId === "premium" ? "Premium Plan" : "Basic Plan"} - 
                    {" "}{currentStatus.currentPackageCount || 0}/{currentStatus.packageLimit} packages used
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.plansContainer}>
            {getVisiblePlans().map(renderPlanCard)}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              All plans include secure payment processing, booking management, 
              and customer support. Upgrade or downgrade anytime.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#95A5A6",
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 20,
  },
  currentStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1ABC9C",
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  statusText: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 2,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E9ECEF",
    position: "relative",
  },
  premiumCard: {
    borderColor: "#1ABC9C",
    transform: [{ scale: 1.02 }],
  },
  currentPlanCard: {
    borderColor: "#3498DB",
    backgroundColor: "#F8FBFF",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: "#1ABC9C",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  premiumText: {
    color: "#1ABC9C",
  },
  planDescription: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  price: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  priceInterval: {
    fontSize: 16,
    color: "#7F8C8D",
    marginLeft: 4,
  },
  packageLimit: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  packageLimitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginLeft: 8,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#2C3E50",
    marginLeft: 12,
    flex: 1,
  },
  selectButton: {
    backgroundColor: "#95A5A6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  premiumButton: {
    backgroundColor: "#1ABC9C",
  },
  currentButton: {
    backgroundColor: "#3498DB",
  },
  loadingButton: {
    backgroundColor: "#BDC3C7",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
  premiumButtonText: {
    color: "#FFF",
  },
  footerSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default SubscriptionPlansScreen; 