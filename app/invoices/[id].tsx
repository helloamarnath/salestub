import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  getInvoice,
  sendInvoice,
  cancelInvoice,
  markInvoicePaid,
  sendInvoiceReminder,
  deleteInvoice,
} from '@/lib/api/invoices';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/types/invoice';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const buttonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!accessToken || !id) return;
      setLoading(true);
      const response = await getInvoice(accessToken, id);
      if (response.success && response.data) {
        setInvoice(response.data);
      }
      setLoading(false);
    };
    fetchInvoice();
  }, [accessToken, id]);

  const formatAmount = (amount: number | string, symbol?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol || '₹'}${(num / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const refreshInvoice = async () => {
    if (!accessToken || !id) return;
    const res = await getInvoice(accessToken, id);
    if (res.success && res.data) setInvoice(res.data);
  };

  const handleSend = () => {
    if (!accessToken || !invoice) return;
    Alert.alert('Send Invoice', `Send invoice #${invoice.invoiceNumber} to ${invoice.contact?.email || 'customer'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await sendInvoice(accessToken, invoice.id);
          if (res.success) {
            Alert.alert('Success', 'Invoice sent successfully');
            refreshInvoice();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to send invoice');
          }
        },
      },
    ]);
  };

  const handleMarkPaid = () => {
    if (!accessToken || !invoice) return;
    const dueAmount = typeof invoice.amountDue === 'string' ? parseFloat(invoice.amountDue) : (invoice.amountDue || 0);
    Alert.alert('Mark as Paid', `Mark ${formatAmount(dueAmount, invoice.currency?.symbol)} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await markInvoicePaid(accessToken, invoice.id, { amount: dueAmount });
          if (res.success) {
            Alert.alert('Success', 'Invoice marked as paid');
            refreshInvoice();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to mark as paid');
          }
        },
      },
    ]);
  };

  const handleReminder = async () => {
    if (!accessToken || !invoice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await sendInvoiceReminder(accessToken, invoice.id);
    if (res.success) {
      Alert.alert('Success', 'Payment reminder sent');
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to send reminder');
    }
  };

  const handleCancel = () => {
    if (!accessToken || !invoice) return;
    Alert.alert('Cancel Invoice', `Cancel invoice #${invoice.invoiceNumber}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Invoice',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await cancelInvoice(accessToken, invoice.id);
          if (res.success) {
            refreshInvoice();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const handleEdit = () => {
    if (!invoice) return;
    router.push(`/invoices/create?editId=${invoice.id}` as any);
  };

  const handleDelete = () => {
    if (!accessToken || !invoice) return;
    Alert.alert('Delete Invoice', `Delete draft invoice #${invoice.invoiceNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await deleteInvoice(accessToken, invoice.id);
          if (res.success) {
            router.back();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to delete invoice');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <Ionicons name="receipt-outline" size={64} color={subtitleColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>Invoice not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = INVOICE_STATUS_COLORS[invoice.status] || '#6b7280';
  const contactName = invoice.contact
    ? `${invoice.contact.firstName} ${invoice.contact.lastName || ''}`.trim()
    : '-';

  const canSend = invoice.status === 'DRAFT';
  const canEdit = invoice.status === 'DRAFT';
  const canDelete = invoice.status === 'DRAFT';
  const canMarkPaid = ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status);
  const canRemind = ['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status);
  const canCancel = ['DRAFT', 'SENT'].includes(invoice.status);

  const amountDue = typeof invoice.amountDue === 'string' ? parseFloat(invoice.amountDue) : (invoice.amountDue || 0);
  const amountPaid = typeof invoice.amountPaid === 'string' ? parseFloat(invoice.amountPaid) : (invoice.amountPaid || 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: buttonBg }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: textColor }]}>#{invoice.invoiceNumber}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: buttonBg, marginRight: 8 }]} onPress={handleEdit}>
            <Ionicons name="pencil" size={18} color={textColor} />
          </TouchableOpacity>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.amountLabel, { color: sectionTitleColor }]}>Total Amount</Text>
          <Text style={[styles.amountValue, { color: textColor }]}>
            {formatAmount(invoice.total, invoice.currency?.symbol)}
          </Text>
          <View style={styles.amountBreakdown}>
            <View style={styles.amountRow}>
              <Text style={[styles.amountRowLabel, { color: subtitleColor }]}>Subtotal</Text>
              <Text style={[styles.amountRowValue, { color: subtitleColor }]}>
                {formatAmount(invoice.subtotal, invoice.currency?.symbol)}
              </Text>
            </View>
            {Number(invoice.taxAmount) > 0 && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountRowLabel, { color: subtitleColor }]}>Tax</Text>
                <Text style={[styles.amountRowValue, { color: subtitleColor }]}>
                  {formatAmount(invoice.taxAmount, invoice.currency?.symbol)}
                </Text>
              </View>
            )}
            {Number(invoice.discountAmount) > 0 && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountRowLabel, { color: '#22c55e' }]}>Discount</Text>
                <Text style={[styles.amountRowValue, { color: '#22c55e' }]}>
                  -{formatAmount(invoice.discountAmount, invoice.currency?.symbol)}
                </Text>
              </View>
            )}
            {amountPaid > 0 && (
              <View style={[styles.amountRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: borderColor }]}>
                <Text style={[styles.amountRowLabel, { color: '#22c55e', fontWeight: '600' }]}>Paid</Text>
                <Text style={[styles.amountRowValue, { color: '#22c55e', fontWeight: '600' }]}>
                  {formatAmount(amountPaid, invoice.currency?.symbol)}
                </Text>
              </View>
            )}
            {amountDue > 0 && amountDue !== Number(invoice.total) && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountRowLabel, { color: '#ef4444', fontWeight: '600' }]}>Amount Due</Text>
                <Text style={[styles.amountRowValue, { color: '#ef4444', fontWeight: '600' }]}>
                  {formatAmount(amountDue, invoice.currency?.symbol)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoice Details */}
        <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Invoice Details</Text>
          <DetailRow label="Invoice Date" value={formatDate(invoice.invoiceDate)} textColor={textColor} subtitleColor={subtitleColor} />
          <DetailRow label="Due Date" value={formatDate(invoice.dueDate)} textColor={textColor} subtitleColor={subtitleColor} />
          {invoice.subject && <DetailRow label="Subject" value={invoice.subject} textColor={textColor} subtitleColor={subtitleColor} />}
          {invoice.paymentTerms && <DetailRow label="Payment Terms" value={invoice.paymentTerms} textColor={textColor} subtitleColor={subtitleColor} />}
          {invoice.isRecurring && <DetailRow label="Recurring" value={invoice.recurringFrequency || 'Yes'} textColor={textColor} subtitleColor={subtitleColor} />}
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Contact</Text>
          <DetailRow label="Name" value={contactName} textColor={textColor} subtitleColor={subtitleColor} />
          {invoice.contact?.email && <DetailRow label="Email" value={invoice.contact.email} textColor={textColor} subtitleColor={subtitleColor} />}
          {invoice.contact?.phone && <DetailRow label="Phone" value={invoice.contact.phone} textColor={textColor} subtitleColor={subtitleColor} />}
          {invoice.contact?.companyName && <DetailRow label="Company" value={invoice.contact.companyName} textColor={textColor} subtitleColor={subtitleColor} />}
          {invoice.company && <DetailRow label="Company" value={invoice.company.name} textColor={textColor} subtitleColor={subtitleColor} />}
        </View>

        {/* Items */}
        <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Items ({invoice.items?.length || 0})
          </Text>
          {invoice.items?.map((item, index) => (
            <ItemRow key={item.id || index} item={item} symbol={invoice.currency?.symbol} textColor={textColor} subtitleColor={subtitleColor} borderColor={borderColor} isLast={index === invoice.items.length - 1} />
          ))}
        </View>

        {/* Notes */}
        {(invoice.notes || invoice.termsAndConditions) && (
          <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
            {invoice.notes && (
              <>
                <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Notes</Text>
                <Text style={[styles.notesText, { color: subtitleColor }]}>{invoice.notes}</Text>
              </>
            )}
            {invoice.termsAndConditions && (
              <>
                <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginTop: invoice.notes ? 16 : 0 }]}>Terms & Conditions</Text>
                <Text style={[styles.notesText, { color: subtitleColor }]}>{invoice.termsAndConditions}</Text>
              </>
            )}
          </View>
        )}

        {/* Actions */}
        {(canSend || canMarkPaid || canRemind || canCancel || canDelete) && (
          <View style={styles.actionsContainer}>
            {canSend && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleSend}>
                <Ionicons name="send" size={16} color="white" />
                <Text style={styles.actionBtnText}>Send Invoice</Text>
              </TouchableOpacity>
            )}
            {canMarkPaid && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={handleMarkPaid}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.actionBtnText}>Mark Paid</Text>
              </TouchableOpacity>
            )}
            <View style={styles.actionsSecondary}>
              {canRemind && (
                <TouchableOpacity style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]} onPress={handleReminder}>
                  <Ionicons name="notifications-outline" size={15} color="#f59e0b" />
                  <Text style={[styles.actionBtnSmallText, { color: '#f59e0b' }]}>Remind</Text>
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]} onPress={handleCancel}>
                  <Ionicons name="close-circle-outline" size={15} color="#f59e0b" />
                  <Text style={[styles.actionBtnSmallText, { color: '#f59e0b' }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            {canDelete && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  textColor,
  subtitleColor,
}: {
  label: string;
  value: string;
  textColor: string;
  subtitleColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: subtitleColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ItemRow({
  item,
  symbol,
  textColor,
  subtitleColor,
  borderColor,
  isLast,
}: {
  item: InvoiceItem;
  symbol?: string;
  textColor: string;
  subtitleColor: string;
  borderColor: string;
  isLast: boolean;
}) {
  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol || '₹'}${(num / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <View style={[styles.itemRow, !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: textColor }]}>{item.name}</Text>
        {item.description && (
          <Text style={[styles.itemDesc, { color: subtitleColor }]} numberOfLines={1}>{item.description}</Text>
        )}
        <Text style={[styles.itemQty, { color: subtitleColor }]}>
          {item.quantity} {item.unit || 'unit(s)'} × {formatAmount(item.unitPrice)}
          {Number(item.taxRate) > 0 ? ` · Tax ${item.taxRate}%` : ''}
        </Text>
      </View>
      <Text style={[styles.itemTotal, { color: textColor }]}>{formatAmount(item.total)}</Text>
    </View>
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
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  scrollContent: { flex: 1, padding: 16 },
  amountCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  amountValue: { fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  amountBreakdown: { width: '100%', marginTop: 14, gap: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountRowLabel: { fontSize: 13 },
  amountRowValue: { fontSize: 13, fontWeight: '500' },
  section: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500', textAlign: 'right', maxWidth: '55%' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  itemQty: { fontSize: 12, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '700' },
  notesText: { fontSize: 13, lineHeight: 20 },
  actionsContainer: { gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#252525' },
  actionsSecondary: { flexDirection: 'row', gap: 10 },
  actionBtnSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnSmallText: { fontSize: 13, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
  },
  backBtnText: { color: '#252525', fontWeight: '600' },
});
