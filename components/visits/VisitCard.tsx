import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Visit } from '@/types/visit';
import { Colors } from '@/constants/theme';
import { VisitStatusBadge, VisitPurposeBadge } from './VisitStatusBadge';

interface VisitCardProps {
  visit: Visit;
  onPress?: () => void;
  isDark?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(mins?: number): string {
  if (!mins) return '--';
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = Math.floor(mins / 60);
  const remaining = Math.round(mins % 60);
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatDistance(km?: number): string {
  if (!km) return '--';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

export function VisitCard({ visit, onPress, isDark = true }: VisitCardProps) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  // Theme-aware colors (matching LeadCard pattern)
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const metaBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const repName = visit.user
    ? `${visit.user.firstName} ${visit.user.lastName}`.trim()
    : 'Unknown';

  const photoCount = visit.photos?.length || 0;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={handlePress}
      disabled={!onPress}
    >
      <View style={[styles.container, { borderColor, backgroundColor: bgColor }]}>
        <View style={styles.content}>
          {/* Top Row: Badges */}
          <View style={styles.badgeRow}>
            <VisitPurposeBadge purpose={visit.purpose} size="small" />
            <VisitStatusBadge status={visit.status} size="small" />
          </View>

          {/* Lead Title */}
          <Text style={[styles.leadTitle, { color: textColor }]} numberOfLines={1}>
            {visit.lead.title}
          </Text>

          {/* Rep Name */}
          <View style={styles.repRow}>
            <Ionicons name="person-outline" size={12} color={subtitleColor} />
            <Text style={[styles.repName, { color: subtitleColor }]} numberOfLines={1}>
              {repName}
            </Text>
          </View>

          {/* Metadata Row: Date/Time, Duration, Distance, Photos */}
          <View style={[styles.metaRow, { backgroundColor: metaBg }]}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={mutedColor} />
              <Text style={[styles.metaText, { color: mutedColor }]}>
                {formatDate(visit.startedAt)} {formatTime(visit.startedAt)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={mutedColor} />
              <Text style={[styles.metaText, { color: mutedColor }]}>
                {formatDuration(visit.durationMins)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="navigate-outline" size={12} color={mutedColor} />
              <Text style={[styles.metaText, { color: mutedColor}]}>
                {formatDistance(visit.distanceKm)}
              </Text>
            </View>

            {photoCount > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="camera-outline" size={12} color={mutedColor} />
                <Text style={[styles.metaText, { color: mutedColor }]}>
                  {photoCount}
                </Text>
              </View>
            )}
          </View>

          {/* Notes preview */}
          {visit.notes ? (
            <Text style={[styles.notes, { color: subtitleColor }]} numberOfLines={2}>
              {visit.notes}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  leadTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  repName: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  notes: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
});
