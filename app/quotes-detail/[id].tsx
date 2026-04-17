import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { getQuote, sendQuote, cancelQuote, deleteQuote } from '@/lib/api/quotes';
import { createInvoiceFromQuote } from '@/lib/api/invoices';
import type { Quote, QuoteItem } from '@/types/quote';
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from '@/types/quote';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const [quote, setQuote] = useState<Quote | null>(null);
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
    const fetchQuote = async () => {
      if (!accessToken || !id) return;
      setLoading(true);
      const response = await getQuote(accessToken, id);
      if (response.success && response.data) {
        setQuote(response.data);
      }
      setLoading(false);
    };
    fetchQuote();
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

  const handleSend = async () => {
    if (!accessToken || !quote) return;
    Alert.alert('Send Quote', `Send quote #${quote.quoteNumber} to ${quote.contact?.email || 'customer'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await sendQuote(accessToken, quote.id);
          if (res.success) {
            Alert.alert('Success', 'Quote sent successfully');
            const refreshed = await getQuote(accessToken, quote.id);
            if (refreshed.success && refreshed.data) setQuote(refreshed.data);
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to send quote');
          }
        },
      },
    ]);
  };

  const handleCancel = async () => {
    if (!accessToken || !quote) return;
    Alert.alert('Cancel Quote', `Are you sure you want to cancel quote #${quote.quoteNumber}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Quote',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await cancelQuote(accessToken, quote.id);
          if (res.success) {
            const refreshed = await getQuote(accessToken, quote.id);
            if (refreshed.success && refreshed.data) setQuote(refreshed.data);
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to cancel quote');
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (!accessToken || !quote) return;
    Alert.alert('Delete Quote', `Delete draft quote #${quote.quoteNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await deleteQuote(accessToken, quote.id);
          if (res.success) {
            router.back();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to delete quote');
          }
        },
      },
    ]);
  };

  const handleDownloadPDF = async () => {
    if (!quote?.accessToken) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const pdfUrl = `${apiUrl}/api/v1/public/quotes/${quote.accessToken}/pdf`;
    await WebBrowser.openBrowserAsync(pdfUrl);
  };

  const handleCopyLink = async () => {
    if (!quote?.accessToken) return;
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://crm.salestub.com';
    const link = `${webUrl}/q/${quote.accessToken}`;
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Quote link copied to clipboard');
  };

  const handleCreateInvoice = async () => {
    if (!accessToken || !quote) return;
    Alert.alert('Create Invoice', `Create invoice from quote #${quote.quoteNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const res = await createInvoiceFromQuote(accessToken, quote.id);
          if (res.success && res.data) {
            Alert.alert('Success', `Invoice #${res.data.invoiceNumber} created`);
            router.push(`/invoices/${res.data.id}` as any);
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to create invoice');
          }
        },
      },
    ]);
  };

  const handleEdit = () => {
    if (!quote) return;
    router.push(`/(tabs)/quotes/create?editId=${quote.id}` as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <Ionicons name="document-text-outline" size={64} color={subtitleColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>Quote not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = QUOTE_STATUS_COLORS[quote.status] || '#6b7280';
  const contactName = quote.contact
    ? `${quote.contact.firstName} ${quote.contact.lastName || ''}`.trim()
    : '-';
  const canSend = quote.status === 'DRAFT';
  const canCancel = ['DRAFT', 'SENT'].includes(quote.status);
  const canEdit = quote.status === 'DRAFT';
  const canDelete = quote.status === 'DRAFT';
  const canCreateInvoice = quote.status === 'APPROVED';

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: buttonBg }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: textColor }]}>#{quote.quoteNumber}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: buttonBg, marginRight: 8 }]} onPress={handleEdit}>
            <Ionicons name="pencil" size={18} color={textColor} />
          </TouchableOpacity>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {QUOTE_STATUS_LABELS[quote.status]}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.amountLabel, { color: sectionTitleColor }]}>Total Amount</Text>
          <Text style={[styles.amountValue, { color: textColor }]}>
            {formatAmount(quote.total, quote.currency?.symbol)}
          </Text>
          <View style={styles.amountBreakdown}>
            <View style={styles.amountRow}>
              <Text style={[styles.amountRowLabel, { color: subtitleColor }]}>Subtotal</Text>
              <Text style={[styles.amountRowValue, { color: subtitleColor }]}>
                {formatAmount(quote.subtotal, quote.currency?.symbol)}
              </Text>
            </View>
            {Number(quote.taxAmount) > 0 && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountRowLabel, { color: subtitleColor }]}>Tax</Text>
                <Text style={[styles.amountRowValue, { color: subtitleColor }]}>
                  {formatAmount(quote.taxAmount, quote.currency?.symbol)}
                </Text>
              </View>
            )}
            {Number(quote.discountAmount) > 0 && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountRowLabel, { color: '#22c55e' }]}>Discount</Text>
                <Text style={[styles.amountRowValue, { color: '#22c55e' }]}>
                  -{formatAmount(quote.discountAmount, quote.currency?.symbol)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quote Details */}
        <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Quote Details</Text>
          <DetailRow label="Quote Date" value={quote.quoteDate ? formatDate(quote.quoteDate) : formatDate(quote.createdAt)} textColor={textColor} subtitleColor={subtitleColor} />
          <DetailRow label="Valid Until" value={quote.validUntil ? formatDate(quote.validUntil) : '-'} textColor={textColor} subtitleColor={subtitleColor} />
          {quote.subject && <DetailRow label="Subject" value={quote.subject} textColor={textColor} subtitleColor={subtitleColor} />}
          {quote.paymentTerms && <DetailRow label="Payment Terms" value={quote.paymentTerms} textColor={textColor} subtitleColor={subtitleColor} />}
          {quote.deliveryTerms && <DetailRow label="Delivery Terms" value={quote.deliveryTerms} textColor={textColor} subtitleColor={subtitleColor} />}
          {quote.customerReference && <DetailRow label="Customer Ref" value={quote.customerReference} textColor={textColor} subtitleColor={subtitleColor} />}
          <DetailRow label="Revision" value={`#${quote.revisionNumber || 0}`} textColor={textColor} subtitleColor={subtitleColor} />
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Contact</Text>
          <DetailRow label="Name" value={contactName} textColor={textColor} subtitleColor={subtitleColor} />
          {quote.contact?.email && <DetailRow label="Email" value={quote.contact.email} textColor={textColor} subtitleColor={subtitleColor} />}
          {quote.contact?.phone && <DetailRow label="Phone" value={quote.contact.phone} textColor={textColor} subtitleColor={subtitleColor} />}
          {quote.contact?.companyName && <DetailRow label="Company" value={quote.contact.companyName} textColor={textColor} subtitleColor={subtitleColor} />}
        </View>

        {/* Items */}
        <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
            Items ({quote.items?.length || 0})
          </Text>
          {quote.items?.map((item, index) => (
            <ItemRow key={item.id || index} item={item} symbol={quote.currency?.symbol} textColor={textColor} subtitleColor={subtitleColor} borderColor={borderColor} isLast={index === quote.items.length - 1} />
          ))}
        </View>

        {/* Notes */}
        {(quote.notes || quote.termsAndConditions) && (
          <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
            {quote.notes && (
              <>
                <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Notes</Text>
                <Text style={[styles.notesText, { color: subtitleColor }]}>{quote.notes}</Text>
              </>
            )}
            {quote.termsAndConditions && (
              <>
                <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginTop: quote.notes ? 16 : 0 }]}>Terms & Conditions</Text>
                <Text style={[styles.notesText, { color: subtitleColor }]}>{quote.termsAndConditions}</Text>
              </>
            )}
          </View>
        )}

        {/* Primary Actions */}
        {canSend && (
          <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: colors.primary }]} onPress={handleSend}>
            <Ionicons name="send" size={16} color="white" />
            <Text style={styles.actionBtnText}>Send Quote</Text>
          </TouchableOpacity>
        )}
        {canCreateInvoice && (
          <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: '#22c55e' }]} onPress={handleCreateInvoice}>
            <Ionicons name="receipt-outline" size={16} color="white" />
            <Text style={styles.actionBtnText}>Create Invoice</Text>
          </TouchableOpacity>
        )}

        {/* Secondary Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]} onPress={handleDownloadPDF}>
            <Ionicons name="download-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }]} onPress={handleCopyLink}>
            <Ionicons name="link-outline" size={16} color="#8b5cf6" />
            <Text style={[styles.actionBtnText, { color: '#8b5cf6' }]}>Copy Link</Text>
          </TouchableOpacity>
        </View>

        {/* Destructive Actions */}
        {(canCancel || canDelete) && (
          <View style={styles.actionsRow}>
            {canCancel && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]} onPress={handleCancel}>
                <Ionicons name="close-circle-outline" size={16} color="#f59e0b" />
                <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Cancel Quote</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
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
  item: QuoteItem;
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
  actionBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#252525' },
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
