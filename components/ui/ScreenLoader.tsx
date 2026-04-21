import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = 160;

// ─── Spinning arc ─────────────────────────────────────────────────────────────
function SpinnerArc({ size, color, trackColor }: { size: number; color: string; trackColor: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const r = size / 2;

  return (
    <View style={{ width: size, height: size, position: 'absolute' }}>
      {/* Track ring */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 2.5,
          borderColor: trackColor,
          position: 'absolute',
        }}
      />
      {/* Spinning arc — 3/4 arc trick: only top+right+left border visible */}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 2.5,
          borderTopColor: color,
          borderRightColor: color,
          borderBottomColor: 'transparent',
          borderLeftColor: color,
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}

// ─── Shimmer progress bar ─────────────────────────────────────────────────────
function ShimmerBar({ barColor, shimmerColor }: { barColor: string; shimmerColor: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-BAR_WIDTH)).current;

  useEffect(() => {
    // Progress fill: 0 → full → reset, loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: BAR_WIDTH,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Shimmer highlight sliding across
    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(shimmerX, {
          toValue: BAR_WIDTH,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: -BAR_WIDTH,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View
      style={{
        width: BAR_WIDTH,
        height: 3,
        borderRadius: 2,
        backgroundColor: 'transparent',
        overflow: 'hidden',
        marginTop: 32,
      }}
    >
      {/* Track */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: 2, backgroundColor: barColor, opacity: 0.18 }]} />
      {/* Fill */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 2,
          backgroundColor: barColor,
          width: progress,
          overflow: 'hidden',
        }}
      >
        {/* Shimmer highlight */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 40,
            backgroundColor: shimmerColor,
            opacity: 0.5,
            transform: [{ translateX: shimmerX }],
          }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Main ScreenLoader ────────────────────────────────────────────────────────
interface ScreenLoaderProps {
  message?: string;
}

export function ScreenLoader({ message }: ScreenLoaderProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const logoScale = useRef(new Animated.Value(0.92)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Subtle breathing on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 0.94, duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Theme-specific colors
  const bg = isDark ? '#0c0e14' : '#f5f7ff';
  const glowColor = isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)';
  const arcColor = isDark ? '#818cf8' : '#6366f1';
  const arcTrack = isDark ? 'rgba(129,140,248,0.15)' : 'rgba(99,102,241,0.12)';
  const iconBg = isDark ? '#1e2030' : '#ffffff';
  const iconShadow = isDark ? '#6366f1' : '#6366f1';
  const wordmarkColor = isDark ? 'rgba(255,255,255,0.85)' : '#1e1e2e';
  const msgColor = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(30,30,46,0.38)';
  const barColor = isDark ? '#818cf8' : '#6366f1';
  const shimmerColor = isDark ? '#c7d2fe' : '#a5b4fc';

  const SPINNER_SIZE = 88;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Radial glow blob behind the icon */}
      <View
        style={[
          styles.glowBlob,
          { backgroundColor: glowColor },
        ]}
      />

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {/* Spinner + Icon stack */}
        <View style={{ width: SPINNER_SIZE, height: SPINNER_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <SpinnerArc size={SPINNER_SIZE} color={arcColor} trackColor={arcTrack} />

          {/* Icon mark */}
          <Animated.View
            style={[
              styles.iconWrap,
              {
                backgroundColor: iconBg,
                shadowColor: iconShadow,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('@/assets/logos/icon-white.svg')}
              style={styles.iconImg}
              contentFit="contain"
              tintColor={arcColor}
            />
          </Animated.View>
        </View>

        {/* Wordmark */}
        <Text style={[styles.wordmark, { color: wordmarkColor }]}>SalesTub</Text>

        {/* Optional message */}
        {message ? (
          <Text style={[styles.message, { color: msgColor }]}>{message}</Text>
        ) : null}

        {/* Progress shimmer bar */}
        <ShimmerBar barColor={barColor} shimmerColor={shimmerColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBlob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  iconImg: {
    width: 28,
    height: 28,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 22,
  },
  message: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 6,
    letterSpacing: 0.1,
  },
});
