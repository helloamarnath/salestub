import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { createDeal, updateDeal, getDeal } from '@/lib/api/deals';
import { searchContacts } from '@/lib/api/contacts';
import { searchCompanies } from '@/lib/api/companies';
import type { Deal, DealStage, DealStatus, CreateDealDto } from '@/types/deal';
import type { Contact } from '@/types/contact';
import type { Company } from '@/types/company';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  DEAL_STATUS_LABELS,
  DEAL_STATUS_COLORS,
} from '@/types/deal';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import { getCompanyInitials, COMPANY_TYPE_COLORS } from '@/types/company';

const STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
];

const STATUSES: DealStatus[] = ['OPEN', 'WON', 'LOST'];

// Input Field Component
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  required = false,
  isDark,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  required?: boolean;
  isDark: boolean;
  error?: string;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = error ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: textColor }]}>
        {label}
        {required && <Text style={styles.requiredStar}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          { backgroundColor: inputBg, borderColor, color: textColor },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={subtitleColor}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Picker Field Component
function PickerField({
  label,
  value,
  displayValue,
  onPress,
  placeholder,
  required = false,
  isDark,
  color,
}: {
  label: string;
  value: any;
  displayValue: string;
  onPress: () => void;
  placeholder: string;
  required?: boolean;
  isDark: boolean;
  color?: string;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: textColor }]}>
        {label}
        {required && <Text style={styles.requiredStar}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: inputBg, borderColor }]}
        onPress={onPress}
      >
        {value ? (
          <View style={styles.pickerValue}>
            {color && (
              <View style={[styles.pickerDot, { backgroundColor: color }]} />
            )}
            <Text style={[styles.pickerText, { color: textColor }]}>{displayValue}</Text>
          </View>
        ) : (
          <Text style={[styles.pickerPlaceholder, { color: subtitleColor }]}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={subtitleColor} />
      </TouchableOpacity>
    </View>
  );
}

// Selection Modal
function SelectionModal<T>({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  getLabel,
  getColor,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: T[];
  selectedValue: T | undefined;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
  getColor?: (value: T) => string;
  isDark: boolean;
}) {
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const itemBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {options.map((option, index) => {
            const isSelected = selectedValue === option;
            const label = getLabel(option);
            const color = getColor ? getColor(option) : undefined;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.modalItem,
                  { backgroundColor: isSelected ? `${color || '#3b82f6'}20` : itemBg },
                  { borderColor },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(option);
                  onClose();
                }}
              >
                {color && (
                  <View style={[styles.itemDot, { backgroundColor: color }]} />
                )}
                <Text style={[styles.modalItemText, { color: textColor }]}>{label}</Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={color || '#3b82f6'} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Entity Search Modal
function EntitySearchModal<T extends { id: string }>({
  visible,
  onClose,
  title,
  placeholder,
  selectedEntity,
  onSelect,
  searchFn,
  renderItem,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  selectedEntity: T | null;
  onSelect: (entity: T | null) => void;
  searchFn: (query: string) => Promise<T[]>;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  isDark: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setLoading(true);
        try {
          const data = await searchFn(searchQuery);
          setResults(data);
        } catch (error) {
          console.error('Search error:', error);
        }
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFn]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: inputBg, borderColor }]}>
          <Ionicons name="search-outline" size={20} color={subtitleColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={placeholder}
            placeholderTextColor={subtitleColor}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={subtitleColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Entity */}
        {selectedEntity && (
          <View style={styles.selectedContainer}>
            <Text style={[styles.selectedLabel, { color: subtitleColor }]}>Selected:</Text>
            <View style={styles.selectedItem}>
              {renderItem(selectedEntity, true)}
              <TouchableOpacity
                onPress={() => {
                  onSelect(null);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Results */}
        <View style={styles.modalContent}>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 20 }} />
          ) : searchQuery.length < 2 ? (
            <Text style={[styles.hintText, { color: subtitleColor }]}>
              Type at least 2 characters to search
            </Text>
          ) : results.length === 0 ? (
            <Text style={[styles.hintText, { color: subtitleColor }]}>
              No results found
            </Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.resultItem,
                    { borderColor },
                    selectedEntity?.id === item.id && { backgroundColor: '#3b82f620' },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(item);
                    onClose();
                  }}
                >
                  {renderItem(item, selectedEntity?.id === item.id)}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CreateDealScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const isEdit = !!id;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<DealStage>('PROSPECTING');
  const [status, setStatus] = useState<DealStatus>('OPEN');
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchingDeal, setFetchingDeal] = useState(isEdit);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Theme colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // Fetch deal for editing
  useEffect(() => {
    if (isEdit) {
      fetchDeal();
    }
  }, [id]);

  const fetchDeal = async () => {
    try {
      const response = await getDeal(accessToken, id!);
      if (response.success && response.data) {
        const deal = response.data;
        setTitle(deal.title);
        setDescription(deal.description || '');
        setValue(deal.value.toString());
        setStage(deal.stage);
        setStatus(deal.status);
        if (deal.expectedCloseDate) {
          setExpectedCloseDate(new Date(deal.expectedCloseDate));
        }
        if (deal.contact) {
          setContact(deal.contact);
        }
        if (deal.company) {
          setCompany(deal.company);
        }
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
      Alert.alert('Error', 'Failed to load deal');
    }
    setFetchingDeal(false);
  };

  // Search functions
  const handleSearchContacts = useCallback(async (query: string): Promise<Contact[]> => {
    try {
      const response = await searchContacts(accessToken, query);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Contact search error:', error);
    }
    return [];
  }, [accessToken]);

  const handleSearchCompanies = useCallback(async (query: string): Promise<Company[]> => {
    try {
      const response = await searchCompanies(accessToken, query);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Company search error:', error);
    }
    return [];
  }, [accessToken]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!value.trim()) {
      newErrors.value = 'Value is required';
    } else if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
      newErrors.value = 'Enter a valid amount';
    }

    if (!contact) {
      newErrors.contact = 'Contact is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const data: CreateDealDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        value: parseFloat(value),
        stage,
        status,
        expectedCloseDate: expectedCloseDate?.toISOString(),
        contactId: contact!.id,
        companyId: company?.id,
      };

      const response = isEdit
        ? await updateDeal(accessToken, id!, data)
        : await createDeal(accessToken, data);

      if (response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to save deal');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }

    setLoading(false);
  };

  const renderContactItem = (item: Contact, isSelected: boolean) => {
    const fullName = getContactFullName(item);
    const initials = getContactInitials(item);
    const avatarColor = getAvatarColor(fullName);

    return (
      <View style={styles.entityItem}>
        <View style={[styles.entityAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.entityAvatarText}>{initials}</Text>
        </View>
        <View style={styles.entityInfo}>
          <Text style={[styles.entityName, { color: textColor }]}>{fullName}</Text>
          {item.email && (
            <Text style={[styles.entitySubtitle, { color: subtitleColor }]}>{item.email}</Text>
          )}
        </View>
        {isSelected && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
      </View>
    );
  };

  const renderCompanyItem = (item: Company, isSelected: boolean) => {
    const initials = getCompanyInitials(item);
    const typeColor = COMPANY_TYPE_COLORS[item.type] || '#3b82f6';

    return (
      <View style={styles.entityItem}>
        <View style={[styles.entityAvatar, { backgroundColor: typeColor }]}>
          <Text style={styles.entityAvatarText}>{initials}</Text>
        </View>
        <View style={styles.entityInfo}>
          <Text style={[styles.entityName, { color: textColor }]}>{item.name}</Text>
          {item.industry && (
            <Text style={[styles.entitySubtitle, { color: subtitleColor }]}>{item.industry}</Text>
          )}
        </View>
        {isSelected && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
      </View>
    );
  };

  if (fetchingDeal) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {isEdit ? 'Edit Deal' : 'New Deal'}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <InputField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter deal title"
            required
            isDark={isDark}
            error={errors.title}
          />

          {/* Value */}
          <InputField
            label="Value"
            value={value}
            onChangeText={setValue}
            placeholder="Enter deal value"
            keyboardType="numeric"
            required
            isDark={isDark}
            error={errors.value}
          />

          {/* Stage Picker */}
          <PickerField
            label="Stage"
            value={stage}
            displayValue={DEAL_STAGE_LABELS[stage]}
            onPress={() => setShowStagePicker(true)}
            placeholder="Select stage"
            isDark={isDark}
            color={DEAL_STAGE_COLORS[stage]}
          />

          {/* Status Picker */}
          <PickerField
            label="Status"
            value={status}
            displayValue={DEAL_STATUS_LABELS[status]}
            onPress={() => setShowStatusPicker(true)}
            placeholder="Select status"
            isDark={isDark}
            color={DEAL_STATUS_COLORS[status]}
          />

          {/* Contact Picker */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>
              Contact<Text style={styles.requiredStar}> *</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: errors.contact ? '#ef4444' : borderColor },
              ]}
              onPress={() => setShowContactPicker(true)}
            >
              {contact ? (
                <View style={styles.entityItem}>
                  <View style={[styles.entityAvatar, { backgroundColor: getAvatarColor(getContactFullName(contact)), width: 32, height: 32 }]}>
                    <Text style={[styles.entityAvatarText, { fontSize: 12 }]}>{getContactInitials(contact)}</Text>
                  </View>
                  <Text style={[styles.pickerText, { color: textColor }]}>
                    {getContactFullName(contact)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.pickerPlaceholder, { color: subtitleColor }]}>
                  Search and select contact
                </Text>
              )}
              <Ionicons name="search" size={20} color={subtitleColor} />
            </TouchableOpacity>
            {errors.contact && <Text style={styles.errorText}>{errors.contact}</Text>}
          </View>

          {/* Company Picker */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Company</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor },
              ]}
              onPress={() => setShowCompanyPicker(true)}
            >
              {company ? (
                <View style={styles.entityItem}>
                  <View style={[styles.entityAvatar, { backgroundColor: COMPANY_TYPE_COLORS[company.type] || '#3b82f6', width: 32, height: 32 }]}>
                    <Text style={[styles.entityAvatarText, { fontSize: 12 }]}>{getCompanyInitials(company)}</Text>
                  </View>
                  <Text style={[styles.pickerText, { color: textColor }]}>
                    {company.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.pickerPlaceholder, { color: subtitleColor }]}>
                  Search and select company (optional)
                </Text>
              )}
              <Ionicons name="search" size={20} color={subtitleColor} />
            </TouchableOpacity>
          </View>

          {/* Expected Close Date */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Expected Close Date</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              {expectedCloseDate ? (
                <Text style={[styles.pickerText, { color: textColor }]}>
                  {expectedCloseDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              ) : (
                <Text style={[styles.pickerPlaceholder, { color: subtitleColor }]}>
                  Select expected close date
                </Text>
              )}
              <Ionicons name="calendar-outline" size={20} color={subtitleColor} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <InputField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter deal description"
            multiline
            isDark={isDark}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Stage Picker Modal */}
      <SelectionModal
        visible={showStagePicker}
        onClose={() => setShowStagePicker(false)}
        title="Select Stage"
        options={STAGES}
        selectedValue={stage}
        onSelect={setStage}
        getLabel={(s) => DEAL_STAGE_LABELS[s]}
        getColor={(s) => DEAL_STAGE_COLORS[s]}
        isDark={isDark}
      />

      {/* Status Picker Modal */}
      <SelectionModal
        visible={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        title="Select Status"
        options={STATUSES}
        selectedValue={status}
        onSelect={setStatus}
        getLabel={(s) => DEAL_STATUS_LABELS[s]}
        getColor={(s) => DEAL_STATUS_COLORS[s]}
        isDark={isDark}
      />

      {/* Contact Search Modal */}
      <EntitySearchModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        title="Select Contact"
        placeholder="Search contacts..."
        selectedEntity={contact}
        onSelect={setContact}
        searchFn={handleSearchContacts}
        renderItem={renderContactItem}
        isDark={isDark}
      />

      {/* Company Search Modal */}
      <EntitySearchModal
        visible={showCompanyPicker}
        onClose={() => setShowCompanyPicker(false)}
        title="Select Company"
        placeholder="Search companies..."
        selectedEntity={company}
        onSelect={setCompany}
        searchFn={handleSearchCompanies}
        renderItem={renderCompanyItem}
        isDark={isDark}
      />

      {/* Date Picker - iOS: spinner with Done button, Android: native dialog */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerOverlay}>
          <View style={[styles.datePickerContainer, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <View style={[styles.datePickerHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: isDark ? 'white' : '#000' }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={expectedCloseDate || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                if (date) {
                  setExpectedCloseDate(date);
                }
              }}
              minimumDate={new Date()}
              style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff' }}
              textColor={isDark ? 'white' : '#000'}
            />
          </View>
        </View>
      )}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={expectedCloseDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              setExpectedCloseDate(date);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  pickerText: {
    fontSize: 16,
  },
  pickerPlaceholder: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  selectedContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  selectedLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginLeft: 8,
  },
  hintText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entityAvatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    fontSize: 15,
    fontWeight: '500',
  },
  entitySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#ef4444',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
