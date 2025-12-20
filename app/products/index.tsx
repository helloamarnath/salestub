import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getProducts, deleteProduct } from '@/lib/api/products';
import type { Product, ProductFilters } from '@/types/product';
import { formatProductPrice } from '@/types/product';

// Product Card Component
function ProductCard({
  product,
  isDark,
  onPress,
  onDelete,
}: {
  product: Product;
  isDark: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'white';
  const currencySymbol = product.currency?.symbol || '₹';

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.productCard, { backgroundColor: cardBg, borderColor }]}>
        {/* Product Image or Placeholder */}
        <View style={[styles.productImage, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          {product.primaryImage?.thumbnailUrl ? (
            <Animated.Image
              source={{ uri: product.primaryImage.thumbnailUrl }}
              style={styles.productImageContent}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="cube-outline" size={28} color={subtitleColor} />
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={[styles.productName, { color: textColor }]} numberOfLines={1}>
              {product.name}
            </Text>
            {!product.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>

          {product.sku && (
            <Text style={[styles.productSku, { color: subtitleColor }]} numberOfLines={1}>
              SKU: {product.sku}
            </Text>
          )}

          <View style={styles.productMeta}>
            {product.price !== undefined && product.price > 0 && (
              <Text style={[styles.productPrice, { color: '#22c55e' }]}>
                {formatProductPrice(product.price, currencySymbol)}
              </Text>
            )}
            {product.category && (
              <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }]}>
                <Text style={[styles.categoryText, { color: '#3b82f6' }]}>
                  {product.category.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]}
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Loading Skeleton
function ProductSkeleton({ isDark }: { isDark: boolean }) {
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
      <View style={[styles.skeletonImage, { backgroundColor: itemBg }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { backgroundColor: itemBg }]} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: itemBg }]} />
      </View>
    </Animated.View>
  );
}

// Empty State
function EmptyState({ isDark, searchQuery }: { isDark: boolean; searchQuery: string }) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const iconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';

  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={searchQuery ? 'search-outline' : 'cube-outline'}
        size={64}
        color={iconColor}
      />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        {searchQuery ? 'No products found' : 'No products yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
        {searchQuery
          ? 'Try adjusting your search'
          : 'Create your first product to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/products/create')}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.emptyButtonText}>Add Product</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  // Fetch products
  const fetchProducts = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      if (!accessToken) return;

      if (pageNum === 1) {
        if (!isRefresh) setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const filters: ProductFilters = {
        page: pageNum,
        limit: 20,
        search: searchQuery || undefined,
      };

      const response = await getProducts(accessToken, filters);

      if (response.success && response.data) {
        const { data, meta } = response.data;
        const newProducts = data || [];
        if (pageNum === 1) {
          setProducts(newProducts);
          // Set total count from meta or fallback to data length
          setTotalCount(meta?.total ?? newProducts.length);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }
        if (meta) {
          setHasMore(meta.page < meta.totalPages);
          setPage(meta.page);
          setTotalCount(meta.total);
        } else {
          setHasMore(false);
        }
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [accessToken, searchQuery]
  );

  // Reload on screen focus (handles create/edit returns)
  useFocusEffect(
    useCallback(() => {
      fetchProducts(1);
    }, [fetchProducts])
  );

  // Search effect with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchProducts(1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, true);
  }, [fetchProducts]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchProducts(page + 1);
    }
  }, [loadingMore, hasMore, loading, page, fetchProducts]);

  // Delete handler
  const handleDelete = async (productId: string) => {
    const response = await deleteProduct(accessToken, productId);
    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setTotalCount((prev) => prev - 1);
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to delete product');
    }
  };

  // Create handler
  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/products/create');
  };

  // Render product item
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        isDark={isDark}
        onPress={() => router.push(`/products/${item.id}`)}
        onDelete={() => handleDelete(item.id)}
      />
    ),
    [isDark, accessToken]
  );

  // List footer
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerContent}>
          {/* Title Row with Back Button */}
          <View style={styles.titleRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <View style={styles.titleContent}>
              <Text style={[styles.title, { color: textColor }]}>Products</Text>
              {!loading && (
                <Text style={[styles.subtitle, { color: subtitleColor }]}>
                  {totalCount} product{totalCount !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: searchBg, borderColor: searchBorder }]}>
            <Ionicons name="search-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search products..."
              placeholderTextColor={placeholderColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={placeholderColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <ProductSkeleton key={i} isDark={isDark} />
          ))}
        </View>
      ) : products.length === 0 ? (
        <EmptyState isDark={isDark} searchQuery={searchQuery} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    padding: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImageContent: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 13,
    marginTop: 2,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 20,
    gap: 10,
  },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  skeletonImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: '60%',
    height: 10,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
