import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  NativeTabs,
  Icon,
  Label,
} from 'expo-router/unstable-native-tabs';
import { useAuth } from '@/contexts/auth-context';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NativeTabs
      minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : undefined}
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
    backgroundColor: '#0f172a',
  },
});
