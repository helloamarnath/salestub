import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getInvoices } from '@/lib/api/invoices';
import type { Invoice, InvoiceStatus } from '@/types/invoice';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/types/invoice';

// Filter tabs
interface FilterTab {
  id: string;
  label: string;
  status?: InvoiceStatus;
  color: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All', color: '#6b7280' },
  { id: 'draft', label: 'Draft', status: 'DRAFT', color: '#6b7280' },
  { id: 'sent', label: 'Sent', status: 'SENT', color: Colors.light.primary },
  { id: 'paid', label: 'Paid', status: 'PAID', color: '#22c55e' },
  { id: 'overdue', label: 'Overdue', status: 'OVERDUE', color: '#ef4444' },
  { id: 'partial', label: 'Partial', status: 'PARTIALLY_PAID', color: '#f59e0b' },
  { id: 'cancelled', label: 'Cancelled', status: 'CANCELLED', color: '#6b7280' },
];

// Invoice card
function InvoiceCard({
  invoice,
  isDark,
  onPress,
}: {
  invoice: Invoice;
  isDark: boolean;
  onPress: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const statusColor = INVOICE_STATUS_COLORS[invoice.status] || '#6b7280';

  const formatAmount = (amount: number | string, symbol?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol || '₹'}${(num / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const contactName = invoice.contact
    ? `${invoice.contact.firstName} ${invoice.contact.lastName || ''}`.trim()
    : '';

  const amountDue = typeof invoice.amountDue === 'string' ? parseFloat(invoice.amountDue) : (invoice.amountDue || 0);
  const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : (invoice.total || 0);
  const showAmountDue = amountDue > 0 && amountDue !== total;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardNumber, { color: colors.primary }]}>#{invoice.invoiceNumber}</Text>
          {invoice.subject && (
            <Text style={[styles.cardSubject, { color: textColor }]} numberOfLines={1}>
              {invoice.subject}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Text>
        </View>
      </View>

      {contactName ? (
        <View style={styles.cardContactRow}>
          <Ionicons name="person-outline" size={13} color={subtitleColor} />
          <Text style={[styles.cardContactText, { color: subtitleColor }]} numberOfLines={1}>
            {contactName}
            {invoice.contact?.companyName ? ` · ${invoice.contact.companyName}` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={[styles.cardDate, { color: subtitleColor }]}>
          Due: {formatDate(invoice.dueDate)}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.cardAmount, { color: textColor }]}>
            {formatAmount(invoice.total, invoice.currency?.symbol)}
          </Text>
          {showAmountDue && (
            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '500' }}>
              Due: {formatAmount(invoice.amountDue, invoice.currency?.symbol)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Skeleton
function InvoiceSkeleton({ isDark }: { isDark: boolean }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const itemBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeleton, { opacity, backgroundColor: bgColor }]}>
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { backgroundColor: itemBg, width: '40%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: itemBg, width: '70%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: itemBg, width: '50%' }]} />
      </View>
    </Animated.View>
  );
}

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Theme colors
  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const fetchInvoices = useCallback(
    async (pageNum = 1, refresh = false) => {
      if (!accessToken) return;

      if (pageNum === 1) {
        refresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const filter = FILTER_TABS.find((f) => f.id === activeFilter);

      const response = await getInvoices(accessToken, {
        page: pageNum,
        limit: 20,
        status: filter?.status,
        search: searchQuery || undefined,
      });

      if (response.success && response.data) {
        const newInvoices = response.data.data || [];
        if (pageNum === 1) {
          setInvoices(newInvoices);
        } else {
          setInvoices((prev) => [...prev, ...newInvoices]);
        }
        setTotalCount(response.data.pagination?.total || 0);
        setHasMore(
          (response.data.pagination?.page || 1) < (response.data.pagination?.totalPages || 1)
        );
        setPage(pageNum);
      } else {
        setError(response.error?.message || 'Failed to load invoices');
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [accessToken, activeFilter, searchQuery]
  );

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => fetchInvoices(1, true), [fetchInvoices]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchInvoices(page + 1);
    }
  }, [loadingMore, hasMore, page, fetchInvoices]);

  // Client-side search filter
  const filteredInvoices = searchQuery
    ? invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.contact?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.contact?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.contact?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : invoices;

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={{ marginRight: 10 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: textColor }]}>Invoices</Text>
            <Text style={[styles.headerSubtitle, { color: subtitleColor }]}>
              {totalCount} total
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => router.push('/invoices/create' as any)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: searchBg, borderColor: searchBorder }]}>
          <Ionicons name="search" size={18} color={placeholderColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search invoices..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={placeholderColor} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_TABS.map((filter) => {
            const active = activeFilter === filter.id;
            const tabColor = filter.color;
            const inactiveBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
            const inactiveBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
            const inactiveTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';

            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? tabColor : inactiveBg,
                    borderColor: active ? tabColor : inactiveBorder,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(filter.id);
                }}
                activeOpacity={0.7}
              >
                {!active && <View style={[styles.filterTabDot, { backgroundColor: tabColor }]} />}
                <Text style={[styles.filterTabLabel, { color: active ? 'white' : inactiveTextColor }]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <InvoiceSkeleton key={i} isDark={isDark} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={[styles.emptyTitle, { color: textColor }]}>Something went wrong</Text>
          <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => fetchInvoices(1)}>
            <Ionicons name="refresh" size={18} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item}
              isDark={isDark}
              onPress={() => router.push(`/invoices/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColor} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                {searchQuery ? 'No invoices found' : 'No invoices yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
                {searchQuery ? 'Try adjusting your search' : 'Invoices will appear here when created'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterScroll: { marginBottom: 4 },
  filterScrollContent: { gap: 8, paddingRight: 16 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterTabDot: { width: 6, height: 6, borderRadius: 3 },
  filterTabLabel: { fontSize: 13, fontWeight: '600' },
  loadingContainer: { padding: 16, gap: 12 },
  listContent: { padding: 16, gap: 10 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardNumber: { fontSize: 14, fontWeight: '700' },
  cardSubject: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardContactRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardContactText: { fontSize: 13, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  cardDate: { fontSize: 12 },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  skeleton: {
    padding: 14,
    borderRadius: 12,
  },
  skeletonContent: { gap: 8 },
  skeletonLine: { height: 14, borderRadius: 4 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  retryButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
