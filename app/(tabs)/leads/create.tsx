import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import { createLead, updateLead, getLead, getLeadSources } from '@/lib/api/leads';
import { searchContacts } from '@/lib/api/contacts';
import { searchCompanies, createCompany } from '@/lib/api/companies';
import type { Company } from '@/types/company';
import { getPipelines, type Pipeline, type PipelineStage } from '@/lib/api/pipelines';
import {
  getOrganizationMembers,
  getMemberDisplayName,
  getCurrencies,
  getOrganizationSettings,
  type OrgMember,
  type Currency,
} from '@/lib/api/organization';
import { LEAD_SOURCES, SOURCE_COLORS } from '@/types/lead';
import type { CreateLeadDto, UpdateLeadDto, Lead } from '@/types/lead';
import type { Contact } from '@/types/contact';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';

// Form section header
function SectionHeader({ title, isDark }: { title: string; isDark?: boolean }) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

// Form input field
function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  error,
  required,
  isDark,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  error?: string;
  required?: boolean;
  isDark?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }, error && styles.inputError]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Score slider
function ScoreSlider({
  value,
  onChange,
  isDark,
}: {
  value: number;
  onChange: (val: number) => void;
  isDark?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const getScoreColor = (score: number) => {
    if (score >= 70) return Palette.emerald;
    if (score >= 40) return Palette.amber;
    return Palette.red;
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Lead Score</Text>
      <View style={[styles.scoreContainer, { backgroundColor: colors.muted }]}>
        <View style={[styles.scoreSliderTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.scoreSliderFill,
              {
                width: `${value}%`,
                backgroundColor: getScoreColor(value),
              },
            ]}
          />
        </View>
        <View style={styles.scoreButtons}>
          <TouchableOpacity
            style={[styles.scoreButton, { backgroundColor: colors.border }]}
            onPress={() => onChange(Math.max(0, value - 10))}
          >
            <Ionicons name="remove" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.scoreValue, { color: getScoreColor(value) }]}>
            {value}
          </Text>
          <TouchableOpacity
            style={[styles.scoreButton, { backgroundColor: colors.border }]}
            onPress={() => onChange(Math.min(100, value + 10))}
          >
            <Ionicons name="add" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Source picker
function SourcePicker({
  value,
  onChange,
  sources,
  loading,
  isDark,
}: {
  value: string;
  onChange: (source: string) => void;
  sources: string[];
  loading?: boolean;
  isDark?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Source</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
      >
        {value ? (
          <View style={styles.sourceChipSelected}>
            <View
              style={[
                styles.sourceChipDot,
                { backgroundColor: SOURCE_COLORS[value] || '#6b7280' },
              ]}
            />
            <Text style={[styles.pickerButtonText, { color: colors.foreground }]}>{value}</Text>
          </View>
        ) : (
          <Text style={[styles.pickerPlaceholder, { color: colors.mutedForeground }]}>Select source...</Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.sourceList, { backgroundColor: colors.secondary }]}>
          {loading ? (
            <View style={styles.sourceLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            sources.map((source) => (
              <TouchableOpacity
                key={source}
                style={[
                  styles.sourceOption,
                  { borderBottomColor: colors.border },
                  value === source && styles.sourceOptionSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onChange(source);
                  setExpanded(false);
                }}
              >
                <View
                  style={[
                    styles.sourceChipDot,
                    { backgroundColor: SOURCE_COLORS[source] || '#6b7280' },
                  ]}
                />
                <Text
                  style={[
                    styles.sourceOptionText,
                    { color: colors.foreground },
                    value === source && styles.sourceOptionTextSelected,
                  ]}
                >
                  {source}
                </Text>
                {value === source && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

// Stage picker — groups stages by pipeline. Selecting a stage implicitly picks its pipeline.
function StagePicker({
  value,
  onChange,
  pipelines,
  loading,
  isDark,
}: {
  value: string | undefined;
  onChange: (stageId: string | undefined, pipelineId: string | undefined) => void;
  pipelines: Pipeline[];
  loading?: boolean;
  isDark?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [expanded, setExpanded] = useState(false);

  const selected: { pipeline: Pipeline; stage: PipelineStage } | null = (() => {
    for (const p of pipelines) {
      const s = p.stages.find((st) => st.id === value);
      if (s) return { pipeline: p, stage: s };
    }
    return null;
  })();

  const showPipelineGroupHeaders = pipelines.length > 1;

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Pipeline & Stage</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
      >
        {selected ? (
          <View style={styles.sourceChipSelected}>
            {selected.stage.color && (
              <View style={[styles.sourceChipDot, { backgroundColor: selected.stage.color }]} />
            )}
            <Text style={[styles.pickerButtonText, { color: colors.foreground }]} numberOfLines={1}>
              {showPipelineGroupHeaders ? `${selected.pipeline.name} · ` : ''}
              {selected.stage.name}
            </Text>
          </View>
        ) : (
          <Text style={[styles.pickerPlaceholder, { color: colors.mutedForeground }]}>
            {pipelines.length === 0 ? 'No pipelines available' : 'Select stage…'}
          </Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.sourceList, { backgroundColor: colors.secondary }]}>
          {loading ? (
            <View style={styles.sourceLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            pipelines.flatMap((p) => {
              const rows: React.ReactNode[] = [];
              if (showPipelineGroupHeaders) {
                rows.push(
                  <View
                    key={`group-${p.id}`}
                    style={[styles.pickerGroupHeader, { backgroundColor: colors.muted }]}
                  >
                    <Text style={[styles.pickerGroupHeaderText, { color: colors.mutedForeground }]}>
                      {p.name}
                      {p.isDefault ? ' · Default' : ''}
                    </Text>
                  </View>,
                );
              }
              for (const stage of p.stages) {
                const isSelected = value === stage.id;
                rows.push(
                  <TouchableOpacity
                    key={stage.id}
                    style={[
                      styles.sourceOption,
                      { borderBottomColor: colors.border },
                      isSelected && styles.sourceOptionSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onChange(stage.id, p.id);
                      setExpanded(false);
                    }}
                  >
                    {stage.color && (
                      <View style={[styles.sourceChipDot, { backgroundColor: stage.color }]} />
                    )}
                    <Text
                      style={[
                        styles.sourceOptionText,
                        { color: colors.foreground },
                        isSelected && styles.sourceOptionTextSelected,
                      ]}
                    >
                      {stage.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>,
                );
              }
              return rows;
            })
          )}
        </View>
      )}
    </View>
  );
}

// Currency picker — defaults to org currency, lets the user override per-lead.
function CurrencyPicker({
  value,
  onChange,
  currencies,
  loading,
  isDark,
}: {
  value: string | undefined;
  onChange: (currencyId: string | undefined) => void;
  currencies: Currency[];
  loading?: boolean;
  isDark?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [expanded, setExpanded] = useState(false);

  const selected = currencies.find((c) => c.id === value);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Currency</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
      >
        {selected ? (
          <Text style={[styles.pickerButtonText, { color: colors.foreground }]}>
            {selected.symbol} {selected.code} — {selected.name}
          </Text>
        ) : (
          <Text style={[styles.pickerPlaceholder, { color: colors.mutedForeground }]}>
            {currencies.length === 0 ? 'No currencies available' : 'Select currency…'}
          </Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.sourceList, { backgroundColor: colors.secondary }]}>
          {loading ? (
            <View style={styles.sourceLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            currencies.map((c) => {
              const isSelected = value === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.sourceOption,
                    { borderBottomColor: colors.border },
                    isSelected && styles.sourceOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange(c.id);
                    setExpanded(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sourceOptionText,
                      { color: colors.foreground },
                      isSelected && styles.sourceOptionTextSelected,
                    ]}
                  >
                    {c.symbol} {c.code} — {c.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// Owner picker — only used in edit mode (create defaults to current user server-side).
function OwnerPicker({
  value,
  onChange,
  members,
  loading,
  isDark,
}: {
  value: string | undefined;
  onChange: (membershipId: string | undefined) => void;
  members: OrgMember[];
  loading?: boolean;
  isDark?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [expanded, setExpanded] = useState(false);

  const selected = members.find((m) => m.membershipId === value);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Owner</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
      >
        {selected ? (
          <Text style={[styles.pickerButtonText, { color: colors.foreground }]} numberOfLines={1}>
            {getMemberDisplayName(selected)}
          </Text>
        ) : (
          <Text style={[styles.pickerPlaceholder, { color: colors.mutedForeground }]}>
            {members.length === 0 ? 'No team members' : 'Select owner…'}
          </Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.sourceList, { backgroundColor: colors.secondary }]}>
          {loading ? (
            <View style={styles.sourceLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            members.map((m) => {
              const isSelected = value === m.membershipId;
              return (
                <TouchableOpacity
                  key={m.membershipId}
                  style={[
                    styles.sourceOption,
                    { borderBottomColor: colors.border },
                    isSelected && styles.sourceOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange(m.membershipId);
                    setExpanded(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sourceOptionText,
                      { color: colors.foreground },
                      isSelected && styles.sourceOptionTextSelected,
                    ]}
                  >
                    {getMemberDisplayName(m)}
                  </Text>
                  {m.email && (
                    <Text style={[styles.ownerEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {m.email}
                    </Text>
                  )}
                  {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// Contact picker with search and create new
function ContactPicker({
  selectedContact,
  onSelectContact,
  onCreateNew,
  newContactData,
  onNewContactDataChange,
  accessToken,
}: {
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact | null) => void;
  onCreateNew: () => void;
  newContactData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
  } | null;
  onNewContactDataChange: (data: typeof newContactData) => void;
  accessToken: string | null;
}) {
  const { resolvedTheme: pickerTheme } = useTheme();
  const colors = Colors[pickerTheme];
  const [mode, setMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search contacts with debounce
  useEffect(() => {
    if (mode !== 'search' || !accessToken) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const response = await searchContacts(accessToken, searchQuery);
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
      setSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, mode, accessToken]);

  const handleModeChange = (newMode: 'search' | 'new') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    if (newMode === 'new') {
      onSelectContact(null);
      if (!newContactData) {
        onNewContactDataChange({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          title: '',
        });
      }
    } else {
      onNewContactDataChange(null);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectContact(contact);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <View style={styles.contactPickerContainer}>
      <SectionHeader title="Contact" />

      {/* Mode toggle */}
      <View style={[styles.modeToggle, { backgroundColor: colors.secondary }]}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'search' && [styles.modeButtonActive, { backgroundColor: colors.primary }]]}
          onPress={() => handleModeChange('search')}
        >
          <Ionicons
            name="search"
            size={16}
            color={mode === 'search' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'search' ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            Link Existing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'new' && [styles.modeButtonActive, { backgroundColor: colors.primary }]]}
          onPress={() => handleModeChange('new')}
        >
          <Ionicons
            name="person-add"
            size={16}
            color={mode === 'new' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'new' ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            Create New
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'search' ? (
        <>
          {/* Selected contact display */}
          {selectedContact ? (
            <View style={[styles.selectedContactCard, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.contactAvatar,
                  { backgroundColor: getAvatarColor(getContactFullName(selectedContact)) },
                ]}
              >
                <Text style={[styles.contactAvatarText, { color: colors.foreground }]}>
                  {getContactInitials(selectedContact)}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.foreground }]}>
                  {getContactFullName(selectedContact)}
                </Text>
                {selectedContact.email && (
                  <Text style={[styles.contactEmail, { color: colors.mutedForeground }]}>{selectedContact.email}</Text>
                )}
                {selectedContact.phone && (
                  <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{selectedContact.phone}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.clearContactButton, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectContact(null);
                }}
              >
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Search input */}
              <View style={[styles.searchInputContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.mutedForeground}
                />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search contacts by name or email..."
                  placeholderTextColor={colors.mutedForeground}
                />
                {searching && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>

              {/* Search results */}
              {searchResults.length > 0 && (
                <View style={[styles.searchResults, { backgroundColor: colors.secondary }]}>
                  {searchResults.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectContact(contact)}
                    >
                      <View
                        style={[
                          styles.contactAvatarSmall,
                          { backgroundColor: getAvatarColor(getContactFullName(contact)) },
                        ]}
                      >
                        <Text style={[styles.contactAvatarTextSmall, { color: colors.foreground }]}>
                          {getContactInitials(contact)}
                        </Text>
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={[styles.searchResultName, { color: colors.foreground }]}>
                          {getContactFullName(contact)}
                        </Text>
                        <Text style={[styles.searchResultMeta, { color: colors.mutedForeground }]}>
                          {contact.email || contact.phone || 'No contact info'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>No contacts found</Text>
                  <TouchableOpacity
                    style={styles.createNewButton}
                    onPress={() => handleModeChange('new')}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={[styles.createNewButtonText, { color: colors.primary }]}>Create new contact</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </>
      ) : (
        /* Create new contact form */
        <View style={styles.newContactForm}>
          <View style={styles.nameRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                First Name<Text style={styles.required}> *</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newContactData?.firstName || ''}
                  onChangeText={(text) =>
                    onNewContactDataChange({
                      ...newContactData!,
                      firstName: text,
                    })
                  }
                  placeholder="First name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Last Name<Text style={styles.required}> *</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newContactData?.lastName || ''}
                  onChangeText={(text) =>
                    onNewContactDataChange({
                      ...newContactData!,
                      lastName: text,
                    })
                  }
                  placeholder="Last name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newContactData?.email || ''}
                onChangeText={(text) =>
                  onNewContactDataChange({
                    ...newContactData!,
                    email: text,
                  })
                }
                placeholder="email@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newContactData?.phone || ''}
                onChangeText={(text) =>
                  onNewContactDataChange({
                    ...newContactData!,
                    phone: text,
                  })
                }
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Title / Position</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newContactData?.title || ''}
                onChangeText={(text) =>
                  onNewContactDataChange({
                    ...newContactData!,
                    title: text,
                  })
                }
                placeholder="e.g., Sales Manager"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Company picker — three modes mirroring web: Skip, Link Existing, Create New.
type CompanyMode = 'skip' | 'search' | 'new';

export interface NewCompanyData {
  name: string;
  industry: string;
  website: string;
}

function CompanyPicker({
  mode,
  onModeChange,
  selectedCompany,
  onSelectCompany,
  newCompanyData,
  onNewCompanyDataChange,
  accessToken,
  isDark,
  errors,
}: {
  mode: CompanyMode;
  onModeChange: (mode: CompanyMode) => void;
  selectedCompany: Company | null;
  onSelectCompany: (company: Company | null) => void;
  newCompanyData: NewCompanyData;
  onNewCompanyDataChange: (data: NewCompanyData) => void;
  accessToken: string | null;
  isDark: boolean;
  errors: Record<string, string>;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced company search
  useEffect(() => {
    if (mode !== 'search' || !accessToken) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const response = await searchCompanies(accessToken, searchQuery);
      if (response.success && response.data) setSearchResults(response.data);
      setSearching(false);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, mode, accessToken]);

  const handleModeChange = (next: CompanyMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onModeChange(next);
    if (next !== 'search') onSelectCompany(null);
    if (next !== 'new') onNewCompanyDataChange({ name: '', industry: '', website: '' });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <View style={styles.contactPickerContainer}>
      <SectionHeader title="Company" isDark={isDark} />

      {/* Mode toggle — three buttons */}
      <View style={[styles.modeToggle, { backgroundColor: colors.secondary }]}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'skip' && [styles.modeButtonActive, { backgroundColor: colors.primary }]]}
          onPress={() => handleModeChange('skip')}
        >
          <Ionicons
            name="remove-circle-outline"
            size={16}
            color={mode === 'skip' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'skip' ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'search' && [styles.modeButtonActive, { backgroundColor: colors.primary }]]}
          onPress={() => handleModeChange('search')}
        >
          <Ionicons
            name="search"
            size={16}
            color={mode === 'search' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'search' ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            Link Existing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'new' && [styles.modeButtonActive, { backgroundColor: colors.primary }]]}
          onPress={() => handleModeChange('new')}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={mode === 'new' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeButtonText,
              { color: mode === 'new' ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            Create New
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'skip' && (
        <View style={[styles.skipCard, { backgroundColor: colors.muted }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            No company will be linked to this lead.
          </Text>
        </View>
      )}

      {mode === 'search' && (
        <>
          {selectedCompany ? (
            <View style={[styles.selectedContactCard, { backgroundColor: colors.secondary }]}>
              <View style={[styles.contactAvatar, { backgroundColor: getAvatarColor(selectedCompany.name) }]}>
                <Ionicons name="business" size={22} color={colors.foreground} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>
                  {selectedCompany.name}
                </Text>
                {selectedCompany.industry && (
                  <Text style={[styles.contactEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {selectedCompany.industry}
                  </Text>
                )}
                {selectedCompany.website && (
                  <Text style={[styles.contactPhone, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {selectedCompany.website}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.clearContactButton, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectCompany(null);
                }}
              >
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.searchInputContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search companies by name…"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {searchResults.length > 0 && (
                <View style={[styles.searchResults, { backgroundColor: colors.secondary }]}>
                  {searchResults.map((company) => (
                    <TouchableOpacity
                      key={company.id}
                      style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelectCompany(company);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <View
                        style={[
                          styles.contactAvatarSmall,
                          { backgroundColor: getAvatarColor(company.name) },
                        ]}
                      >
                        <Ionicons name="business" size={16} color={colors.foreground} />
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={[styles.searchResultName, { color: colors.foreground }]} numberOfLines={1}>
                          {company.name}
                        </Text>
                        <Text style={[styles.searchResultMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {company.industry || company.website || 'No details'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                    No companies found
                  </Text>
                  <TouchableOpacity
                    style={styles.createNewButton}
                    onPress={() => handleModeChange('new')}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={[styles.createNewButtonText, { color: colors.primary }]}>
                      Create new company
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </>
      )}

      {mode === 'new' && (
        <View style={styles.newContactForm}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
              Company Name<Text style={styles.required}> *</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.secondary, borderColor: colors.border },
                errors.companyName && styles.inputError,
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newCompanyData.name}
                onChangeText={(text) => onNewCompanyDataChange({ ...newCompanyData, name: text })}
                placeholder="e.g., Acme Corp"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Industry</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newCompanyData.industry}
                onChangeText={(text) => onNewCompanyDataChange({ ...newCompanyData, industry: text })}
                placeholder="e.g., Software"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Website</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.secondary, borderColor: colors.border },
                errors.companyWebsite && styles.inputError,
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newCompanyData.website}
                onChangeText={(text) => onNewCompanyDataChange({ ...newCompanyData, website: text })}
                placeholder="https://example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            {errors.companyWebsite && <Text style={styles.errorText}>{errors.companyWebsite}</Text>}
          </View>
        </View>
      )}
    </View>
  );
}

export default function CreateLeadScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { accessToken } = useAuth();
  const isEditing = !!editId;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [score, setScore] = useState(50);
  const [source, setSource] = useState('');
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [showValidUntilPicker, setShowValidUntilPicker] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newContactData, setNewContactData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
  } | null>(null);

  // Company picker state
  const [companyMode, setCompanyMode] = useState<CompanyMode>('skip');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyData, setNewCompanyData] = useState<NewCompanyData>({
    name: '',
    industry: '',
    website: '',
  });

  // Pipeline / stage / currency / owner state
  const [stageId, setStageId] = useState<string | undefined>(undefined);
  const [currencyId, setCurrencyId] = useState<string | undefined>(undefined);
  const [ownerMembershipId, setOwnerMembershipId] = useState<string | undefined>(undefined);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Lead sources state
  const [leadSources, setLeadSources] = useState<string[]>([...LEAD_SOURCES]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Lookup data for new pickers
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch lead sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      if (!accessToken) return;
      setLoadingSources(true);
      try {
        const response = await getLeadSources(accessToken);
        if (response.success && response.data?.labels) {
          setLeadSources(response.data.labels);
        }
      } catch (error) {
        console.error('Failed to fetch lead sources:', error);
        // Keep fallback LEAD_SOURCES on error
      }
      setLoadingSources(false);
    };
    fetchSources();
  }, [accessToken]);

  // Fetch pipelines, currencies, members, and seed org-default currency in parallel
  useEffect(() => {
    if (!accessToken) return;

    setLoadingPipelines(true);
    getPipelines(accessToken)
      .then((res) => {
        if (res.success && res.data) {
          // Only show LEAD-type pipelines in the create-lead form
          const leadPipelines = res.data.filter((p) => p.type === 'LEAD');
          setPipelines(leadPipelines);
        }
      })
      .finally(() => setLoadingPipelines(false));

    setLoadingCurrencies(true);
    getCurrencies(accessToken)
      .then((res) => {
        if (res.success && res.data) setCurrencies(res.data);
      })
      .finally(() => setLoadingCurrencies(false));

    setLoadingMembers(true);
    getOrganizationMembers(accessToken, { status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (res.success && res.data) setMembers(res.data.data);
      })
      .finally(() => setLoadingMembers(false));

    // Seed currencyId from org settings on create only — don't override an explicit edit-mode value
    if (!isEditing) {
      getOrganizationSettings(accessToken).then((res) => {
        if (res.success && res.data?.currencyId) {
          setCurrencyId((prev) => prev ?? res.data!.currencyId);
        }
      });
    }
  }, [accessToken, isEditing]);

  // Load existing lead for editing
  useEffect(() => {
    if (!isEditing || !accessToken || !editId) return;

    const fetchLead = async () => {
      setLoadingLead(true);
      const response = await getLead(accessToken, editId);
      if (response.success && response.data) {
        const lead = response.data;
        setTitle(lead.title);
        setDescription(lead.description || '');
        setValue(lead.value?.toString() || '');
        setScore(lead.score || 50);
        setSource(lead.source || '');
        setValidUntil(lead.validUntil ? new Date(lead.validUntil) : null);
        setStageId(lead.stageId || lead.stage?.id);
        setCurrencyId(lead.currencyId || lead.currency?.id);
        setOwnerMembershipId(lead.ownerMembershipId);
        if (lead.contact) {
          setSelectedContact(lead.contact as unknown as Contact);
        }
        if (lead.company) {
          setCompanyMode('search');
          setSelectedCompany(lead.company as unknown as Company);
        } else {
          setCompanyMode('skip');
        }
      } else {
        Alert.alert('Error', 'Failed to load lead');
        router.back();
      }
      setLoadingLead(false);
    };

    fetchLead();
  }, [isEditing, editId, accessToken]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (value && isNaN(Number(value))) {
      newErrors.value = 'Value must be a number';
    }

    if (newContactData) {
      if (!newContactData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!newContactData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (newContactData.email && !isValidEmail(newContactData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (companyMode === 'new') {
      if (!newCompanyData.name.trim()) {
        newErrors.companyName = 'Company name is required';
      }
      if (newCompanyData.website.trim() && !isValidUrl(newCompanyData.website.trim())) {
        newErrors.companyWebsite = 'Invalid website URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    // Accepts both bare domains (acme.com) and fully-qualified URLs.
    return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(url);
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Resolve companyId: skip → undefined; search → selectedCompany.id; new → create then use returned id
    let resolvedCompanyId: string | undefined;
    if (companyMode === 'search' && selectedCompany) {
      resolvedCompanyId = selectedCompany.id;
    } else if (companyMode === 'new' && newCompanyData.name.trim()) {
      const compRes = await createCompany(accessToken, {
        name: newCompanyData.name.trim(),
        industry: newCompanyData.industry.trim() || undefined,
        website: newCompanyData.website.trim() || undefined,
      });
      if (compRes.success && compRes.data) {
        resolvedCompanyId = compRes.data.id;
      } else {
        Alert.alert('Error', compRes.error?.message || 'Failed to create company');
        setLoading(false);
        return;
      }
    }

    const leadData: CreateLeadDto | UpdateLeadDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      value: value ? Number(value) : undefined,
      score,
      source: source || undefined,
      validUntil: validUntil ? validUntil.toISOString() : undefined,
      stageId: stageId || undefined,
      currencyId: currencyId || undefined,
      companyId: resolvedCompanyId,
    };

    // ownerMembershipId is only on UpdateLeadDto — create defaults to current user server-side
    if (isEditing && ownerMembershipId) {
      (leadData as UpdateLeadDto).ownerMembershipId = ownerMembershipId;
    }

    // Add contact info
    if (selectedContact) {
      (leadData as CreateLeadDto).contactId = selectedContact.id;
    } else if (newContactData && newContactData.firstName && newContactData.lastName) {
      (leadData as CreateLeadDto).createContact = {
        firstName: newContactData.firstName.trim(),
        lastName: newContactData.lastName.trim(),
        email: newContactData.email.trim() || undefined,
        phone: newContactData.phone.trim() || undefined,
        title: newContactData.title.trim() || undefined,
      };
    }

    const response = isEditing
      ? await updateLead(accessToken, editId!, leadData as UpdateLeadDto)
      : await createLead(accessToken, leadData as CreateLeadDto);

    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to save lead');
    }

    setLoading(false);
  };

  // Handle back
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if form has data
    const hasData =
      title ||
      description ||
      value ||
      selectedContact ||
      newContactData?.firstName ||
      selectedCompany ||
      newCompanyData.name;

    if (hasData) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  if (loadingLead) {
    return <ScreenLoader />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.secondary }]} onPress={handleBack}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {isEditing ? 'Edit Lead' : 'New Lead'}
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info Section */}
          <SectionHeader title="Basic Information" isDark={isDark} />

          <FormInput
            label="Lead Title"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
            placeholder="e.g., Enterprise Software Deal"
            error={errors.title}
            required
            isDark={isDark}
          />

          <FormInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Add details about this lead..."
            multiline
            isDark={isDark}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormInput
                label="Value"
                value={value}
                onChangeText={(text) => {
                  setValue(text.replace(/[^0-9]/g, ''));
                  if (errors.value) setErrors({ ...errors, value: '' });
                }}
                placeholder="e.g., 50000"
                keyboardType="numeric"
                error={errors.value}
                isDark={isDark}
              />
            </View>
          </View>

          <CurrencyPicker
            value={currencyId}
            onChange={setCurrencyId}
            currencies={currencies}
            loading={loadingCurrencies}
            isDark={isDark}
          />

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Valid Until</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowValidUntilPicker(true);
              }}
            >
              <Text style={[styles.input, { color: validUntil ? colors.foreground : colors.mutedForeground }]}>
                {validUntil
                  ? validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Pick a date'}
              </Text>
            </TouchableOpacity>
          </View>
          {showValidUntilPicker && (
            <DateTimePicker
              value={validUntil || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowValidUntilPicker(Platform.OS === 'ios');
                if (date) setValidUntil(date);
              }}
            />
          )}

          <ScoreSlider value={score} onChange={setScore} isDark={isDark} />

          {/* Pipeline & Stage Section */}
          <SectionHeader title="Pipeline" isDark={isDark} />
          <StagePicker
            value={stageId}
            onChange={(nextStageId) => setStageId(nextStageId)}
            pipelines={pipelines}
            loading={loadingPipelines}
            isDark={isDark}
          />

          {/* Source Section */}
          <SectionHeader title="Source" isDark={isDark} />
          <SourcePicker
            value={source}
            onChange={setSource}
            sources={leadSources}
            loading={loadingSources}
            isDark={isDark}
          />

          {/* Assignment — edit mode only; create defaults owner to current user */}
          {isEditing && (
            <>
              <SectionHeader title="Assignment" isDark={isDark} />
              <OwnerPicker
                value={ownerMembershipId}
                onChange={setOwnerMembershipId}
                members={members}
                loading={loadingMembers}
                isDark={isDark}
              />
            </>
          )}

          {/* Contact Section */}
          <ContactPicker
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            onCreateNew={() => {}}
            newContactData={newContactData}
            onNewContactDataChange={setNewContactData}
            accessToken={accessToken}
          />

          {/* Company Section */}
          <CompanyPicker
            mode={companyMode}
            onModeChange={setCompanyMode}
            selectedCompany={selectedCompany}
            onSelectCompany={setSelectedCompany}
            newCompanyData={newCompanyData}
            onNewCompanyDataChange={setNewCompanyData}
            accessToken={accessToken}
            isDark={isDark}
            errors={errors}
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: Palette.red,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
  },
  inputError: {
    borderColor: Palette.red,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Palette.red,
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreContainer: {
    borderRadius: 12,
    padding: 16,
  },
  scoreSliderTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  scoreSliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  scoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerPlaceholder: {
    fontSize: 16,
  },
  sourceChipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceChipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sourceList: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sourceLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  sourceOptionSelected: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  sourceOptionText: {
    fontSize: 15,
    flex: 1,
  },
  sourceOptionTextSelected: {
    fontWeight: '500',
  },
  pickerGroupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerGroupHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ownerEmail: {
    fontSize: 12,
    marginRight: 8,
    maxWidth: 140,
  },
  skipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  skipText: {
    fontSize: 13,
    flex: 1,
  },
  contactPickerContainer: {
    marginTop: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modeButtonActive: {},
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextActive: {},
  selectedContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    marginTop: 1,
  },
  clearContactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResults: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchResultMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noResultsText: {
    fontSize: 14,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  createNewButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  newContactForm: {
    gap: 0,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
});
