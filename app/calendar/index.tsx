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
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  CalendarProviderType,
  CalendarSyncDirection,
  CalendarConnectionStatus,
  CalendarConflict,
  getCalendarProviders,
  getCalendarStatus,
  getCalendarOAuthUrl,
  disconnectCalendar,
  updateCalendarSettings,
  triggerCalendarSync,
  getCalendarConflicts,
  resolveCalendarConflict,
  getProviderDisplayInfo,
  getSyncDirectionInfo,
} from '@/lib/api/calendar';

const SYNC_DIRECTIONS: { value: CalendarSyncDirection; label: string; description: string }[] = [
  { value: 'BIDIRECTIONAL', label: 'Two-Way Sync', description: 'Sync both ways' },
  { value: 'CRM_TO_CALENDAR', label: 'CRM to Calendar', description: 'Push CRM events' },
  { value: 'CALENDAR_TO_CRM', label: 'Calendar to CRM', description: 'Import calendar events' },
];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const [connections, setConnections] = useState<CalendarConnectionStatus[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState<CalendarProviderType | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<CalendarConnectionStatus | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<CalendarSyncDirection>('BIDIRECTIONAL');

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const cardBgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  const fetchData = useCallback(async () => {
    if (!accessToken) return;

    try {
      const [statusRes, conflictsRes] = await Promise.all([
        getCalendarStatus(accessToken),
        getCalendarConflicts(accessToken),
      ]);

      if (statusRes.success && statusRes.data) {
        setConnections(statusRes.data);
      }

      if (conflictsRes.success && conflictsRes.data?.conflicts) {
        setConflicts(conflictsRes.data.conflicts);
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleConnectProvider = async (provider: CalendarProviderType) => {
    if (!accessToken) return;

    try {
      setShowProviderModal(false);
      const result = await getCalendarOAuthUrl(accessToken, provider, selectedDirection);

      if (result.url) {
        // Open browser for OAuth
        const authResult = await WebBrowser.openAuthSessionAsync(
          result.url,
          'salestub://calendar/callback'
        );

        if (authResult.type === 'success') {
          // Refresh connections after OAuth
          await fetchData();
          Alert.alert('Success', `${provider} calendar connected successfully!`);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to get authorization URL');
      }
    } catch (err) {
      console.error('Failed to connect calendar:', err);
      Alert.alert('Error', 'Failed to connect calendar. Please try again.');
    }
  };

  const handleDisconnect = (connection: CalendarConnectionStatus) => {
    Alert.alert(
      'Disconnect Calendar',
      `Are you sure you want to disconnect ${getProviderDisplayInfo(connection.provider).name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;

            try {
              const result = await disconnectCalendar(accessToken, connection.provider);
              if (result.success) {
                await fetchData();
                Alert.alert('Success', 'Calendar disconnected successfully');
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to disconnect');
              }
            } catch (err) {
              console.error('Failed to disconnect:', err);
              Alert.alert('Error', 'Failed to disconnect calendar');
            }
          },
        },
      ]
    );
  };

  const handleSync = async (provider: CalendarProviderType) => {
    if (!accessToken) return;

    setIsSyncing(provider);
    try {
      const result = await triggerCalendarSync(accessToken, provider, 'incremental');
      if (result.success && result.data?.stats) {
        const stats = result.data.stats;
        Alert.alert(
          'Sync Complete',
          `Created: ${stats.eventsCreatedInCalendar + stats.activitiesCreatedInCrm}\nUpdated: ${stats.eventsUpdatedInCalendar + stats.activitiesUpdatedInCrm}\nConflicts: ${stats.conflictsDetected}`
        );
        await fetchData();
      } else {
        Alert.alert('Error', result.error?.message || 'Sync failed');
      }
    } catch (err) {
      console.error('Failed to sync:', err);
      Alert.alert('Error', 'Failed to sync calendar');
    } finally {
      setIsSyncing(null);
    }
  };

  const handleUpdateSettings = async () => {
    if (!accessToken || !selectedConnection) return;

    try {
      const result = await updateCalendarSettings(accessToken, selectedConnection.provider, {
        syncDirection: selectedDirection,
      });

      if (result.success) {
        setShowSettingsModal(false);
        await fetchData();
        Alert.alert('Success', 'Settings updated successfully');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleResolveConflict = async (conflict: CalendarConflict, resolution: 'CRM_WINS' | 'CALENDAR_WINS') => {
    if (!accessToken) return;

    try {
      const result = await resolveCalendarConflict(accessToken, conflict.mappingId, resolution);
      if (result.success) {
        await fetchData();
        Alert.alert('Success', 'Conflict resolved');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to resolve conflict');
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      Alert.alert('Error', 'Failed to resolve conflict');
    }
  };

  const openSettings = (connection: CalendarConnectionStatus) => {
    setSelectedConnection(connection);
    setSelectedDirection(connection.syncDirection);
    setShowSettingsModal(true);
  };

  const connectedCalendars = connections.filter((c) => c.connectionStatus === 'CONNECTED');
  const hasConnectedCalendar = connectedCalendars.length > 0;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: subtitleColor }]}>
            Loading calendar settings...
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
        <Text style={[styles.headerTitle, { color: textColor }]}>Calendar Sync</Text>
        <View style={styles.headerRight}>
          {conflicts.length > 0 && (
            <TouchableOpacity style={styles.conflictBadge} onPress={() => setShowConflictsModal(true)}>
              <Text style={styles.conflictBadgeText}>{conflicts.length}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Description */}
        <View style={styles.descriptionSection}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
            <Ionicons name="calendar" size={28} color="#06b6d4" />
          </View>
          <Text style={[styles.descriptionTitle, { color: textColor }]}>
            Sync your CRM meetings
          </Text>
          <Text style={[styles.descriptionText, { color: subtitleColor }]}>
            Connect your Google Calendar to keep your meetings in sync with your CRM.
          </Text>
        </View>

        {/* Connected Calendars */}
        {hasConnectedCalendar && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: subtitleColor }]}>
              CONNECTED CALENDARS
            </Text>
            {connectedCalendars.map((connection) => {
              const providerInfo = getProviderDisplayInfo(connection.provider);
              const directionInfo = getSyncDirectionInfo(connection.syncDirection);
              const isCurrentlySyncing = isSyncing === connection.provider;

              return (
                <View key={connection.provider} style={[styles.card, { borderColor }]}>
                  <BlurView
                    intensity={15}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.cardBlur, { backgroundColor: cardBgColor }]}
                  >
                    <View style={styles.connectionHeader}>
                      <View style={[styles.providerIcon, { backgroundColor: providerInfo.color + '20' }]}>
                        <Ionicons
                          name="logo-google"
                          size={24}
                          color={providerInfo.color}
                        />
                      </View>
                      <View style={styles.connectionInfo}>
                        <Text style={[styles.providerName, { color: textColor }]}>
                          {providerInfo.name}
                        </Text>
                        <Text style={[styles.email, { color: subtitleColor }]}>
                          {connection.email}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                        <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                        <Text style={[styles.statusText, { color: '#22c55e' }]}>Connected</Text>
                      </View>
                    </View>

                    <View style={[styles.connectionDetails, { borderTopColor: borderColor }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: subtitleColor }]}>Sync Mode</Text>
                        <Text style={[styles.detailValue, { color: textColor }]}>{directionInfo.label}</Text>
                      </View>
                      {connection.lastSyncAt && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: subtitleColor }]}>Last Sync</Text>
                          <Text style={[styles.detailValue, { color: textColor }]}>
                            {new Date(connection.lastSyncAt).toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.connectionActions, { borderTopColor: borderColor }]}>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor }]}
                        onPress={() => handleSync(connection.provider)}
                        disabled={isCurrentlySyncing}
                      >
                        {isCurrentlySyncing ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons name="sync" size={18} color={colors.primary} />
                        )}
                        <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                          {isCurrentlySyncing ? 'Syncing...' : 'Sync Now'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor }]}
                        onPress={() => openSettings(connection)}
                      >
                        <Ionicons name="settings-outline" size={18} color={textColor} />
                        <Text style={[styles.actionButtonText, { color: textColor }]}>Settings</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: '#ef4444' }]}
                        onPress={() => handleDisconnect(connection)}
                      >
                        <Ionicons name="unlink-outline" size={18} color="#ef4444" />
                        <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Disconnect</Text>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                </View>
              );
            })}
          </View>
        )}

        {/* Connect Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowProviderModal(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color="white" />
            <Text style={styles.connectButtonText}>
              {hasConnectedCalendar ? 'Connect Another Calendar' : 'Connect Calendar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: subtitleColor }]}>
              SYNC CONFLICTS ({conflicts.length})
            </Text>
            <TouchableOpacity
              style={[styles.card, { borderColor }]}
              onPress={() => setShowConflictsModal(true)}
            >
              <BlurView
                intensity={15}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.cardBlur, { backgroundColor: cardBgColor }]}
              >
                <View style={styles.conflictCard}>
                  <View style={[styles.conflictIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons name="alert-circle" size={24} color="#ef4444" />
                  </View>
                  <View style={styles.conflictInfo}>
                    <Text style={[styles.conflictTitle, { color: textColor }]}>
                      {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need attention
                    </Text>
                    <Text style={[styles.conflictSubtitle, { color: subtitleColor }]}>
                      Tap to review and resolve
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Provider Selection Modal */}
      <Modal
        visible={showProviderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProviderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : 'white' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Connect Calendar</Text>
              <TouchableOpacity onPress={() => setShowProviderModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Sync Direction Selection */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: subtitleColor }]}>SYNC DIRECTION</Text>
              {SYNC_DIRECTIONS.map((direction) => (
                <TouchableOpacity
                  key={direction.value}
                  style={[
                    styles.directionOption,
                    { borderColor },
                    selectedDirection === direction.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => setSelectedDirection(direction.value)}
                >
                  <View style={styles.directionInfo}>
                    <Text style={[styles.directionLabel, { color: textColor }]}>{direction.label}</Text>
                    <Text style={[styles.directionDescription, { color: subtitleColor }]}>
                      {direction.description}
                    </Text>
                  </View>
                  {selectedDirection === direction.value && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Provider Selection - Google Calendar Only */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: subtitleColor }]}>SELECT PROVIDER</Text>
              {(() => {
                const provider: CalendarProviderType = 'GOOGLE';
                const info = getProviderDisplayInfo(provider);
                const isConnected = connections.some(
                  (c) => c.provider === provider && c.connectionStatus === 'CONNECTED'
                );

                return (
                  <TouchableOpacity
                    style={[styles.providerOption, { borderColor }]}
                    onPress={() => handleConnectProvider(provider)}
                    disabled={isConnected}
                  >
                    <View style={[styles.providerIcon, { backgroundColor: info.color + '20' }]}>
                      <Ionicons name="logo-google" size={24} color={info.color} />
                    </View>
                    <View style={styles.providerOptionInfo}>
                      <Text style={[styles.providerOptionName, { color: textColor }]}>{info.name}</Text>
                      {isConnected && (
                        <Text style={[styles.providerConnected, { color: '#22c55e' }]}>Connected</Text>
                      )}
                    </View>
                    {!isConnected && <Ionicons name="chevron-forward" size={20} color={subtitleColor} />}
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : 'white' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Sync Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: subtitleColor }]}>SYNC DIRECTION</Text>
              {SYNC_DIRECTIONS.map((direction) => (
                <TouchableOpacity
                  key={direction.value}
                  style={[
                    styles.directionOption,
                    { borderColor },
                    selectedDirection === direction.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => setSelectedDirection(direction.value)}
                >
                  <View style={styles.directionInfo}>
                    <Text style={[styles.directionLabel, { color: textColor }]}>{direction.label}</Text>
                    <Text style={[styles.directionDescription, { color: subtitleColor }]}>
                      {direction.description}
                    </Text>
                  </View>
                  {selectedDirection === direction.value && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdateSettings}
            >
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Conflicts Modal */}
      <Modal
        visible={showConflictsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConflictsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : 'white', maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Sync Conflicts</Text>
              <TouchableOpacity onPress={() => setShowConflictsModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.conflictsList}>
              {conflicts.map((conflict) => (
                <View key={conflict.mappingId} style={[styles.conflictItem, { borderColor }]}>
                  <View style={styles.conflictVersions}>
                    <View style={styles.conflictVersion}>
                      <Text style={[styles.conflictVersionTitle, { color: colors.primary }]}>CRM Version</Text>
                      <Text style={[styles.conflictVersionText, { color: textColor }]}>
                        {conflict.crmVersion.title}
                      </Text>
                      <Text style={[styles.conflictVersionDate, { color: subtitleColor }]}>
                        {new Date(conflict.crmVersion.start).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.conflictDivider} />
                    <View style={styles.conflictVersion}>
                      <Text style={[styles.conflictVersionTitle, { color: '#f59e0b' }]}>Calendar Version</Text>
                      <Text style={[styles.conflictVersionText, { color: textColor }]}>
                        {conflict.calendarVersion.summary}
                      </Text>
                      <Text style={[styles.conflictVersionDate, { color: subtitleColor }]}>
                        {new Date(conflict.calendarVersion.start).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.conflictButtons}>
                    <TouchableOpacity
                      style={[styles.conflictButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleResolveConflict(conflict, 'CRM_WINS')}
                    >
                      <Text style={styles.conflictButtonText}>Use CRM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.conflictButton, { backgroundColor: '#f59e0b' }]}
                      onPress={() => handleResolveConflict(conflict, 'CALENDAR_WINS')}
                    >
                      <Text style={styles.conflictButtonText}>Use Calendar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {conflicts.length === 0 && (
                <View style={styles.emptyConflicts}>
                  <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                  <Text style={[styles.emptyConflictsText, { color: textColor }]}>No conflicts!</Text>
                  <Text style={[styles.emptyConflictsSubtext, { color: subtitleColor }]}>
                    All your calendar events are in sync.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    minWidth: 40,
    alignItems: 'flex-end',
  },
  conflictBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conflictBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  cardBlur: {},
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectionDetails: {
    padding: 16,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  connectionActions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  conflictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  conflictIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conflictTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  conflictSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSection: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  directionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  directionInfo: {
    flex: 1,
  },
  directionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  directionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  providerOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerOptionName: {
    fontSize: 15,
    fontWeight: '500',
  },
  providerConnected: {
    fontSize: 12,
    marginTop: 2,
  },
  saveButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  conflictsList: {
    padding: 20,
  },
  conflictItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  conflictVersions: {
    flexDirection: 'row',
    padding: 16,
  },
  conflictVersion: {
    flex: 1,
  },
  conflictDivider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 12,
  },
  conflictVersionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  conflictVersionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  conflictVersionDate: {
    fontSize: 11,
  },
  conflictButtons: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  conflictButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  conflictButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyConflicts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyConflictsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyConflictsSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
