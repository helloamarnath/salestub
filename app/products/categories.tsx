import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useRBAC } from '@/hooks/use-rbac';
import { Colors, Palette } from '@/constants/theme';
import { AccessDenied } from '@/components/AccessDenied';
import {
  listAllProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  seedDefaultCategories,
  type ProductCategoryDetail,
} from '@/lib/api/products';

const NAME_MAX = 80;
const DESC_MAX = 240;

export default function ProductCategoriesScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const rbac = useRBAC();

  const [categories, setCategories] = useState<ProductCategoryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Editor state
  const [editing, setEditing] = useState<ProductCategoryDetail | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<ProductCategoryDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await listAllProductCategories(accessToken);
      if (res.success && res.data) {
        // Sort: active first, then alphabetically — matches typical settings UX
        const sorted = [...res.data].sort((a, b) => {
          const aActive = a.isActive !== false;
          const bActive = b.isActive !== false;
          if (aActive !== bActive) return aActive ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setCategories(sorted);
      } else {
        setError(res.error?.message || 'Failed to load categories');
      }
      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (!rbac.canRead('products')) {
    return <AccessDenied />;
  }

  const canMutate = rbac.canCreate('products') || rbac.canUpdate('products');

  const openCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setEditorVisible(true);
  };

  const openEdit = (cat: ProductCategoryDetail) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsActive(cat.isActive !== false);
    setEditorVisible(true);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Give the category a name.');
      return;
    }
    setSaving(true);
    const res = editing
      ? await updateProductCategory(accessToken, editing.id, {
          name: trimmedName,
          description: description.trim() || undefined,
          isActive,
        })
      : await createProductCategory(accessToken, {
          name: trimmedName,
          description: description.trim() || undefined,
          isActive,
        });
    setSaving(false);
    if (res.success && res.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditorVisible(false);
      setCategories((prev) => {
        const next = editing
          ? prev.map((c) => (c.id === editing.id ? res.data! : c))
          : [...prev, res.data!];
        return [...next].sort((a, b) => {
          const aA = a.isActive !== false;
          const bA = b.isActive !== false;
          if (aA !== bA) return aA ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Save failed', res.error?.message || 'Could not save category.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !pendingDelete) return;
    setDeleting(true);
    const res = await deleteProductCategory(accessToken, pendingDelete.id);
    setDeleting(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCategories((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      setPendingDelete(null);
    } else {
      Alert.alert('Delete failed', res.error?.message || 'Could not delete category.');
    }
  };

  const handleSeed = async () => {
    if (!accessToken) return;
    setSeeding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await seedDefaultCategories(accessToken);
    setSeeding(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Defaults added',
        `${res.data?.created ?? 0} default categor${(res.data?.created ?? 0) === 1 ? 'y was' : 'ies were'} created.`,
      );
      await fetchCategories();
    } else {
      Alert.alert('Failed', res.error?.message || 'Could not seed defaults.');
    }
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Categories</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {categories.length} total
          </Text>
        </View>
        {canMutate && (
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: colors.primary }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={22} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>

      {loading && categories.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && categories.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retry, { backgroundColor: colors.primary }]}
            onPress={() => fetchCategories()}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="layers-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No categories yet</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Create one manually, or seed a starter set.
          </Text>
          {canMutate && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor }]}
                onPress={handleSeed}
                disabled={seeding}
              >
                {seeding ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>Seed defaults</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={openCreate}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
                  Create category
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCategories(true)}
              tintColor={colors.primary}
            />
          }
        >
          {categories.map((cat) => {
            const inactive = cat.isActive === false;
            return (
              <View
                key={cat.id}
                style={[
                  styles.catCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: inactive ? 0.55 : 1,
                  },
                ]}
              >
                <View style={styles.catRow}>
                  <View style={[styles.catIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="layers-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catTitleRow}>
                      <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      {cat.isDefault && (
                        <View
                          style={[
                            styles.defaultPill,
                            { backgroundColor: `${Palette.amber}20` },
                          ]}
                        >
                          <Text style={[styles.defaultPillText, { color: Palette.amber }]}>
                            Default
                          </Text>
                        </View>
                      )}
                      {inactive && (
                        <View
                          style={[styles.defaultPill, { backgroundColor: 'rgba(156,163,175,0.2)' }]}
                        >
                          <Text style={[styles.defaultPillText, { color: '#9ca3af' }]}>
                            Inactive
                          </Text>
                        </View>
                      )}
                    </View>
                    {cat.description ? (
                      <Text
                        style={[styles.catDescription, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {cat.description}
                      </Text>
                    ) : null}
                    {cat.productCount != null && (
                      <Text style={[styles.catMeta, { color: colors.mutedForeground }]}>
                        {cat.productCount} product{cat.productCount === 1 ? '' : 's'}
                      </Text>
                    )}
                  </View>
                  {canMutate && (
                    <View style={styles.catActions}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: inputBg }]}
                        onPress={() => openEdit(cat)}
                      >
                        <Ionicons name="pencil" size={14} color={colors.foreground} />
                      </TouchableOpacity>
                      {rbac.canDelete('products') && (
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: `${Palette.red}10` }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPendingDelete(cat);
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color={Palette.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Editor modal */}
      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditorVisible(false)}
          >
            <Pressable
              style={[styles.modalSheet, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editing ? 'Edit category' : 'New category'}
                </Text>
                <TouchableOpacity onPress={() => setEditorVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={name}
                  onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
                  placeholder="e.g. Hardware"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="sentences"
                />
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  {name.length} / {NAME_MAX}
                </Text>

                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}
                >
                  Description
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.fieldInputMultiline,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={description}
                  onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
                  placeholder="Short description (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                />
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  {description.length} / {DESC_MAX}
                </Text>

                <View style={[styles.toggleRow, { marginTop: 16 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Active</Text>
                    <Text style={[styles.fieldHint, { color: colors.mutedForeground, marginTop: 0 }]}>
                      Inactive categories don't show up when creating products.
                    </Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: borderColor, true: Palette.emerald }}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.primary },
                    saving && { opacity: 0.6 },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                      {editing ? 'Save changes' : 'Create category'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <Pressable
          style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}
          onPress={() => setPendingDelete(null)}
        >
          <Pressable
            style={[styles.confirmCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              Delete category?
            </Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
              "{pendingDelete?.name}" will be removed.
              {pendingDelete?.productCount
                ? ` ${pendingDelete.productCount} product${pendingDelete.productCount === 1 ? '' : 's'} will become uncategorized.`
                : ''}
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={[styles.confirmCancel, { borderColor }]}
                onPress={() => setPendingDelete(null)}
                disabled={deleting}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDelete, { backgroundColor: Palette.red }]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '600' }}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyBody: { fontSize: 13, textAlign: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  /* Card */
  catCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  catName: { fontSize: 15, fontWeight: '700' },
  catDescription: { fontSize: 13, marginTop: 2 },
  catMeta: { fontSize: 11, marginTop: 4 },
  catActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* Buttons (empty state) */
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalBody: { paddingHorizontal: 20, paddingTop: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  fieldHint: { fontSize: 11, marginTop: 4 },

  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },

  /* Save button */
  saveBtn: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700' },

  /* Confirm */
  confirmCard: { borderRadius: 16, padding: 20, gap: 6 },
  confirmTitle: { fontSize: 16, fontWeight: '700' },
  confirmBody: { fontSize: 13, marginBottom: 12 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});
