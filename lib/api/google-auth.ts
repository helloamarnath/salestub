import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  type: 'success' | 'cancel' | 'error';
  idToken?: string;
  error?: string;
}

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const platformClientId = Platform.select({
  ios: iosClientId,
  android: androidClientId,
  web: webClientId,
  default: webClientId,
});

const isConfigured = Boolean(platformClientId);

function useGoogleAuthReal(onResult: (result: GoogleAuthResult) => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken =
        response.authentication?.idToken ??
        (response.params as { id_token?: string } | undefined)?.id_token;

      if (idToken) {
        onResult({ type: 'success', idToken });
      } else {
        onResult({
          type: 'error',
          error:
            'Google sign-in returned no ID token. Verify openid scope and that the OAuth client is correctly configured.',
        });
      }
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      onResult({ type: 'cancel' });
    } else if (response.type === 'error') {
      onResult({
        type: 'error',
        error: response.error?.message || 'Google sign-in failed.',
      });
    }
  }, [response, onResult]);

  return { request, promptAsync };
}

function useGoogleAuthStub(_onResult: (result: GoogleAuthResult) => void) {
  return {
    request: null,
    promptAsync: async () => {
      if (__DEV__) {
        console.warn(
          '[google-auth] Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.',
        );
      }
      return { type: 'dismiss' as const };
    },
  };
}

export const useGoogleAuth = isConfigured ? useGoogleAuthReal : useGoogleAuthStub;
