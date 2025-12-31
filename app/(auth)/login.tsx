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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { useAuth } from '@/contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Brand Icon Component - white icon on gradient background
function LogoIcon({ size = 72 }: { size?: number }) {
  return (
    <View style={[logoIconStyles.container, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={logoIconStyles.shine} />
      <Image
        source={require('@/assets/logos/icon-white.svg')}
        style={{ width: size * 0.6, height: size * 0.6 }}
        contentFit="contain"
      />
    </View>
  );
}

const logoIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '50%',
    bottom: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomRightRadius: 100,
  },
});

export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animation refs
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Floating orb positions
  const orb1Position = useRef(new Animated.ValueXY({ x: -100, y: 80 })).current;
  const orb2Position = useRef(new Animated.ValueXY({ x: width - 80, y: height - 200 })).current;
  const orb3Position = useRef(new Animated.ValueXY({ x: width - 150, y: 150 })).current;
  const orb4Position = useRef(new Animated.ValueXY({ x: 50, y: height - 350 })).current;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)' as Href);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Staggered entry animations
    Animated.sequence([
      // Logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      // Title
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Card
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Footer
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating orbs animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb1Position, {
            toValue: { x: -50, y: 180 },
            duration: 7000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Position, {
            toValue: { x: -100, y: 80 },
            duration: 7000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb2Position, {
            toValue: { x: width - 150, y: height - 280 },
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Position, {
            toValue: { x: width - 80, y: height - 200 },
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb3Position, {
            toValue: { x: width - 100, y: 220 },
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(orb3Position, {
            toValue: { x: width - 150, y: 150 },
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb4Position, {
            toValue: { x: 100, y: height - 420 },
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(orb4Position, {
            toValue: { x: 50, y: height - 350 },
            duration: 9000,
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

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

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
        return;
      }

      if (result.requiresMfa) {
        setShowMfa(true);
        setError('');
        setIsLoading(false);
        return;
      }

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

  const handleForgotPassword = async () => {
    await WebBrowser.openBrowserAsync('https://app.salestub.com/auth/forgot-password');
  };

  return (
    <View style={styles.container}>
      {/* Dark gradient background */}
      <LinearGradient
        colors={['#0a0f1a', '#0f172a', '#162033', '#0f172a', '#0a0f1a']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Mesh gradient overlay */}
      <View style={styles.meshOverlay}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.08)', 'transparent', 'rgba(139, 92, 246, 0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Floating orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateX: orb1Position.x }, { translateY: orb1Position.y }] },
        ]}
      >
        <LinearGradient
          colors={['#3b82f6', '#60a5fa', '#93c5fd']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateX: orb2Position.x }, { translateY: orb2Position.y }] },
        ]}
      >
        <LinearGradient
          colors={['#ec4899', '#f472b6', '#f9a8d4']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          { transform: [{ translateX: orb3Position.x }, { translateY: orb3Position.y }] },
        ]}
      >
        <LinearGradient
          colors={['#8b5cf6', '#a78bfa', '#c4b5fd']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb4,
          { transform: [{ translateX: orb4Position.x }, { translateY: orb4Position.y }] },
        ]}
      >
        <LinearGradient
          colors={['#06b6d4', '#22d3ee', '#67e8f9']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <LogoIcon size={72} />
            </View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to SalesTub</Text>
          </Animated.View>

          {/* Login form - Glass card */}
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}
          >
            <View style={styles.glassCard}>
              <BlurView intensity={30} tint="dark" style={styles.blurView}>
                <View style={styles.formContent}>
                  {/* Email input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        focusedInput === 'email' && styles.inputContainerFocused,
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={focusedInput === 'email' ? '#3b82f6' : 'rgba(255,255,255,0.4)'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>
                  </View>

                  {/* Password input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        focusedInput === 'password' && styles.inputContainerFocused,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={focusedInput === 'password' ? '#3b82f6' : 'rgba(255,255,255,0.4)'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={20}
                          color="rgba(255,255,255,0.4)"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* MFA Code input (shown when required) */}
                  {showMfa && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>2FA Code</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          focusedInput === 'mfa' && styles.inputContainerFocused,
                        ]}
                      >
                        <Ionicons
                          name="keypad-outline"
                          size={20}
                          color={focusedInput === 'mfa' ? '#3b82f6' : 'rgba(255,255,255,0.4)'}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter 6-digit code"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={mfaCode}
                          onChangeText={setMfaCode}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoComplete="one-time-code"
                          onFocus={() => setFocusedInput('mfa')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>
                    </View>
                  )}

                  {/* Error message */}
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={18} color="#ef4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Forgot password */}
                  <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>

                  {/* Login button */}
                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                      onPress={handleLogin}
                      disabled={isLoading}
                      activeOpacity={0.9}
                      style={styles.buttonContainer}
                    >
                      <LinearGradient
                        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.loginButton}
                      >
                        {isLoading ? (
                          <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="white" />
                            <Text style={styles.loginButtonText}>Signing in...</Text>
                          </View>
                        ) : (
                          <View style={styles.buttonContent}>
                            <Text style={styles.loginButtonText}>Sign In</Text>
                            <View style={styles.buttonIconContainer}>
                              <Ionicons name="arrow-forward" size={18} color="white" />
                            </View>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </BlurView>
            </View>
          </Animated.View>

          {/* Sign up link */}
          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
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
  meshOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  orb1: {
    width: 250,
    height: 250,
  },
  orb2: {
    width: 200,
    height: 200,
  },
  orb3: {
    width: 180,
    height: 180,
  },
  orb4: {
    width: 160,
    height: 160,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  cardWrapper: {
    marginBottom: 24,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blurView: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  formContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputContainerFocused: {
    borderColor: 'rgba(59, 130, 246, 0.5)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#60a5fa',
  },
  buttonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60a5fa',
  },
});
