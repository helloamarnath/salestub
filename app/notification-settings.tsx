import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Notification settings interface
interface NotificationPreferences {
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
}

// Notification toggle component
function NotificationToggle({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  isDark,
  color = '#3b82f6',
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark: boolean;
  color?: string;
  disabled?: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  return (
    <View style={[styles.notificationToggle, { borderColor, backgroundColor: bgColor }]}>
      <View style={[styles.notificationToggleIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.notificationToggleContent}>
        <Text style={[styles.notificationToggleTitle, { color: textColor }]}>
          {title}
        </Text>
        <Text style={[styles.notificationToggleSubtitle, { color: subtitleColor }]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: isDark ? '#374151' : '#d1d5db', true: color }}
        thumbColor={value ? '#ffffff' : '#f4f4f5'}
        ios_backgroundColor={isDark ? '#374151' : '#d1d5db'}
        disabled={disabled}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    whatsappNotificationsEnabled: false,
  });

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  // Fetch preferences when accessToken is available
  useEffect(() => {
    if (accessToken) {
      fetchPreferences();
    }
  }, [accessToken]);

  const fetchPreferences = async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/push-notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences({
          pushNotificationsEnabled: data.pushNotificationsEnabled ?? true,
          emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
          smsNotificationsEnabled: data.smsNotificationsEnabled ?? false,
          whatsappNotificationsEnabled: data.whatsappNotificationsEnabled ?? false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!accessToken) {
      return;
    }

    // Optimistically update UI
    setPreferences(prev => ({ ...prev, [key]: value }));
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/push-notifications/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences({
          pushNotificationsEnabled: data.pushNotificationsEnabled ?? true,
          emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
          smsNotificationsEnabled: data.smsNotificationsEnabled ?? false,
          whatsappNotificationsEnabled: data.whatsappNotificationsEnabled ?? false,
        });
      } else {
        // Revert on error
        setPreferences(prev => ({ ...prev, [key]: !value }));
      }
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
    } finally {
      setIsSaving(false);
    }
  };

  const getEnabledCount = () => {
    return [
      preferences.pushNotificationsEnabled,
      preferences.emailNotificationsEnabled,
      preferences.smsNotificationsEnabled,
      preferences.whatsappNotificationsEnabled,
    ].filter(Boolean).length;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={styles.headerRight}>
          {isSaving && (
            <ActivityIndicator size="small" color="#3b82f6" />
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
            Loading preferences...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Status Card */}
          <View style={[styles.statusCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <BlurView
              intensity={15}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.statusCardBlur, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
            >
              <View style={styles.statusContent}>
                <View style={[styles.statusIcon, { backgroundColor: getEnabledCount() > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Ionicons
                    name={getEnabledCount() > 0 ? 'notifications' : 'notifications-off'}
                    size={24}
                    color={getEnabledCount() > 0 ? '#22c55e' : '#ef4444'}
                  />
                </View>
                <View style={styles.statusText}>
                  <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                    {getEnabledCount() === 4 ? 'All channels enabled' :
                     getEnabledCount() === 0 ? 'All channels disabled' :
                     `${getEnabledCount()} of 4 channels enabled`}
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                    Choose how you want to receive notifications
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Notification Channels */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)' }]}>
              Notification Channels
            </Text>
            <View style={[styles.sectionCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <BlurView
                intensity={15}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.sectionCardBlur, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              >
                <NotificationToggle
                  icon="phone-portrait-outline"
                  title="Push Notifications"
                  subtitle="Instant alerts on your device, even when the app is closed"
                  value={preferences.pushNotificationsEnabled}
                  onValueChange={(value) => updatePreference('pushNotificationsEnabled', value)}
                  isDark={isDark}
                  color="#3b82f6"
                  disabled={isSaving}
                />
                <NotificationToggle
                  icon="mail-outline"
                  title="Email Notifications"
                  subtitle="Important updates and reminders sent to your inbox"
                  value={preferences.emailNotificationsEnabled}
                  onValueChange={(value) => updatePreference('emailNotificationsEnabled', value)}
                  isDark={isDark}
                  color="#ef4444"
                  disabled={isSaving}
                />
                <NotificationToggle
                  icon="chatbox-outline"
                  title="SMS Notifications"
                  subtitle="Text messages for urgent alerts and time-sensitive updates"
                  value={preferences.smsNotificationsEnabled}
                  onValueChange={(value) => updatePreference('smsNotificationsEnabled', value)}
                  isDark={isDark}
                  color="#10b981"
                  disabled={isSaving}
                />
                <NotificationToggle
                  icon="logo-whatsapp"
                  title="WhatsApp Notifications"
                  subtitle="Rich notifications via WhatsApp with quick action links"
                  value={preferences.whatsappNotificationsEnabled}
                  onValueChange={(value) => updatePreference('whatsappNotificationsEnabled', value)}
                  isDark={isDark}
                  color="#25d366"
                  disabled={isSaving}
                />
              </BlurView>
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <BlurView
              intensity={15}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.infoCardBlur, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
            >
              <View style={styles.infoContent}>
                <Ionicons name="information-circle-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                <Text style={[styles.infoText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                  Enable multiple channels to ensure you never miss important updates about leads, deals, and activities.
                </Text>
              </View>
            </BlurView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statusCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  statusCardBlur: {},
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    marginLeft: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  sectionCardBlur: {
    padding: 12,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  notificationToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationToggleContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  notificationToggleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  notificationToggleSubtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  infoCardBlur: {},
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
