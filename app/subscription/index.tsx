import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
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
  getOrganizationSubscription,
  cancelSubscription,
  reactivateSubscription,
} from '@/lib/api/subscription';
import {
  Subscription,
  SUBSCRIPTION_STATUS_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  BILLING_CYCLE_LABELS,
} from '@/types/subscription';
import { formatINR } from '@/hooks/use-razorpay';

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const cardBgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  const fetchSubscription = useCallback(async () => {
    if (!accessToken || !user?.orgId) return;

    try {
      const response = await getOrganizationSubscription(accessToken, user.orgId);
      if (response.success) {
        setSubscription(response.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, user?.orgId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSubscription();
  };

  const handleUpgrade = () => {
    router.push('/subscription/plans');
  };

  const handleCancel = () => {
    if (!subscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !user?.orgId) return;

            setIsCancelling(true);
            try {
              const response = await cancelSubscription(accessToken, user.orgId);
              if (response.success && response.data) {
                setSubscription(response.data);
                Alert.alert(
                  'Subscription Cancelled',
                  'Your subscription has been cancelled. You will continue to have access until the end of your current billing period.'
                );
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to cancel subscription');
              }
            } catch (error) {
              console.error('Failed to cancel subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async () => {
    if (!accessToken || !user?.orgId) return;

    setIsReactivating(true);
    try {
      const response = await reactivateSubscription(accessToken, user.orgId);
      if (response.success && response.data) {
        setSubscription(response.data);
        Alert.alert('Success', 'Your subscription has been reactivated.');
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      Alert.alert('Error', 'Failed to reactivate subscription. Please try again.');
    } finally {
      setIsReactivating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return null;
    const end = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: subtitleColor }]}>
            Loading subscription...
          </Text>
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
        <Text style={[styles.headerTitle, { color: textColor }]}>Subscription</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {subscription ? (
          <>
            {/* Current Plan Card */}
            <View style={styles.section}>
              <View style={[styles.card, { borderColor }]}>
                <BlurView
                  intensity={15}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.cardBlur, { backgroundColor: cardBgColor }]}
                >
                  {/* Plan Header */}
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={[styles.planName, { color: textColor }]}>
                        {subscription.plan.displayName}
                      </Text>
                      <View style={styles.statusBadgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${SUBSCRIPTION_STATUS_COLORS[subscription.status]}20` },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: SUBSCRIPTION_STATUS_COLORS[subscription.status] },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: SUBSCRIPTION_STATUS_COLORS[subscription.status] },
                            ]}
                          >
                            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                          </Text>
                        </View>
                        {subscription.cancelAtPeriodEnd && (
                          <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Text style={[styles.statusText, { color: '#ef4444' }]}>
                              Cancels Soon
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={[styles.priceAmount, { color: textColor }]}>
                        {formatINR(
                          subscription.billingCycle === 'MONTHLY'
                            ? subscription.plan.pricePerUserMonthlyINR
                            : subscription.plan.pricePerUserAnnualINR
                        )}
                      </Text>
                      <Text style={[styles.priceInterval, { color: subtitleColor }]}>
                        /user/{subscription.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                      </Text>
                    </View>
                  </View>

                  {/* Plan Details */}
                  <View style={[styles.divider, { backgroundColor: borderColor }]} />

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Ionicons name="people-outline" size={20} color={subtitleColor} />
                      <Text style={[styles.detailLabel, { color: subtitleColor }]}>Users</Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {subscription.userCount}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={20} color={subtitleColor} />
                      <Text style={[styles.detailLabel, { color: subtitleColor }]}>Billing</Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {BILLING_CYCLE_LABELS[subscription.billingCycle]}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={20} color={subtitleColor} />
                      <Text style={[styles.detailLabel, { color: subtitleColor }]}>Renews</Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {formatDate(subscription.currentPeriodEnd)}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons name="hourglass-outline" size={20} color={subtitleColor} />
                      <Text style={[styles.detailLabel, { color: subtitleColor }]}>Days Left</Text>
                      <Text style={[styles.detailValue, { color: textColor }]}>
                        {getDaysRemaining()}
                      </Text>
                    </View>
                  </View>

                  {/* Trial Info */}
                  {subscription.status === 'TRIAL' && subscription.trialEnd && (
                    <>
                      <View style={[styles.divider, { backgroundColor: borderColor }]} />
                      <View style={styles.trialInfo}>
                        <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
                        <Text style={[styles.trialText, { color: subtitleColor }]}>
                          Your trial ends on {formatDate(subscription.trialEnd)}. Upgrade now to
                          continue using all features.
                        </Text>
                      </View>
                    </>
                  )}
                </BlurView>
              </View>
            </View>

            {/* Features */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: subtitleColor }]}>INCLUDED FEATURES</Text>
              <View style={[styles.card, { borderColor }]}>
                <BlurView
                  intensity={15}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.cardBlur, { backgroundColor: cardBgColor }]}
                >
                  {subscription.plan.features.map((feature, index) => (
                    <View
                      key={index}
                      style={[
                        styles.featureItem,
                        index !== subscription.plan.features.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: borderColor,
                        },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      <Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
                    </View>
                  ))}
                </BlurView>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  style={styles.upgradeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="rocket-outline" size={20} color="white" />
                  <Text style={styles.upgradeButtonText}>
                    {subscription.status === 'TRIAL' ? 'Upgrade Now' : 'Change Plan'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {subscription.cancelAtPeriodEnd ? (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor }]}
                  onPress={handleReactivate}
                  disabled={isReactivating}
                >
                  {isReactivating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                      <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                        Reactivate Subscription
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                subscription.status !== 'TRIAL' && (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor }]}
                    onPress={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                        <Text style={[styles.secondaryButtonText, { color: '#ef4444' }]}>
                          Cancel Subscription
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )
              )}
            </View>
          </>
        ) : (
          /* No Subscription */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="card-outline" size={64} color={subtitleColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Active Subscription</Text>
            <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
              Choose a plan to unlock all features and grow your business.
            </Text>
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.upgradeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="rocket-outline" size={20} color="white" />
                <Text style={styles.upgradeButtonText}>View Plans</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardBlur: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceInterval: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '45%',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  trialText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
