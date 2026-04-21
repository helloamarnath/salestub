import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// ─── Brand Logo ───────────────────────────────────────────────────────────────
function LogoIcon({ size = 72 }: { size?: number }) {
  return (
    <View style={[logoStyles.container, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <LinearGradient
        colors={[Colors.dark.primary, Colors.dark.primary, '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={logoStyles.shine} />
      <Image
        source={require('@/assets/logos/icon-white.svg')}
        style={{ width: size * 0.6, height: size * 0.6 }}
        contentFit="contain"
      />
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: {
    position: 'absolute', top: 0, left: 0, right: '50%', bottom: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)', borderBottomRightRadius: 100,
  },
});

// ─── Sparkle Decoration ───────────────────────────────────────────────────────
function Sparkle({ size = 16, color = '#f59e0b', style }: { size?: number; color?: string; style?: object }) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 1, opacity: 0.8 }} />
      <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color, borderRadius: 1, opacity: 0.8 }} />
      <View style={{ position: 'absolute', width: size * 0.7, height: 2, backgroundColor: color, borderRadius: 1, opacity: 0.5, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: 2, height: size * 0.7, backgroundColor: color, borderRadius: 1, opacity: 0.5, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

// ─── Avatar Circle ─────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 52, icon }: { initials?: string; color: string; size?: number; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2.5, borderColor: 'white',
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    }}>
      {icon ? (
        <View style={{
          width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25,
          backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={icon} size={size * 0.3} color="white" />
        </View>
      ) : (
        <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.32 }}>{initials}</Text>
      )}
    </View>
  );
}

// ─── Slide 1 Illustration: Lead Pipeline Orbit ────────────────────────────────
function Slide1Illustration() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const avatars = [
    { color: '#f97316', initials: 'AK', angle: 0, r: 108 },
    { color: '#8b5cf6', initials: 'PL', angle: 72, r: 108 },
    { color: '#06b6d4', initials: 'SR', angle: 144, r: 108 },
    { color: '#10b981', initials: 'MJ', angle: 216, r: 108 },
    { color: '#ec4899', initials: 'VN', angle: 288, r: 108 },
  ];

  return (
    <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
      {/* Orbit ring */}
      <View style={{
        position: 'absolute', width: 240, height: 240, borderRadius: 120,
        borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.2)', borderStyle: 'dashed',
      }} />
      {/* Inner ring */}
      <View style={{
        position: 'absolute', width: 170, height: 170, borderRadius: 85,
        borderWidth: 1, borderColor: 'rgba(59,130,246,0.12)',
      }} />

      {/* Center logo pill */}
      <Animated.View style={{ transform: [{ scale: pulse }], alignItems: 'center' }}>
        <View style={{
          backgroundColor: 'white', borderRadius: 28, paddingHorizontal: 18, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
        }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#1e293b', letterSpacing: 0.2 }}>SalesTub</Text>
        </View>
      </Animated.View>

      {/* Orbit avatars */}
      {avatars.map((a, i) => {
        const rad = (a.angle - 90) * (Math.PI / 180);
        const x = Math.cos(rad) * a.r;
        const y = Math.sin(rad) * a.r;
        return (
          <View key={i} style={{ position: 'absolute', transform: [{ translateX: x }, { translateY: y }] }}>
            <Avatar initials={a.initials} color={a.color} size={48} />
          </View>
        );
      })}

      {/* Badge icons at edges */}
      <View style={{ position: 'absolute', left: -4, top: 70 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
          <Ionicons name="briefcase-outline" size={18} color="white" />
        </View>
      </View>
      <View style={{ position: 'absolute', right: -4, top: 70 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
          <Ionicons name="basket-outline" size={18} color="white" />
        </View>
      </View>

      {/* Sparkles */}
      <Sparkle size={14} color="#f59e0b" style={{ position: 'absolute', top: 10, right: 48 }} />
      <Sparkle size={10} color="#8b5cf6" style={{ position: 'absolute', bottom: 20, left: 44 }} />
      <Sparkle size={12} color="#06b6d4" style={{ position: 'absolute', top: 55, left: 14 }} />
    </View>
  );
}

// ─── Slide 2 Illustration: Activity Cards Mockup ─────────────────────────────
function Slide2Illustration() {
  const slideIn = useRef(new Animated.Value(20)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ width: 280, opacity: fadeIn, transform: [{ translateY: slideIn }] }}>
      {/* Card 1 */}
      <View style={{
        backgroundColor: 'white', borderRadius: 16, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
        marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Avatar initials="SR" color="#3b82f6" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#1e293b' }}>School PTA Meeting</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>5:00 PM · MIT School</Text>
        </View>
        <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#d97706' }}>Today</Text>
        </View>
      </View>

      {/* Card 2 */}
      <View style={{
        backgroundColor: 'white', borderRadius: 16, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
        marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Avatar initials="MJ" color="#8b5cf6" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: '#1e293b' }}>Demo Call</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>11:30 AM · Prospect Inc</Text>
        </View>
        <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#16a34a' }}>Tomorrow</Text>
        </View>
      </View>

      {/* Task checkbox */}
      <View style={{
        backgroundColor: 'white', borderRadius: 16, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#3b82f6' }} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#1e293b' }}>Follow up with lead</Text>
      </View>

      {/* Bottom avatars */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 10 }}>
        {['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'].map((c, i) => (
          <Avatar key={i} initials={['AK', 'SR', 'PL', 'MJ', 'VN'][i]} color={c} size={38} />
        ))}
      </View>

      {/* Sparkles */}
      <Sparkle size={14} color="#f59e0b" style={{ position: 'absolute', top: -10, right: 20 }} />
      <Sparkle size={10} color="#10b981" style={{ position: 'absolute', bottom: 56, left: -8 }} />
    </Animated.View>
  );
}

// ─── Slide 3 Illustration: Team Grid ─────────────────────────────────────────
function Slide3Illustration() {
  const members = [
    { color: '#f97316', initials: 'AK', tall: true },
    { color: '#3b82f6', initials: 'SR', tall: false },
    { color: '#8b5cf6', initials: 'PL', tall: false },
    { color: '#10b981', initials: 'MJ', tall: true },
    { color: '#ec4899', initials: 'RV', tall: false },
    { color: '#06b6d4', initials: 'VN', tall: false },
  ];

  const badges = [
    { icon: 'basket-outline' as keyof typeof Ionicons.glyphMap, color: '#1e293b', col: 1, row: 1 },
    { icon: 'star-outline' as keyof typeof Ionicons.glyphMap, color: '#1e293b', col: 0, row: 2 },
    { icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, color: '#1e293b', col: 2, row: 1 },
  ];

  return (
    <View style={{ width: 280, height: 300, flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2].map(col => (
        <View key={col} style={{ gap: 8, flex: 1, flexDirection: 'column', alignItems: 'center', paddingTop: col === 1 ? 0 : 20 }}>
          {members
            .filter((_, i) => i % 3 === col)
            .map((m, row) => {
              const badgeInfo = badges.find(b => b.col === col && b.row === row);
              const h = m.tall ? 160 : 128;
              return (
                <View key={row} style={{ position: 'relative' }}>
                  <View style={{
                    width: 80, height: h, borderRadius: 40,
                    backgroundColor: m.color,
                    alignItems: 'center', justifyContent: 'flex-end',
                    paddingBottom: 16, overflow: 'hidden',
                    shadowColor: m.color, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
                  }}>
                    {/* Gradient overlay */}
                    <LinearGradient
                      colors={['rgba(255,255,255,0.15)', 'rgba(0,0,0,0.2)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>{m.initials}</Text>
                  </View>
                  {badgeInfo && (
                    <View style={{
                      position: 'absolute', bottom: 10, right: -6,
                      width: 30, height: 30, borderRadius: 10,
                      backgroundColor: badgeInfo.color, alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
                      borderWidth: 2, borderColor: 'white',
                    }}>
                      <Ionicons name={badgeInfo.icon} size={14} color="white" />
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      ))}

      {/* Sparkles */}
      <Sparkle size={14} color="#f59e0b" style={{ position: 'absolute', top: 10, left: 10 }} />
      <Sparkle size={10} color="#8b5cf6" style={{ position: 'absolute', top: 30, right: 8 }} />
      <Sparkle size={12} color="#10b981" style={{ position: 'absolute', bottom: 20, left: 30 }} />
    </View>
  );
}

// ─── Onboarding Data ──────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'slide1',
    bg1: '#fff8f0' as const,
    bg2: '#ffeedd' as const,
    accent: '#f97316',
    title: 'Manage All Your\nLeads Effortlessly',
    description: 'Capture, organize & nurture leads with a visual pipeline built for sales teams.',
    illustration: <Slide1Illustration />,
  },
  {
    key: 'slide2',
    bg1: '#f8faff' as const,
    bg2: '#eef3ff' as const,
    accent: '#3b82f6',
    title: 'Never Miss a\nFollow-Up Again',
    description: 'AI suggests next steps, reminds tasks, and keeps your deals moving forward.',
    illustration: <Slide2Illustration />,
  },
  {
    key: 'slide3',
    bg1: '#f8fff9' as const,
    bg2: '#eefff2' as const,
    accent: '#10b981',
    title: 'Your Whole Team\nin Perfect Sync',
    description: 'Assign leads, share notes, and keep every team member aligned in real time.',
    illustration: <Slide3Illustration />,
  },
];

// ─── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const colors = Colors.dark;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <View style={[splashStyles.orb, { top: -100, left: -80, backgroundColor: 'rgba(59,130,246,0.12)' }]} />
      <View style={[splashStyles.orb, { bottom: -80, right: -80, backgroundColor: 'rgba(139,92,246,0.12)', width: 250, height: 250 }]} />
      <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(59,130,246,0.15)', opacity: glowAnim }} />
        <LogoIcon size={80} />
      </Animated.View>
      <Text style={{ fontSize: 32, fontWeight: '700', color: 'white', marginTop: 24 }}>SalesTub</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Loading your workspace…</Text>
      <View style={{ marginTop: 36, width: 100, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', borderRadius: 2, width: progressWidth, overflow: 'hidden' }}>
          <LinearGradient colors={[colors.primary, Palette.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
});

// ─── Onboarding Screen ─────────────────────────────────────────────────────────
function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const dot0 = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dotAnimations = [dot0, dot1, dot2];

  useEffect(() => {
    SLIDES.forEach((_, i) => {
      Animated.timing(dotAnimations[i], {
        toValue: i === activeIndex ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.replace('/(auth)/login' as Href);
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={{ width, flex: 1 }}>
      <LinearGradient
        colors={[item.bg1, item.bg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top logo bar */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <Image
          source={require('@/assets/logos/logo.svg')}
          style={{ width: 120, height: 30 }}
          contentFit="contain"
        />
      </View>

      {/* Illustration area */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 12 }}>
        {item.illustration}
      </View>
    </View>
  );

  const slide = SLIDES[activeIndex];

  return (
    <View style={{ flex: 1, backgroundColor: slide.bg1 }}>
      {/* Slide list */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={i => i.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        style={{ flex: 1 }}
        scrollEventThrottle={16}
      />

      {/* Bottom panel */}
      <View style={{
        paddingHorizontal: 28,
        paddingBottom: insets.bottom + 24,
        paddingTop: 24,
        backgroundColor: colors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 20,
        elevation: 10,
      }}>
        {/* Title */}
        <Text style={{
          fontSize: 26, fontWeight: '800', color: colors.foreground,
          textAlign: 'center', lineHeight: 34, marginBottom: 10,
        }}>
          {slide.title}
        </Text>

        {/* Description */}
        <Text style={{
          fontSize: 14, color: colors.mutedForeground, textAlign: 'center',
          lineHeight: 22, marginBottom: 28,
        }}>
          {slide.description}
        </Text>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, gap: 6 }}>
          {SLIDES.map((_, i) => {
            const dotWidth = dotAnimations[i].interpolate({ inputRange: [0, 1], outputRange: [8, 24] });
            const dotColor = dotAnimations[i].interpolate({ inputRange: [0, 1], outputRange: [colors.border, slide.accent] });
            return (
              <Animated.View key={i} style={{ height: 8, borderRadius: 4, width: dotWidth, backgroundColor: dotColor }} />
            );
          })}
        </View>

        {/* CTA Button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <View style={{
            backgroundColor: isDark ? colors.primary : '#0f172a',
            borderRadius: 50,
            paddingVertical: 16, paddingHorizontal: 32,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            shadowColor: isDark ? 'transparent' : '#0f172a',
            shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
          }}>
            <Text style={{ color: isDark ? colors.primaryForeground : 'white', fontWeight: '700', fontSize: 16 }}>
              {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={isDark ? colors.primaryForeground : 'white'} />
          </View>
        </TouchableOpacity>

        {/* Sign in link — only on last slide */}
        {activeIndex === SLIDES.length - 1 && (
          <TouchableOpacity onPress={() => router.replace('/(auth)/login' as Href)} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              Already have an account?{' '}
              <Text style={{ color: Palette.blue, fontWeight: '600' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Root Screen ───────────────────────────────────────────────────────────────
export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasNavigated && isAuthenticated) {
      setHasNavigated(true);
      setTimeout(() => router.replace('/(tabs)' as Href), 100);
    }
  }, [isLoading, isAuthenticated, hasNavigated]);

  if (isLoading || isAuthenticated) return <SplashScreen />;
  return <OnboardingScreen />;
}
