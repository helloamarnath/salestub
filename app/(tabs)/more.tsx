import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/auth-context';
import { useTheme, Theme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { router, Href } from 'expo-router';

// Support URLs from landing page
const SUPPORT_URLS = {
  helpCenter: 'https://www.salestub.com/help',
  contactSupport: 'https://www.salestub.com/contact',
  privacyPolicy: 'https://www.salestub.com/privacy-policy',
  about: 'https://www.salestub.com/about',
};

// Menu item component
function MenuItem({
  icon,
  title,
  subtitle,
  color = '#ffffff',
  onPress,
  showArrow = true,
  destructive = false,
  isDark = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
  showArrow?: boolean;
  destructive?: boolean;
  isDark?: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const arrowColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.menuItem, { borderBottomColor: borderColor }]}>
        <View
          style={[styles.iconContainer, { backgroundColor: `${destructive ? '#ef4444' : color}15` }]}
        >
          <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : color} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemTitle, { color: destructive ? '#ef4444' : textColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.menuItemSubtitle, { color: subtitleColor }]}>{subtitle}</Text>
          )}
        </View>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={arrowColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Menu section component
function MenuSection({
  title,
  children,
  isDark = true,
}: {
  title: string;
  children: React.ReactNode;
  isDark?: boolean;
}) {
  const titleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  return (
    <View style={styles.menuSection}>
      <Text style={[styles.sectionTitle, { color: titleColor }]}>
        {title}
      </Text>
      <View style={[styles.sectionContainer, { borderColor }]}>
        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={[styles.sectionBlur, { backgroundColor: bgColor }]}>
          {children}
        </BlurView>
      </View>
    </View>
  );
}

// Theme option component for the modal
function ThemeOption({
  icon,
  title,
  subtitle,
  isSelected,
  onPress,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isSelected
    ? '#3b82f6'
    : isDark
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(0,0,0,0.1)';
  const bgColor = isSelected
    ? isDark
      ? 'rgba(59,130,246,0.15)'
      : 'rgba(59,130,246,0.1)'
    : isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.03)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.themeOption, { borderColor, backgroundColor: bgColor }]}>
        <View style={styles.themeOptionIcon}>
          <Ionicons name={icon} size={24} color={isSelected ? '#3b82f6' : textColor} />
        </View>
        <View style={styles.themeOptionContent}>
          <Text style={[styles.themeOptionTitle, { color: isSelected ? '#3b82f6' : textColor }]}>
            {title}
          </Text>
          <Text style={[styles.themeOptionSubtitle, { color: subtitleColor }]}>
            {subtitle}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login' as Href);
          },
        },
      ]
    );
  };

  const getThemeLabel = (): string => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setShowThemeModal(false);
  };

  const firstName = user?.firstName || 'User';
  const lastName = user?.lastName || '';
  const email = user?.email || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase();

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCardWrapper}>
          <View style={[styles.profileCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={[styles.profileCardBlur, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <View style={styles.profileContent}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{initials}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.foreground }]}>
                    {firstName} {lastName}
                  </Text>
                  <Text style={[styles.profileEmail, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>{email}</Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </View>

        {/* CRM Settings */}
        <MenuSection title="CRM" isDark={isDark}>
          <MenuItem
            icon="cube-outline"
            title="Products"
            subtitle="Manage your products"
            color="#06b6d4"
            onPress={() => router.push('/products' as Href)}
            isDark={isDark}
          />
        </MenuSection>

        {/* Integrations */}
        <MenuSection title="Integrations" isDark={isDark}>
          <MenuItem
            icon="calendar-outline"
            title="Calendar"
            subtitle="Sync your calendar"
            color="#06b6d4"
            isDark={isDark}
          />
          <MenuItem
            icon="cloud-outline"
            title="Import/Export"
            subtitle="CSV and data sync"
            color="#8b5cf6"
            onPress={() => router.push('/export-import' as Href)}
            isDark={isDark}
          />
        </MenuSection>

        {/* Preferences */}
        <MenuSection title="Preferences" isDark={isDark}>
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification channels"
            color="#f59e0b"
            onPress={() => router.push('/notification-settings' as Href)}
            isDark={isDark}
          />
          <MenuItem
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            title="Appearance"
            subtitle={getThemeLabel()}
            color="#6366f1"
            onPress={() => setShowThemeModal(true)}
            isDark={isDark}
          />
        </MenuSection>

        {/* Support */}
        <MenuSection title="Support" isDark={isDark}>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            color="#3b82f6"
            onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URLS.helpCenter)}
            isDark={isDark}
          />
          <MenuItem
            icon="chatbubble-outline"
            title="Contact Support"
            color="#8b5cf6"
            onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URLS.contactSupport)}
            isDark={isDark}
          />
          <MenuItem
            icon="document-text-outline"
            title="Privacy Policy"
            color="#6b7280"
            onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URLS.privacyPolicy)}
            isDark={isDark}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
            color="#6b7280"
            onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URLS.about)}
            isDark={isDark}
          />
        </MenuSection>

        {/* Sign Out */}
        <MenuSection title="Account" isDark={isDark}>
          <MenuItem
            icon="log-out-outline"
            title="Sign Out"
            onPress={handleLogout}
            showArrow={false}
            destructive
            isDark={isDark}
          />
        </MenuSection>
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Appearance</Text>
                <Text style={[styles.modalSubtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                  Choose how SalesTub looks on your device
                </Text>

                <View style={styles.themeOptions}>
                  <ThemeOption
                    icon="phone-portrait-outline"
                    title="System"
                    subtitle="Match device settings"
                    isSelected={theme === 'system'}
                    onPress={() => handleThemeChange('system')}
                    isDark={isDark}
                  />
                  <ThemeOption
                    icon="sunny-outline"
                    title="Light"
                    subtitle="Always use light mode"
                    isSelected={theme === 'light'}
                    onPress={() => handleThemeChange('light')}
                    isDark={isDark}
                  />
                  <ThemeOption
                    icon="moon-outline"
                    title="Dark"
                    subtitle="Always use dark mode"
                    isSelected={theme === 'dark'}
                    onPress={() => handleThemeChange('dark')}
                    isDark={isDark}
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowThemeModal(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileCardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  profileCardBlur: {},
  profileContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontWeight: '600',
    fontSize: 18,
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  sectionBlur: {},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemTitle: {
    fontWeight: '500',
    fontSize: 16,
  },
  menuItemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeOptionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    marginLeft: 8,
  },
  modalCloseButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
