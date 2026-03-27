import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';

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
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="create" />
    </Stack>
  );
}
