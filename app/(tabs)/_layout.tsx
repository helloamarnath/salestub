import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, DynamicColorIOS } from 'react-native';
import { router } from 'expo-router';
import {
  NativeTabs,
  Icon,
  Label,
} from 'expo-router/unstable-native-tabs';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';

// Color constants for tab bar theming
const colors = {
  light: {
    background: '#ffffff',
    tint: '#3b82f6', // Primary blue
    inactive: '#64748b', // Slate gray
    indicator: '#3b82f6',
    ripple: 'rgba(59, 130, 246, 0.12)',
  },
  dark: {
    background: '#0f172a', // Dark slate
    tint: '#60a5fa', // Lighter blue for dark mode
    inactive: '#94a3b8', // Lighter gray for visibility
    indicator: '#60a5fa',
    ripple: 'rgba(96, 165, 250, 0.12)',
  },
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
      // Use setTimeout to ensure we're not in a render cycle
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

  return (
    <NativeTabs
      minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : undefined}
      // Background color
      backgroundColor={themeColors.background}
      // Icon colors: default (inactive) and selected (active)
      iconColor={{
        default: themeColors.inactive,
        selected: themeColors.tint,
      }}
      // Label styling for both states
      labelStyle={{
        default: { color: themeColors.inactive },
        selected: { color: themeColors.tint },
      }}
      // Android-specific props
      {...(Platform.OS === 'android' && {
        indicatorColor: themeColors.indicator,
        rippleColor: themeColors.ripple,
      })}
      // iOS-specific: Use DynamicColorIOS for automatic adaptation
      {...(Platform.OS === 'ios' && {
        tintColor: DynamicColorIOS({
          dark: colors.dark.tint,
          light: colors.light.tint,
        }),
      })}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          drawable="ic_home"
        />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="leads">
        <Icon
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          drawable="ic_people"
        />
        <Label>Leads</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="deals">
        <Icon
          sf={{ default: 'briefcase', selected: 'briefcase.fill' }}
          drawable="ic_briefcase"
        />
        <Label>Deals</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="contacts">
        <Icon
          sf={{ default: 'person.circle', selected: 'person.circle.fill' }}
          drawable="ic_contact"
        />
        <Label>Contacts</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <Icon
          sf={{ default: 'line.3.horizontal', selected: 'line.3.horizontal' }}
          drawable="ic_menu"
        />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
