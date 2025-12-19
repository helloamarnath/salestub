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

// Contact item component
function ContactItem({
  name,
  company,
  email,
  phone,
}: {
  name: string;
  company: string;
  email: string;
  phone: string;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];
  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <TouchableOpacity activeOpacity={0.7}>
      <View className="flex-row items-center py-3 px-5 border-b border-white/5">
        <View
          style={[styles.avatar, { backgroundColor: colors[colorIndex] }]}
        >
          <Text className="text-white font-semibold text-sm">{initials}</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-white font-medium text-base">{name}</Text>
          <Text className="text-white/50 text-sm">{company}</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity style={styles.actionButton} className="mr-2">
            <Ionicons name="call-outline" size={18} color="#22c55e" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

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
    <View className="flex-1">
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View className="px-5 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-2xl font-bold">Contacts</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.4)" />
            <TextInput
              className="flex-1 ml-3 text-white text-base"
              placeholder="Search contacts..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Contacts list */}
      <SectionList
        sections={contactsData}
        keyExtractor={(item, index) => item.email + index}
        renderItem={({ item }) => <ContactItem {...item} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text className="text-white/40 text-sm font-semibold">{title}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
});
