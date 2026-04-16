import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, DynamicColorIOS } from 'react-native';
import { router, Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

// Tab bar colors are now derived from theme

// Android tab icon mapping (Ionicons)
type IconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<string, { default: IconName; selected: IconName }> = {
  index: { default: 'home-outline', selected: 'home' },
  leads: { default: 'people-outline', selected: 'people' },
  quotes: { default: 'document-text-outline', selected: 'document-text' },
  contacts: { default: 'person-circle-outline', selected: 'person-circle' },
  more: { default: 'menu-outline', selected: 'menu' },
};

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const insets = useSafeAreaInsets();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const themeColors = {
    background: colors.background,
    tint: colors.foreground,
    inactive: colors.mutedForeground,
  };

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  // iOS: Use NativeTabs for liquid glass effect
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs
        tintColor={DynamicColorIOS({
          dark: Colors.dark.foreground,
          light: Colors.light.foreground,
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

        <NativeTabs.Trigger name="contacts">
          <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
          <Label>Contacts</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="quotes">
          <Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
          <Label>Quotes</Label>
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
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom - 8, 0),
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
        name="quotes"
        options={{
          title: 'Quotes',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tabIcons.quotes.selected : tabIcons.quotes.default}
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
