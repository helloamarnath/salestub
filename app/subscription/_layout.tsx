import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

export default function SubscriptionLayout() {
  const { resolvedTheme } = useTheme();
  const colors = Colors[resolvedTheme];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="billing" />
    </Stack>
  );
}
