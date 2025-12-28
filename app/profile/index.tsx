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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getProfile, updateProfile, UserProfile, UpdateProfileDto } from '@/lib/api/profile';
import { secureStorage, STORAGE_KEYS } from '@/lib/storage';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Validation errors
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inputBgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  const fetchProfile = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getProfile(accessToken);

      if (response.success && response.data) {
        setProfile(response.data);
        setFirstName(response.data.firstName || '');
        setLastName(response.data.lastName || '');
        setPhone(response.data.phone || '');
      } else {
        // Fallback to user from auth context
        if (user) {
          setProfile({
            id: user.id,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            phone: null,
            profilePicture: null,
          });
          setFirstName(user.firstName || '');
          setLastName(user.lastName || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
      // Fallback to auth context user
      if (user) {
        setProfile({
          id: user.id,
          email: user.email,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          phone: null,
          profilePicture: null,
        });
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const validateForm = (): boolean => {
    let isValid = true;

    // Reset errors
    setFirstNameError('');
    setLastNameError('');
    setPhoneError('');

    // Validate first name
    if (firstName.trim() && firstName.trim().length < 2) {
      setFirstNameError('First name must be at least 2 characters');
      isValid = false;
    }

    // Validate last name
    if (lastName.trim() && lastName.trim().length < 2) {
      setLastNameError('Last name must be at least 2 characters');
      isValid = false;
    }

    // Validate phone (international format)
    if (phone.trim()) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone.trim())) {
        setPhoneError('Phone must be in international format (e.g., +919876543210)');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!accessToken) return;

    setIsSaving(true);

    try {
      const updateData: UpdateProfileDto = {};

      // Only include fields that have changed
      if (firstName.trim() !== (profile?.firstName || '')) {
        updateData.firstName = firstName.trim();
      }
      if (lastName.trim() !== (profile?.lastName || '')) {
        updateData.lastName = lastName.trim();
      }
      if (phone.trim() !== (profile?.phone || '')) {
        updateData.phone = phone.trim() || undefined;
      }

      // Check if there are any changes
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        return;
      }

      const response = await updateProfile(accessToken, updateData);

      if (response.success && response.data) {
        setProfile(response.data);
        setIsEditing(false);

        // Update stored user data
        const storedUserStr = await secureStorage.getItem(STORAGE_KEYS.USER);
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          const updatedUser = {
            ...storedUser,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
          };
          await secureStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        }

        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFirstName(profile?.firstName || '');
    setLastName(profile?.lastName || '');
    setPhone(profile?.phone || '');
    setFirstNameError('');
    setLastNameError('');
    setPhoneError('');
    setIsEditing(false);
  };

  const getInitials = () => {
    const first = firstName || profile?.firstName || '';
    const last = lastName || profile?.lastName || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: subtitleColor }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
          <View style={styles.headerRight}>
            {!isEditing ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text style={[styles.cancelButtonText, { color: subtitleColor }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
              {isEditing && (
                <TouchableOpacity style={styles.avatarEditButton}>
                  <Ionicons name="camera" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.emailText, { color: subtitleColor }]}>
              {profile?.email || user?.email}
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={[styles.card, { borderColor }]}>
              <BlurView
                intensity={15}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.cardBlur, { backgroundColor: inputBgColor }]}
              >
                {/* First Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                    First Name
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={[
                          styles.textInput,
                          { color: textColor, borderColor: firstNameError ? '#ef4444' : borderColor },
                        ]}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Enter first name"
                        placeholderTextColor={subtitleColor}
                        autoCapitalize="words"
                        editable={!isSaving}
                      />
                      {firstNameError ? (
                        <Text style={styles.errorText}>{firstNameError}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={[styles.valueText, { color: textColor }]}>
                      {profile?.firstName || '-'}
                    </Text>
                  )}
                </View>

                {/* Last Name */}
                <View style={[styles.inputGroup, { borderTopColor: borderColor, borderTopWidth: 1 }]}>
                  <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                    Last Name
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={[
                          styles.textInput,
                          { color: textColor, borderColor: lastNameError ? '#ef4444' : borderColor },
                        ]}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Enter last name"
                        placeholderTextColor={subtitleColor}
                        autoCapitalize="words"
                        editable={!isSaving}
                      />
                      {lastNameError ? (
                        <Text style={styles.errorText}>{lastNameError}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={[styles.valueText, { color: textColor }]}>
                      {profile?.lastName || '-'}
                    </Text>
                  )}
                </View>

                {/* Phone */}
                <View style={[styles.inputGroup, { borderTopColor: borderColor, borderTopWidth: 1 }]}>
                  <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                    Phone Number
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={[
                          styles.textInput,
                          { color: textColor, borderColor: phoneError ? '#ef4444' : borderColor },
                        ]}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+919876543210"
                        placeholderTextColor={subtitleColor}
                        keyboardType="phone-pad"
                        editable={!isSaving}
                      />
                      {phoneError ? (
                        <Text style={styles.errorText}>{phoneError}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={[styles.valueText, { color: textColor }]}>
                      {profile?.phone || '-'}
                    </Text>
                  )}
                </View>

                {/* Email (Read-only) */}
                <View style={[styles.inputGroup, { borderTopColor: borderColor, borderTopWidth: 1 }]}>
                  <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                    Email
                  </Text>
                  <View style={styles.readOnlyRow}>
                    <Text style={[styles.valueText, { color: textColor, flex: 1 }]}>
                      {profile?.email || user?.email}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>

          {/* Additional Info Section */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: subtitleColor }]}>
              ACCOUNT INFORMATION
            </Text>
            <View style={[styles.card, { borderColor }]}>
              <BlurView
                intensity={15}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.cardBlur, { backgroundColor: inputBgColor }]}
              >
                {/* User ID */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                    User ID
                  </Text>
                  <Text style={[styles.valueText, { color: textColor, fontSize: 13 }]}>
                    {profile?.id || user?.id}
                  </Text>
                </View>

                {/* Organization */}
                {user?.orgId && (
                  <View style={[styles.inputGroup, { borderTopColor: borderColor, borderTopWidth: 1 }]}>
                    <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                      Organization ID
                    </Text>
                    <Text style={[styles.valueText, { color: textColor, fontSize: 13 }]}>
                      {user.orgId}
                    </Text>
                  </View>
                )}

                {/* Roles */}
                {user?.roles && user.roles.length > 0 && (
                  <View style={[styles.inputGroup, { borderTopColor: borderColor, borderTopWidth: 1 }]}>
                    <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                      Roles
                    </Text>
                    <View style={styles.rolesContainer}>
                      {user.roles.map((role, index) => (
                        <View key={index} style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>{role}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </BlurView>
            </View>
          </View>
        </ScrollView>

        {/* Save Button (Fixed at bottom when editing) */}
        {isEditing && (
          <View style={[styles.saveButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  editButton: {
    padding: 8,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  emailText: {
    fontSize: 14,
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardBlur: {},
  inputGroup: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
