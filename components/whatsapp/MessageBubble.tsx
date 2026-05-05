import { View, Text, TouchableOpacity, Image, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Palette } from '@/constants/theme';
import type { WaMessage } from '@/types/whatsapp';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function StatusTicks({ status, isDark }: { status: WaMessage['status']; isDark: boolean }) {
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  if (status === 'FAILED') {
    return <Ionicons name="alert-circle" size={13} color={Palette.red} />;
  }
  if (status === 'READ') {
    return <Ionicons name="checkmark-done" size={13} color="#3b82f6" />;
  }
  if (status === 'DELIVERED') {
    return <Ionicons name="checkmark-done" size={13} color={muted} />;
  }
  // SENT
  return <Ionicons name="checkmark" size={13} color={muted} />;
}

export function MessageBubble({
  message,
  isDark,
  retrying,
  onRetry,
}: {
  message: WaMessage;
  isDark: boolean;
  retrying?: boolean;
  onRetry?: (messageId: string) => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const isOutbound = message.direction === 'OUTBOUND';
  const bubbleBg = isOutbound
    ? isDark
      ? 'rgba(34,197,94,0.18)'
      : '#dcfce7'
    : isDark
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(0,0,0,0.03)';
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';

  const renderBody = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <View>
            {message.mediaUrl && (
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.media}
                resizeMode="cover"
              />
            )}
            {(message.caption || message.body) && (
              <Text style={[styles.body, { color: textColor, marginTop: 6 }]}>
                {message.caption || message.body}
              </Text>
            )}
          </View>
        );

      case 'DOCUMENT':
        return (
          <TouchableOpacity
            style={styles.docRow}
            onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
          >
            <Ionicons name="document-outline" size={20} color={textColor} />
            <Text style={[styles.body, { color: textColor, flex: 1 }]} numberOfLines={2}>
              {message.filename || message.caption || 'Document'}
            </Text>
          </TouchableOpacity>
        );

      case 'AUDIO':
        return (
          <TouchableOpacity
            style={styles.docRow}
            onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
          >
            <Ionicons name="musical-notes-outline" size={20} color={textColor} />
            <Text style={[styles.body, { color: textColor }]}>Audio message</Text>
          </TouchableOpacity>
        );

      case 'VIDEO':
        return (
          <TouchableOpacity
            style={styles.docRow}
            onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
          >
            <Ionicons name="videocam-outline" size={20} color={textColor} />
            <Text style={[styles.body, { color: textColor }]}>Video</Text>
          </TouchableOpacity>
        );

      case 'LOCATION': {
        const lat = message.latitude;
        const lon = message.longitude;
        const url =
          lat != null && lon != null ? `https://maps.google.com/?q=${lat},${lon}` : null;
        return (
          <TouchableOpacity
            style={styles.docRow}
            onPress={() => url && Linking.openURL(url)}
            disabled={!url}
          >
            <Ionicons name="location-outline" size={20} color={textColor} />
            <Text style={[styles.body, { color: textColor }]}>
              {url ? 'View location' : 'Location'}
            </Text>
          </TouchableOpacity>
        );
      }

      case 'TEXT':
      default:
        return (
          <Text style={[styles.body, { color: textColor }]}>{message.body || ''}</Text>
        );
    }
  };

  return (
    <View style={[styles.row, isOutbound ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, { backgroundColor: bubbleBg }]}>
        {renderBody()}

        {message.status === 'FAILED' && message.failureReason && (
          <Text style={[styles.failure, { color: Palette.red }]} numberOfLines={2}>
            {message.failureReason}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: subtitleColor }]}>
            {formatTime(message.createdAt)}
          </Text>
          {isOutbound && <StatusTicks status={message.status} isDark={isDark} />}
        </View>

        {isOutbound && message.status === 'FAILED' && onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: Palette.red }]}
            onPress={() => onRetry(message.id)}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator size="small" color={Palette.red} />
            ) : (
              <>
                <Ionicons name="refresh" size={12} color={Palette.red} />
                <Text style={[styles.retryText, { color: Palette.red }]}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  body: { fontSize: 14, lineHeight: 19 },
  media: {
    width: 240,
    height: 200,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 140,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: { fontSize: 10 },
  failure: { fontSize: 11, marginTop: 4 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: { fontSize: 11, fontWeight: '600' },
});

export function DateSeparator({
  iso,
  isDark,
}: {
  iso: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  let label: string;
  if (sameDay(date, today)) label = 'Today';
  else if (sameDay(date, yesterday)) label = 'Yesterday';
  else label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <View style={separatorStyles.wrap}>
      <View
        style={[
          separatorStyles.pill,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        <Text style={[separatorStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );
}

const separatorStyles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 10 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  label: { fontSize: 11, fontWeight: '600' },
});
