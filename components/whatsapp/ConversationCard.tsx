import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Palette } from '@/constants/theme';
import {
  type WaConversation,
  getCustomerInitials,
  getCustomerDisplayName,
} from '@/types/whatsapp';
import { getAvatarColor } from '@/types/contact';

const STATUS_COLORS = {
  OPEN: Palette.emerald,
  SNOOZED: Palette.amber,
  CLOSED: '#9ca3af',
} as const;

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function ConversationCard({
  conversation,
  isDark,
  onPress,
}: {
  conversation: WaConversation;
  isDark: boolean;
  onPress: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const name = getCustomerDisplayName(conversation);
  const initials = getCustomerInitials(conversation);
  const avatarColor = getAvatarColor(name);
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const lastBody = conversation.lastMessage?.body
    ? conversation.lastMessage.body
    : conversation.lastMessage
      ? '📎 Media'
      : '';

  const isUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.row, { borderBottomColor: borderColor }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
          {/* Status dot in corner of avatar */}
          <View
            style={[
              styles.statusDot,
              { backgroundColor: STATUS_COLORS[conversation.status], borderColor: colors.background },
            ]}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.name,
                { color: colors.foreground, fontWeight: isUnread ? '700' : '600' },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={[styles.time, { color: subtitleColor }]}>
              {formatRelativeTime(conversation.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.preview,
                { color: isUnread ? colors.foreground : subtitleColor, fontWeight: isUnread ? '500' : '400' },
              ]}
              numberOfLines={1}
            >
              {lastBody || conversation.customerNumber}
            </Text>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: Palette.emerald }]}>
                <Text style={styles.unreadText}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
          {(conversation.contact || conversation.lead || conversation.assignedTo) && (
            <View style={styles.tagsRow}>
              {conversation.lead && (
                <View style={[styles.tag, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="flash" size={10} color={colors.primary} />
                  <Text style={[styles.tagText, { color: colors.primary }]}>
                    {conversation.lead.displayId || 'Lead'}
                  </Text>
                </View>
              )}
              {conversation.contact && (
                <View style={[styles.tag, { backgroundColor: `${Palette.purple}20` }]}>
                  <Ionicons name="person" size={10} color={Palette.purple} />
                  <Text style={[styles.tagText, { color: Palette.purple }]} numberOfLines={1}>
                    {conversation.contact.firstName} {conversation.contact.lastName}
                  </Text>
                </View>
              )}
              {conversation.assignedTo && (
                <Text style={[styles.assignee, { color: subtitleColor }]} numberOfLines={1}>
                  · {conversation.assignedTo.firstName || conversation.assignedTo.email}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: { fontSize: 15, flex: 1 },
  time: { fontSize: 11 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: { fontSize: 13, flex: 1 },
  unreadBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: 'white', fontSize: 11, fontWeight: '700' },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { fontSize: 10, fontWeight: '600' },
  assignee: { fontSize: 10 },
});
