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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { useAuth } from '@/contexts/auth-context';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMfa, setShowMfa] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const orb1Anim = useRef(new Animated.ValueXY({ x: -80, y: 100 })).current;
  const orb2Anim = useRef(new Animated.ValueXY({ x: width - 100, y: height - 200 })).current;

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
    <View className="flex-1">
      {/* Gradient background */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
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
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            className="flex-1 px-6 pt-20 pb-8"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 rounded-2xl bg-white/10 items-center justify-center mb-4">
                <Image
                  source={require('@/assets/images/splash-icon.png')}
                  style={{ width: 48, height: 48 }}
                  contentFit="contain"
                />
              </View>
              <Text className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </Text>
              <Text className="text-base text-white/60">
                Sign in to continue to SalesTub
              </Text>
            </View>

            {/* Login form - Glass card */}
            <View style={styles.glassCard}>
              <BlurView intensity={25} tint="dark" style={styles.blurView}>
                <View className="p-6">
                  {/* Email input */}
                  <View className="mb-5">
                    <Text className="text-sm text-white/70 mb-2 ml-1">
                      Email Address
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color="rgba(255,255,255,0.5)"
                        style={{ marginRight: 12 }}
                      />
                      <TextInput
                        className="flex-1 text-white text-base"
                        placeholder="Enter your email"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </View>
                  </View>

                  {/* Password input */}
                  <View className="mb-6">
                    <Text className="text-sm text-white/70 mb-2 ml-1">
                      Password
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="rgba(255,255,255,0.5)"
                        style={{ marginRight: 12 }}
                      />
                      <TextInput
                        className="flex-1 text-white text-base"
                        placeholder="Enter your password"
                        placeholderTextColor="rgba(255,255,255,0.3)"
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
                          color="rgba(255,255,255,0.5)"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* MFA Code input (shown when required) */}
                  {showMfa && (
                    <View className="mb-5">
                      <Text className="text-sm text-white/70 mb-2 ml-1">
                        2FA Code
                      </Text>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="keypad-outline"
                          size={20}
                          color="rgba(255,255,255,0.5)"
                          style={{ marginRight: 12 }}
                        />
                        <TextInput
                          className="flex-1 text-white text-base"
                          placeholder="Enter 6-digit code"
                          placeholderTextColor="rgba(255,255,255,0.3)"
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
                    <View className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30">
                      <Text className="text-red-400 text-sm text-center">
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  {/* Forgot password */}
                  <TouchableOpacity className="self-end mb-6">
                    <Text className="text-primary text-sm font-medium">
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
                        <View className="flex-row items-center">
                          <Animated.View style={styles.loadingDot} />
                          <Text className="text-white text-base font-semibold ml-2">
                            Signing in...
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-white text-base font-semibold">
                          Sign In
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            {/* Sign up link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-white/60 text-base">
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text className="text-primary text-base font-semibold">
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
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurView: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});
