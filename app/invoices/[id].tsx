import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import {
  getInvoice,
  sendInvoice,
  markInvoiceSent,
  cancelInvoice,
  markInvoicePaid,
  sendInvoiceReminder,
  deleteInvoice,
  duplicateInvoice,
  refundInvoice,
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

  // Action busy flags
  const [duplicating, setDuplicating] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);

  // Refund modal
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [refunding, setRefunding] = useState(false);

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

  // ----- Public link helpers -----
  const buildPublicLink = (): string => {
    if (!invoice?.accessToken) return '';
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://crm.salestub.com';
    return `${webUrl}/i/${invoice.accessToken}`;
  };

  const buildPayLink = (): string => {
    if (!invoice?.accessToken) return '';
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://crm.salestub.com';
    return `${webUrl}/pay/${invoice.accessToken}`;
  };

  const handleViewPdf = async () => {
    if (!invoice?.accessToken) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const pdfUrl = `${apiUrl}/api/v1/public/invoices/${invoice.accessToken}/pdf`;
    await WebBrowser.openBrowserAsync(pdfUrl);
  };

  const handleCopyLink = async () => {
    const link = buildPublicLink();
    if (!link) return;
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Invoice link copied to clipboard');
  };

  const handleShareLink = async () => {
    const link = buildPublicLink();
    if (!link || !invoice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Invoice #${invoice.invoiceNumber}: ${link}`,
        url: link,
        title: `Invoice #${invoice.invoiceNumber}`,
      });
    } catch {
      // user dismissed
    }
  };

  const handleSharePayLink = async () => {
    const link = buildPayLink();
    if (!link || !invoice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Pay invoice #${invoice.invoiceNumber}: ${link}`,
        url: link,
        title: `Pay invoice #${invoice.invoiceNumber}`,
      });
    } catch {
      // user dismissed
    }
  };

  // ----- Mark sent (manual — no email) -----
  const handleMarkSent = () => {
    if (!accessToken || !invoice) return;
    Alert.alert(
      'Mark as sent',
      `Mark invoice #${invoice.invoiceNumber} as sent without emailing? Use this when you've shared it via WhatsApp or another channel.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Sent',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setMarkingSent(true);
            const res = await markInvoiceSent(accessToken, invoice.id);
            setMarkingSent(false);
            if (res.success && res.data?.invoice) {
              setInvoice(res.data.invoice);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', res.error?.message || 'Failed to mark invoice as sent');
            }
          },
        },
      ],
    );
  };

  // ----- Duplicate -----
  const handleDuplicate = () => {
    if (!accessToken || !invoice) return;
    Alert.alert(
      'Duplicate invoice?',
      `Create a new draft invoice with the same items and customer as #${invoice.invoiceNumber}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDuplicating(true);
            const res = await duplicateInvoice(accessToken, invoice.id);
            setDuplicating(false);
            if (res.success && res.data) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace(`/invoices/${res.data.id}` as never);
            } else {
              Alert.alert('Error', res.error?.message || 'Failed to duplicate invoice');
            }
          },
        },
      ],
    );
  };

  // ----- Refund -----
  const openRefundModal = () => {
    if (!invoice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pre-fill with the paid amount as the refund default
    const paid = parseFloat(String(invoice.amountPaid ?? '0'));
    setRefundAmount(paid > 0 ? paid.toFixed(2) : '');
    setRefundReason('');
    setRefundReference('');
    setRefundOpen(true);
  };

  const handleSubmitRefund = async () => {
    if (!accessToken || !invoice) return;
    const amt = parseFloat(refundAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a refund amount greater than 0.');
      return;
    }
    if (!refundReason.trim()) {
      Alert.alert('Reason required', 'Tell the team why this refund is happening.');
      return;
    }
    setRefunding(true);
    const res = await refundInvoice(accessToken, invoice.id, {
      amount: amt,
      reason: refundReason.trim(),
      reference: refundReference.trim() || undefined,
    });
    setRefunding(false);
    if (res.success && res.data) {
      setInvoice(res.data);
      setRefundOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Refund failed', res.error?.message || 'Could not process refund.');
    }
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
    return <ScreenLoader />;
  }

  if (!invoice) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <Ionicons name="receipt-outline" size={64} color={subtitleColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>Invoice not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = INVOICE_STATUS_COLORS[invoice.status] || '#6b7280';
  const contactName = invoice.contact
    ? `${invoice.contact.firstName} ${invoice.contact.lastName || ''}`.trim()
    : '-';

  const canSend = invoice.status === 'DRAFT';
  const canMarkSent = invoice.status === 'DRAFT';
  const canEdit = invoice.status === 'DRAFT';
  const canDelete = invoice.status === 'DRAFT';
  const canMarkPaid = ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status);
  const canRemind = ['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status);
  const canCancel = ['DRAFT', 'SENT'].includes(invoice.status);
  const canRefund = ['PAID', 'PARTIALLY_PAID'].includes(invoice.status);
  // Duplicate any invoice (web allows it on every status — useful for repeat billing)
  const canDuplicate = invoice.status !== 'DRAFT' || true;
  // Public link makes sense once the invoice has been sent (i.e. customer is expected to see it)
  const showPublicLink =
    !!invoice.accessToken && invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED';

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
                <Text style={[styles.amountRowLabel, { color: Palette.emerald }]}>Discount</Text>
                <Text style={[styles.amountRowValue, { color: Palette.emerald }]}>
                  -{formatAmount(invoice.discountAmount, invoice.currency?.symbol)}
                </Text>
              </View>
            )}
            {amountPaid > 0 && (
              <View style={[styles.amountRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: borderColor }]}>
                <Text style={[styles.amountRowLabel, { color: Palette.emerald, fontWeight: '600' }]}>Paid</Text>
                <Text style={[styles.amountRowValue, { color: Palette.emerald, fontWeight: '600' }]}>
                  {formatAmount(amountPaid, invoice.currency?.symbol)}
                </Text>
              </View>
            )}
            {amountDue > 0 && amountDue !== Number(invoice.total) && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountRowLabel, { color: Palette.red, fontWeight: '600' }]}>Amount Due</Text>
                <Text style={[styles.amountRowValue, { color: Palette.red, fontWeight: '600' }]}>
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

        {/* Public link / share — visible once the invoice is no longer Draft / Cancelled */}
        {showPublicLink && (
          <View style={[styles.section, { backgroundColor: sectionBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Public link</Text>
            <Text style={[styles.notesText, { color: subtitleColor, marginBottom: 8 }]}>
              Share this with your customer to view the invoice or pay online.
            </Text>
            <View style={styles.actionsSecondary}>
              <TouchableOpacity
                style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]}
                onPress={handleViewPdf}
              >
                <Ionicons name="document-outline" size={15} color={colors.primary} />
                <Text style={[styles.actionBtnSmallText, { color: colors.primary }]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }]}
                onPress={handleCopyLink}
              >
                <Ionicons name="link-outline" size={15} color={Palette.purple} />
                <Text style={[styles.actionBtnSmallText, { color: Palette.purple }]}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)' }]}
                onPress={handleShareLink}
              >
                <Ionicons name="share-outline" size={15} color={Palette.emerald} />
                <Text style={[styles.actionBtnSmallText, { color: Palette.emerald }]}>Share</Text>
              </TouchableOpacity>
            </View>
            {canMarkPaid && (
              <TouchableOpacity
                style={[
                  styles.actionBtnSmall,
                  {
                    marginTop: 10,
                    backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)',
                    paddingVertical: 10,
                  },
                ]}
                onPress={handleSharePayLink}
              >
                <Ionicons name="card-outline" size={16} color={Palette.emerald} />
                <Text style={[styles.actionBtnSmallText, { color: Palette.emerald, fontSize: 14 }]}>
                  Share Pay link
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        {(canSend || canMarkSent || canMarkPaid || canRemind || canCancel || canDelete || canDuplicate || canRefund) && (
          <View style={styles.actionsContainer}>
            {canSend && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleSend}>
                <Ionicons name="send" size={16} color={colors.primaryForeground} />
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Send Invoice</Text>
              </TouchableOpacity>
            )}
            {canMarkSent && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                onPress={handleMarkSent}
                disabled={markingSent}
              >
                {markingSent ? (
                  <ActivityIndicator size="small" color={textColor} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={16} color={textColor} />
                    <Text style={[styles.actionBtnText, { color: textColor }]}>Mark Sent (no email)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canMarkPaid && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Palette.emerald }]} onPress={handleMarkPaid}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={[styles.actionBtnText, { color: 'white' }]}>Mark Paid</Text>
              </TouchableOpacity>
            )}
            <View style={styles.actionsSecondary}>
              {canRemind && (
                <TouchableOpacity style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]} onPress={handleReminder}>
                  <Ionicons name="notifications-outline" size={15} color={Palette.amber} />
                  <Text style={[styles.actionBtnSmallText, { color: Palette.amber }]}>Remind</Text>
                </TouchableOpacity>
              )}
              {canDuplicate && (
                <TouchableOpacity
                  style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }]}
                  onPress={handleDuplicate}
                  disabled={duplicating}
                >
                  {duplicating ? (
                    <ActivityIndicator size="small" color={Palette.purple} />
                  ) : (
                    <>
                      <Ionicons name="copy-outline" size={15} color={Palette.purple} />
                      <Text style={[styles.actionBtnSmallText, { color: Palette.purple }]}>Duplicate</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {canRefund && (
                <TouchableOpacity
                  style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]}
                  onPress={openRefundModal}
                >
                  <Ionicons name="return-up-back-outline" size={15} color={Palette.red} />
                  <Text style={[styles.actionBtnSmallText, { color: Palette.red }]}>Refund</Text>
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity style={[styles.actionBtnSmall, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]} onPress={handleCancel}>
                  <Ionicons name="close-circle-outline" size={15} color={Palette.amber} />
                  <Text style={[styles.actionBtnSmallText, { color: Palette.amber }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            {canDelete && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={Palette.red} />
                <Text style={[styles.actionBtnText, { color: Palette.red }]}>Delete Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      {/* Refund modal */}
      <Modal
        visible={refundOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setRefundOpen(false)}>
            <Pressable
              style={[styles.modalSheet, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Refund invoice
                </Text>
                <TouchableOpacity onPress={() => setRefundOpen(false)}>
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
                <Text style={[styles.fieldLabel, { color: subtitleColor }]}>
                  Amount{invoice.currency?.symbol ? ` (${invoice.currency.symbol})` : ''}
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: sectionBg, color: textColor, borderColor },
                  ]}
                  value={refundAmount}
                  onChangeText={(t) => setRefundAmount(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={subtitleColor}
                />
                <Text style={[styles.fieldHint, { color: subtitleColor }]}>
                  Paid: {invoice.currency?.symbol || ''}
                  {String(invoice.amountPaid ?? '0')}
                </Text>

                <Text style={[styles.fieldLabel, { color: subtitleColor, marginTop: 12 }]}>
                  Reason
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.fieldInputMultiline,
                    { backgroundColor: sectionBg, color: textColor, borderColor },
                  ]}
                  value={refundReason}
                  onChangeText={setRefundReason}
                  placeholder="e.g. Customer requested cancellation"
                  placeholderTextColor={subtitleColor}
                  multiline
                />

                <Text style={[styles.fieldLabel, { color: subtitleColor, marginTop: 12 }]}>
                  External reference (optional)
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { backgroundColor: sectionBg, color: textColor, borderColor },
                  ]}
                  value={refundReference}
                  onChangeText={setRefundReference}
                  placeholder="RZP_REF_… or bank ref"
                  placeholderTextColor={subtitleColor}
                  autoCapitalize="none"
                />
                <Text style={[styles.fieldHint, { color: subtitleColor }]}>
                  Note: this records the refund in the CRM. It does NOT initiate a refund through your payment gateway — issue that separately.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: Palette.red,
                      marginTop: 18,
                      opacity: refunding ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleSubmitRefund}
                  disabled={refunding}
                >
                  {refunding ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="return-up-back-outline" size={16} color="white" />
                      <Text style={[styles.actionBtnText, { color: 'white' }]}>
                        Process refund
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  actionBtnText: { fontSize: 14, fontWeight: '600' },
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
    borderRadius: 10,
  },
  backBtnText: { fontWeight: '600' },

  /* Refund modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldHint: { fontSize: 11, marginTop: 4 },
});
