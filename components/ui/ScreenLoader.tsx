import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';

function PulseRing({ color, size, delay }: { color: string; size: number; delay: number }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function DotsRow({ color }: { color: string }) {
  const d = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    d.forEach((val, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(val, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 340, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 28 }}>
      {d.map((val, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: color,
            opacity: val,
            transform: [{ scale: val }],
          }}
        />
      ))}
    </View>
  );
}

interface ScreenLoaderProps {
  message?: string;
}

export function ScreenLoader({ message }: ScreenLoaderProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const gradientColors: [string, string, string] = [
    colors.background,
    colors.card,
    colors.background,
  ];

  const dotColor = isDark ? 'rgba(255,255,255,0.55)' : Palette.blue;
  const ringColor = isDark ? 'rgba(255,255,255,0.12)' : `${Palette.blue}22`;
  const iconBg = isDark ? 'rgba(255,255,255,0.08)' : `${Palette.blue}15`;
  const iconColor = isDark ? 'rgba(255,255,255,0.6)' : Palette.blue;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        {/* Pulse rings */}
        <PulseRing color={ringColor} size={110} delay={0} />
        <PulseRing color={ringColor} size={140} delay={400} />

        {/* Icon mark */}
        <Animated.View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBg, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={[styles.innerDot, { backgroundColor: iconColor }]} />
          <View style={[styles.innerDot, styles.innerDotAlt, { backgroundColor: iconColor }]} />
        </Animated.View>

        {/* Label */}
        {message && (
          <Text style={[styles.message, { color: subtitleColor }]}>{message}</Text>
        )}

        {/* Dots */}
        <DotsRow color={dotColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.85,
  },
  innerDotAlt: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.5,
    marginTop: 6,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 20,
    letterSpacing: 0.2,
  },
});
