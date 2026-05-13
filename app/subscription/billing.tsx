import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import { useRazorpay } from '@/hooks/use-razorpay';
import {
  createInvoicePaymentOrder,
  getSubscriptionInvoices,
  verifyInvoicePayment,
  type SubscriptionInvoiceListItem,
} from '@/lib/api/subscription';

const PAYABLE_STATUSES = new Set<SubscriptionInvoiceListItem['status']>([
  'PENDING',
  'FAILED',
]);

const STATUS_COLORS: Record<SubscriptionInvoiceListItem['status'], string> = {
  PAID: Palette.emerald,
  FAILED: Palette.red,
  PENDING: Palette.amber,
  VOID: '#9ca3af',
};

const STATUS_LABELS: Record<SubscriptionInvoiceListItem['status'], string> = {
  PAID: 'Paid',
  FAILED: 'Failed',
  PENDING: 'Unpaid',
  VOID: 'Void',
};

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (currency === 'INR') return `₹${n.toLocaleString('en-IN')}`;
  return `${currency} ${n.toFixed(2)}`;
}

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function SubscriptionBillingScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const colors = Colors[resolvedTheme];
  const { accessToken, user } = useAuth();
  const { openOrderCheckout } = useRazorpay();
  const { invoice: highlightInvoiceId } = useLocalSearchParams<{
    invoice?: string;
  }>();

  const [invoices, setInvoices] = useState<SubscriptionInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await getSubscriptionInvoices(accessToken);
      if (res.data) setInvoices(res.data);
    } catch (err) {
      console.warn('Failed to load subscription invoices', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePayNow = useCallback(
    async (invoice: SubscriptionInvoiceListItem) => {
      if (!accessToken || payingInvoiceId) return;
      Haptics.selectionAsync();
      setPayingInvoiceId(invoice.id);
      try {
        const orderRes = await createInvoicePaymentOrder(
          accessToken,
          invoice.id,
          'razorpay'
        );
        if (!orderRes.data) {
          throw new Error(orderRes.error?.message || 'Could not create payment order');
        }

        const result = await openOrderCheckout(
          {
            razorpayKeyId: orderRes.data.razorpayKeyId,
            orderId: orderRes.data.orderId,
            amount: orderRes.data.amount,
            currency: orderRes.data.currency,
            invoiceNumber: orderRes.data.invoiceNumber,
          },
          {
            email: user?.email,
            name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
          }
        );

        if (!result) {
          // user cancelled or error already alerted
          return;
        }

        const verifyRes = await verifyInvoicePayment(accessToken, invoice.id, {
          razorpayOrderId:
            result.razorpay_order_id ?? orderRes.data.orderId,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });

        if (verifyRes.data?.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await load();
        } else {
          throw new Error(verifyRes.error?.message || 'Payment verification failed');
        }
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.warn('Pay Now failed', err);
      } finally {
        setPayingInvoiceId(null);
      }
    },
    [accessToken, openOrderCheckout, payingInvoiceId, user, load]
  );

  const renderItem = useCallback(
    ({ item }: { item: SubscriptionInvoiceListItem }) => {
      const isPayable = PAYABLE_STATUSES.has(item.status);
      const isPaying = payingInvoiceId === item.id;
      const isHighlighted = highlightInvoiceId === item.id;
      const statusColor = STATUS_COLORS[item.status];

      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: isHighlighted ? Palette.indigo : colors.border,
              borderWidth: isHighlighted ? 2 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.invoiceNumber, { color: colors.text }]}>
                {item.invoiceNumber}
              </Text>
              <Text style={[styles.planName, { color: colors.secondaryForeground }]}>
                {item.planName}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}
            >
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>

          <Text style={[styles.period, { color: colors.secondaryForeground }]}>
            {formatPeriod(item.periodStart, item.periodEnd)}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatMoney(item.amount, item.currency)}
            </Text>
            {isPayable ? (
              <TouchableOpacity
                style={[
                  styles.payButton,
                  { backgroundColor: Palette.indigo, opacity: isPaying ? 0.6 : 1 },
                ]}
                onPress={() => handlePayNow(item)}
                disabled={isPaying || !!payingInvoiceId}
              >
                {isPaying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={16} color="#fff" />
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : item.status === 'PAID' && item.paidAt ? (
              <Text style={[styles.paidAt, { color: colors.secondaryForeground }]}>
                Paid {new Date(item.paidAt).toLocaleDateString('en-IN')}
              </Text>
            ) : null}
          </View>
        </View>
      );
    },
    [colors, handlePayNow, highlightInvoiceId, payingInvoiceId]
  );

  const unpaidCount = invoices.filter((i) => PAYABLE_STATUSES.has(i.status)).length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Billing</Text>
        <View style={{ width: 26 }} />
      </View>

      {unpaidCount > 0 && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: Palette.amber + '22',
              borderColor: Palette.amber,
            },
          ]}
        >
          <Ionicons name="alert-circle" size={18} color={Palette.amber} />
          <Text style={[styles.bannerText, { color: colors.text }]}>
            You have {unpaidCount} unpaid invoice{unpaidCount > 1 ? 's' : ''}. Pay
            to keep your subscription active.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.indigo} />
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-outline" size={48} color={colors.secondaryForeground} />
          <Text style={[styles.emptyText, { color: colors.secondaryForeground }]}>
            No invoices yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.text}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, marginTop: 8 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceNumber: { fontSize: 15, fontWeight: '600' },
  planName: { fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  period: { fontSize: 12, marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: { fontSize: 18, fontWeight: '700' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  payButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  paidAt: { fontSize: 12 },
});
