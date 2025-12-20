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
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { getCompany, createCompany, updateCompany } from '@/lib/api/companies';
import type { CreateCompanyDto, CompanyType } from '@/types/company';
import { COMPANY_TYPE_LABELS, COMPANY_TYPE_COLORS } from '@/types/company';

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
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = error ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: labelColor }]}>
        {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
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
        placeholderTextColor={placeholderColor}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'words'}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Section Header
function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  return (
    <Text style={[styles.sectionHeader, { color: textColor }]}>{title}</Text>
  );
}

// Company Type Picker
function CompanyTypePicker({
  value,
  onChange,
  isDark,
}: {
  value: CompanyType;
  onChange: (type: CompanyType) => void;
  isDark: boolean;
}) {
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const types: CompanyType[] = ['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'RESELLER'];

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: labelColor }]}>Type</Text>
      <View style={styles.typeGrid}>
        {types.map((type) => {
          const isSelected = value === type;
          const color = COMPANY_TYPE_COLORS[type];
          return (
            <Pressable
              key={type}
              style={[
                styles.typeOption,
                { backgroundColor: inputBg, borderColor: isSelected ? color : borderColor },
                isSelected && { borderWidth: 2 },
              ]}
              onPress={() => onChange(type)}
            >
              <View style={[styles.typeColorDot, { backgroundColor: color }]} />
              <Text
                style={[
                  styles.typeOptionText,
                  { color: isSelected ? color : (isDark ? 'white' : Colors.light.foreground) },
                ]}
              >
                {COMPANY_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Industry Picker
const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Education',
  'Consulting',
  'Marketing',
  'Legal',
  'Construction',
  'Transportation',
  'Hospitality',
  'Agriculture',
  'Energy',
  'Media',
  'Telecommunications',
  'Non-Profit',
  'Government',
  'Other',
];

function IndustryPicker({
  value,
  onChange,
  isDark,
}: {
  value: string;
  onChange: (industry: string) => void;
  isDark: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: labelColor }]}>Industry</Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: inputBg, borderColor }]}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={[styles.pickerButtonText, { color: value ? textColor : placeholderColor }]}>
          {value || 'Select industry'}
        </Text>
        <Ionicons
          name={showPicker ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={placeholderColor}
        />
      </TouchableOpacity>

      {showPicker && (
        <View style={[styles.pickerOptions, { backgroundColor: inputBg, borderColor }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {INDUSTRIES.map((industry) => (
              <TouchableOpacity
                key={industry}
                style={[
                  styles.pickerOption,
                  { borderBottomColor: borderColor },
                  value === industry && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  onChange(industry);
                  setShowPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: value === industry ? '#3b82f6' : textColor },
                  ]}
                >
                  {industry}
                </Text>
                {value === industry && (
                  <Ionicons name="checkmark" size={18} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function CreateOrganizationScreen() {
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState<CreateCompanyDto>({
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    type: 'PROSPECT',
    description: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    annualRevenue: undefined,
    numberOfEmployees: undefined,
  });

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : colors.foreground;
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // Load existing company for editing
  useEffect(() => {
    if (isEditing) {
      (async () => {
        const response = await getCompany(accessToken, id);
        if (response.success && response.data) {
          const company = response.data;
          setForm({
            name: company.name,
            email: company.email || '',
            phone: company.phone || '',
            website: company.website || '',
            industry: company.industry || '',
            type: company.type,
            description: company.description || '',
            address: company.address || '',
            city: company.city || '',
            state: company.state || '',
            country: company.country || '',
            postalCode: company.postalCode || '',
            annualRevenue: company.annualRevenue,
            numberOfEmployees: company.numberOfEmployees,
          });
        }
        setLoading(false);
      })();
    }
  }, [isEditing, id, accessToken]);

  const updateForm = (field: keyof CreateCompanyDto, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Organization name is required';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    const data: CreateCompanyDto = { ...form };

    // Clean up empty fields
    Object.keys(data).forEach((key) => {
      const k = key as keyof CreateCompanyDto;
      if (data[k] === '' || data[k] === undefined) {
        delete data[k];
      }
    });

    let response;
    if (isEditing) {
      response = await updateCompany(accessToken, id!, data);
    } else {
      response = await createCompany(accessToken, data);
    }

    if (response.success) {
      router.back();
    } else {
      Alert.alert('Error', response.error?.message || `Failed to ${isEditing ? 'update' : 'create'} organization`);
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
          {isEditing ? 'Edit Organization' : 'New Organization'}
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
          <SectionHeader title="Basic Information" isDark={isDark} />

          <InputField
            label="Organization Name"
            value={form.name}
            onChangeText={(v) => updateForm('name', v)}
            placeholder="Acme Corporation"
            isDark={isDark}
            required
            error={errors.name}
          />

          <CompanyTypePicker
            value={form.type || 'PROSPECT'}
            onChange={(v) => updateForm('type', v)}
            isDark={isDark}
          />

          <IndustryPicker
            value={form.industry || ''}
            onChange={(v) => updateForm('industry', v)}
            isDark={isDark}
          />

          <InputField
            label="Description"
            value={form.description || ''}
            onChangeText={(v) => updateForm('description', v)}
            placeholder="Brief description of the organization..."
            isDark={isDark}
            multiline
          />

          {/* Contact Info */}
          <SectionHeader title="Contact Information" isDark={isDark} />

          <InputField
            label="Email"
            value={form.email || ''}
            onChangeText={(v) => updateForm('email', v)}
            placeholder="contact@acme.com"
            isDark={isDark}
            keyboardType="email-address"
            error={errors.email}
          />

          <InputField
            label="Phone"
            value={form.phone || ''}
            onChangeText={(v) => updateForm('phone', v)}
            placeholder="+1 234 567 8900"
            isDark={isDark}
            keyboardType="phone-pad"
          />

          <InputField
            label="Website"
            value={form.website || ''}
            onChangeText={(v) => updateForm('website', v)}
            placeholder="https://acme.com"
            isDark={isDark}
            keyboardType="url"
          />

          {/* Business Info */}
          <SectionHeader title="Business Information" isDark={isDark} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Annual Revenue"
                value={form.annualRevenue?.toString() || ''}
                onChangeText={(v) => updateForm('annualRevenue', v ? parseInt(v) : undefined)}
                placeholder="1000000"
                isDark={isDark}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Employees"
                value={form.numberOfEmployees?.toString() || ''}
                onChangeText={(v) => updateForm('numberOfEmployees', v ? parseInt(v) : undefined)}
                placeholder="50"
                isDark={isDark}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Address */}
          <SectionHeader title="Address" isDark={isDark} />

          <InputField
            label="Street Address"
            value={form.address || ''}
            onChangeText={(v) => updateForm('address', v)}
            placeholder="123 Business Avenue"
            isDark={isDark}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="City"
                value={form.city || ''}
                onChangeText={(v) => updateForm('city', v)}
                placeholder="San Francisco"
                isDark={isDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="State"
                value={form.state || ''}
                onChangeText={(v) => updateForm('state', v)}
                placeholder="CA"
                isDark={isDark}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Country"
                value={form.country || ''}
                onChangeText={(v) => updateForm('country', v)}
                placeholder="USA"
                isDark={isDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Postal Code"
                value={form.postalCode || ''}
                onChangeText={(v) => updateForm('postalCode', v)}
                placeholder="94102"
                isDark={isDark}
              />
            </View>
          </View>

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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  typeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerOptions: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  pickerOptionText: {
    fontSize: 15,
  },
});
