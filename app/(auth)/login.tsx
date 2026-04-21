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
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Logo ──────────────────────────────────────────────────────────────────────
function BrandLogo({ height = 32, isDark }: { height?: number; isDark: boolean }) {
  // logo.svg viewBox is 7890 x 2004 → aspect ratio ≈ 3.94 (for light bg)
  // logo-dark.svg for dark bg
  const logoWidth = height * 3.94;
  return (
    <Image
      source={isDark ? require('@/assets/logos/logo-dark.svg') : require('@/assets/logos/logo.svg')}
      style={{ width: logoWidth, height }}
      contentFit="contain"
    />
  );
}

// ─── Mini illustration: floating metric cards ──────────────────────────────────
function HeroIllustration({ cardBg, textColor }: { cardBg: string; textColor: string }) {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (val: Animated.Value, delay: number, range: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: -range, duration: 2000 + delay, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 2000 + delay, useNativeDriver: true }),
        ])
      );
    anim(float1, 0, 6).start();
    anim(float2, 300, 8).start();
    anim(float3, 600, 5).start();
  }, []);

  return (
    <View style={{ width: width - 48, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background accent blob */}
      <View style={{
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(59,130,246,0.08)', top: -20, left: width * 0.05,
      }} />
      <View style={{
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(249,115,22,0.07)', top: 10, right: width * 0.05,
      }} />

      {/* Card 1 — Leads won */}
      <Animated.View style={[styles.heroCard, { left: 0, top: 12, transform: [{ translateY: float1 }], backgroundColor: cardBg }]}>
        <View style={[styles.heroCardIcon, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="trending-up" size={14} color="#16a34a" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroCardLabel}>Leads Won</Text>
          <Text style={[styles.heroCardValue, { color: textColor }]}>24 this month</Text>
        </View>
        <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a' }}>↑ 18%</Text>
        </View>
      </Animated.View>

      {/* Card 2 — Pipeline */}
      <Animated.View style={[styles.heroCard, { right: 0, top: 52, transform: [{ translateY: float2 }], backgroundColor: cardBg }]}>
        <View style={[styles.heroCardIcon, { backgroundColor: '#eff6ff' }]}>
          <Ionicons name="bar-chart" size={14} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroCardLabel}>Pipeline</Text>
          <Text style={[styles.heroCardValue, { color: textColor }]}>₹12.4L active</Text>
        </View>
        <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#3b82f6' }}>Live</Text>
        </View>
      </Animated.View>

      {/* Card 3 — Tasks */}
      <Animated.View style={[styles.heroCard, { left: 16, bottom: 4, transform: [{ translateY: float3 }], backgroundColor: cardBg }]}>
        <View style={[styles.heroCardIcon, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#d97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroCardLabel}>Tasks due today</Text>
          <Text style={[styles.heroCardValue, { color: textColor }]}>3 follow-ups</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Input Field ───────────────────────────────────────────────────────────────
function InputField({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  maxLength,
  rightElement,
  focused,
  onFocus,
  onBlur,
  colors,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoComplete?: any;
  maxLength?: number;
  rightElement?: React.ReactNode;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  colors: typeof Colors.light;
  isDark: boolean;
}) {
  const fieldBoxStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: focused ? Palette.blue : colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    backgroundColor: focused
      ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff')
      : (isDark ? colors.input : '#f8faff'),
  };

  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={fieldBoxStyle}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? Palette.blue : colors.mutedForeground}
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={[styles.fieldInput, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#666666' : '#c0cdd9'}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {rightElement}
      </View>
    </View>
  );
}

// ─── Main Login Screen ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Entry animations
  const topAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)' as Href);
  }, [isAuthenticated]);

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(topAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) return setError('Please enter your email');
    if (!password) return setError('Please enter your password');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setIsLoading(true);
    setError('');
    try {
      const deviceId = Device.deviceName || Device.modelName || 'Unknown Device';
      const deviceName = `${Device.brand || ''} ${Device.modelName || ''}`.trim() || 'Mobile Device';

      const result = await login({
        email: email.trim().toLowerCase(),
        password,
        mfaCode: showMfa ? mfaCode : undefined,
        deviceId,
        deviceName,
      });

      if (result.success) return;
      if (result.requiresMfa) {
        setShowMfa(true);
        setError('');
        setIsLoading(false);
        return;
      }
      setError(result.error || 'Login failed. Please try again.');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => WebBrowser.openBrowserAsync('https://app.salestub.com/auth/register');
  const handleForgotPassword = () => WebBrowser.openBrowserAsync('https://app.salestub.com/auth/forgot-password');

  const signInBtnBg = isDark ? colors.primary : '#0f172a';
  const signInBtnText = isDark ? colors.primaryForeground : 'white';
  const signUpBtnBg = isDark ? colors.secondary : '#f8faff';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#f8faff' }}>
      {/* Subtle top gradient accent */}
      <LinearGradient
        colors={isDark ? ['rgba(59,130,246,0.05)', colors.background] as const : ['#e8f0ff', '#f8faff'] as const}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top: logo + hero */}
          <Animated.View style={{ opacity: topAnim }}>
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={colors.mutedForeground} />
              <Text style={{ fontSize: 14, color: colors.mutedForeground, fontWeight: '500' }}>Back</Text>
            </TouchableOpacity>

            {/* Brand row */}
            <View style={{ marginBottom: 24 }}>
              <BrandLogo height={34} isDark={isDark} />
            </View>

            {/* Hero illustration */}
            <HeroIllustration cardBg={colors.card} textColor={colors.foreground} />
          </Animated.View>

          {/* Form card */}
          <Animated.View style={{ opacity: cardAnim, transform: [{ translateY: cardY }] }}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {/* Heading */}
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.heading, { color: colors.foreground }]}>Welcome back</Text>
                <Text style={[styles.subheading, { color: colors.mutedForeground }]}>Sign in to your workspace</Text>
              </View>

              {/* Email */}
              <InputField
                icon="mail-outline"
                label="Email address"
                placeholder="you@company.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                focused={focused === 'email'}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                colors={colors}
                isDark={isDark}
              />

              {/* Password */}
              <InputField
                icon="lock-closed-outline"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                focused={focused === 'password'}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                colors={colors}
                isDark={isDark}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                }
              />

              {/* MFA */}
              {showMfa && (
                <InputField
                  icon="keypad-outline"
                  label="2FA Code"
                  placeholder="6-digit code"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  focused={focused === 'mfa'}
                  onFocus={() => setFocused('mfa')}
                  onBlur={() => setFocused(null)}
                  colors={colors}
                  isDark={isDark}
                />
              )}

              {/* Error */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Palette.red} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Forgot password */}
              <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: error ? 4 : 0 }}>
                <Text style={{ fontSize: 13, color: Palette.blue, fontWeight: '600' }}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign in button */}
              <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
                <View style={[styles.signInBtn, {
                  backgroundColor: signInBtnBg,
                  shadowColor: isDark ? 'transparent' : '#0f172a',
                }]}>
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color={signInBtnText} />
                      <Text style={[styles.signInBtnText, { color: signInBtnText }]}>Signing in…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.signInBtnText, { color: signInBtnText }]}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color={signInBtnText} />
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontWeight: '500' }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              {/* Sign up */}
              <TouchableOpacity onPress={handleSignUp} activeOpacity={0.85}>
                <View style={[styles.signUpBtn, {
                  borderColor: colors.border,
                  backgroundColor: signUpBtnBg,
                }]}>
                  <Ionicons name="person-add-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.signUpBtnText, { color: colors.foreground }]}>Create a new account</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <Text style={{ textAlign: 'center', fontSize: 12, color: colors.mutedForeground, marginTop: 20 }}>
            By signing in, you agree to our Terms & Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero cards
  heroCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    maxWidth: width * 0.52,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.06)',
  },
  heroCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 1,
  },
  heroCardValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Form card
  card: {
    borderRadius: 28,
    padding: 24,
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.06)',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
  },

  // Input
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
  },

  // Buttons
  signInBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 7,
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 50,
    paddingVertical: 14,
  },
  signUpBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
