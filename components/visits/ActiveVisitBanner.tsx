import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Visit } from '@/types/visit';
import { VISIT_PURPOSE_LABELS } from '@/types/visit';
import { Palette } from '@/constants/theme';

interface ActiveVisitBannerProps {
  visit: Visit;
  onComplete: () => void;
  onPress: () => void;
}

function formatDuration(startedAt: string): string {
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function ActiveVisitBanner({ visit, onComplete, onPress }: ActiveVisitBannerProps) {
  const [elapsed, setElapsed] = useState(() => formatDuration(visit.startedAt));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatDuration(visit.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [visit.startedAt]);

  // Pulsing green dot animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          {/* Pulsing green dot */}
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />

          <View style={styles.textSection}>
            <Text style={styles.label} numberOfLines={1}>
              Visit in progress
            </Text>
            <Text style={styles.leadName} numberOfLines={1}>
              {visit.lead.title}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {/* Timer */}
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={14} color={Palette.emerald} />
            <Text style={styles.timerText}>{elapsed}</Text>
          </View>

          {/* Complete button */}
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.completeText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.30)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    minHeight: 50,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.emerald,
    marginRight: 10,
  },
  textSection: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.emerald,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  leadName: {
    fontSize: 13,
    fontWeight: '500',
    color: Palette.success,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.emerald,
    fontVariant: ['tabular-nums'],
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.emerald,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});
