import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, DynamicColorIOS } from 'react-native';
import { router, Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';

// Color constants for tab bar theming
const colors = {
  light: {
    background: '#ffffff',
    tint: '#3b82f6', // Primary blue
    inactive: '#64748b', // Slate gray
  },
  dark: {
    background: '#0f172a', // Dark slate
    tint: '#60a5fa', // Lighter blue for dark mode
    inactive: '#94a3b8', // Lighter gray for visibility
  },
};

// Android tab icon mapping (Ionicons)
type IconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<string, { default: IconName; selected: IconName }> = {
  index: { default: 'home-outline', selected: 'home' },
  leads: { default: 'people-outline', selected: 'people' },
  deals: { default: 'briefcase-outline', selected: 'briefcase' },
  contacts: { default: 'person-circle-outline', selected: 'person-circle' },
  more: { default: 'menu-outline', selected: 'menu' },
};

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  // Handle redirect in useEffect to avoid render loops
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true);
      setTimeout(() => {
        router.replace('/');
      }, 0);
    }
  }, [isLoading, isAuthenticated, isRedirecting]);

  // Show loading spinner while checking auth or redirecting
  if (isLoading || !isAuthenticated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  // iOS: Use NativeTabs for liquid glass effect with SF Symbols
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={DynamicColorIOS({
          dark: colors.dark.tint,
          light: colors.light.tint,
        })}
      >
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="leads">
          <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
          <Label>Leads</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="deals">
          <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
          <Label>Deals</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="contacts">
          <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
          <Label>Contacts</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="more">
          <Icon sf={{ default: 'line.3.horizontal', selected: 'line.3.horizontal' }} />
          <Label>More</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Android: Use standard Tabs with Ionicons
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.inactive,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tabIcons.index.selected : tabIcons.index.default}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tabIcons.leads.selected : tabIcons.leads.default}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tabIcons.deals.selected : tabIcons.deals.default}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tabIcons.contacts.selected : tabIcons.contacts.default}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tabIcons.more.selected : tabIcons.more.default}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
