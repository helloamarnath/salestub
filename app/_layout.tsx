import '../lib/firebase/background-task';
import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationProvider } from '@/contexts/notification-context';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutNav() {
  const { resolvedTheme } = useTheme();

  // Style Android system navigation bar buttons to match app theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
  }, [resolvedTheme]);

  return (
    <NavigationThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="products" options={{ headerShown: false }} />
        <Stack.Screen name="deals" options={{ headerShown: false }} />
        <Stack.Screen name="invoices" options={{ headerShown: false }} />
        <Stack.Screen name="leads" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="contacts" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="quotes-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="activities" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="system">
          <NotificationProvider>
            <RootLayoutNav />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
