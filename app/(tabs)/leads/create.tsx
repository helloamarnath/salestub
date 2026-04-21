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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newContactData, setNewContactData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
  } | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Lead sources state
  const [leadSources, setLeadSources] = useState<string[]>([...LEAD_SOURCES]);
  const [loadingSources, setLoadingSources] = useState(false);

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
        if (lead.contact) {
          setSelectedContact(lead.contact as unknown as Contact);
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    const leadData: CreateLeadDto | UpdateLeadDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      value: value ? Number(value) : undefined,
      score,
      source: source || undefined,
    };

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
    const hasData = title || description || value || selectedContact || newContactData?.firstName;

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
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading lead...</Text>
        </View>
      </View>
    );
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
                label="Value (INR)"
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

          <ScoreSlider value={score} onChange={setScore} isDark={isDark} />

          {/* Pipeline Section */}
          <SectionHeader title="Pipeline" isDark={isDark} />
          <SourcePicker value={source} onChange={setSource} sources={leadSources} loading={loadingSources} isDark={isDark} />

          {/* Contact Section */}
          <ContactPicker
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            onCreateNew={() => {}}
            newContactData={newContactData}
            onNewContactDataChange={setNewContactData}
            accessToken={accessToken}
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
