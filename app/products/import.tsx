import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system/next';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useRBAC } from '@/hooks/use-rbac';
import { Colors, Palette } from '@/constants/theme';
import { AccessDenied } from '@/components/AccessDenied';
import {
  importProductsFromCsv,
  downloadProductImportTemplate,
  type ProductImportResult,
} from '@/lib/api/products';

const STATUS_COLORS = {
  imported: Palette.emerald,
  updated: '#3b82f6',
  skipped: Palette.amber,
  failed: Palette.red,
} as const;

export default function ProductImportScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const rbac = useRBAC();

  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);

  if (!rbac.canCreate('products')) {
    return <AccessDenied />;
  }

  const handleDownloadTemplate = async () => {
    if (!accessToken) return;
    setDownloading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await downloadProductImportTemplate(accessToken);
    setDownloading(false);
    if (!res.success || !res.csv) {
      Alert.alert('Failed', res.error || 'Could not download template.');
      return;
    }
    try {
      const filename = res.filename || 'products-import-template.csv';
      const file = new File(Paths.cache, filename);
      await file.write(res.csv);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save import template',
          UTI: 'public.comma-separated-values-text',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'Saved',
          'The template is saved to the app cache, but sharing is not available on this device.',
        );
      }
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : String(e));
    }
  };

  const handlePickFile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResult(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    if (asset.size != null && asset.size > 5 * 1024 * 1024) {
      Alert.alert('Too large', 'CSV import is capped at 5 MB. Split the file and try again.');
      return;
    }
    setPickedFileName(asset.name);
    setUploading(true);
    const upRes = await importProductsFromCsv(accessToken, {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'text/csv',
    });
    setUploading(false);
    if (upRes.success && upRes.data) {
      setResult(upRes.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Import failed', upRes.error || 'Could not import the file.');
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Import products</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            CSV upload, max 5 MB
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Template */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Step 1 — Download template
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardBody, { color: colors.foreground }]}>
            Download the blank CSV template, fill it in, then upload it back. Imports{' '}
            <Text style={{ fontWeight: '700' }}>upsert by product name</Text> within your
            organization — existing products with the same name are updated, new names are created.
          </Text>
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor }]}
            onPress={handleDownloadTemplate}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color={colors.foreground} />
                <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>
                  Download template
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Step 2: Upload */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
          Step 2 — Upload your CSV
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {pickedFileName && (
            <View style={[styles.filePicked, { backgroundColor: inputBg, borderColor }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.foreground} />
              <Text
                style={[styles.filePickedName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {pickedFileName}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              uploading && { opacity: 0.6 },
            ]}
            onPress={handlePickFile}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Uploading…
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  {result ? 'Upload another file' : 'Pick CSV file'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Result summary */}
        {result && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
              Result
            </Text>
            <View style={styles.tally}>
              <TallyChip
                label="Imported"
                count={result.imported}
                color={STATUS_COLORS.imported}
                isDark={isDark}
              />
              <TallyChip
                label="Updated"
                count={result.updated}
                color={STATUS_COLORS.updated}
                isDark={isDark}
              />
              <TallyChip
                label="Skipped"
                count={result.skipped}
                color={STATUS_COLORS.skipped}
                isDark={isDark}
              />
              <TallyChip
                label="Failed"
                count={result.failed}
                color={STATUS_COLORS.failed}
                isDark={isDark}
              />
            </View>

            {result.details.length > 0 && (
              <View
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}
              >
                <Text style={[styles.cardSubLabel, { color: colors.mutedForeground }]}>
                  Per-row details
                </Text>
                {result.details.slice(0, 100).map((row, idx) => {
                  const accent = STATUS_COLORS[row.status];
                  return (
                    <View
                      key={`${row.row}-${idx}`}
                      style={[styles.detailRow, { borderBottomColor: borderColor }]}
                    >
                      <View style={[styles.detailDot, { backgroundColor: accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.detailName, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          Row {row.row} · {row.name || '(no name)'}
                        </Text>
                        {row.reason && (
                          <Text
                            style={[styles.detailReason, { color: colors.mutedForeground }]}
                            numberOfLines={2}
                          >
                            {row.reason}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.detailStatus, { color: accent }]}>{row.status}</Text>
                    </View>
                  );
                })}
                {result.details.length > 100 && (
                  <Text style={[styles.cardBody, { color: colors.mutedForeground, marginTop: 8 }]}>
                    Showing first 100 of {result.details.length} rows.
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor, marginTop: 14 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back-outline" size={16} color={colors.foreground} />
              <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>
                Back to products
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TallyChip({
  label,
  count,
  color,
  isDark,
}: {
  label: string;
  count: number;
  color: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View
      style={[
        styles.tallyChip,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.tallyDot, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.tallyLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.tallyCount, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  /* Section */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardBody: { fontSize: 13, lineHeight: 18 },
  cardSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  /* Buttons */
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },

  /* Picked file pill */
  filePicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  filePickedName: { flex: 1, fontSize: 13, fontWeight: '500' },

  /* Tally chips */
  tally: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tallyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  tallyDot: { width: 10, height: 10, borderRadius: 5 },
  tallyLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tallyCount: { fontSize: 18, fontWeight: '700' },

  /* Detail rows */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailDot: { width: 8, height: 8, borderRadius: 4 },
  detailName: { fontSize: 13, fontWeight: '600' },
  detailReason: { fontSize: 11, marginTop: 1 },
  detailStatus: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
