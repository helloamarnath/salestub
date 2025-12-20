import { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { getContact, createContact, updateContact } from '@/lib/api/contacts';
import { searchCompanies } from '@/lib/api/companies';
import type { CreateContactDto } from '@/types/contact';
import type { Company } from '@/types/company';

// Input Field Component
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  isDark,
  keyboardType = 'default',
  multiline = false,
  required = false,
  error,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isDark: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url' | 'numeric';
  multiline?: boolean;
  required?: boolean;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = error ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const iconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: labelColor }]}>
        {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      <View style={[
        styles.inputWrapper,
        multiline && styles.multilineWrapper,
        { backgroundColor: inputBg, borderColor },
      ]}>
        {icon && <Ionicons name={icon} size={18} color={iconColor} style={styles.inputIcon} />}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            { color: textColor },
            icon && { paddingLeft: 0 },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'words'}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Section Header
function SectionHeader({
  title,
  icon,
  isDark,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const iconColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  return (
    <View style={styles.sectionHeaderContainer}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.sectionHeader, { color: textColor }]}>{title}</Text>
    </View>
  );
}

// Company Picker
function CompanyPicker({
  selectedCompany,
  companyName,
  onSelect,
  onChangeCompanyName,
  isDark,
  accessToken,
}: {
  selectedCompany: Company | null;
  companyName: string;
  onSelect: (company: Company | null) => void;
  onChangeCompanyName: (name: string) => void;
  isDark: boolean;
  accessToken: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const response = await searchCompanies(accessToken, searchQuery, 5);
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, accessToken]);

  if (selectedCompany) {
    return (
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: labelColor }]}>Company</Text>
        <TouchableOpacity
          style={[styles.selectedCompany, { backgroundColor: inputBg, borderColor }]}
          onPress={() => {
            onSelect(null);
            onChangeCompanyName('');
          }}
        >
          <View style={styles.selectedCompanyInfo}>
            <Ionicons name="business" size={20} color="#3b82f6" />
            <Text style={[styles.selectedCompanyName, { color: textColor }]}>
              {selectedCompany.name}
            </Text>
          </View>
          <Ionicons name="close-circle" size={22} color={placeholderColor} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: labelColor }]}>Company</Text>

      {showPicker ? (
        <>
          <View style={[styles.searchInputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="search" size={18} color={placeholderColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search companies..."
              placeholderTextColor={placeholderColor}
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color="#3b82f6" />}
          </View>

          {searchResults.length > 0 && (
            <View style={[styles.searchResults, { backgroundColor: inputBg, borderColor }]}>
              {searchResults.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[styles.searchResultItem, { borderBottomColor: borderColor }]}
                  onPress={() => {
                    onSelect(company);
                    onChangeCompanyName(company.name);
                    setShowPicker(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <Ionicons name="business-outline" size={18} color={placeholderColor} />
                  <Text style={[styles.searchResultText, { color: textColor }]}>
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.createNewButton}
            onPress={() => setShowPicker(false)}
          >
            <Text style={styles.createNewText}>Or enter company name manually</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.companyInputRow}>
          <View style={[styles.inputWrapper, { flex: 1, backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="business-outline" size={18} color={placeholderColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor, paddingLeft: 0 }]}
              value={companyName}
              onChangeText={onChangeCompanyName}
              placeholder="Enter company name"
              placeholderTextColor={placeholderColor}
            />
          </View>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: '#3b82f6' }]}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function CreateCustomerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state with all fields
  const [form, setForm] = useState<CreateContactDto>({
    firstName: '',
    lastName: '',
    email: '',
    secondaryEmail: '',
    phone: '',
    mobilePhone: '',
    title: '',
    position: '',
    department: '',
    companyId: undefined,
    companyName: '',
    linkedIn: '',
    twitter: '',
    facebook: '',
    website: '',
    primaryAddress: '',
    primaryCity: '',
    primaryState: '',
    primaryCountry: '',
    primaryPostalCode: '',
    dateOfBirth: '',
    anniversary: '',
    source: '',
    notes: '',
  });

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : colors.foreground;
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // Load existing contact for editing
  useEffect(() => {
    if (isEditing) {
      (async () => {
        const response = await getContact(accessToken, id);
        if (response.success && response.data) {
          const contact = response.data;
          setForm({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || '',
            secondaryEmail: contact.secondaryEmail || '',
            phone: contact.phone || '',
            mobilePhone: contact.mobilePhone || '',
            title: contact.title || '',
            position: contact.position || '',
            department: contact.department || '',
            companyId: contact.companyId,
            companyName: contact.companyName || '',
            linkedIn: contact.linkedIn || '',
            twitter: contact.twitter || '',
            facebook: contact.facebook || '',
            website: contact.website || '',
            primaryAddress: contact.primaryAddress || '',
            primaryCity: contact.primaryCity || '',
            primaryState: contact.primaryState || '',
            primaryCountry: contact.primaryCountry || '',
            primaryPostalCode: contact.primaryPostalCode || '',
            dateOfBirth: contact.dateOfBirth || '',
            anniversary: contact.anniversary || '',
            source: contact.source || '',
            notes: contact.notes || '',
          });
          if (contact.company) {
            setSelectedCompany(contact.company as Company);
          }
        }
        setLoading(false);
      })();
    }
  }, [isEditing, id, accessToken]);

  const updateForm = (field: keyof CreateContactDto, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (form.secondaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.secondaryEmail)) {
      newErrors.secondaryEmail = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    const data: CreateContactDto = {
      ...form,
      companyId: selectedCompany?.id || undefined,
    };

    // Clean up empty fields
    Object.keys(data).forEach((key) => {
      const k = key as keyof CreateContactDto;
      if (data[k] === '' || data[k] === undefined) {
        delete data[k];
      }
    });

    let response;
    if (isEditing) {
      response = await updateContact(accessToken, id!, data);
    } else {
      response = await createContact(accessToken, data);
    }

    if (response.success) {
      router.back();
    } else {
      Alert.alert('Error', response.error?.message || `Failed to ${isEditing ? 'update' : 'create'} customer`);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: headerBorderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {isEditing ? 'Edit Customer' : 'New Customer'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info */}
          <SectionHeader title="Basic Information" icon="person-outline" isDark={isDark} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="First Name"
                value={form.firstName}
                onChangeText={(v) => updateForm('firstName', v)}
                placeholder="John"
                isDark={isDark}
                required
                error={errors.firstName}
                icon="person-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Last Name"
                value={form.lastName}
                onChangeText={(v) => updateForm('lastName', v)}
                placeholder="Doe"
                isDark={isDark}
                required
                error={errors.lastName}
                icon="person-outline"
              />
            </View>
          </View>

          {/* Contact Info */}
          <SectionHeader title="Contact Information" icon="call-outline" isDark={isDark} />

          <InputField
            label="Email"
            value={form.email || ''}
            onChangeText={(v) => updateForm('email', v)}
            placeholder="john@example.com"
            isDark={isDark}
            keyboardType="email-address"
            error={errors.email}
            icon="mail-outline"
          />

          <InputField
            label="Secondary Email"
            value={form.secondaryEmail || ''}
            onChangeText={(v) => updateForm('secondaryEmail', v)}
            placeholder="john.work@example.com"
            isDark={isDark}
            keyboardType="email-address"
            error={errors.secondaryEmail}
            icon="mail-outline"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Phone"
                value={form.phone || ''}
                onChangeText={(v) => updateForm('phone', v)}
                placeholder="+1 234 567 8900"
                isDark={isDark}
                keyboardType="phone-pad"
                icon="call-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Mobile Phone"
                value={form.mobilePhone || ''}
                onChangeText={(v) => updateForm('mobilePhone', v)}
                placeholder="+1 234 567 8900"
                isDark={isDark}
                keyboardType="phone-pad"
                icon="phone-portrait-outline"
              />
            </View>
          </View>

          {/* Job Info */}
          <SectionHeader title="Job Information" icon="briefcase-outline" isDark={isDark} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Title"
                value={form.title || ''}
                onChangeText={(v) => updateForm('title', v)}
                placeholder="CEO, Manager, etc."
                isDark={isDark}
                icon="briefcase-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Position"
                value={form.position || ''}
                onChangeText={(v) => updateForm('position', v)}
                placeholder="Sales, Engineering"
                isDark={isDark}
                icon="person-outline"
              />
            </View>
          </View>

          <InputField
            label="Department"
            value={form.department || ''}
            onChangeText={(v) => updateForm('department', v)}
            placeholder="Sales, Marketing, IT"
            isDark={isDark}
            icon="layers-outline"
          />

          <CompanyPicker
            selectedCompany={selectedCompany}
            companyName={form.companyName || ''}
            onSelect={setSelectedCompany}
            onChangeCompanyName={(v) => updateForm('companyName', v)}
            isDark={isDark}
            accessToken={accessToken}
          />

          {/* Personal Dates */}
          <SectionHeader title="Personal Dates" icon="calendar-outline" isDark={isDark} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Date of Birth"
                value={form.dateOfBirth || ''}
                onChangeText={(v) => updateForm('dateOfBirth', v)}
                placeholder="YYYY-MM-DD"
                isDark={isDark}
                icon="gift-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Anniversary"
                value={form.anniversary || ''}
                onChangeText={(v) => updateForm('anniversary', v)}
                placeholder="YYYY-MM-DD"
                isDark={isDark}
                icon="heart-outline"
              />
            </View>
          </View>

          {/* Address */}
          <SectionHeader title="Address" icon="location-outline" isDark={isDark} />

          <InputField
            label="Street Address"
            value={form.primaryAddress || ''}
            onChangeText={(v) => updateForm('primaryAddress', v)}
            placeholder="123 Main Street"
            isDark={isDark}
            icon="home-outline"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="City"
                value={form.primaryCity || ''}
                onChangeText={(v) => updateForm('primaryCity', v)}
                placeholder="New York"
                isDark={isDark}
                icon="business-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="State"
                value={form.primaryState || ''}
                onChangeText={(v) => updateForm('primaryState', v)}
                placeholder="NY"
                isDark={isDark}
                icon="map-outline"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Country"
                value={form.primaryCountry || ''}
                onChangeText={(v) => updateForm('primaryCountry', v)}
                placeholder="USA"
                isDark={isDark}
                icon="globe-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Postal Code"
                value={form.primaryPostalCode || ''}
                onChangeText={(v) => updateForm('primaryPostalCode', v)}
                placeholder="10001"
                isDark={isDark}
                icon="document-text-outline"
              />
            </View>
          </View>

          {/* Social Profiles */}
          <SectionHeader title="Social Profiles" icon="globe-outline" isDark={isDark} />

          <InputField
            label="LinkedIn"
            value={form.linkedIn || ''}
            onChangeText={(v) => updateForm('linkedIn', v)}
            placeholder="linkedin.com/in/username"
            isDark={isDark}
            keyboardType="url"
            icon="logo-linkedin"
          />

          <InputField
            label="Twitter"
            value={form.twitter || ''}
            onChangeText={(v) => updateForm('twitter', v)}
            placeholder="twitter.com/username"
            isDark={isDark}
            keyboardType="url"
            icon="logo-twitter"
          />

          <InputField
            label="Facebook"
            value={form.facebook || ''}
            onChangeText={(v) => updateForm('facebook', v)}
            placeholder="facebook.com/username"
            isDark={isDark}
            keyboardType="url"
            icon="logo-facebook"
          />

          <InputField
            label="Website"
            value={form.website || ''}
            onChangeText={(v) => updateForm('website', v)}
            placeholder="example.com"
            isDark={isDark}
            keyboardType="url"
            icon="globe-outline"
          />

          {/* Additional Info */}
          <SectionHeader title="Additional Information" icon="information-circle-outline" isDark={isDark} />

          <InputField
            label="Source"
            value={form.source || ''}
            onChangeText={(v) => updateForm('source', v)}
            placeholder="Website, Referral, LinkedIn"
            isDark={isDark}
            icon="flag-outline"
          />

          <InputField
            label="Notes"
            value={form.notes || ''}
            onChangeText={(v) => updateForm('notes', v)}
            placeholder="Add any notes about this contact..."
            isDark={isDark}
            multiline
            icon="document-text-outline"
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  formContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 0,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  selectedCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedCompanyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedCompanyName: {
    fontSize: 16,
    fontWeight: '500',
  },
  companyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResults: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchResultText: {
    fontSize: 15,
  },
  createNewButton: {
    marginTop: 8,
  },
  createNewText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});
