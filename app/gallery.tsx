import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import {
  listGalleryFiles,
  getGalleryStats,
  getGalleryPreviewUrl,
  deleteGalleryFile,
  bulkDeleteGalleryFiles,
  uploadGalleryFile,
} from '@/lib/api/gallery';
import type {
  OrgFile,
  GalleryStats,
  GalleryListFilters,
} from '@/types/gallery';
import {
  formatBytes,
  getFileIcon,
  summarizeUsage,
} from '@/types/gallery';

type FilterChip = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  fileType?: string; // MIME substring; undefined for "All"
};

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'images', label: 'Images', icon: 'image-outline', fileType: 'image' },
  { id: 'pdf', label: 'PDF', icon: 'document-text-outline', fileType: 'pdf' },
  { id: 'docs', label: 'Documents', icon: 'document-outline', fileType: 'word' },
  { id: 'sheets', label: 'Sheets', icon: 'grid-outline', fileType: 'sheet' },
];

type SortKey = 'createdAt' | 'fileName' | 'fileSize';
const SORT_LABELS: Record<SortKey, string> = {
  createdAt: 'Recent',
  fileName: 'Name (A→Z)',
  fileSize: 'Largest',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function GalleryScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [files, setFiles] = useState<OrgFile[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeChip, setActiveChip] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    const res = await getGalleryStats(accessToken);
    if (res.success && res.data) setStats(res.data);
  }, [accessToken]);

  const fetchFiles = useCallback(
    async (pageNum: number, opts: { silent?: boolean } = {}) => {
      if (!accessToken) return;
      if (!opts.silent && pageNum === 1) setLoading(true);
      setError(null);
      const chip = FILTER_CHIPS.find((c) => c.id === activeChip);
      const filters: GalleryListFilters = {
        page: pageNum,
        limit: 30,
        search: debouncedSearch || undefined,
        fileType: chip?.fileType,
        sortBy,
        sortOrder: sortBy === 'fileName' ? 'asc' : 'desc',
      };
      const res = await listGalleryFiles(accessToken, filters);
      if (res.success && res.data) {
        const items = res.data.data || [];
        setFiles((prev) => (pageNum === 1 ? items : [...prev, ...items]));
        setHasMore(pageNum < res.data.totalPages);
      } else if (!opts.silent) {
        setError(res.error?.message || 'Failed to load files');
      }
      if (!opts.silent && pageNum === 1) setLoading(false);
      setRefreshing(false);
    },
    [accessToken, activeChip, debouncedSearch, sortBy],
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    fetchFiles(1);
  }, [activeChip, debouncedSearch, sortBy, fetchFiles]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLoadMore = () => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    fetchFiles(next);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchFiles(1);
    fetchStats();
  };

  // ----- Selection mode -----
  const enterSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const exitSelection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  // ----- Single delete -----
  const handleDelete = (file: OrgFile) => {
    if (!accessToken) return;
    const usageNote =
      file.usage && file.usage.length > 0
        ? `\n\nThis file is attached to ${file.usage.length} record${file.usage.length === 1 ? '' : 's'} — those attachments will be removed too.`
        : '';
    Alert.alert(
      'Delete file?',
      `"${file.fileName}" (${formatBytes(file.fileSize)}) will be permanently deleted.${usageNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSingleDeleteId(file.id);
            const res = await deleteGalleryFile(accessToken, file.id);
            setSingleDeleteId(null);
            if (res.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setFiles((prev) => prev.filter((f) => f.id !== file.id));
              fetchStats();
            } else {
              Alert.alert('Delete failed', res.error?.message || 'Could not delete file.');
            }
          },
        },
      ],
    );
  };

  const handleBulkDelete = () => {
    if (!accessToken || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    Alert.alert(
      `Delete ${ids.length} file${ids.length === 1 ? '' : 's'}?`,
      'All entity attachments referencing these files will be removed too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkDeleting(true);
            const res = await bulkDeleteGalleryFiles(accessToken, ids);
            setBulkDeleting(false);
            if (res.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
              setSelectionMode(false);
              setSelectedIds(new Set());
              fetchStats();
            } else {
              Alert.alert('Delete failed', res.error?.message || 'Could not delete files.');
            }
          },
        },
      ],
    );
  };

  // ----- Preview / open -----
  const handlePreview = async (file: OrgFile) => {
    if (selectionMode) {
      toggleSelected(file.id);
      return;
    }
    if (!accessToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await getGalleryPreviewUrl(accessToken, file.id);
    if (res.success && res.data?.url) {
      WebBrowser.openBrowserAsync(res.data.url);
    } else {
      Alert.alert('Preview failed', res.error?.message || 'Could not get preview URL.');
    }
  };

  // ----- Upload -----
  const inferMime = (uri: string, fallback = 'application/octet-stream') => {
    const ext = uri.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      mp3: 'audio/mpeg', mp4: 'video/mp4', txt: 'text/plain', csv: 'text/csv',
    };
    return map[ext] || fallback;
  };

  const sendUpload = async (file: { uri: string; name: string; type: string }) => {
    if (!accessToken) return;
    setUploadOpen(false);
    setUploading(true);
    const res = await uploadGalleryFile(accessToken, file);
    setUploading(false);
    if (res.success && res.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Reload page 1 so the new file appears at the top (sorted by createdAt desc)
      setPage(1);
      fetchFiles(1);
      fetchStats();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload failed', res.error?.message || 'Could not upload file.');
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setUploadOpen(false);
      Alert.alert('Permission required', 'Allow photo library access to upload images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]) {
      setUploadOpen(false);
      return;
    }
    const asset = res.assets[0];
    if (stats && asset.fileSize != null && asset.fileSize > stats.maxFileSizeBytes) {
      Alert.alert('Too large', `Max file size is ${stats.formattedMaxFileSize}.`);
      setUploadOpen(false);
      return;
    }
    await sendUpload({
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      type: asset.mimeType || inferMime(asset.uri, 'image/jpeg'),
    });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setUploadOpen(false);
      Alert.alert('Permission required', 'Allow camera access to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]) {
      setUploadOpen(false);
      return;
    }
    const asset = res.assets[0];
    await sendUpload({
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) {
      setUploadOpen(false);
      return;
    }
    const asset = res.assets[0];
    if (stats && asset.size != null && asset.size > stats.maxFileSizeBytes) {
      Alert.alert('Too large', `Max file size is ${stats.formattedMaxFileSize}.`);
      setUploadOpen(false);
      return;
    }
    await sendUpload({
      uri: asset.uri,
      name: asset.name || `file-${Date.now()}`,
      type: asset.mimeType || inferMime(asset.uri),
    });
  };

  // ----- Render -----
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: colors.secondary }]}
            onPress={() => (selectionMode ? exitSelection() : router.back())}
          >
            <Ionicons
              name={selectionMode ? 'close' : 'chevron-back'}
              size={22}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {selectionMode ? `${selectedIds.size} selected` : 'Gallery'}
            </Text>
            {!selectionMode && stats && (
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {stats.formattedUsed} of {stats.formattedQuota}
                {stats.fileCount != null ? ` · ${stats.fileCount} file${stats.fileCount === 1 ? '' : 's'}` : ''}
              </Text>
            )}
          </View>
          {selectionMode ? (
            <TouchableOpacity
              style={[styles.headerIcon, { backgroundColor: colors.secondary }]}
              onPress={selectAllVisible}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>
                {selectedIds.size === files.length ? 'Clear' : 'All'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.headerIcon, { backgroundColor: colors.secondary }]}
              onPress={() => setSortMenuOpen(true)}
            >
              <Ionicons name="swap-vertical-outline" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>

        {!selectionMode && (
          <>
            {/* Storage progress bar */}
            {stats && (
              <View style={[styles.storageBar, { backgroundColor: inputBg }]}>
                <View
                  style={[
                    styles.storageFill,
                    {
                      width: `${Math.min(100, Math.max(2, stats.percentageUsed))}%`,
                      backgroundColor:
                        stats.percentageUsed > 90
                          ? Palette.red
                          : stats.percentageUsed > 70
                            ? Palette.amber
                            : colors.primary,
                    },
                  ]}
                />
              </View>
            )}

            {/* Search */}
            <View style={[styles.searchWrap, { backgroundColor: inputBg, borderColor }]}>
              <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search files…"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {FILTER_CHIPS.map((c) => {
                const active = activeChip === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : inputBg,
                        borderColor: active ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveChip(c.id);
                    }}
                  >
                    <Ionicons
                      name={c.icon}
                      size={14}
                      color={active ? colors.primaryForeground : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>

      {/* Body */}
      {loading && files.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retry, { backgroundColor: colors.primary }]}
            onPress={() => fetchFiles(1)}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {debouncedSearch ? 'No files match' : 'No files yet'}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {debouncedSearch
              ? 'Try a different search or filter.'
              : 'Upload an image, PDF, or document to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <FileRow
              file={item}
              isDark={isDark}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
              singleDeleting={singleDeleteId === item.id}
              onPress={() => handlePreview(item)}
              onLongPress={() => !selectionMode && enterSelection(item.id)}
              onDelete={() => handleDelete(item)}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && files.length > 0 ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: selectionMode ? 120 : 100 }}
        />
      )}

      {/* Bulk action bar */}
      {selectionMode && (
        <View
          style={[
            styles.bulkBar,
            {
              paddingBottom: insets.bottom + 10,
              backgroundColor: colors.card,
              borderTopColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.bulkBtn,
              { backgroundColor: Palette.red },
              (selectedIds.size === 0 || bulkDeleting) && { opacity: 0.5 },
            ]}
            onPress={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
          >
            {bulkDeleting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="white" />
                <Text style={styles.bulkBtnText}>
                  Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Upload FAB */}
      {!selectionMode && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              bottom: insets.bottom + 20,
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setUploadOpen(true);
          }}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      )}

      {/* Upload sheet */}
      <Modal
        visible={uploadOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setUploadOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Upload to gallery</Text>
              <TouchableOpacity onPress={() => setUploadOpen(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <UploadOption
              icon="camera-outline"
              accent={Palette.emerald}
              label="Take photo"
              hint="Use camera"
              onPress={takePhoto}
              borderColor={borderColor}
              isDark={isDark}
            />
            <UploadOption
              icon="image-outline"
              accent={Palette.purple}
              label="Photo library"
              hint="Pick an image"
              onPress={pickPhoto}
              borderColor={borderColor}
              isDark={isDark}
            />
            <UploadOption
              icon="document-outline"
              accent={Palette.amber}
              label="Document"
              hint={`Any file type${stats ? ` · max ${stats.formattedMaxFileSize}` : ''}`}
              onPress={pickDocument}
              borderColor={borderColor}
              isDark={isDark}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sort menu */}
      <Modal
        visible={sortMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { justifyContent: 'center', padding: 32 }]}
          onPress={() => setSortMenuOpen(false)}
        >
          <Pressable
            style={[styles.sortCard, { backgroundColor: colors.card, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 12 }]}>
              Sort by
            </Text>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
              const active = sortBy === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sortOption,
                    { borderBottomColor: borderColor },
                    active && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSortBy(key);
                    setSortMenuOpen(false);
                  }}
                >
                  <Text style={[styles.sortLabel, { color: colors.foreground }]}>
                    {SORT_LABELS[key]}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------- File row ----------

function FileRow({
  file,
  isDark,
  selectionMode,
  isSelected,
  singleDeleting,
  onPress,
  onLongPress,
  onDelete,
}: {
  file: OrgFile;
  isDark: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  singleDeleting: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const iconBg = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)';
  const isImage = file.fileType.startsWith('image/');
  const uploaderName = file.uploadedBy.firstName || file.uploadedBy.email?.split('@')[0] || 'Someone';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View
        style={[
          styles.row,
          { borderBottomColor: borderColor },
          isSelected && {
            backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
          },
        ]}
      >
        {selectionMode ? (
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? colors.primary : 'transparent',
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
            )}
          </View>
        ) : isImage && file.thumbnailUrl ? (
          <Image source={{ uri: file.thumbnailUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={getFileIcon(file.fileType)} size={20} color={colors.primary} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
            {file.fileName}
          </Text>
          <Text style={[styles.fileMeta, { color: subtitleColor }]} numberOfLines={1}>
            {formatBytes(file.fileSize)} · {uploaderName} · {relativeTime(file.createdAt)}
          </Text>
          <Text
            style={[
              styles.fileUsage,
              {
                color: file.usage && file.usage.length > 0 ? colors.primary : subtitleColor,
              },
            ]}
            numberOfLines={1}
          >
            {summarizeUsage(file.usage)}
          </Text>
        </View>

        {!selectionMode && (
          <TouchableOpacity
            style={[
              styles.deleteBtn,
              { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)' },
            ]}
            onPress={onDelete}
            disabled={singleDeleting}
          >
            {singleDeleting ? (
              <ActivityIndicator size="small" color={Palette.red} />
            ) : (
              <Ionicons name="trash-outline" size={16} color={Palette.red} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function UploadOption({
  icon,
  accent,
  label,
  hint,
  onPress,
  borderColor,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  label: string;
  hint: string;
  onPress: () => void;
  borderColor: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  return (
    <TouchableOpacity
      style={[styles.uploadOption, { borderBottomColor: borderColor }]}
      onPress={onPress}
    >
      <View style={[styles.uploadIconWrap, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.uploadLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.uploadHint, { color: subtitleColor }]}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={subtitleColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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

  /* Storage progress bar */
  storageBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  /* Chips */
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  /* Center states */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyBody: { fontSize: 13, textAlign: 'center' },

  /* File row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileMeta: { fontSize: 11, marginTop: 2 },
  fileUsage: { fontSize: 10, marginTop: 2, fontWeight: '500' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Bulk bar */
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bulkBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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

  /* Upload options */
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  uploadIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: { fontSize: 15, fontWeight: '600' },
  uploadHint: { fontSize: 12, marginTop: 1 },

  /* Sort */
  sortCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  sortLabel: { fontSize: 15, fontWeight: '500' },
});
