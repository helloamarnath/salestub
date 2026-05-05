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
  Switch,
  Platform,
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import {
  getConfig,
  saveConfig,
  verifyConfig,
  disconnectConfig,
  regenerateWebhookSecret,
  updatePolicy,
} from '@/lib/api/whatsapp';
import type { WhatsappStatus } from '@/types/whatsapp';

const AUTO_CREATE_LEAD_OPTIONS: { value: 'OFF' | 'PROMPT' | 'AUTO'; label: string; hint: string }[] = [
  { value: 'OFF', label: 'Off', hint: 'Never auto-create leads' },
  { value: 'PROMPT', label: 'Prompt', hint: 'Show "Create lead" CTA' },
  { value: 'AUTO', label: 'Auto', hint: 'Create immediately on first inbound' },
];

export default function WhatsappSettingsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuth();
  const isAdmin = user?.roles?.includes('ORG_SUPER_ADMIN') ?? false;

  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connect form (only when not connected)
  const [integratedNumber, setIntegratedNumber] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Webhook secret reveal
  const [secretVisible, setSecretVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Policy editor
  const [autoCreateLead, setAutoCreateLead] = useState<'OFF' | 'PROMPT' | 'AUTO'>('PROMPT');
  const [optInRequired, setOptInRequired] = useState(false);
  const [stopKeywords, setStopKeywords] = useState('');
  const [templateNamespace, setTemplateNamespace] = useState('');
  const [policyDirty, setPolicyDirty] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const res = await getConfig(accessToken);
    if (res.success && res.data) {
      setStatus(res.data);
      setAutoCreateLead(res.data.autoCreateLead || 'PROMPT');
      setOptInRequired(res.data.optInRequired ?? false);
      setStopKeywords((res.data.stopKeywords || []).join(', '));
      setTemplateNamespace(res.data.templateNamespace ?? '');
      setPolicyDirty(false);
    } else {
      setError(res.error?.message || 'Failed to load WhatsApp settings');
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ----- Connect / Verify -----
  const handleVerify = async () => {
    if (!accessToken) return;
    if (!integratedNumber.trim() || !authKey.trim()) {
      Alert.alert('Missing', 'Enter both the WhatsApp number and the MSG91 auth key.');
      return;
    }
    setVerifying(true);
    const res = await verifyConfig(accessToken, {
      integratedNumber: integratedNumber.trim(),
      authKey: authKey.trim(),
    });
    setVerifying(false);
    if (res.success && res.data?.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Verified', 'Credentials work. Tap Connect to save.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Verification failed',
        res.data?.error || res.error?.message || 'Could not verify credentials.',
      );
    }
  };

  const handleConnect = async () => {
    if (!accessToken) return;
    if (!integratedNumber.trim() || !authKey.trim()) {
      Alert.alert('Missing', 'Enter both the WhatsApp number and the MSG91 auth key.');
      return;
    }
    setSaving(true);
    const res = await saveConfig(accessToken, {
      integratedNumber: integratedNumber.trim(),
      authKey: authKey.trim(),
    });
    setSaving(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIntegratedNumber('');
      setAuthKey('');
      await fetchStatus();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Connect failed', res.error?.message || 'Could not save configuration.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect WhatsApp?',
      'Existing conversations are preserved, but you will stop receiving new messages until you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            const res = await disconnectConfig(accessToken);
            if (res.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await fetchStatus();
            } else {
              Alert.alert('Failed', res.error?.message || 'Could not disconnect.');
            }
          },
        },
      ],
    );
  };

  // ----- Webhook -----
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
  const webhookUrl = status?.connected && user?.orgId
    ? `${baseUrl}/api/v1/whatsapp/webhook/${user.orgId}`
    : '';

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const handleRegenerateSecret = () => {
    Alert.alert(
      'Regenerate webhook secret?',
      'The current secret stops working immediately. Update MSG91 with the new value or webhooks will start failing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            setRegenerating(true);
            const res = await regenerateWebhookSecret(accessToken);
            setRegenerating(false);
            if (res.success && res.data) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStatus((prev) =>
                prev ? { ...prev, webhookSecret: res.data!.webhookSecret } : prev,
              );
              setSecretVisible(true);
            } else {
              Alert.alert('Failed', res.error?.message || 'Could not regenerate secret.');
            }
          },
        },
      ],
    );
  };

  // ----- Policy -----
  const markPolicyDirty = () => setPolicyDirty(true);

  const handleSavePolicy = async () => {
    if (!accessToken) return;
    setSavingPolicy(true);
    const keywords = stopKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const res = await updatePolicy(accessToken, {
      autoCreateLead,
      optInRequired,
      stopKeywords: keywords,
      templateNamespace: templateNamespace.trim() || null,
    });
    setSavingPolicy(false);
    if (res.success && res.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus(res.data);
      setPolicyDirty(false);
    } else {
      Alert.alert('Save failed', res.error?.message || 'Could not save compliance settings.');
    }
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>WhatsApp settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {status?.connected ? 'Connected' : 'Not connected'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!isAdmin ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Only organization admins can manage WhatsApp settings.
          </Text>
        </View>
      ) : loading && !status ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !status ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retry, { backgroundColor: colors.primary }]}
            onPress={fetchStatus}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Connection */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Connection
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {status?.connected ? (
              <>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: Palette.emerald }]} />
                  <Text style={[styles.statusText, { color: Palette.emerald }]}>Connected</Text>
                </View>
                <View style={{ height: 12 }} />
                <InfoLine
                  label="Number"
                  value={status.integratedNumber || '—'}
                  isDark={isDark}
                />
                <InfoLine label="Auth key" value={status.authKeyMasked || '—'} isDark={isDark} />
                {status.lastVerifiedAt && (
                  <InfoLine
                    label="Last verified"
                    value={new Date(status.lastVerifiedAt).toLocaleString('en-IN')}
                    isDark={isDark}
                  />
                )}
                <TouchableOpacity
                  style={[styles.dangerButton, { borderColor: Palette.red }]}
                  onPress={handleDisconnect}
                >
                  <Ionicons name="log-out-outline" size={16} color={Palette.red} />
                  <Text style={[styles.dangerButtonText, { color: Palette.red }]}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  WhatsApp number (E.164, no +)
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={integratedNumber}
                  onChangeText={setIntegratedNumber}
                  placeholder="917000000000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />

                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}
                >
                  MSG91 auth key
                </Text>
                <View
                  style={[
                    styles.fieldInputRow,
                    { backgroundColor: inputBg, borderColor },
                  ]}
                >
                  <TextInput
                    style={[styles.fieldInputInner, { color: colors.foreground }]}
                    value={authKey}
                    onChangeText={setAuthKey}
                    placeholder="••••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showAuthKey}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowAuthKey((v) => !v)}>
                    <Ionicons
                      name={showAuthKey ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor }]}
                    onPress={handleVerify}
                    disabled={verifying || saving}
                  >
                    {verifying ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <Text style={{ color: colors.foreground, fontWeight: '600' }}>Verify</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: '#25D366' },
                      saving && { opacity: 0.6 },
                    ]}
                    onPress={handleConnect}
                    disabled={saving || verifying}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Connect</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Webhook config */}
          {status?.connected && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
                Webhook
              </Text>
              <View
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>URL</Text>
                <View style={styles.copyRow}>
                  <Text
                    style={[
                      styles.code,
                      { color: colors.foreground, backgroundColor: inputBg, borderColor },
                    ]}
                    numberOfLines={1}
                  >
                    {webhookUrl}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyBtn, { backgroundColor: inputBg }]}
                    onPress={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.copyBtn, { backgroundColor: inputBg }]}
                    onPress={() => Share.share({ message: webhookUrl })}
                  >
                    <Ionicons name="share-outline" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}
                >
                  Header — X-Webhook-Secret
                </Text>
                <View style={styles.copyRow}>
                  <Text
                    style={[
                      styles.code,
                      { color: colors.foreground, backgroundColor: inputBg, borderColor },
                    ]}
                    numberOfLines={1}
                  >
                    {secretVisible
                      ? status.webhookSecret || '—'
                      : `••••••••${(status.webhookSecret || '').slice(-6)}`}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyBtn, { backgroundColor: inputBg }]}
                    onPress={() => setSecretVisible((v) => !v)}
                  >
                    <Ionicons
                      name={secretVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={colors.foreground}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.copyBtn, { backgroundColor: inputBg }]}
                    onPress={() =>
                      copyToClipboard(status.webhookSecret || '', 'Webhook secret')
                    }
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.dangerButton, { borderColor: Palette.amber }]}
                  onPress={handleRegenerateSecret}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <ActivityIndicator size="small" color={Palette.amber} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color={Palette.amber} />
                      <Text style={[styles.dangerButtonText, { color: Palette.amber }]}>
                        Regenerate secret
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={[styles.helperText, { color: colors.mutedForeground, marginTop: 10 }]}>
                  In MSG91 dashboard, point these 5 events at the URL above with the
                  X-Webhook-Secret header: Inbound, Sent, Delivered, Read, Failed.
                </Text>
              </View>
            </>
          )}

          {/* Compliance / Policy */}
          {status?.connected && (
            <>
              <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  Compliance & policy
                </Text>
                {policyDirty && (
                  <TouchableOpacity onPress={handleSavePolicy} disabled={savingPolicy}>
                    {savingPolicy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={[styles.sectionAction, { color: colors.primary }]}>Save</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <View
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {/* Auto-create lead */}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Auto-create lead
                </Text>
                <View style={styles.segmented}>
                  {AUTO_CREATE_LEAD_OPTIONS.map((opt) => {
                    const active = autoCreateLead === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.segmentedItem,
                          {
                            backgroundColor: active ? colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          setAutoCreateLead(opt.value);
                          markPolicyDirty();
                        }}
                      >
                        <Text
                          style={{
                            color: active ? colors.primaryForeground : colors.foreground,
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                  {
                    AUTO_CREATE_LEAD_OPTIONS.find((o) => o.value === autoCreateLead)?.hint
                  }
                </Text>

                {/* Opt-in required */}
                <View style={[styles.toggleRow, { marginTop: 18 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                      Require explicit opt-in
                    </Text>
                    <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                      Block sending to contacts without recorded opt-in (DPDP/GDPR-safe)
                    </Text>
                  </View>
                  <Switch
                    value={optInRequired}
                    onValueChange={(v) => {
                      setOptInRequired(v);
                      markPolicyDirty();
                    }}
                    trackColor={{ false: colors.border, true: Palette.emerald }}
                  />
                </View>

                {/* STOP keywords */}
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 18 }]}
                >
                  Custom STOP keywords (comma-separated)
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={stopKeywords}
                  onChangeText={(t) => {
                    setStopKeywords(t);
                    markPolicyDirty();
                  }}
                  placeholder="rok do, rukko, no thanks"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
                <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                  English / Hindi / Tamil defaults are always active. Add localized variants here.
                </Text>

                {/* Template namespace */}
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 18 }]}
                >
                  Meta template namespace
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  ]}
                  value={templateNamespace}
                  onChangeText={(t) => {
                    setTemplateNamespace(t);
                    markPolicyDirty();
                  }}
                  placeholder="UUID — required for marketplace lead notifications"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function InfoLine({
  label,
  value,
  isDark,
}: {
  label: string;
  value: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={styles.infoLine}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  /* Section */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionAction: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },

  /* Status */
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontWeight: '700' },

  /* Field */
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
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingRight: 12,
  },
  fieldInputInner: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  helperText: { fontSize: 12, marginTop: 4 },

  /* Info line */
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },

  /* Buttons */
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  dangerButtonText: { fontSize: 13, fontWeight: '700' },

  /* Webhook copy row */
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  code: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },

  /* Segmented control */
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
});
