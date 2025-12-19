import { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glassOpacity = useRef(new Animated.Value(0)).current;
  const orb1Position = useRef(new Animated.ValueXY({ x: -100, y: -100 })).current;
  const orb2Position = useRef(new Animated.ValueXY({ x: width, y: height })).current;
  const orb3Position = useRef(new Animated.ValueXY({ x: width / 2, y: -150 })).current;

  useEffect(() => {
    // Animate floating orbs
    const animateOrbs = () => {
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
    };

    animateOrbs();

    // Logo animation sequence
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
      Animated.timing(glassOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to login after animation
    const timer = setTimeout(() => {
      router.replace('/(auth)/login' as Href);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-background">
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
      <View className="flex-1 items-center justify-center px-8">
        {/* Glass card */}
        <Animated.View style={[styles.glassContainer, { opacity: glassOpacity }]}>
          <BlurView intensity={40} tint="dark" style={styles.blurView}>
            <View style={styles.glassContent}>
              {/* Logo */}
              <Animated.View
                style={{
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                }}
              >
                <View className="w-24 h-24 rounded-3xl bg-primary/20 items-center justify-center mb-6">
                  <Image
                    source={require('@/assets/images/splash-icon.png')}
                    style={{ width: 64, height: 64 }}
                    contentFit="contain"
                  />
                </View>
              </Animated.View>

              {/* App name */}
              <Animated.View style={{ opacity: textOpacity }}>
                <Text className="text-4xl font-bold text-white text-center mb-2">
                  SalesTub
                </Text>
                <Text className="text-base text-white/60 text-center">
                  Your CRM, Simplified
                </Text>
              </Animated.View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Loading indicator */}
        <Animated.View
          style={{ opacity: textOpacity }}
          className="absolute bottom-20"
        >
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <View className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
            <View className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.6,
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
  glassContainer: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurView: {
    padding: 40,
  },
  glassContent: {
    alignItems: 'center',
  },
});
