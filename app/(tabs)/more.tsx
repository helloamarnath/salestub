import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { router, Href } from 'expo-router';

// Menu item component
function MenuItem({
  icon,
  title,
  subtitle,
  color = '#ffffff',
  onPress,
  showArrow = true,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
  showArrow?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View className="flex-row items-center py-4 px-4 border-b border-white/5">
        <View
          style={[styles.iconContainer, { backgroundColor: `${destructive ? '#ef4444' : color}15` }]}
        >
          <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : color} />
        </View>
        <View className="flex-1 ml-3">
          <Text className={`font-medium text-base ${destructive ? 'text-red-500' : 'text-white'}`}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-white/40 text-sm mt-0.5">{subtitle}</Text>
          )}
        </View>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Menu section component
function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text className="text-white/40 text-xs font-semibold uppercase tracking-wide px-5 mb-2">
        {title}
      </Text>
      <View style={styles.sectionContainer}>
        <BlurView intensity={15} tint="dark" style={styles.sectionBlur}>
          {children}
        </BlurView>
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

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

  const firstName = user?.firstName || 'User';
  const lastName = user?.lastName || '';
  const email = user?.email || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase();

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 20 }} className="px-5 mb-6">
          <Text className="text-white text-2xl font-bold">Settings</Text>
        </View>

        {/* Profile card */}
        <View className="px-5 mb-6">
          <View style={styles.profileCard}>
            <BlurView intensity={20} tint="dark" style={styles.profileCardBlur}>
              <View className="p-4 flex-row items-center">
                <View style={styles.profileAvatar}>
                  <Text className="text-white font-bold text-xl">{initials}</Text>
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-white font-semibold text-lg">
                    {firstName} {lastName}
                  </Text>
                  <Text className="text-white/50 text-sm">{email}</Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </View>

        {/* CRM Settings */}
        <MenuSection title="CRM">
          <MenuItem
            icon="business-outline"
            title="Organization"
            subtitle="Manage your organization"
            color="#3b82f6"
          />
          <MenuItem
            icon="people-outline"
            title="Team Members"
            subtitle="Invite and manage team"
            color="#8b5cf6"
          />
          <MenuItem
            icon="pricetags-outline"
            title="Custom Fields"
            subtitle="Lead and deal fields"
            color="#22c55e"
          />
          <MenuItem
            icon="git-network-outline"
            title="Pipeline Settings"
            subtitle="Configure deal stages"
            color="#f59e0b"
          />
        </MenuSection>

        {/* Integrations */}
        <MenuSection title="Integrations">
          <MenuItem
            icon="mail-outline"
            title="Email"
            subtitle="Connect your inbox"
            color="#ef4444"
          />
          <MenuItem
            icon="calendar-outline"
            title="Calendar"
            subtitle="Sync your calendar"
            color="#06b6d4"
          />
          <MenuItem
            icon="cloud-outline"
            title="Import/Export"
            subtitle="CSV and data sync"
            color="#8b5cf6"
          />
        </MenuSection>

        {/* Preferences */}
        <MenuSection title="Preferences">
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push and email alerts"
            color="#f59e0b"
          />
          <MenuItem
            icon="moon-outline"
            title="Appearance"
            subtitle="Dark mode"
            color="#6366f1"
          />
          <MenuItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            color="#22c55e"
          />
        </MenuSection>

        {/* Support */}
        <MenuSection title="Support">
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            color="#3b82f6"
          />
          <MenuItem
            icon="chatbubble-outline"
            title="Contact Support"
            color="#8b5cf6"
          />
          <MenuItem
            icon="document-text-outline"
            title="Privacy Policy"
            color="#6b7280"
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
            color="#6b7280"
          />
        </MenuSection>

        {/* Sign Out */}
        <MenuSection title="Account">
          <MenuItem
            icon="log-out-outline"
            title="Sign Out"
            onPress={handleLogout}
            showArrow={false}
            destructive
          />
        </MenuSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileCardBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
