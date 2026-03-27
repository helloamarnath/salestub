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
import { createQuote, updateQuote, getQuote } from '@/lib/api/quotes';
import { getDeals } from '@/lib/api/deals';
import { searchContacts } from '@/lib/api/contacts';
import { getCurrencies } from '@/lib/api/organization';
import { QuoteItemEditor } from '@/components/quotes/QuoteItemEditor';
import type { CreateQuoteDto, CreateQuoteItemDto } from '@/types/quote';
import type { Deal } from '@/types/deal';
import type { Contact } from '@/types/contact';

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
}

export default function CreateQuoteScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const isEditMode = !!editId;

  // Form state
  const [dealId, setDealId] = useState('');
  const [contactId, setContactId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [quoteDate, setQuoteDate] = useState(new Date());
  const [subject, setSubject] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [quoteLevelDiscount, setQuoteLevelDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [items, setItems] = useState<CreateQuoteItemDto[]>([]);

  // Data
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDealPicker, setShowDealPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'quoteDate' | 'validUntil' | null>(null);
  const [dealSearch, setDealSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Theme
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const buttonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) return;
      const [dealsRes, currRes] = await Promise.all([
        getDeals(accessToken, { limit: 50 }),
        getCurrencies(accessToken),
      ]);
      if (dealsRes.success && dealsRes.data) setDeals(dealsRes.data.data || []);
      if (currRes.success && currRes.data) {
        setCurrencies(currRes.data);
        const inr = currRes.data.find((c: Currency) => c.code === 'INR');
        if (inr && !currencyId) setCurrencyId(inr.id);
      }
    };
    loadData();
  }, [accessToken]);

  // Load quote for editing
  useEffect(() => {
    const loadQuote = async () => {
      if (!accessToken || !editId) return;
      setLoading(true);
      const res = await getQuote(accessToken, editId);
      if (res.success && res.data) {
        const q = res.data;
        setDealId(q.dealId);
        setContactId(q.contactId);
        setCurrencyId(q.currencyId);
        setValidUntil(new Date(q.validUntil));
        if (q.quoteDate) setQuoteDate(new Date(q.quoteDate));
        setSubject(q.subject || '');
        setPaymentTerms(q.paymentTerms || '');
        setDeliveryTerms(q.deliveryTerms || '');
        setCustomerReference(q.customerReference || '');
        setQuoteLevelDiscount(q.quoteLevelDiscount ? String(q.quoteLevelDiscount) : '');
        setNotes(q.notes || '');
        setTermsAndConditions(q.termsAndConditions || '');
        setItems(
          (q.items || []).map((i) => ({
            productId: i.productId || undefined,
            name: i.name,
            description: i.description || '',
            sku: i.sku || '',
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            taxRate: Number(i.taxRate) || 0,
            discount: Number(i.discount) || 0,
            unit: i.unit || 'pcs',
            hsnCode: i.hsnCode || '',
            sortOrder: i.sortOrder || 0,
          }))
        );
        if (q.deal) setSelectedDeal(q.deal as any);
        if (q.contact) setSelectedContact(q.contact as any);
      }
      setLoading(false);
    };
    loadQuote();
  }, [accessToken, editId]);

  // Search deals
  const filteredDeals = dealSearch
    ? deals.filter((d) => d.title?.toLowerCase().includes(dealSearch.toLowerCase()))
    : deals;

  // Search contacts
  const handleContactSearch = useCallback(
    async (query: string) => {
      setContactSearch(query);
      if (!accessToken || query.length < 1) return;
      const res = await searchContacts(accessToken, query, 10);
      if (res.success && res.data) setContacts(res.data);
    },
    [accessToken]
  );

  // Select deal -> auto-set contact
  const selectDeal = (deal: Deal) => {
    setDealId(deal.id);
    setSelectedDeal(deal);
    if (deal.contact) {
      setContactId(deal.contact.id);
      setSelectedContact(deal.contact as any);
    }
    setShowDealPicker(false);
    setErrors((e) => ({ ...e, dealId: '' }));
  };

  const selectContact = (contact: Contact) => {
    setContactId(contact.id);
    setSelectedContact(contact);
    setShowContactPicker(false);
    setErrors((e) => ({ ...e, contactId: '' }));
  };

  const selectCurrency = (currency: Currency) => {
    setCurrencyId(currency.id);
    setShowCurrencyPicker(false);
  };

  // Validate
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!dealId) newErrors.dealId = 'Deal is required';
    if (!contactId) newErrors.contactId = 'Contact is required';
    if (!currencyId) newErrors.currencyId = 'Currency is required';
    if (items.length === 0) newErrors.items = 'At least one item is required';
    const hasEmptyNames = items.some((i) => !i.name.trim());
    if (hasEmptyNames) newErrors.items = 'All items must have a name';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate() || !accessToken) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const data: CreateQuoteDto = {
      dealId,
      contactId,
      currencyId,
      validUntil: validUntil.toISOString(),
      quoteDate: quoteDate.toISOString(),
      subject: subject || undefined,
      paymentTerms: paymentTerms || undefined,
      deliveryTerms: deliveryTerms || undefined,
      customerReference: customerReference || undefined,
      quoteLevelDiscount: quoteLevelDiscount ? parseFloat(quoteLevelDiscount) : undefined,
      notes: notes || undefined,
      termsAndConditions: termsAndConditions || undefined,
      items: items.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    };

    const res = isEditMode
      ? await updateQuote(accessToken, editId!, data)
      : await createQuote(accessToken, data);

    if (res.success) {
      Alert.alert('Success', isEditMode ? 'Quote updated' : 'Quote created');
      router.back();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to save quote');
    }
    setSaving(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const contactName = (c: any) =>
    c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '';

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: buttonBg }]} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {isEditMode ? 'Edit Quote' : 'Create Quote'}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveBtnText}>{isEditMode ? 'Save' : 'Create'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Deal Selection */}
          <Text style={[styles.sectionLabel, { color: subtitleColor }]}>DEAL & CONTACT</Text>

          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: inputBg, borderColor: errors.dealId ? '#ef4444' : inputBorder }]}
            onPress={() => setShowDealPicker(true)}
          >
            <Ionicons name="briefcase-outline" size={18} color={selectedDeal ? textColor : subtitleColor} />
            <Text style={[styles.pickerBtnText, { color: selectedDeal ? textColor : subtitleColor }]} numberOfLines={1}>
              {selectedDeal ? selectedDeal.title : 'Select Deal *'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={subtitleColor} />
          </TouchableOpacity>
          {errors.dealId ? <Text style={styles.errorText}>{errors.dealId}</Text> : null}

          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: inputBg, borderColor: errors.contactId ? '#ef4444' : inputBorder }]}
            onPress={() => { setShowContactPicker(true); handleContactSearch(''); }}
          >
            <Ionicons name="person-outline" size={18} color={selectedContact ? textColor : subtitleColor} />
            <Text style={[styles.pickerBtnText, { color: selectedContact ? textColor : subtitleColor }]} numberOfLines={1}>
              {selectedContact ? contactName(selectedContact) : 'Select Contact *'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={subtitleColor} />
          </TouchableOpacity>
          {errors.contactId ? <Text style={styles.errorText}>{errors.contactId}</Text> : null}

          {/* Currency */}
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: inputBg, borderColor: inputBorder }]}
            onPress={() => setShowCurrencyPicker(true)}
          >
            <Ionicons name="cash-outline" size={18} color={currencyId ? textColor : subtitleColor} />
            <Text style={[styles.pickerBtnText, { color: currencyId ? textColor : subtitleColor }]} numberOfLines={1}>
              {currencyId
                ? currencies.find((c) => c.id === currencyId)?.code + ' - ' + currencies.find((c) => c.id === currencyId)?.name
                : 'Select Currency *'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={subtitleColor} />
          </TouchableOpacity>

          {/* Dates */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 20 }]}>DATES</Text>
          <View style={styles.twoCol}>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: inputBg, borderColor: inputBorder, flex: 1 }]}
              onPress={() => setShowDatePicker('quoteDate')}
            >
              <Ionicons name="calendar-outline" size={16} color={subtitleColor} />
              <View>
                <Text style={[styles.dateBtnLabel, { color: subtitleColor }]}>Quote Date</Text>
                <Text style={[styles.dateBtnValue, { color: textColor }]}>{formatDate(quoteDate)}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: inputBg, borderColor: inputBorder, flex: 1 }]}
              onPress={() => setShowDatePicker('validUntil')}
            >
              <Ionicons name="time-outline" size={16} color={subtitleColor} />
              <View>
                <Text style={[styles.dateBtnLabel, { color: subtitleColor }]}>Valid Until *</Text>
                <Text style={[styles.dateBtnValue, { color: textColor }]}>{formatDate(validUntil)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Subject */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 20 }]}>DETAILS</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject (optional)"
            placeholderTextColor={subtitleColor}
          />

          {/* Payment & Delivery Terms */}
          <View style={styles.twoCol}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor, flex: 1 }]}
              value={paymentTerms}
              onChangeText={setPaymentTerms}
              placeholder="Payment Terms"
              placeholderTextColor={subtitleColor}
            />
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor, flex: 1 }]}
              value={deliveryTerms}
              onChangeText={setDeliveryTerms}
              placeholder="Delivery Terms"
              placeholderTextColor={subtitleColor}
            />
          </View>

          {/* Customer Ref + Discount */}
          <View style={styles.twoCol}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor, flex: 1 }]}
              value={customerReference}
              onChangeText={setCustomerReference}
              placeholder="Customer Ref / PO#"
              placeholderTextColor={subtitleColor}
            />
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor, flex: 1 }]}
              value={quoteLevelDiscount}
              onChangeText={setQuoteLevelDiscount}
              placeholder="Discount %"
              placeholderTextColor={subtitleColor}
              keyboardType="numeric"
            />
          </View>

          {/* Line Items */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 20 }]}>LINE ITEMS</Text>
          {errors.items ? <Text style={styles.errorText}>{errors.items}</Text> : null}
          <QuoteItemEditor
            items={items}
            onItemsChange={setItems}
            accessToken={accessToken}
            isDark={isDark}
          />

          {/* Notes & Terms */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 6 }]}>NOTES & TERMS</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes for the customer (optional)"
            placeholderTextColor={subtitleColor}
            multiline
          />
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={termsAndConditions}
            onChangeText={setTermsAndConditions}
            placeholder="Terms & Conditions (optional)"
            placeholderTextColor={subtitleColor}
            multiline
          />

          <View style={{ height: insets.bottom + 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'quoteDate' ? quoteDate : validUntil}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(null);
            if (date) {
              if (showDatePicker === 'quoteDate') setQuoteDate(date);
              else setValidUntil(date);
            }
          }}
        />
      )}

      {/* Deal Picker Modal */}
      <PickerModal
        visible={showDealPicker}
        onClose={() => setShowDealPicker(false)}
        title="Select Deal"
        isDark={isDark}
        textColor={textColor}
        subtitleColor={subtitleColor}
        inputBg={inputBg}
        inputBorder={inputBorder}
        borderColor={borderColor}
        searchValue={dealSearch}
        onSearchChange={setDealSearch}
        searchPlaceholder="Search deals..."
      >
        <FlatList
          data={filteredDeals}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, { borderBottomColor: borderColor }]}
              onPress={() => selectDeal(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerItemTitle, { color: textColor }]}>{item.title}</Text>
                {item.contact && (
                  <Text style={[styles.pickerItemSub, { color: subtitleColor }]}>
                    {contactName(item.contact)}
                  </Text>
                )}
              </View>
              {dealId === item.id && <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.emptyPickerText, { color: subtitleColor }]}>No deals found</Text>}
          style={{ maxHeight: 350 }}
        />
      </PickerModal>

      {/* Contact Picker Modal */}
      <PickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        title="Select Contact"
        isDark={isDark}
        textColor={textColor}
        subtitleColor={subtitleColor}
        inputBg={inputBg}
        inputBorder={inputBorder}
        borderColor={borderColor}
        searchValue={contactSearch}
        onSearchChange={handleContactSearch}
        searchPlaceholder="Search contacts..."
      >
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, { borderBottomColor: borderColor }]}
              onPress={() => selectContact(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerItemTitle, { color: textColor }]}>{contactName(item)}</Text>
                <Text style={[styles.pickerItemSub, { color: subtitleColor }]}>
                  {item.email || item.phone || ''}
                </Text>
              </View>
              {contactId === item.id && <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.emptyPickerText, { color: subtitleColor }]}>Type to search contacts</Text>}
          style={{ maxHeight: 350 }}
        />
      </PickerModal>

      {/* Currency Picker Modal */}
      <PickerModal
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        title="Select Currency"
        isDark={isDark}
        textColor={textColor}
        subtitleColor={subtitleColor}
        inputBg={inputBg}
        inputBorder={inputBorder}
        borderColor={borderColor}
      >
        <FlatList
          data={currencies}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, { borderBottomColor: borderColor }]}
              onPress={() => selectCurrency(item)}
            >
              <Text style={[styles.currencySymbol, { color: textColor }]}>{item.symbol}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerItemTitle, { color: textColor }]}>{item.code}</Text>
                <Text style={[styles.pickerItemSub, { color: subtitleColor }]}>{item.name}</Text>
              </View>
              {currencyId === item.id && <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />}
            </TouchableOpacity>
          )}
          style={{ maxHeight: 350 }}
        />
      </PickerModal>
    </View>
  );
}

// Reusable picker modal
function PickerModal({
  visible,
  onClose,
  title,
  isDark,
  textColor,
  subtitleColor,
  inputBg,
  inputBorder,
  borderColor,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  isDark: boolean;
  textColor: string;
  subtitleColor: string;
  inputBg: string;
  inputBorder: string;
  borderColor: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : 'white' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          {onSearchChange && (
            <View style={[styles.modalSearch, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="search" size={18} color={subtitleColor} />
              <TextInput
                style={[styles.modalSearchInput, { color: textColor }]}
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder={searchPlaceholder}
                placeholderTextColor={subtitleColor}
                autoFocus
              />
            </View>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  saveBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  form: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  pickerBtnText: { flex: 1, fontSize: 14 },
  input: {
    fontSize: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  dateBtnLabel: { fontSize: 11, fontWeight: '500' },
  dateBtnValue: { fontSize: 14, fontWeight: '500', marginTop: 1 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: -6, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 15 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  pickerItemTitle: { fontSize: 14, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, marginTop: 1 },
  emptyPickerText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  currencySymbol: { fontSize: 20, fontWeight: '700', width: 36, textAlign: 'center' },
});
