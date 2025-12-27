import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { exportLeadsToCSV } from '@/lib/api/leads';
import { exportContactsToCSV } from '@/lib/api/contacts';
import { exportDealsToCSV } from '@/lib/api/deals';
import { exportActivitiesToCSV } from '@/lib/api/activities';
import { exportProductsToCSV } from '@/lib/api/products';
import { ExportFilterModal, type ExportDataType, type ExportFilters } from '@/components/export/ExportFilterModal';

// Data types available for export/import
interface DataType {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  exportEnabled: boolean;
  importEnabled: boolean;
}

const DATA_TYPES: DataType[] = [
  {
    id: 'leads',
    title: 'Leads',
    description: 'Lead data with contact info, stage, and source',
    icon: 'people-outline',
    color: '#3b82f6',
    exportEnabled: true,
    importEnabled: false, // Coming soon
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Contact details, company, and tags',
    icon: 'person-outline',
    color: '#10b981',
    exportEnabled: true,
    importEnabled: false,
  },
  {
    id: 'deals',
    title: 'Deals',
    description: 'Deal pipeline data, values, and stages',
    icon: 'briefcase-outline',
    color: '#f59e0b',
    exportEnabled: true,
    importEnabled: false,
  },
  {
    id: 'activities',
    title: 'Activities',
    description: 'Calls, meetings, tasks, and notes',
    icon: 'calendar-outline',
    color: '#8b5cf6',
    exportEnabled: true,
    importEnabled: false,
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Product catalog with pricing',
    icon: 'cube-outline',
    color: '#06b6d4',
    exportEnabled: true,
    importEnabled: false,
  },
];

// Data type card component
function DataTypeCard({
  dataType,
  onExport,
  onImport,
  isExporting,
  isDark,
}: {
  dataType: DataType;
  onExport: () => void;
  onImport: () => void;
  isExporting: boolean;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const disabledColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';

  return (
    <View style={[styles.cardContainer, { borderColor }]}>
      <BlurView
        intensity={15}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.cardBlur, { backgroundColor: bgColor }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: `${dataType.color}15` }]}>
            <Ionicons name={dataType.icon} size={24} color={dataType.color} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: textColor }]}>{dataType.title}</Text>
            <Text style={[styles.cardDescription, { color: subtitleColor }]}>
              {dataType.description}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.exportButton,
              !dataType.exportEnabled && styles.actionButtonDisabled,
              { borderColor: dataType.exportEnabled ? dataType.color : disabledColor },
            ]}
            onPress={onExport}
            disabled={!dataType.exportEnabled || isExporting}
            activeOpacity={0.7}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={dataType.color} />
            ) : (
              <>
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={dataType.exportEnabled ? dataType.color : disabledColor}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: dataType.exportEnabled ? dataType.color : disabledColor },
                  ]}
                >
                  Export
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.importButton,
              !dataType.importEnabled && styles.actionButtonDisabled,
              {
                backgroundColor: dataType.importEnabled ? dataType.color : 'transparent',
                borderColor: dataType.importEnabled ? dataType.color : disabledColor,
              },
            ]}
            onPress={onImport}
            disabled={!dataType.importEnabled}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={dataType.importEnabled ? 'white' : disabledColor}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: dataType.importEnabled ? 'white' : disabledColor },
              ]}
            >
              Import
            </Text>
          </TouchableOpacity>
        </View>

        {(!dataType.exportEnabled || !dataType.importEnabled) && (
          <View style={[styles.comingSoonBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name="time-outline" size={12} color={subtitleColor} />
            <Text style={[styles.comingSoonText, { color: subtitleColor }]}>
              {!dataType.exportEnabled && !dataType.importEnabled
                ? 'Coming soon'
                : !dataType.importEnabled
                ? 'Import coming soon'
                : 'Export coming soon'}
            </Text>
          </View>
        )}
      </BlurView>
    </View>
  );
}

export default function ExportImportScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [exportingType, setExportingType] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<ExportDataType | null>(null);

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  // Open filter modal for export
  const handleExport = (dataType: DataType) => {
    if (exportingType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDataType(dataType.id as ExportDataType);
    setFilterModalVisible(true);
  };

  // Process export with filters
  const handleExportWithFilters = async (filters: ExportFilters) => {
    if (!accessToken || !selectedDataType) return;

    setExportingType(selectedDataType);
    const dataType = DATA_TYPES.find(dt => dt.id === selectedDataType);

    try {
      let result: { success: boolean; csv?: string; filename?: string; error?: string } | null = null;

      switch (selectedDataType) {
        case 'leads':
          result = await exportLeadsToCSV(accessToken, {
            stageId: filters.stageIds?.[0],
            source: filters.sources?.[0],
            createdFrom: filters.dateFrom,
            createdTo: filters.dateTo,
          });
          break;
        case 'contacts':
          result = await exportContactsToCSV(accessToken, {
            status: filters.status,
            createdFrom: filters.dateFrom,
            createdTo: filters.dateTo,
          });
          break;
        case 'deals':
          result = await exportDealsToCSV(accessToken, {
            stage: filters.dealStage,
            status: filters.dealStatus,
          });
          break;
        case 'activities':
          result = await exportActivitiesToCSV(accessToken, {
            type: filters.activityType,
            status: filters.activityStatus,
            dueDateFrom: filters.dateFrom,
            dueDateTo: filters.dateTo,
          });
          break;
        case 'products':
          result = await exportProductsToCSV(accessToken, {
            category: filters.category,
            isActive: filters.isActive,
          });
          break;
        default:
          Alert.alert('Not Available', 'Export is not yet available for this data type.');
          setExportingType(null);
          return;
      }

      if (result?.success && result.csv) {
        // Save to a temp file using new File API
        const filename = result.filename || `${selectedDataType}-export.csv`;
        const file = new File(Paths.cache, filename);
        await file.write(result.csv);

        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/csv',
            dialogTitle: `Export ${dataType?.title || selectedDataType}`,
            UTI: 'public.comma-separated-values-text',
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            'Export Ready',
            'CSV file has been saved. Sharing is not available on this device.'
          );
        }
      } else {
        Alert.alert('Export Failed', result?.error || `Failed to export ${dataType?.title.toLowerCase() || 'data'}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', `An error occurred while exporting ${dataType?.title.toLowerCase() || 'data'}`);
    } finally {
      setExportingType(null);
    }
  };

  const handleImport = (dataType: DataType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Coming Soon',
      `${dataType.title} import will be available in a future update.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Import / Export
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={[styles.infoText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }]}>
            Export your CRM data as CSV files. Import functionality coming soon.
          </Text>
        </View>

        {/* Data type cards */}
        <View style={styles.cardsContainer}>
          {DATA_TYPES.map((dataType) => (
            <DataTypeCard
              key={dataType.id}
              dataType={dataType}
              onExport={() => handleExport(dataType)}
              onImport={() => handleImport(dataType)}
              isExporting={exportingType === dataType.id}
              isDark={isDark}
            />
          ))}
        </View>
      </ScrollView>

      {/* Export Filter Modal */}
      {selectedDataType && (
        <ExportFilterModal
          visible={filterModalVisible}
          onClose={() => {
            setFilterModalVisible(false);
            setSelectedDataType(null);
          }}
          onApply={handleExportWithFilters}
          dataType={selectedDataType}
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
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 16,
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardBlur: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  exportButton: {
    backgroundColor: 'transparent',
  },
  importButton: {},
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
