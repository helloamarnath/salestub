import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

export default function ContactsLayout() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="customer/[id]"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="customer/create"
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="organization/[id]"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="organization/create"
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
