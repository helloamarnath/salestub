import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getProduct, deleteProduct } from '@/lib/api/products';
import type { Product } from '@/types/product';
import { formatProductPrice } from '@/types/product';

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Theme colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  // Fetch product
  const fetchProduct = useCallback(async () => {
    if (!accessToken || !id) return;

    setLoading(true);
    setError(null);

    const response = await getProduct(accessToken, id);

    if (response.success && response.data) {
      setProduct(response.data);
    } else {
      setError(response.error?.message || 'Failed to load product');
    }

    setLoading(false);
    setRefreshing(false);
  }, [accessToken, id]);

  // Initial load
  useEffect(() => {
    fetchProduct();
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProduct();
  }, [fetchProduct]);

  // Back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Edit
  const handleEdit = () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/products/create?editId=${product.id}`);
  };

  // Delete
  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const response = await deleteProduct(accessToken, product.id);
            if (response.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete product');
            }
            setDeleting(false);
          },
        },
      ]
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[resolvedTheme].primary} />
        </View>
      </View>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: textColor }]}>Failed to load product</Text>
          <Text style={[styles.errorMessage, { color: subtitleColor }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProduct}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currencySymbol = product.currency?.symbol || '₹';

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: borderColor }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={handleEdit}
            >
              <Ionicons name="pencil" size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors[resolvedTheme].primary}
          />
        }
      >
        {/* Product Image */}
        <View style={[styles.imageContainer, { backgroundColor: cardBg }]}>
          {product.primaryImage?.imageUrl ? (
            <Image
              source={{ uri: product.primaryImage.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={64} color={subtitleColor} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={[styles.productName, { color: textColor }]}>{product.name}</Text>
            {!product.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>

          {product.sku && (
            <Text style={[styles.productSku, { color: subtitleColor }]}>SKU: {product.sku}</Text>
          )}

          <View style={styles.productMeta}>
            {product.price !== undefined && product.price > 0 && (
              <Text style={styles.productPrice}>
                {formatProductPrice(product.price, currencySymbol)}
              </Text>
            )}
            {product.category && (
              <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }]}>
                <Text style={styles.categoryText}>{product.category.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {product.description && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: subtitleColor }]}>Description</Text>
            <Text style={[styles.description, { color: textColor }]}>{product.description}</Text>
          </View>
        )}

        {/* Owner Section */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: subtitleColor }]}>Owner</Text>
          <View style={styles.ownerCard}>
            <View style={[styles.ownerAvatar, { backgroundColor: '#8b5cf6' }]}>
              <Text style={styles.ownerAvatarText}>
                {product.owner.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.ownerName, { color: textColor }]}>{product.owner.userName}</Text>
              <Text style={[styles.ownerEmail, { color: subtitleColor }]}>{product.owner.userEmail}</Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: subtitleColor }]}>Details</Text>

          <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.infoLabel, { color: subtitleColor }]}>Status</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: product.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: product.isActive ? '#22c55e' : '#ef4444' }
              ]}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {product.currency && (
            <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
              <Text style={[styles.infoLabel, { color: subtitleColor }]}>Currency</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {product.currency.name} ({product.currency.symbol})
              </Text>
            </View>
          )}

          <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.infoLabel, { color: subtitleColor }]}>Activities</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{product.activitiesCount || 0}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.infoLabel, { color: subtitleColor }]}>Created</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{formatDate(product.createdAt)}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoLabel, { color: subtitleColor }]}>Updated</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{formatDate(product.updatedAt)}</Text>
          </View>
        </View>

        {/* Additional Images */}
        {product.images && product.images.length > 1 && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: subtitleColor }]}>
              Images ({product.images.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {product.images.map((image) => (
                <View key={image.id} style={[styles.thumbnailContainer, { borderColor }]}>
                  <Image
                    source={{ uri: image.thumbnailUrl || image.imageUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  {image.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Ionicons name="star" size={10} color="white" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  productImage: {
    width: '100%',
    height: 250,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    marginBottom: 20,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inactiveBadgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 14,
    marginTop: 6,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22c55e',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ownerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imagesScroll: {
    marginTop: 4,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
