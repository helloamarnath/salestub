import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMfa, setShowMfa] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const orb1Anim = useRef(new Animated.ValueXY({ x: -80, y: 100 })).current;
  const orb2Anim = useRef(new Animated.ValueXY({ x: width - 100, y: height - 200 })).current;

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)' as Href);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating orbs animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb1Anim, {
            toValue: { x: 20, y: 200 },
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Anim, {
            toValue: { x: -80, y: 100 },
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb2Anim, {
            toValue: { x: width - 180, y: height - 350 },
            duration: 7000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Anim, {
            toValue: { x: width - 100, y: height - 200 },
            duration: 7000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get device info for session tracking
      const deviceId = Device.deviceName || Device.modelName || 'Unknown Device';
      const deviceName = `${Device.brand || ''} ${Device.modelName || ''}`.trim() || 'Mobile Device';

      const result = await login({
        email: email.trim().toLowerCase(),
        password,
        mfaCode: showMfa ? mfaCode : undefined,
        deviceId,
        deviceName,
      });

      if (result.success) {
        // Navigation handled by isAuthenticated effect
        return;
      }

      if (result.requiresMfa) {
        setShowMfa(true);
        setError('');
        setIsLoading(false);
        return;
      }

      // Show error
      setError(result.error || 'Login failed. Please try again.');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    await WebBrowser.openBrowserAsync('https://app.salestub.com/auth/register');
  };

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: 280,
            height: 280,
            opacity: isDark ? 0.4 : 0.2,
            transform: [
              { translateX: orb1Anim.x },
              { translateY: orb1Anim.y },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#3b82f6', '#8b5cf6']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          {
            width: 220,
            height: 220,
            opacity: isDark ? 0.4 : 0.2,
            transform: [
              { translateX: orb2Anim.x },
              { translateY: orb2Anim.y },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#ec4899', '#f43f5e']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.1)' }]}>
                <Image
                  source={require('@/assets/images/splash-icon.png')}
                  style={styles.logoImage}
                  contentFit="contain"
                />
              </View>
              <Text style={[styles.title, { color: textColor }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: subtitleColor }]}>
                Sign in to continue to SalesTub
              </Text>
            </View>

            {/* Login form - Glass card */}
            <View style={[styles.glassCard, { borderColor: cardBorderColor }]}>
              <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={[styles.blurView, { backgroundColor: cardBg }]}>
                <View style={styles.formContent}>
                  {/* Email input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: subtitleColor }]}>
                      Email Address
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={mutedColor}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: textColor }]}
                        placeholder="Enter your email"
                        placeholderTextColor={placeholderColor}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </View>
                  </View>

                  {/* Password input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: subtitleColor }]}>
                      Password
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={mutedColor}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: textColor }]}
                        placeholder="Enter your password"
                        placeholderTextColor={placeholderColor}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={mutedColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* MFA Code input (shown when required) */}
                  {showMfa && (
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: subtitleColor }]}>
                        2FA Code
                      </Text>
                      <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                        <Ionicons
                          name="keypad-outline"
                          size={20}
                          color={mutedColor}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[styles.input, { color: textColor }]}
                          placeholder="Enter 6-digit code"
                          placeholderTextColor={placeholderColor}
                          value={mfaCode}
                          onChangeText={setMfaCode}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoComplete="one-time-code"
                        />
                      </View>
                    </View>
                  )}

                  {/* Error message */}
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Forgot password */}
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  {/* Login button */}
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButton}
                    >
                      {isLoading ? (
                        <View style={styles.loadingRow}>
                          <Animated.View style={styles.loadingDot} />
                          <Text style={styles.loginButtonText}>
                            Signing in...
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.loginButtonText}>
                          Sign In
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            {/* Sign up link */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: subtitleColor }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blurView: {},
  formContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 16,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
