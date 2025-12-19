import { useEffect, useRef } from 'react';
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

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
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
    <View className="flex-1">
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
      <View className="flex-1 px-6 pt-20 pb-12">
        {/* Logo Section */}
        <View className="flex-1 items-center justify-center">
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

          <Animated.View style={{ opacity: contentOpacity }} className="mt-8">
            <Text className="text-5xl font-bold text-white text-center mb-3">
              SalesTub
            </Text>
            <Text className="text-lg text-white/60 text-center mb-10">
              Your CRM, Simplified
            </Text>

            {/* Feature highlights */}
            <View style={styles.featuresContainer}>
              <BlurView intensity={20} tint="dark" style={styles.featuresBlur}>
                <View className="py-5 px-6">
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
              <Text className="text-white text-lg font-semibold mr-2">
                Get Started
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <Text className="text-white/40 text-center text-sm mt-4">
            Already have an account?{' '}
            <Text
              className="text-primary font-medium"
              onPress={handleGetStarted}
            >
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
    <View className="flex-row items-center py-3">
      <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4">
        <Ionicons name={icon} size={20} color="#3b82f6" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-semibold text-base">{title}</Text>
        <Text className="text-white/50 text-sm">{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  featuresContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
});
