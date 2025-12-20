import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { Lead } from '@/types/lead';
import { LeadStatusBadge, ScoreIndicator } from './LeadStatusBadge';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import { Colors } from '@/constants/theme';

interface LeadCardProps {
  lead: Lead;
  onPress?: () => void;
  onLongPress?: () => void;
  isDark?: boolean;
}

export function LeadCard({ lead, onPress, onLongPress, isDark = true }: LeadCardProps) {
  const contactName = lead.contact
    ? getContactFullName(lead.contact)
    : 'No contact';

  const initials = lead.contact
    ? getContactInitials(lead.contact)
    : lead.title.substring(0, 2).toUpperCase();

  const avatarColor = getAvatarColor(contactName);

  // Theme-aware colors
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const valueColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const actionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.push(`/(tabs)/leads/${lead.id}`);
    }
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };

  const handleCall = async () => {
    const phone = lead.contact?.phone;
    if (phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = async () => {
    const email = lead.contact?.email;
    if (email) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(`mailto:${email}`);
    }
  };

  const handleWhatsApp = async () => {
    const phone = lead.contact?.phone;
    if (phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Remove non-numeric characters
      const cleanPhone = phone.replace(/\D/g, '');
      await Linking.openURL(`https://wa.me/${cleanPhone}`);
    }
  };

  const formatValue = (value?: number): string => {
    if (!value) return '';
    const symbol = lead.currency?.symbol || '₹';
    if (value >= 100000) {
      return `${symbol}${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `${symbol}${(value / 1000).toFixed(1)}K`;
    }
    return `${symbol}${value.toLocaleString()}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <View style={[styles.container, { borderColor }]}>
        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={[styles.blur, { backgroundColor: bgColor }]}>
          <View style={styles.content}>
            {/* Left: Avatar */}
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {/* Center: Lead Info */}
            <View style={styles.info}>
              {/* Title Row */}
              <View style={styles.titleRow}>
                <Text style={[styles.displayId, { color: mutedColor }]}>{lead.displayId}</Text>
                {lead.score !== undefined && (
                  <ScoreIndicator score={lead.score} size={6} />
                )}
              </View>

              <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                {lead.title}
              </Text>

              <Text style={[styles.contactName, { color: subtitleColor }]} numberOfLines={1}>
                {contactName}
              </Text>

              {/* Bottom Row: Stage & Value */}
              <View style={styles.bottomRow}>
                <LeadStatusBadge stage={lead.stage} size="small" isDark={isDark} />
                {lead.value !== undefined && lead.value > 0 && (
                  <Text style={[styles.value, { color: valueColor }]}>{formatValue(lead.value)}</Text>
                )}
              </View>
            </View>

            {/* Right: Quick Actions */}
            <View style={styles.actions}>
              {lead.contact?.phone && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: actionBg }]}
                  onPress={handleCall}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="call-outline" size={18} color="#22c55e" />
                </TouchableOpacity>
              )}
              {lead.contact?.phone && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: actionBg }]}
                  onPress={handleWhatsApp}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
                </TouchableOpacity>
              )}
              {lead.contact?.email && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: actionBg }]}
                  onPress={handleEmail}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="mail-outline" size={18} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
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
  blur: {},
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayId: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  contactName: {
    fontSize: 13,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
