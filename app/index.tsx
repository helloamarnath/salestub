import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Brand Icon Component - white icon on gradient background
function LogoIcon({ size = 88 }: { size?: number }) {
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

const { width, height } = Dimensions.get('window');

// Splash Screen Component - shown while checking auth state
function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle rotation for the gradient ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.splashContainer}>
      <LinearGradient
        colors={['#0a0f1a', '#0f172a', '#1e293b', '#0f172a', '#0a0f1a']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background orbs */}
      <View style={[styles.splashOrb, styles.splashOrb1]} />
      <View style={[styles.splashOrb, styles.splashOrb2]} />
      <View style={[styles.splashOrb, styles.splashOrb3]} />

      {/* Center content */}
      <View style={styles.splashContent}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.splashGlowRing,
            { opacity: glowAnim, transform: [{ scale: pulseAnim }] },
          ]}
        />

        {/* Animated ring behind logo */}
        <Animated.View
          style={[
            styles.splashRing,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.splashRingGradient}
          />
        </Animated.View>

        {/* Logo with pulse */}
        <Animated.View
          style={[
            styles.splashLogoContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LogoIcon size={72} />
        </Animated.View>

        {/* App name */}
        <Text style={styles.splashTitle}>SalesTub</Text>
        <Text style={styles.splashSubtitle}>Loading your workspace...</Text>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <LoadingProgress />
          </View>
        </View>
      </View>
    </View>
  );
}

// Animated loading progress bar
function LoadingProgress() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.loadingProgress, { width: progressWidth }]}>
      <LinearGradient
        colors={['#3b82f6', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// Welcome Screen Component - shown when not authenticated
function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  // Feature animations
  const feature1Opacity = useRef(new Animated.Value(0)).current;
  const feature1TranslateX = useRef(new Animated.Value(-20)).current;
  const feature2Opacity = useRef(new Animated.Value(0)).current;
  const feature2TranslateX = useRef(new Animated.Value(-20)).current;
  const feature3Opacity = useRef(new Animated.Value(0)).current;
  const feature3TranslateX = useRef(new Animated.Value(-20)).current;

  // Floating orb positions
  const orb1Position = useRef(new Animated.ValueXY({ x: -80, y: 50 })).current;
  const orb2Position = useRef(new Animated.ValueXY({ x: width - 100, y: height - 250 })).current;
  const orb3Position = useRef(new Animated.ValueXY({ x: width / 2 - 50, y: -50 })).current;
  const orb4Position = useRef(new Animated.ValueXY({ x: 30, y: height - 400 })).current;

  useEffect(() => {
    // Floating orbs animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb1Position, {
            toValue: { x: 30, y: 150 },
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Position, {
            toValue: { x: -80, y: 50 },
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb2Position, {
            toValue: { x: width - 180, y: height - 350 },
            duration: 7000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Position, {
            toValue: { x: width - 100, y: height - 250 },
            duration: 7000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb3Position, {
            toValue: { x: width / 2 + 30, y: 100 },
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(orb3Position, {
            toValue: { x: width / 2 - 50, y: -50 },
            duration: 5000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb4Position, {
            toValue: { x: -20, y: height - 500 },
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(orb4Position, {
            toValue: { x: 30, y: height - 400 },
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo ring rotation
    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    // Staggered content animations
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      // Title
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Features container
      Animated.parallel([
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(featuresTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Staggered feature items
      Animated.parallel([
        Animated.timing(feature1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(feature1TranslateX, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(feature2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(feature2TranslateX, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(feature3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(feature3TranslateX, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      // Button
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.replace('/(auth)/login' as Href);
  };

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Animated gradient background */}
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
          colors={['rgba(59, 130, 246, 0.08)', 'transparent', 'rgba(139, 92, 246, 0.08)']}
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
          colors={['#8b5cf6', '#a78bfa', '#c4b5fd']}
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
          colors={['#06b6d4', '#22d3ee', '#67e8f9']}
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
          colors={['#10b981', '#34d399', '#6ee7b7']}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Content */}
      <View style={[styles.welcomeContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            {/* Glow effect behind logo */}
            <Animated.View style={[styles.logoGlow, { opacity: glowPulse }]}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.4)', 'rgba(139, 92, 246, 0.3)', 'transparent']}
                style={styles.logoGlowGradient}
              />
            </Animated.View>

            {/* Rotating ring */}
            <Animated.View style={[styles.logoRing, { transform: [{ rotate: logoSpin }] }]}>
              <LinearGradient
                colors={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoRingGradient}
              />
            </Animated.View>

            {/* Logo container */}
            <View style={styles.logoContainer}>
              <LogoIcon size={88} />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              marginTop: 28,
            }}
          >
            <Text style={styles.appTitle}>SalesTub</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Text style={styles.appSubtitle}>Your CRM, Simplified</Text>
          </Animated.View>

          {/* Feature highlights */}
          <Animated.View
            style={[
              styles.featuresContainer,
              {
                opacity: featuresOpacity,
                transform: [{ translateY: featuresTranslateY }],
              },
            ]}
          >
            <BlurView intensity={25} tint="dark" style={styles.featuresBlur}>
              <View style={styles.featuresContent}>
                <Animated.View
                  style={{
                    opacity: feature1Opacity,
                    transform: [{ translateX: feature1TranslateX }],
                  }}
                >
                  <FeatureItem
                    icon="people"
                    title="Manage Leads"
                    description="Capture, organize & nurture leads"
                    color="#3b82f6"
                    bgColor="rgba(59, 130, 246, 0.15)"
                  />
                </Animated.View>

                <View style={styles.featureDivider} />

                <Animated.View
                  style={{
                    opacity: feature2Opacity,
                    transform: [{ translateX: feature2TranslateX }],
                  }}
                >
                  <FeatureItem
                    icon="trending-up"
                    title="Track Deals"
                    description="Visual pipeline & forecasting"
                    color="#8b5cf6"
                    bgColor="rgba(139, 92, 246, 0.15)"
                  />
                </Animated.View>

                <View style={styles.featureDivider} />

                <Animated.View
                  style={{
                    opacity: feature3Opacity,
                    transform: [{ translateX: feature3TranslateX }],
                  }}
                >
                  <FeatureItem
                    icon="analytics"
                    title="Smart Insights"
                    description="AI-powered analytics & reports"
                    color="#06b6d4"
                    bgColor="rgba(6, 182, 212, 0.15)"
                  />
                </Animated.View>
              </View>
            </BlurView>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <Animated.View
          style={{
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          }}
        >
          {/* Trust badges */}
          <View style={styles.trustBadges}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10b981" />
              <Text style={styles.trustText}>Secure</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustBadge}>
              <Ionicons name="flash" size={14} color="#f59e0b" />
              <Text style={styles.trustText}>Fast</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustBadge}>
              <Ionicons name="cloud-done" size={14} color="#3b82f6" />
              <Text style={styles.trustText}>Cloud Sync</Text>
            </View>
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.9}
            style={styles.buttonContainer}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedButton}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In link */}
          <TouchableOpacity onPress={handleGetStarted} style={styles.signInContainer}>
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
    </View>
  );
}

// Main Index Screen - handles auth routing
export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // Only navigate once loading is complete and we haven't navigated yet
    if (!isLoading && !hasNavigated) {
      if (isAuthenticated) {
        setHasNavigated(true);
        // Use setTimeout to ensure navigation happens after render
        setTimeout(() => {
          router.replace('/(tabs)' as Href);
        }, 100);
      }
    }
  }, [isLoading, isAuthenticated, hasNavigated]);

  // Show splash screen while loading auth state
  if (isLoading) {
    return <SplashScreen />;
  }

  // If authenticated, keep showing splash until navigation completes
  if (isAuthenticated) {
    return <SplashScreen />;
  }

  // Show welcome screen for unauthenticated users
  return <WelcomeScreen />;
}

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  splashOrb1: {
    width: 350,
    height: 350,
    top: -120,
    left: -120,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  splashOrb2: {
    width: 280,
    height: 280,
    bottom: -100,
    right: -100,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  splashOrb3: {
    width: 200,
    height: 200,
    top: height * 0.3,
    right: -50,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashGlowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  splashRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 3,
  },
  splashRingGradient: {
    flex: 1,
    borderRadius: 80,
    opacity: 0.7,
  },
  splashLogoContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginTop: 28,
    letterSpacing: 1,
  },
  splashSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  loadingBar: {
    width: 120,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    borderRadius: 2,
  },

  // Welcome Screen Styles
  meshOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    width: 280,
    height: 280,
  },
  orb2: {
    width: 220,
    height: 220,
  },
  orb3: {
    width: 180,
    height: 180,
  },
  orb4: {
    width: 150,
    height: 150,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  logoGlowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  logoRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    padding: 2,
    left: -6,
    top: -6,
  },
  logoRingGradient: {
    flex: 1,
    borderRadius: 75,
    opacity: 0.5,
  },
  logoContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 10,
  },
  appTitle: {
    fontSize: 44,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  featuresContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    maxWidth: 380,
  },
  featuresBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  featuresContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  featureDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 4,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 10,
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
  },
  signInLink: {
    color: '#60a5fa',
    fontWeight: '600',
  },
});
