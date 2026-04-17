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
import { createInvoice, updateInvoice, getInvoice } from '@/lib/api/invoices';
import { searchContacts } from '@/lib/api/contacts';
import { getCurrencies } from '@/lib/api/organization';
import { QuoteItemEditor } from '@/components/quotes/QuoteItemEditor';
import type { CreateInvoiceDto } from '@/types/invoice';
import type { CreateQuoteItemDto } from '@/types/quote';
import type { Contact } from '@/types/contact';

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
}

export default function CreateInvoiceScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const isEditMode = !!editId;

  // Form state
  const [contactId, setContactId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [subject, setSubject] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [items, setItems] = useState<CreateQuoteItemDto[]>([]);

  // Data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'invoiceDate' | 'dueDate' | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Theme
  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const buttonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Load currencies
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) return;
      const currRes = await getCurrencies(accessToken);
      if (currRes.success && currRes.data) {
        setCurrencies(currRes.data);
        const inr = currRes.data.find((c: Currency) => c.code === 'INR');
        if (inr && !currencyId) setCurrencyId(inr.id);
      }
    };
    loadData();
  }, [accessToken]);

  // Load invoice for editing
  useEffect(() => {
    const loadInvoice = async () => {
      if (!accessToken || !editId) return;
      setLoading(true);
      const res = await getInvoice(accessToken, editId);
      if (res.success && res.data) {
        const inv = res.data;
        setContactId(inv.contactId);
        setCurrencyId(inv.currencyId);
        setDueDate(new Date(inv.dueDate));
        setInvoiceDate(new Date(inv.invoiceDate));
        setSubject(inv.subject || '');
        setPaymentTerms(inv.paymentTerms || '');
        setNotes(inv.notes || '');
        setTermsAndConditions(inv.termsAndConditions || '');
        setItems(
          (inv.items || []).map((i) => ({
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
        if (inv.contact) setSelectedContact(inv.contact as any);
      }
      setLoading(false);
    };
    loadInvoice();
  }, [accessToken, editId]);

  const handleContactSearch = useCallback(
    async (query: string) => {
      setContactSearch(query);
      if (!accessToken || query.length < 1) return;
      const res = await searchContacts(accessToken, query, 10);
      if (res.success && res.data) setContacts(res.data);
    },
    [accessToken]
  );

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!contactId) newErrors.contactId = 'Contact is required';
    if (!currencyId) newErrors.currencyId = 'Currency is required';
    if (items.length === 0) newErrors.items = 'At least one item is required';
    if (items.some((i) => !i.name.trim())) newErrors.items = 'All items must have a name';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !accessToken) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const data: CreateInvoiceDto = {
      contactId,
      currencyId,
      dueDate: dueDate.toISOString(),
      invoiceDate: invoiceDate.toISOString(),
      subject: subject || undefined,
      paymentTerms: paymentTerms || undefined,
      notes: notes || undefined,
      termsAndConditions: termsAndConditions || undefined,
      items: items.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    };

    const res = isEditMode
      ? await updateInvoice(accessToken, editId!, data)
      : await createInvoice(accessToken, data);

    if (res.success) {
      Alert.alert('Success', isEditMode ? 'Invoice updated' : 'Invoice created');
      router.back();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to save invoice');
    }
    setSaving(false);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const contactName = (c: any) =>
    c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '';

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
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
          {isEditMode ? 'Edit Invoice' : 'Create Invoice'}
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Contact */}
          <Text style={[styles.sectionLabel, { color: subtitleColor }]}>CONTACT</Text>
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
              onPress={() => setShowDatePicker('invoiceDate')}
            >
              <Ionicons name="calendar-outline" size={16} color={subtitleColor} />
              <View>
                <Text style={[styles.dateBtnLabel, { color: subtitleColor }]}>Invoice Date</Text>
                <Text style={[styles.dateBtnValue, { color: textColor }]}>{formatDate(invoiceDate)}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: inputBg, borderColor: inputBorder, flex: 1 }]}
              onPress={() => setShowDatePicker('dueDate')}
            >
              <Ionicons name="time-outline" size={16} color={subtitleColor} />
              <View>
                <Text style={[styles.dateBtnLabel, { color: subtitleColor }]}>Due Date *</Text>
                <Text style={[styles.dateBtnValue, { color: textColor }]}>{formatDate(dueDate)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Details */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 20 }]}>DETAILS</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject (optional)"
            placeholderTextColor={subtitleColor}
          />
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={paymentTerms}
            onChangeText={setPaymentTerms}
            placeholder="Payment Terms (optional)"
            placeholderTextColor={subtitleColor}
          />

          {/* Line Items */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 20 }]}>LINE ITEMS</Text>
          {errors.items ? <Text style={styles.errorText}>{errors.items}</Text> : null}
          <QuoteItemEditor
            items={items}
            onItemsChange={setItems}
            accessToken={accessToken}
            isDark={isDark}
          />

          {/* Notes */}
          <Text style={[styles.sectionLabel, { color: subtitleColor, marginTop: 6 }]}>NOTES & TERMS</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
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
          value={showDatePicker === 'invoiceDate' ? invoiceDate : dueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(null);
            if (date) {
              if (showDatePicker === 'invoiceDate') setInvoiceDate(date);
              else setDueDate(date);
            }
          }}
        />
      )}

      {/* Contact Picker */}
      <Modal visible={showContactPicker} transparent animationType="slide" onRequestClose={() => setShowContactPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Select Contact</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="search" size={18} color={subtitleColor} />
              <TextInput
                style={[styles.modalSearchInput, { color: textColor }]}
                value={contactSearch}
                onChangeText={handleContactSearch}
                placeholder="Search contacts..."
                placeholderTextColor={subtitleColor}
                autoFocus
              />
            </View>
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
                    <Text style={[styles.pickerItemSub, { color: subtitleColor }]}>{item.email || item.phone || ''}</Text>
                  </View>
                  {contactId === item.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: subtitleColor }]}>Type to search contacts</Text>}
              style={{ maxHeight: 350 }}
            />
          </View>
        </View>
      </Modal>

      {/* Currency Picker */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={currencies}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                  onPress={() => selectCurrency(item)}
                >
                  <Text style={[{ fontSize: 20, fontWeight: '700', width: 36, textAlign: 'center' }, { color: textColor }]}>{item.symbol}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerItemTitle, { color: textColor }]}>{item.code}</Text>
                    <Text style={[styles.pickerItemSub, { color: subtitleColor }]}>{item.name}</Text>
                  </View>
                  {currencyId === item.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 350 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  saveBtnText: { color: '#fbfbfb', fontWeight: '600', fontSize: 14 },
  form: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  pickerBtnText: { flex: 1, fontSize: 14 },
  input: { fontSize: 14, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  dateBtnLabel: { fontSize: 11, fontWeight: '500' },
  dateBtnValue: { fontSize: 14, fontWeight: '500', marginTop: 1 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: -6, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  modalSearchInput: { flex: 1, fontSize: 15 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  pickerItemTitle: { fontSize: 14, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, marginTop: 1 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
