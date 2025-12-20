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

const { width, height } = Dimensions.get('window');

// Splash Screen Component - shown while checking auth state
function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle rotation for the gradient ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
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
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background orbs */}
      <View style={[styles.splashOrb, styles.splashOrb1]} />
      <View style={[styles.splashOrb, styles.splashOrb2]} />

      {/* Center content */}
      <View style={styles.splashContent}>
        {/* Animated ring behind logo */}
        <Animated.View
          style={[
            styles.splashRing,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6', '#06b6d4', '#3b82f6']}
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
          <BlurView intensity={30} tint="dark" style={styles.splashLogoBlur}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={{ width: 64, height: 64 }}
              contentFit="contain"
            />
          </BlurView>
        </Animated.View>

        {/* App name */}
        <Text style={styles.splashTitle}>SalesTub</Text>
        <Text style={styles.splashSubtitle}>Loading...</Text>

        {/* Loading indicator */}
        <View style={styles.loadingDots}>
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>
      </View>
    </View>
  );
}

// Animated loading dot
function LoadingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay]);

  return (
    <Animated.View style={[styles.loadingDot, { opacity }]} />
  );
}

// Welcome Screen Component - shown when not authenticated
function WelcomeScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  const orb1Position = useRef(new Animated.ValueXY({ x: -100, y: -100 })).current;
  const orb2Position = useRef(new Animated.ValueXY({ x: width, y: height })).current;
  const orb3Position = useRef(new Animated.ValueXY({ x: width / 2, y: -150 })).current;

  useEffect(() => {
    // Animate floating orbs
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orb1Position, {
            toValue: { x: 50, y: 100 },
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1Position, {
            toValue: { x: -100, y: -100 },
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb2Position, {
            toValue: { x: width - 200, y: height - 300 },
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(orb2Position, {
            toValue: { x: width, y: height },
            duration: 5000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(orb3Position, {
            toValue: { x: width / 2 - 100, y: 200 },
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(orb3Position, {
            toValue: { x: width / 2, y: -150 },
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Content animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
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

  return (
    <View style={{ flex: 1 }}>
      {/* Animated gradient background */}
      <LinearGradient
        colors={['#0f172a', '#1e3a5f', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs for liquid effect */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            transform: [
              { translateX: orb1Position.x },
              { translateY: orb1Position.y },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#3b82f6', '#8b5cf6', '#06b6d4']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            transform: [
              { translateX: orb2Position.x },
              { translateY: orb2Position.y },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#8b5cf6', '#ec4899', '#f43f5e']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            transform: [
              { translateX: orb3Position.x },
              { translateY: orb3Position.y },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#06b6d4', '#10b981', '#3b82f6']}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.welcomeContent}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            <View style={styles.logoContainer}>
              <BlurView intensity={30} tint="dark" style={styles.logoBlur}>
                <Image
                  source={require('@/assets/images/splash-icon.png')}
                  style={{ width: 80, height: 80 }}
                  contentFit="contain"
                />
              </BlurView>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: contentOpacity, marginTop: 32 }}>
            <Text style={styles.appTitle}>SalesTub</Text>
            <Text style={styles.appSubtitle}>Your CRM, Simplified</Text>

            {/* Feature highlights */}
            <View style={styles.featuresContainer}>
              <BlurView intensity={20} tint="dark" style={styles.featuresBlur}>
                <View style={styles.featuresContent}>
                  <FeatureItem
                    icon="people-outline"
                    title="Manage Contacts"
                    description="Organize all your leads in one place"
                  />
                  <FeatureItem
                    icon="trending-up-outline"
                    title="Track Deals"
                    description="Monitor your sales pipeline"
                  />
                  <FeatureItem
                    icon="analytics-outline"
                    title="Insights"
                    description="Get actionable analytics"
                  />
                </View>
              </BlurView>
            </View>
          </Animated.View>
        </View>

        {/* Bottom Section - Get Started Button */}
        <Animated.View
          style={{
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          }}
        >
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
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.signInText}>
            Already have an account?{' '}
            <Text style={styles.signInLink} onPress={handleGetStarted}>
              Sign In
            </Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color="#3b82f6" />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
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
    width: 300,
    height: 300,
    top: -100,
    left: -100,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  splashOrb2: {
    width: 250,
    height: 250,
    bottom: -80,
    right: -80,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
  },
  splashRingGradient: {
    flex: 1,
    borderRadius: 70,
    opacity: 0.6,
  },
  splashLogoContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  splashLogoBlur: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 24,
  },
  splashSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },

  // Welcome Screen Styles
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    width: 300,
    height: 300,
  },
  orb2: {
    width: 250,
    height: 250,
  },
  orb3: {
    width: 200,
    height: 200,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoBlur: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  appTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  appSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  featuresContent: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
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
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
  },
  signInLink: {
    color: '#3b82f6',
    fontWeight: '500',
  },
});
