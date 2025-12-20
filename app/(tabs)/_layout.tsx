import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import {
  NativeTabs,
  Icon,
  Label,
} from 'expo-router/unstable-native-tabs';
import { useAuth } from '@/contexts/auth-context';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing while loading auth state
  if (isLoading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/" />;
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
