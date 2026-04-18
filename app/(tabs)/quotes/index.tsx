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
import { getQuotes } from '@/lib/api/quotes';
import type { Quote, QuoteStatus } from '@/types/quote';
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from '@/types/quote';

// Filter tabs
interface FilterTab {
  id: string;
  label: string;
  status?: QuoteStatus;
  color: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All', color: '#6b7280' },
  { id: 'draft', label: 'Draft', status: 'DRAFT', color: '#6b7280' },
  { id: 'sent', label: 'Sent', status: 'SENT', color: Colors.light.primary },
  { id: 'approved', label: 'Approved', status: 'APPROVED', color: '#22c55e' },
  { id: 'rejected', label: 'Rejected', status: 'REJECTED', color: '#ef4444' },
  { id: 'expired', label: 'Expired', status: 'EXPIRED', color: '#f59e0b' },
  { id: 'cancelled', label: 'Cancelled', status: 'CANCELLED', color: '#6b7280' },
];

// Quote card component
function QuoteCard({
  quote,
  isDark,
  onPress,
}: {
  quote: Quote;
  isDark: boolean;
  onPress: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const statusColor = QUOTE_STATUS_COLORS[quote.status] || '#6b7280';

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

  const contactName = quote.contact
    ? `${quote.contact.firstName} ${quote.contact.lastName || ''}`.trim()
    : '';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardNumber, { color: colors.primary }]}>#{quote.quoteNumber}</Text>
          {quote.subject && (
            <Text style={[styles.cardSubject, { color: textColor }]} numberOfLines={1}>
              {quote.subject}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {QUOTE_STATUS_LABELS[quote.status]}
          </Text>
        </View>
      </View>

      {contactName ? (
        <View style={styles.cardContactRow}>
          <Ionicons name="person-outline" size={13} color={subtitleColor} />
          <Text style={[styles.cardContactText, { color: subtitleColor }]} numberOfLines={1}>
            {contactName}
            {quote.contact?.companyName ? ` · ${quote.contact.companyName}` : ''}
          </Text>
        </View>
      ) : null}

      {quote.lead && (
        <View style={styles.cardContactRow}>
          <Ionicons name="briefcase-outline" size={13} color={subtitleColor} />
          <Text style={[styles.cardContactText, { color: subtitleColor }]} numberOfLines={1}>
            {quote.lead.title}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={[styles.cardDate, { color: subtitleColor }]}>
          {formatDate(quote.createdAt)}
          {quote.validUntil ? ` · Valid till ${formatDate(quote.validUntil)}` : ''}
        </Text>
        <Text style={[styles.cardAmount, { color: textColor }]}>
          {formatAmount(quote.total, quote.currency?.symbol)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Loading skeleton
function QuoteSkeleton({ isDark }: { isDark: boolean }) {
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

export default function QuotesScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // State
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme colors
  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  // Fetch quotes
  const fetchQuotes = useCallback(
    async (pageNum = 1, refresh = false) => {
      if (!accessToken) return;

      if (pageNum === 1) {
        refresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const filter = FILTER_TABS.find((f) => f.id === activeFilter);

      const response = await getQuotes(accessToken, {
        page: pageNum,
        limit: 20,
        status: filter?.status,
      });

      if (response.success && response.data) {
        const newQuotes = response.data.data || [];
        if (pageNum === 1) {
          setQuotes(newQuotes);
        } else {
          setQuotes((prev) => [...prev, ...newQuotes]);
        }
        setTotalCount(response.data.pagination?.total || 0);
        setHasMore(
          (response.data.pagination?.page || 1) < (response.data.pagination?.totalPages || 1)
        );
        setPage(pageNum);
      } else {
        setError(response.error?.message || 'Failed to load quotes');
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [accessToken, activeFilter]
  );

  useEffect(() => {
    fetchQuotes(1);
  }, [fetchQuotes]);

  const onRefresh = useCallback(() => fetchQuotes(1, true), [fetchQuotes]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchQuotes(page + 1);
    }
  }, [loadingMore, hasMore, page, fetchQuotes]);

  // Search filter (client-side)
  const filteredQuotes = searchQuery
    ? quotes.filter(
        (q) =>
          q.quoteNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.contact?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.contact?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.contact?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quotes;

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Quotes</Text>
            <Text style={[styles.headerSubtitle, { color: subtitleColor }]}>
              {totalCount} total
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => router.push('/(tabs)/quotes/create' as any)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: searchBg, borderColor: searchBorder }]}>
          <Ionicons name="search" size={18} color={placeholderColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search quotes..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={handleSearch}
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
            <QuoteSkeleton key={i} isDark={isDark} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={[styles.emptyTitle, { color: textColor }]}>Something went wrong</Text>
          <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => fetchQuotes(1)}>
            <Ionicons name="refresh" size={18} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredQuotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuoteCard
              quote={item}
              isDark={isDark}
              onPress={() => router.push(`/quotes-detail/${item.id}` as any)}
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
              <Ionicons name="document-text-outline" size={64} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                {searchQuery ? 'No quotes found' : 'No quotes yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
                {searchQuery ? 'Try adjusting your search' : 'Quotes will appear here when created'}
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
    alignItems: 'center',
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
