import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  getPlans,
  createCheckoutSession,
  verifyPayment,
} from '@/lib/api/subscription';
import { useRazorpay, formatINR, isExpoGo } from '@/hooks/use-razorpay';
import type { SubscriptionPlan, BillingCycle } from '@/types/subscription';

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const { openCheckout, isLoading: isPaymentLoading, isAvailable: isRazorpayAvailable } = useRazorpay();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [userCount, setUserCount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // Background gradient colors
  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const cardBgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  const fetchPlans = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await getPlans(accessToken);
      if (response.success && response.data) {
        const activePlans = response.data.filter((p) => p.isActive);
        setPlans(activePlans);
        // Select the first plan by default
        if (activePlans.length > 0 && !selectedPlan) {
          setSelectedPlan(activePlans[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, selectedPlan]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Show Expo Go warning
  useEffect(() => {
    if (isExpoGo()) {
      Alert.alert(
        'Development Build Required',
        'Razorpay payments require a development build. You can view plans, but payment will not work in Expo Go.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const calculatePrice = (plan: SubscriptionPlan) => {
    const pricePerUser =
      billingCycle === 'MONTHLY'
        ? plan.pricePerUserMonthlyINR
        : plan.pricePerUserAnnualINR;
    return pricePerUser * userCount;
  };

  const calculateSavings = (plan: SubscriptionPlan) => {
    if (billingCycle !== 'ANNUAL') return 0;
    const monthlyTotal = plan.pricePerUserMonthlyINR * 12 * userCount;
    const annualTotal = plan.pricePerUserAnnualINR * userCount;
    return monthlyTotal - annualTotal;
  };

  const handleUserCountChange = (delta: number) => {
    const newCount = userCount + delta;
    if (selectedPlan) {
      if (newCount < selectedPlan.minUsers) return;
      if (selectedPlan.maxUsers && newCount > selectedPlan.maxUsers) return;
    }
    if (newCount >= 1 && newCount <= 100) {
      setUserCount(newCount);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !accessToken || !user?.orgId) return;

    if (!isRazorpayAvailable) {
      Alert.alert(
        'Development Build Required',
        'Razorpay payments require a development build. Please build the app using EAS Build.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create checkout session
      const sessionResponse = await createCheckoutSession(accessToken, {
        planId: selectedPlan.id,
        orgId: user.orgId,
        userCount,
        billingCycle,
      });

      if (!sessionResponse.success || !sessionResponse.data) {
        Alert.alert('Error', sessionResponse.error?.message || 'Failed to create checkout session');
        setIsProcessing(false);
        return;
      }

      const session = sessionResponse.data;

      // Step 2: Open Razorpay checkout
      const paymentResult = await openCheckout(session);

      if (!paymentResult) {
        // User cancelled or payment failed
        setIsProcessing(false);
        return;
      }

      // Step 3: Verify payment
      const verifyResponse = await verifyPayment(accessToken, {
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySubscriptionId: paymentResult.razorpay_subscription_id,
        razorpaySignature: paymentResult.razorpay_signature,
      });

      if (verifyResponse.success && verifyResponse.data?.success) {
        Alert.alert(
          'Payment Successful',
          'Your subscription has been activated. Thank you for subscribing!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/subscription'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Verification Failed',
          verifyResponse.error?.message || 'Payment verification failed. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: subtitleColor }]}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Choose a Plan</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Billing Toggle */}
        <View style={styles.section}>
          <View style={[styles.billingToggle, { backgroundColor: cardBgColor, borderColor }]}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'MONTHLY' && styles.billingOptionActive,
              ]}
              onPress={() => setBillingCycle('MONTHLY')}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  { color: billingCycle === 'MONTHLY' ? 'white' : subtitleColor },
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'ANNUAL' && styles.billingOptionActive,
              ]}
              onPress={() => setBillingCycle('ANNUAL')}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  { color: billingCycle === 'ANNUAL' ? 'white' : subtitleColor },
                ]}
              >
                Annual
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 20%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Count */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: subtitleColor }]}>NUMBER OF USERS</Text>
          <View style={[styles.userCountContainer, { borderColor }]}>
            <BlurView
              intensity={15}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.userCountBlur, { backgroundColor: cardBgColor }]}
            >
              <TouchableOpacity
                style={[styles.userCountButton, userCount <= 1 && styles.userCountButtonDisabled]}
                onPress={() => handleUserCountChange(-1)}
                disabled={userCount <= 1}
              >
                <Ionicons
                  name="remove"
                  size={24}
                  color={userCount <= 1 ? subtitleColor : textColor}
                />
              </TouchableOpacity>
              <View style={styles.userCountValue}>
                <Text style={[styles.userCountNumber, { color: textColor }]}>{userCount}</Text>
                <Text style={[styles.userCountLabel, { color: subtitleColor }]}>
                  {userCount === 1 ? 'User' : 'Users'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.userCountButton, userCount >= 100 && styles.userCountButtonDisabled]}
                onPress={() => handleUserCountChange(1)}
                disabled={userCount >= 100}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={userCount >= 100 ? subtitleColor : textColor}
                />
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: subtitleColor }]}>SELECT A PLAN</Text>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.8}
              onPress={() => setSelectedPlan(plan)}
            >
              <View
                style={[
                  styles.planCard,
                  {
                    borderColor:
                      selectedPlan?.id === plan.id ? colors.primary : borderColor,
                    borderWidth: selectedPlan?.id === plan.id ? 2 : 1,
                  },
                ]}
              >
                <BlurView
                  intensity={15}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.planCardBlur, { backgroundColor: cardBgColor }]}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, { color: textColor }]}>
                        {plan.displayName}
                      </Text>
                      <Text style={[styles.planDescription, { color: subtitleColor }]}>
                        {plan.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        {
                          borderColor:
                            selectedPlan?.id === plan.id ? colors.primary : borderColor,
                        },
                      ]}
                    >
                      {selectedPlan?.id === plan.id && (
                        <View
                          style={[styles.radioButtonInner, { backgroundColor: colors.primary }]}
                        />
                      )}
                    </View>
                  </View>

                  <View style={styles.planPricing}>
                    <Text style={[styles.planPrice, { color: textColor }]}>
                      {formatINR(
                        billingCycle === 'MONTHLY'
                          ? plan.pricePerUserMonthlyINR
                          : plan.pricePerUserAnnualINR
                      )}
                    </Text>
                    <Text style={[styles.planPriceInterval, { color: subtitleColor }]}>
                      /user/{billingCycle === 'MONTHLY' ? 'month' : 'year'}
                    </Text>
                  </View>

                  {billingCycle === 'ANNUAL' && calculateSavings(plan) > 0 && (
                    <View style={styles.savingsContainer}>
                      <Ionicons name="pricetag" size={14} color="#22c55e" />
                      <Text style={styles.savingsText}>
                        Save {formatINR(calculateSavings(plan))} per year
                      </Text>
                    </View>
                  )}

                  <View style={[styles.divider, { backgroundColor: borderColor }]} />

                  <View style={styles.featuresPreview}>
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons name="checkmark" size={16} color="#22c55e" />
                        <Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
                      </View>
                    ))}
                    {plan.features.length > 3 && (
                      <Text style={[styles.moreFeatures, { color: colors.primary }]}>
                        +{plan.features.length - 3} more features
                      </Text>
                    )}
                  </View>

                  {plan.trialDays > 0 && (
                    <View style={styles.trialBadge}>
                      <Ionicons name="gift-outline" size={14} color="#f59e0b" />
                      <Text style={styles.trialBadgeText}>
                        {plan.trialDays}-day free trial
                      </Text>
                    </View>
                  )}
                </BlurView>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      {selectedPlan && (
        <View
          style={[
            styles.bottomCTA,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.95)',
              borderTopColor: borderColor,
            },
          ]}
        >
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, { color: subtitleColor }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: textColor }]}>
              {formatINR(calculatePrice(selectedPlan))}
              <Text style={[styles.totalInterval, { color: subtitleColor }]}>
                /{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              (isProcessing || isPaymentLoading) && styles.subscribeButtonDisabled,
            ]}
            onPress={handleSubscribe}
            disabled={isProcessing || isPaymentLoading}
          >
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              style={styles.subscribeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isProcessing || isPaymentLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="white" />
                  <Text style={styles.subscribeButtonText}>
                    {selectedPlan.trialDays > 0 ? 'Start Free Trial' : 'Subscribe Now'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerRight: {
    width: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: '#6366f1',
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    color: '#252525',
    fontSize: 10,
    fontWeight: '600',
  },
  userCountContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  userCountBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  userCountButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  userCountButtonDisabled: {
    opacity: 0.5,
  },
  userCountValue: {
    alignItems: 'center',
  },
  userCountNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  userCountLabel: {
    fontSize: 13,
  },
  planCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  planCardBlur: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    flex: 1,
    marginRight: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  planPriceInterval: {
    fontSize: 14,
    marginLeft: 4,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  savingsText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  featuresPreview: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  moreFeatures: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  trialBadgeText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  totalInterval: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  subscribeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  subscribeButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
});
