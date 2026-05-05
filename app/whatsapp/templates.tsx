import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/api/whatsapp';
import type { WhatsappTemplate } from '@/types/whatsapp';

const NAME_MAX = 100;
const BODY_MAX = 2000;

export default function WhatsappTemplatesScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState<WhatsappTemplate | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorName, setEditorName] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<WhatsappTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await listTemplates(accessToken);
      if (res.success && res.data) {
        // Sort alphabetically (matches web)
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name));
        setTemplates(sorted);
      } else {
        setError(res.error?.message || 'Failed to load templates');
      }
      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(null);
    setEditorName('');
    setEditorBody('');
    setEditorVisible(true);
  };

  const openEdit = (tpl: WhatsappTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(tpl);
    setEditorName(tpl.name);
    setEditorBody(tpl.body);
    setEditorVisible(true);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    const name = editorName.trim();
    const body = editorBody.trim();
    if (!name) return Alert.alert('Name required', 'Give the template a name.');
    if (!body) return Alert.alert('Body required', 'Templates need a message body.');
    setSaving(true);
    const res = editing
      ? await updateTemplate(accessToken, editing.id, { name, body })
      : await createTemplate(accessToken, { name, body });
    setSaving(false);
    if (res.success && res.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditorVisible(false);
      // Update list optimistically
      setTemplates((prev) => {
        if (editing) {
          return [...prev]
            .map((t) => (t.id === editing.id ? res.data! : t))
            .sort((a, b) => a.name.localeCompare(b.name));
        }
        return [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name));
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Save failed', res.error?.message || 'Could not save template.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !pendingDelete) return;
    setDeleting(true);
    const res = await deleteTemplate(accessToken, pendingDelete.id);
    setDeleting(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTemplates((prev) => prev.filter((t) => t.id !== pendingDelete.id));
      setPendingDelete(null);
    } else {
      Alert.alert('Delete failed', res.error?.message || 'Could not delete template.');
    }
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Templates</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {templates.length} saved
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: '#25D366' }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading && templates.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && templates.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retry, { backgroundColor: colors.primary }]}
            onPress={() => fetchTemplates()}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No templates</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Templates let you reply quickly and re-initiate after the 24-hour session.
          </Text>
          <TouchableOpacity
            style={[styles.retry, { backgroundColor: '#25D366' }]}
            onPress={openCreate}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Create your first template</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTemplates(true)}
              tintColor={colors.primary}
            />
          }
        >
          {templates.map((tpl) => (
            <View
              key={tpl.id}
              style={[
                styles.tplCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.tplHeader}>
                <Text style={[styles.tplName, { color: colors.foreground }]} numberOfLines={1}>
                  {tpl.name}
                </Text>
                <View style={styles.tplActions}>
                  <TouchableOpacity
                    style={[styles.tplIconBtn, { backgroundColor: inputBg }]}
                    onPress={() => openEdit(tpl)}
                  >
                    <Ionicons name="pencil" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tplIconBtn, { backgroundColor: `${Palette.red}10` }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPendingDelete(tpl);
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color={Palette.red} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.tplBody, { color: colors.mutedForeground }]} numberOfLines={3}>
                {tpl.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Editor modal */}
      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditorVisible(false)}
          >
            <Pressable
              style={[styles.modalSheet, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editing ? 'Edit template' : 'New template'}
                </Text>
                <TouchableOpacity onPress={() => setEditorVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Name
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={editorName}
                  onChangeText={(t) => setEditorName(t.slice(0, NAME_MAX))}
                  placeholder="e.g. Follow-up"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="sentences"
                />
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  {editorName.length} / {NAME_MAX}
                </Text>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
                  Body
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.fieldInputMultiline,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={editorBody}
                  onChangeText={(t) => setEditorBody(t.slice(0, BODY_MAX))}
                  placeholder="Hello {firstName}, just following up on…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                />
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  {editorBody.length} / {BODY_MAX} · You can reference variables like {'{firstName}'}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: '#25D366' },
                    saving && { opacity: 0.6 },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Save changes' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <Pressable
          style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}
          onPress={() => setPendingDelete(null)}
        >
          <Pressable
            style={[styles.confirmCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              Delete template?
            </Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
              "{pendingDelete?.name}" will be removed permanently.
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={[styles.confirmCancel, { borderColor }]}
                onPress={() => setPendingDelete(null)}
                disabled={deleting}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDelete, { backgroundColor: Palette.red }]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '600' }}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyBody: { fontSize: 13, textAlign: 'center', marginBottom: 4 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  /* Card */
  tplCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  tplHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  tplName: { flex: 1, fontSize: 15, fontWeight: '700' },
  tplActions: { flexDirection: 'row', gap: 6 },
  tplIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplBody: { fontSize: 13, lineHeight: 18 },

  /* Modal — editor */
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
  modalBody: { paddingHorizontal: 20, paddingTop: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldHint: { fontSize: 11, marginTop: 4 },
  saveBtn: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  /* Confirm */
  confirmCard: {
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  confirmTitle: { fontSize: 16, fontWeight: '700' },
  confirmBody: { fontSize: 13, marginBottom: 12 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});
