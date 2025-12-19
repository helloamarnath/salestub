import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  SectionList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

// Contact item component
function ContactItem({
  name,
  company,
  email,
  phone,
  isDark,
}: {
  name: string;
  company: string;
  email: string;
  phone: string;
  isDark: boolean;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarColors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];
  const colorIndex = name.charCodeAt(0) % avatarColors.length;

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const actionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <TouchableOpacity activeOpacity={0.7}>
      <View style={[styles.contactItem, { borderBottomColor: borderColor }]}>
        <View
          style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: textColor }]}>{name}</Text>
          <Text style={[styles.contactCompany, { color: subtitleColor }]}>{company}</Text>
        </View>
        <View style={styles.contactActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: actionBg }]}>
            <Ionicons name="call-outline" size={18} color="#22c55e" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: actionBg }]}>
            <Ionicons name="mail-outline" size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const sectionHeaderBg = isDark ? '#0f172a' : '#f8fafc';
  const sectionHeaderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  // Sample contacts data grouped by letter
  const contactsData = [
    {
      title: 'A',
      data: [
        { name: 'Alex Thompson', company: 'Acme Corp', email: 'alex@acme.com', phone: '+1 234 567 8901' },
        { name: 'Amanda Chen', company: 'TechStart', email: 'amanda@techstart.io', phone: '+1 234 567 8902' },
      ],
    },
    {
      title: 'B',
      data: [
        { name: 'Brian Wilson', company: 'Global Solutions', email: 'brian@global.com', phone: '+1 234 567 8903' },
      ],
    },
    {
      title: 'D',
      data: [
        { name: 'David Miller', company: 'Innovate Ltd', email: 'david@innovate.co', phone: '+1 234 567 8904' },
        { name: 'Diana Ross', company: 'Enterprise Co', email: 'diana@enterprise.com', phone: '+1 234 567 8905' },
      ],
    },
    {
      title: 'E',
      data: [
        { name: 'Emily Davis', company: 'StartUp Hub', email: 'emily@startuphub.io', phone: '+1 234 567 8906' },
      ],
    },
    {
      title: 'J',
      data: [
        { name: 'James Brown', company: 'Digital Inc', email: 'james@digital.com', phone: '+1 234 567 8907' },
        { name: 'Jennifer Lee', company: 'Scale Up', email: 'jennifer@scaleup.co', phone: '+1 234 567 8908' },
        { name: 'John Smith', company: 'BigCorp', email: 'john@bigcorp.com', phone: '+1 234 567 8909' },
      ],
    },
    {
      title: 'M',
      data: [
        { name: 'Michael Johnson', company: 'NewCo', email: 'michael@newco.com', phone: '+1 234 567 8910' },
        { name: 'Michelle Park', company: 'FutureTech', email: 'michelle@futuretech.io', phone: '+1 234 567 8911' },
      ],
    },
    {
      title: 'S',
      data: [
        { name: 'Sarah Anderson', company: 'CloudFirst', email: 'sarah@cloudfirst.com', phone: '+1 234 567 8912' },
        { name: 'Steven Garcia', company: 'DataDrive', email: 'steven@datadrive.io', phone: '+1 234 567 8913' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: textColor }]}>Contacts</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, { backgroundColor: searchBg, borderColor: searchBorder }]}>
            <Ionicons name="search-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search contacts..."
              placeholderTextColor={placeholderColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={placeholderColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Contacts list */}
      <SectionList
        sections={contactsData}
        keyExtractor={(item, index) => item.email + index}
        renderItem={({ item }) => <ContactItem {...item} isDark={isDark} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: sectionHeaderBg }]}>
            <Text style={[styles.sectionHeaderText, { color: sectionHeaderColor }]}>{title}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontWeight: '500',
    fontSize: 16,
  },
  contactCompany: {
    fontSize: 14,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
