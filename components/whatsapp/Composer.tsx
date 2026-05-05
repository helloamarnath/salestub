import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Palette } from '@/constants/theme';
import type { WhatsappTemplate } from '@/types/whatsapp';
import { isSessionExpired } from '@/types/whatsapp';

/** What a picked file looks like before upload — handed to the parent for `sendMedia`. */
export interface PickedMedia {
  uri: string;
  name: string;
  type: string; // MIME type
}

const MAX_LEN = 4096;

export function Composer({
  windowExpiresAt,
  templates,
  templatesLoading,
  sending,
  uploading,
  isDark,
  onSend,
  onSendMedia,
}: {
  windowExpiresAt: string | null | undefined;
  templates: WhatsappTemplate[];
  templatesLoading?: boolean;
  sending: boolean;
  uploading?: boolean;
  isDark: boolean;
  onSend: (body: string) => void;
  /**
   * Optional — when provided, the paperclip button is shown. Caption is whatever
   * is currently in the text input (matches web behavior).
   */
  onSendMedia?: (file: PickedMedia, caption?: string) => Promise<void> | void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [text, setText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const sessionExpired = isSessionExpired(windowExpiresAt);
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // Auto-open template picker when session expires (only first time)
  useEffect(() => {
    if (sessionExpired && templates.length > 0 && !text) {
      setShowTemplates(true);
    }
  }, [sessionExpired, templates.length]);

  const handleSend = () => {
    const body = text.trim();
    if (!body || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(body);
    setText('');
  };

  const insertTemplate = (tpl: WhatsappTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText(tpl.body);
    setShowTemplates(false);
  };

  const canSend = text.trim().length > 0 && !sending;

  // ---------- Media picker handlers ----------
  // Backend caps WhatsApp media at 16 MB; we soft-block >15.5 MB on the client.
  const MAX_BYTES = 15.5 * 1024 * 1024;

  const inferMimeFromUri = (uri: string, fallback = 'application/octet-stream') => {
    const ext = uri.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      mp4: 'video/mp4',
      '3gp': 'video/3gpp',
      '3gpp': 'video/3gpp',
    };
    return map[ext] || fallback;
  };

  const dispatchSendMedia = async (file: PickedMedia) => {
    if (!onSendMedia) return;
    if (file.uri && typeof file !== 'undefined') {
      // Best-effort size check — works when the picker reports it
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const caption = text.trim() || undefined;
    await onSendMedia(file, caption);
    setText('');
  };

  const handlePickPhoto = async () => {
    setShowAttachSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to attach images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    if (asset.fileSize != null && asset.fileSize > MAX_BYTES) {
      Alert.alert('Too large', 'WhatsApp caps media at 16 MB. Please pick a smaller file.');
      return;
    }
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    const type = asset.mimeType || inferMimeFromUri(asset.uri, 'image/jpeg');
    await dispatchSendMedia({ uri: asset.uri, name, type });
  };

  const handleTakePhoto = async () => {
    setShowAttachSheet(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow camera access to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    if (asset.fileSize != null && asset.fileSize > MAX_BYTES) {
      Alert.alert('Too large', 'WhatsApp caps media at 16 MB.');
      return;
    }
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';
    await dispatchSendMedia({ uri: asset.uri, name, type });
  };

  const handlePickDocument = async () => {
    setShowAttachSheet(false);
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    if (asset.size != null && asset.size > MAX_BYTES) {
      Alert.alert('Too large', 'WhatsApp caps media at 16 MB.');
      return;
    }
    const name = asset.name || `document-${Date.now()}`;
    const type = asset.mimeType || inferMimeFromUri(asset.uri);
    await dispatchSendMedia({ uri: asset.uri, name, type });
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, borderTopColor: borderColor }]}>
      {sessionExpired && (
        <View style={styles.expiredBanner}>
          <Ionicons name="time-outline" size={14} color={Palette.amber} />
          <Text style={[styles.expiredText, { color: Palette.amber }]}>
            24-hour session expired — pick a template to re-initiate
          </Text>
        </View>
      )}

      <View style={styles.row}>
        {templates.length > 0 && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: inputBg }]}
            onPress={() => setShowTemplates(true)}
          >
            <Ionicons name="grid-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}

        {onSendMedia && !sessionExpired && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: inputBg }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAttachSheet(true);
            }}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="attach" size={22} color={colors.foreground} />
            )}
          </TouchableOpacity>
        )}

        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_LEN))}
            placeholder={
              sessionExpired ? 'Session expired — use a template' : 'Type a message…'
            }
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
            multiline
          />
          {text.length > 0 && (
            <Text style={[styles.counter, { color: colors.mutedForeground }]}>
              {text.length} / {MAX_LEN}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? Palette.emerald : inputBg },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={canSend ? 'white' : colors.mutedForeground}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Templates picker modal */}
      <Modal
        visible={showTemplates}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplates(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTemplates(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Templates
              </Text>
              <TouchableOpacity onPress={() => setShowTemplates(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {templatesLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : templates.length === 0 ? (
                <View style={styles.modalLoading}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No templates yet. Create them in the web settings.
                  </Text>
                </View>
              ) : (
                templates.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.tplOption, { borderBottomColor: borderColor }]}
                    onPress={() => insertTemplate(tpl)}
                  >
                    <Text style={[styles.tplName, { color: colors.foreground }]} numberOfLines={1}>
                      {tpl.name}
                    </Text>
                    <Text
                      style={[styles.tplBody, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {tpl.body}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Attach action sheet */}
      <Modal
        visible={showAttachSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachSheet(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAttachSheet(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Send attachment
              </Text>
              <TouchableOpacity onPress={() => setShowAttachSheet(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.attachOption, { borderBottomColor: borderColor }]}
              onPress={handleTakePhoto}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: `${Palette.emerald}20` }]}>
                <Ionicons name="camera-outline" size={20} color={Palette.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachLabel, { color: colors.foreground }]}>
                  Take photo
                </Text>
                <Text style={[styles.attachHint, { color: colors.mutedForeground }]}>
                  Use camera
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachOption, { borderBottomColor: borderColor }]}
              onPress={handlePickPhoto}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: `${Palette.purple}20` }]}>
                <Ionicons name="image-outline" size={20} color={Palette.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachLabel, { color: colors.foreground }]}>
                  Photo library
                </Text>
                <Text style={[styles.attachHint, { color: colors.mutedForeground }]}>
                  Pick an image
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachOption, { borderBottomColor: borderColor }]}
              onPress={handlePickDocument}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: `${Palette.amber}20` }]}>
                <Ionicons name="document-outline" size={20} color={Palette.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachLabel, { color: colors.foreground }]}>
                  Document
                </Text>
                <Text style={[styles.attachHint, { color: colors.mutedForeground }]}>
                  PDF, Word, Excel — max 16 MB
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 8,
    marginBottom: 6,
  },
  expiredText: { fontSize: 11, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
  },
  input: { fontSize: 15, padding: 0, lineHeight: 20 },
  counter: { fontSize: 9, alignSelf: 'flex-end', marginTop: 2 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalLoading: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  tplOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tplName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tplBody: { fontSize: 13 },

  /* Attach sheet */
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  attachIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: { fontSize: 15, fontWeight: '600' },
  attachHint: { fontSize: 12, marginTop: 1 },
});
