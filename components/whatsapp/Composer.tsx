import { useState, useEffect, useMemo } from 'react';
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
import type {
  WhatsappTemplate,
  WhatsappTemplateStatus,
} from '@/types/whatsapp';
import { isSessionExpired } from '@/types/whatsapp';

/** Send payload — matches the web composer and the backend DTO. */
export interface ComposerSendPayload {
  body?: string;
  templateId?: string;
  variables?: string[];
}

const STATUS_LABEL: Record<WhatsappTemplateStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAUSED: 'Paused',
  DISABLED: 'Disabled',
  ARCHIVED: 'Archived',
};

const STATUS_COLOR: Record<WhatsappTemplateStatus, string> = {
  DRAFT: '#64748b',
  PENDING: '#d97706',
  APPROVED: '#059669',
  REJECTED: '#dc2626',
  PAUSED: '#ca8a04',
  DISABLED: '#52525b',
  ARCHIVED: '#94a3b8',
};

/** Count of distinct positional placeholders ({{1}}, {{2}}…) in a body. */
function variableCount(body: string): number {
  const re = /\{\{\s*(\d+)\s*\}\}/g;
  let max = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** Substitute {{N}} → values[N-1]; falls back to the original placeholder. */
function applyVariables(body: string, values: string[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => {
    const idx = parseInt(n, 10) - 1;
    return values[idx]?.trim() || `{{${n}}}`;
  });
}

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
  /**
   * Receives the new payload shape:
   *   { body }                            → free-form text (CSW-open only)
   *   { templateId, variables }           → APPROVED template dispatch
   */
  onSend: (payload: ComposerSendPayload) => void;
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

  // Variable-fill modal state. Shown after a template with placeholders is
  // picked; not used for plain-body templates.
  const [varFillTpl, setVarFillTpl] = useState<WhatsappTemplate | null>(null);
  const [varValues, setVarValues] = useState<string[]>([]);

  // The currently-staged template — set after pick (or after the fill step).
  // Dispatch uses `{ templateId, variables }` when this is non-null; manual
  // text edits clear it so the rep can fall back to free-form text.
  const [pendingTemplate, setPendingTemplate] = useState<{
    template: WhatsappTemplate;
    variables: string[];
  } | null>(null);

  const sessionExpired = isSessionExpired(windowExpiresAt);
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // Outside the CSW we can only dispatch APPROVED templates. Inside the CSW
  // we still surface DRAFT/PENDING so the rep can see what's in flight, but
  // the backend will reject non-APPROVED sends with a 400.
  const usableTemplates = useMemo(() => {
    if (!sessionExpired) return templates;
    return templates.filter((t) => t.status === 'APPROVED');
  }, [templates, sessionExpired]);

  // Auto-open template picker when session expires (only first time, only
  // when there's at least one approved template to pick).
  useEffect(() => {
    if (sessionExpired && usableTemplates.length > 0 && !text) {
      setShowTemplates(true);
    }
  }, [sessionExpired, usableTemplates.length]);

  const handleSend = () => {
    if (sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pendingTemplate) {
      onSend({
        templateId: pendingTemplate.template.id,
        variables: pendingTemplate.variables,
      });
    } else {
      const body = text.trim();
      if (!body) return;
      onSend({ body });
    }
    setText('');
    setPendingTemplate(null);
  };

  const stageTemplateWithoutVars = (tpl: WhatsappTemplate) => {
    setText(tpl.body);
    setPendingTemplate({ template: tpl, variables: [] });
    setShowTemplates(false);
  };

  const pickTemplate = (tpl: WhatsappTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const n = variableCount(tpl.body);
    if (n === 0) {
      stageTemplateWithoutVars(tpl);
      return;
    }
    setVarFillTpl(tpl);
    setVarValues(new Array<string>(n).fill(''));
    setShowTemplates(false);
  };

  const confirmFilledTemplate = () => {
    if (!varFillTpl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText(applyVariables(varFillTpl.body, varValues));
    setPendingTemplate({
      template: varFillTpl,
      variables: [...varValues],
    });
    setVarFillTpl(null);
    setVarValues([]);
  };

  const cancelVarFill = () => {
    setVarFillTpl(null);
    setVarValues([]);
    setShowTemplates(true); // pop back to the picker
  };

  const allVarsFilled = varValues.every((v) => v.trim().length > 0);

  const canSend = pendingTemplate
    ? !sending
    : text.trim().length > 0 && !sending;

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
          {pendingTemplate && (
            <View style={styles.pendingTemplateChip}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingChipText} numberOfLines={1}>
                Sending as template: {pendingTemplate.template.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPendingTemplate(null);
                  setText('');
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={14} color={Palette.emerald} />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={text}
            onChangeText={(t) => {
              const next = t.slice(0, MAX_LEN);
              setText(next);
              // Manual edit invalidates the staged template — the rep wants
              // to send their own text now, not the template payload.
              if (pendingTemplate) setPendingTemplate(null);
            }}
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Insert template
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {sessionExpired
                    ? 'Only approved templates can re-open this 24-hour session.'
                    : 'Pick a template to insert.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTemplates(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }}>
              {templatesLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : usableTemplates.length === 0 ? (
                <View style={styles.modalLoading}>
                  <Text
                    style={[styles.emptyText, { color: colors.mutedForeground }]}
                  >
                    {templates.length === 0
                      ? 'No templates yet. Create and approve them in the web settings.'
                      : sessionExpired
                        ? 'You need at least one APPROVED template to re-open this session. Submit a draft for approval from Settings → WhatsApp Templates.'
                        : 'No matching templates.'}
                  </Text>
                </View>
              ) : (
                usableTemplates.map((tpl) => {
                  const vCount = variableCount(tpl.body);
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.tplOption, { borderBottomColor: borderColor }]}
                      onPress={() => pickTemplate(tpl)}
                    >
                      <View style={styles.tplOptionHeader}>
                        <Text
                          style={[styles.tplName, { color: colors.foreground, flexShrink: 1 }]}
                          numberOfLines={1}
                        >
                          {tpl.name}
                        </Text>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: `${STATUS_COLOR[tpl.status]}1A`,
                              borderColor: STATUS_COLOR[tpl.status],
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: STATUS_COLOR[tpl.status] },
                            ]}
                          >
                            {STATUS_LABEL[tpl.status]}
                          </Text>
                        </View>
                        {vCount > 0 && (
                          <View
                            style={[
                              styles.varPill,
                              { borderColor: colors.mutedForeground },
                            ]}
                          >
                            <Text
                              style={[
                                styles.varPillText,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {vCount} var{vCount === 1 ? '' : 's'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.tplBody, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {tpl.body}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Variable-fill modal (shown after picking a template with placeholders) */}
      <Modal
        visible={!!varFillTpl}
        transparent
        animationType="slide"
        onRequestClose={cancelVarFill}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelVarFill}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={cancelVarFill}>
                  <Ionicons name="chevron-back" size={22} color={colors.foreground} />
                </TouchableOpacity>
                <Text
                  style={[styles.modalTitle, { color: colors.foreground, flex: 1 }]}
                  numberOfLines={1}
                >
                  {varFillTpl?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={cancelVarFill}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 16 }}>
              {varValues.map((v, i) => {
                const label =
                  varFillTpl?.variableLabels?.[i]?.trim() || `Variable ${i + 1}`;
                return (
                  <View key={i} style={{ marginBottom: 12 }}>
                    <View style={styles.varLabelRow}>
                      <Text style={[styles.varLabel, { color: colors.foreground }]}>
                        {label}
                      </Text>
                      <Text style={[styles.varLabelHint, { color: colors.mutedForeground }]}>
                        {`{{${i + 1}}}`}
                      </Text>
                    </View>
                    <TextInput
                      style={[
                        styles.varInput,
                        {
                          color: colors.foreground,
                          backgroundColor: inputBg,
                          borderColor,
                        },
                      ]}
                      value={v}
                      onChangeText={(text) => {
                        const next = [...varValues];
                        next[i] = text;
                        setVarValues(next);
                      }}
                      placeholder={`Value for ${label.toLowerCase()}`}
                      placeholderTextColor={
                        isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
                      }
                    />
                  </View>
                );
              })}

              {/* Live preview */}
              <View style={styles.previewWrap}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewBubble}>
                  {/* Media header — `headerMediaUrl` on the client is the
                      provider's upload-session handle, not a fetchable URL.
                      The browser web composer falls back to a local blob;
                      mobile has no local blob in this read-only picker
                      context, so render a placeholder for all media types. */}
                  {varFillTpl?.headerType === 'IMAGE' &&
                    varFillTpl.headerMediaUrl && (
                      <View style={styles.previewMediaPlaceholder}>
                        <Ionicons name="image" size={20} color="#71717a" />
                        <Text style={styles.previewMediaPlaceholderText}>
                          Image header
                        </Text>
                      </View>
                    )}
                  {varFillTpl?.headerType === 'VIDEO' &&
                    varFillTpl.headerMediaUrl && (
                      <View style={styles.previewMediaPlaceholder}>
                        <Ionicons name="videocam" size={20} color="#71717a" />
                        <Text style={styles.previewMediaPlaceholderText}>
                          Video header
                        </Text>
                      </View>
                    )}
                  {varFillTpl?.headerType === 'DOCUMENT' &&
                    varFillTpl.headerMediaUrl && (
                      <View style={styles.previewMediaPlaceholder}>
                        <Ionicons name="document" size={20} color="#71717a" />
                        <Text style={styles.previewMediaPlaceholderText}>
                          Document attachment
                        </Text>
                      </View>
                    )}

                  <View style={{ padding: 10 }}>
                    {varFillTpl?.headerType === 'TEXT' &&
                      varFillTpl?.headerText && (
                        <Text style={styles.previewHeader}>{varFillTpl.headerText}</Text>
                      )}
                    <Text style={styles.previewBody}>
                      {varFillTpl ? applyVariables(varFillTpl.body, varValues) : ''}
                    </Text>
                    {varFillTpl?.footerText && (
                      <Text style={styles.previewFooter}>{varFillTpl.footerText}</Text>
                    )}
                  </View>
                  {/* Buttons row under the message bubble */}
                  {varFillTpl?.buttons && varFillTpl.buttons.length > 0 && (
                    <View style={styles.previewButtonsWrap}>
                      {varFillTpl.buttons.map((b, i) => (
                        <View key={i} style={styles.previewButtonRow}>
                          {b.type === 'URL' && (
                            <Ionicons
                              name="open-outline"
                              size={12}
                              color="#71717a"
                            />
                          )}
                          {b.type === 'PHONE' && (
                            <Ionicons name="call" size={12} color="#71717a" />
                          )}
                          <Text style={styles.previewButtonText} numberOfLines={1}>
                            {b.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.varFooter, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                style={[styles.varCancelBtn, { borderColor }]}
                onPress={cancelVarFill}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.varConfirmBtn,
                  { backgroundColor: allVarsFilled ? Palette.emerald : inputBg },
                ]}
                onPress={confirmFilledTemplate}
                disabled={!allVarsFilled}
              >
                <Text
                  style={{
                    color: allVarsFilled ? 'white' : colors.mutedForeground,
                    fontWeight: '600',
                  }}
                >
                  Insert into message
                </Text>
              </TouchableOpacity>
            </View>
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

  // ---- template picker (status + variable badges) ----
  modalSubtitle: { fontSize: 11, marginTop: 2 },
  tplOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '600' },
  varPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  varPillText: { fontSize: 10 },

  // ---- pending-template chip above the textarea ----
  pendingTemplateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${Palette.emerald}1A`,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${Palette.emerald}55`,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.emerald,
  },
  pendingChipText: {
    flex: 1,
    fontSize: 11,
    color: Palette.emerald,
    fontWeight: '600',
  },

  // ---- variable-fill modal ----
  varLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  varLabel: { fontSize: 12, fontWeight: '600' },
  varLabelHint: { fontSize: 10, fontFamily: 'Courier' },
  varInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  previewWrap: {
    backgroundColor: '#e5ddd5',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3f3f46',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBubble: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 4,
  },
  previewBody: { fontSize: 14, color: '#18181b', lineHeight: 18 },
  previewFooter: { fontSize: 11, color: '#71717a', marginTop: 6 },
  previewButtonsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
  },
  previewButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f4f4f5',
  },
  previewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
    flexShrink: 1,
  },
  previewMediaPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 80,
    backgroundColor: '#f4f4f5',
  },
  previewMediaPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  varFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  varCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  varConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
