import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

export default function DealsLayout() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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
        name="[id]"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
