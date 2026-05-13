import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import {
  getConversation,
  getContactContext,
  updateConversation,
  recordOptIn,
} from '@/lib/api/whatsapp';
import { createContact } from '@/lib/api/contacts';
import type {
  WaConversationDetail,
  WaContactContext,
} from '@/types/whatsapp';
import {
  getCustomerDisplayName,
  getCustomerInitials,
  isSessionExpired,
} from '@/types/whatsapp';
import { getAvatarColor } from '@/types/contact';

const OPT_IN_SOURCES = [
  { value: 'WEB_FORM', label: 'Web form' },
  { value: 'PHONE_CALL', label: 'Phone call' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'EMAIL_REPLY', label: 'Email reply' },
  { value: 'WHATSAPP_INBOUND', label: 'WhatsApp inbound' },
] as const;

function splitName(full?: string | null): { firstName: string; lastName: string } {
  if (!full) return { firstName: '', lastName: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function formatCurrency(value?: number): string {
  if (!value) return '—';
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-IN');
}

function SectionCard({
  title,
  children,
  isDark,
  action,
}: {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  action?: React.ReactNode;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{title}</Text>
        {action}
      </View>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={18}
        color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function PrimaryActionButton({
  label,
  icon,
  onPress,
  busy,
  variant = 'solid',
  destructive = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  busy?: boolean;
  variant?: 'solid' | 'outline';
  destructive?: boolean;
}) {
  const accent = destructive ? Palette.red : Palette.emerald;
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.actionButton, { borderColor: accent, borderWidth: 1 }]}
        onPress={onPress}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <>
            <Ionicons name={icon} size={16} color={accent} />
            <Text style={[styles.actionButtonText, { color: accent }]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: accent }]}
      onPress={onPress}
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name={icon} size={16} color="white" />
          <Text style={[styles.actionButtonText, { color: 'white' }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function ConversationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [conversation, setConversation] = useState<WaConversationDetail | null>(null);
  const [context, setContext] = useState<WaContactContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [optInSheetVisible, setOptInSheetVisible] = useState(false);
  const [recordingOptIn, setRecordingOptIn] = useState(false);

  // ----- Load -----
  const fetchAll = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    const res = await getConversation(accessToken, id);
    if (res.success && res.data) {
      setConversation(res.data);
      setNotes(res.data.notes ?? '');
      // Related records — best-effort; ignore errors so the rest of the page renders
      const ctx = await getContactContext(accessToken, id);
      if (ctx.success && ctx.data) setContext(ctx.data);
    } else {
      setError(res.error?.message || 'Failed to load details');
    }
    setLoading(false);
  }, [accessToken, id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ----- Actions -----
  const handleSaveNotes = useCallback(async () => {
    if (!accessToken || !conversation) return;
    setSavingNotes(true);
    const res = await updateConversation(accessToken, conversation.id, {
      notes: notes.trim() || null,
    });
    if (res.success && res.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConversation((prev) => (prev ? { ...prev, notes: res.data!.notes } : prev));
    } else {
      Alert.alert('Save failed', res.error?.message || 'Could not save notes.');
    }
    setSavingNotes(false);
  }, [accessToken, conversation, notes]);

  const handleCreateContact = useCallback(async () => {
    if (!accessToken || !conversation) return;
    const { firstName, lastName } = splitName(conversation.customerName);
    if (!firstName) {
      // Fall back to the phone number as a stub first name so the API accepts it
      Alert.alert(
        'Cannot create contact',
        'This chat has no customer name yet — ask the customer for their name first or set it manually.',
      );
      return;
    }
    setCreatingContact(true);
    const res = await createContact(accessToken, {
      firstName,
      lastName: lastName || firstName,
      phone: conversation.customerNumber,
    });
    if (res.success && res.data) {
      // Auto-link the conversation to the new contact
      const linkRes = await updateConversation(accessToken, conversation.id, {
        contactId: res.data.id,
      });
      if (linkRes.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchAll();
      } else {
        Alert.alert(
          'Linked partially',
          'Contact was created but we could not link it to the conversation. Try refreshing.',
        );
      }
    } else {
      Alert.alert('Create failed', res.error?.message || 'Could not create contact.');
    }
    setCreatingContact(false);
  }, [accessToken, conversation, fetchAll]);

  const handleCreateLead = useCallback(() => {
    if (!conversation) return;
    const { firstName, lastName } = splitName(conversation.customerName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/leads/create',
      params: {
        firstName,
        lastName,
        phone: conversation.customerNumber,
        source: 'WhatsApp',
        whatsappConversationId: conversation.id,
      },
    } as never);
  }, [conversation]);

  const handleExportJson = useCallback(() => {
    if (!conversation || !accessToken) return;
    // Open the export endpoint with the JWT in the URL fragment is not safe, so
    // we open via Linking with an Authorization header is not possible from
    // Linking — fallback: open the URL in the browser. Backend will respond with
    // a JSON download (the user's session cookie won't be present, so this only
    // works if the API also accepts the token via query string. We surface a
    // helpful note instead of broken behavior.)
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const url = `${baseUrl}/api/v1/whatsapp/conversations/${conversation.id}/export`;
    Alert.alert(
      'Export conversation',
      'The export will open in your browser. You may need to be signed in to the web portal in the same browser.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => Linking.openURL(url).catch(() => undefined),
        },
      ],
    );
  }, [accessToken, conversation]);

  const handleRecordOptIn = useCallback(
    async (source: string) => {
      if (!accessToken || !conversation?.contactId) return;
      setRecordingOptIn(true);
      const res = await recordOptIn(accessToken, conversation.contactId, source);
      setRecordingOptIn(false);
      setOptInSheetVisible(false);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Opt-in recorded', 'The contact is marked as opted-in for WhatsApp.');
      } else {
        Alert.alert('Failed', res.error?.message || 'Could not record opt-in.');
      }
    },
    [accessToken, conversation],
  );

  // ----- Computed -----
  const sessionLabel = useMemo(() => {
    if (!conversation?.windowExpiresAt) return 'No window yet';
    if (isSessionExpired(conversation.windowExpiresAt)) return 'Expired';
    return new Date(conversation.windowExpiresAt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [conversation?.windowExpiresAt]);

  const notesDirty = (conversation?.notes ?? '') !== notes;

  // ----- Render -----
  if (loading && !conversation) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error && !conversation) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="alert-circle-outline" size={48} color={Palette.red} />
        <Text style={{ color: colors.foreground, marginTop: 8, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: colors.primary }]}
          onPress={fetchAll}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!conversation) return null;

  const name = getCustomerDisplayName(conversation);
  const initials = getCustomerInitials(conversation);
  const avatarColor = getAvatarColor(name);

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Customer hero */}
        <View style={styles.hero}>
          <View style={[styles.heroAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{name}</Text>
          <Text style={[styles.heroPhone, { color: colors.mutedForeground }]}>
            {conversation.customerNumber}
          </Text>
        </View>

        {/* Contact section */}
        <SectionCard title="Contact" isDark={isDark}>
          {conversation.contact ? (
            <TouchableOpacity
              style={styles.linkedRow}
              onPress={() =>
                router.push(`/contacts/customer/${conversation.contact!.id}` as never)
              }
            >
              <View style={[styles.linkedIcon, { backgroundColor: `${Palette.purple}20` }]}>
                <Ionicons name="person" size={16} color={Palette.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkedTitle, { color: colors.foreground }]}>
                  {conversation.contact.firstName} {conversation.contact.lastName}
                </Text>
                {conversation.contact.companyName && (
                  <Text style={[styles.linkedSub, { color: colors.mutedForeground }]}>
                    {conversation.contact.companyName}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                Save this chat as a contact so it shows up under that contact's history.
              </Text>
              <PrimaryActionButton
                label="Create contact from chat"
                icon="person-add-outline"
                onPress={handleCreateContact}
                busy={creatingContact}
              />
            </View>
          )}
        </SectionCard>

        {/* Lead section */}
        <SectionCard title="Lead" isDark={isDark}>
          {conversation.lead ? (
            <TouchableOpacity
              style={styles.linkedRow}
              onPress={() => router.push(`/leads/${conversation.lead!.id}` as never)}
            >
              <View style={[styles.linkedIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="flash" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkedTitle, { color: colors.foreground }]}>
                  {conversation.lead.title || conversation.lead.displayId || 'Lead'}
                </Text>
                {conversation.lead.stageRel && (
                  <Text style={[styles.linkedSub, { color: colors.mutedForeground }]}>
                    {conversation.lead.stageRel.name}
                    {conversation.lead.value
                      ? ` · ₹${formatCurrency(conversation.lead.value)}`
                      : ''}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                Create a lead from this chat — name, phone and source pre-fill, and the
                conversation auto-links after save.
              </Text>
              <PrimaryActionButton
                label="Create lead from chat"
                icon="add-circle-outline"
                onPress={handleCreateLead}
              />
            </View>
          )}
        </SectionCard>

        {/* Conversation info */}
        <SectionCard title="Conversation" isDark={isDark}>
          <InfoRow
            icon="call-outline"
            label="Number"
            value={conversation.customerNumber}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            icon="ellipse-outline"
            label="Status"
            value={conversation.status}
            isDark={isDark}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="time-outline" label="Session window" value={sessionLabel} isDark={isDark} />
          {conversation.assignedTo && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <InfoRow
                icon="person-circle-outline"
                label="Assigned to"
                value={
                  conversation.assignedTo.name ||
                  `${conversation.assignedTo.firstName ?? ''} ${conversation.assignedTo.lastName ?? ''}`.trim() ||
                  conversation.assignedTo.email ||
                  '—'
                }
                isDark={isDark}
              />
            </>
          )}
        </SectionCard>

        {/* Related records — only if contact is linked and we have any */}
        {conversation.contact && context && (context.leads.length + context.quotes.length + context.invoices.length > 0) && (
          <SectionCard title="Related" isDark={isDark}>
            {context.leads.slice(0, 5).map((l) => (
              <TouchableOpacity
                key={l.id}
                style={styles.relatedRow}
                onPress={() => router.push(`/leads/${l.id}` as never)}
              >
                <View style={[styles.relatedIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="flash" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.relatedTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {l.title || l.displayId || 'Lead'}
                  </Text>
                  <Text style={[styles.relatedSub, { color: colors.mutedForeground }]}>
                    {l.stageRel?.name || ''}
                    {l.value ? ` · ₹${formatCurrency(l.value)}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
            {context.quotes.slice(0, 5).map((q) => (
              <View key={q.id} style={styles.relatedRow}>
                <View style={[styles.relatedIcon, { backgroundColor: `${Palette.amber}20` }]}>
                  <Ionicons name="document-text" size={14} color={Palette.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.relatedTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {q.quoteNumber || `Quote ${q.id.slice(0, 6)}`}
                  </Text>
                  <Text style={[styles.relatedSub, { color: colors.mutedForeground }]}>
                    {q.status || ''}
                    {q.total ? ` · ₹${formatCurrency(q.total)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
            {context.invoices.slice(0, 5).map((inv) => (
              <View key={inv.id} style={styles.relatedRow}>
                <View style={[styles.relatedIcon, { backgroundColor: `${Palette.red}20` }]}>
                  <Ionicons name="receipt" size={14} color={Palette.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.relatedTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {inv.invoiceNumber || `Invoice ${inv.id.slice(0, 6)}`}
                  </Text>
                  <Text style={[styles.relatedSub, { color: colors.mutedForeground }]}>
                    {inv.status || ''}
                    {inv.total ? ` · ₹${formatCurrency(inv.total)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Notes */}
        <SectionCard
          title="Notes"
          isDark={isDark}
          action={
            notesDirty && (
              <TouchableOpacity onPress={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.sectionAction, { color: colors.primary }]}>Save</Text>
                )}
              </TouchableOpacity>
            )
          }
        >
          <TextInput
            style={[
              styles.notesInput,
              {
                color: colors.foreground,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: colors.border,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Internal notes — not sent to customer"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </SectionCard>

        {/* Compliance */}
        <SectionCard title="Compliance" isDark={isDark}>
          <TouchableOpacity style={styles.complianceRow} onPress={handleExportJson}>
            <Ionicons name="download-outline" size={18} color={colors.foreground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.complianceLabel, { color: colors.foreground }]}>
                Export conversation (JSON)
              </Text>
              <Text style={[styles.complianceHint, { color: colors.mutedForeground }]}>
                For legal hold or audit
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {conversation.contactId && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.complianceRow}
                onPress={() => setOptInSheetVisible(true)}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.foreground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.complianceLabel, { color: colors.foreground }]}>
                    Record WhatsApp opt-in
                  </Text>
                  <Text style={[styles.complianceHint, { color: colors.mutedForeground }]}>
                    DPDP / GDPR consent capture
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
        </SectionCard>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Opt-in source picker */}
      <Modal
        visible={optInSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOptInSheetVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOptInSheetVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Opt-in source
              </Text>
              <TouchableOpacity onPress={() => setOptInSheetVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            {OPT_IN_SOURCES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                disabled={recordingOptIn}
                onPress={() => handleRecordOptIn(s.value)}
              >
                <Text style={[styles.modalOptionText, { color: colors.foreground }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 16 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: { fontSize: 18, fontWeight: '700' },

  /* Hero */
  hero: { alignItems: 'center', marginBottom: 20, gap: 6 },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroAvatarText: { color: 'white', fontSize: 24, fontWeight: '700' },
  heroName: { fontSize: 18, fontWeight: '700' },
  heroPhone: { fontSize: 13 },

  /* Section */
  sectionWrap: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionAction: { fontSize: 13, fontWeight: '600' },
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  divider: { height: 1, marginVertical: 4 },

  helperText: { fontSize: 13, lineHeight: 18 },

  /* Action buttons */
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonText: { fontSize: 14, fontWeight: '600' },

  /* Linked row (contact / lead) */
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedTitle: { fontSize: 15, fontWeight: '600' },
  linkedSub: { fontSize: 12, marginTop: 1 },

  /* InfoRow */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 11, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '500', marginTop: 1 },

  /* Related row */
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  relatedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedTitle: { fontSize: 13, fontWeight: '600' },
  relatedSub: { fontSize: 11, marginTop: 1 },

  /* Notes */
  notesInput: {
    fontSize: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Compliance */
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  complianceLabel: { fontSize: 14, fontWeight: '600' },
  complianceHint: { fontSize: 12, marginTop: 1 },

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
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 15, fontWeight: '500' },
});
