// WhatsApp CRM types — mirror the web's `whatsapp-crm.service.ts` shapes
// so the same backend powers both clients without divergence.

export type WaConvStatus = 'OPEN' | 'SNOOZED' | 'CLOSED';

export type WaMsgDirection = 'INBOUND' | 'OUTBOUND';

export type WaMsgType =
  | 'TEXT'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'VIDEO'
  | 'LOCATION'
  | 'INTERACTIVE'
  | 'REACTION'
  | 'TEMPLATE';

export type WaMsgStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export type WaListFilter = 'all' | 'unread' | 'assigned' | 'mentions' | 'lead_candidates';

export interface WaSender {
  id: string;
  name: string;
}

export interface WaAssignee {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
}

export interface WaContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  company?: { id: string; name: string };
}

export interface WaLeadSummary {
  id: string;
  displayId?: string;
  title?: string;
  value?: number;
  stageRel?: { id: string; name: string };
}

export interface WaMessage {
  id: string;
  conversationId: string;
  direction: WaMsgDirection;
  type: WaMsgType;
  body?: string | null;
  mediaUrl?: string | null;
  caption?: string | null;
  filename?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  msgId?: string | null;
  replyToMsgId?: string | null;
  status: WaMsgStatus;
  failureReason?: string | null;
  sentById?: string | null;
  sentBy?: WaSender | null;
  createdAt: string;
}

export interface WaConversation {
  id: string;
  customerNumber: string;
  customerName: string | null;
  status: WaConvStatus;
  unreadCount: number;
  lastMessageAt: string | null;
  windowExpiresAt: string | null;
  snoozedUntil: string | null;
  assignedToId: string | null;
  assignedTo?: WaAssignee | null;
  contactId: string | null;
  contact?: WaContactSummary | null;
  leadId?: string | null;
  lead?: WaLeadSummary | null;
  notes: string | null;
  lastMessage?: WaMessage | null;
}

export interface WaConversationDetail extends WaConversation {
  messages: WaMessage[];
}

export interface WaConversationsListResponse {
  data: WaConversation[];
  total: number;
  page: number;
  limit: number;
}

export interface WaContactContext {
  leads: Array<{
    id: string;
    displayId?: string;
    title?: string;
    value?: number;
    stageRel?: { id: string; name: string };
    expectedCloseDate?: string;
  }>;
  quotes: Array<{
    id: string;
    quoteNumber?: string;
    status?: string;
    total?: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber?: string;
    status?: string;
    total?: number;
    amountDue?: number;
    dueDate?: string;
  }>;
}

export interface WaAnalytics {
  // Backend service may use either name set; keep both for compatibility.
  conversations?: number;
  totalConversations?: number;
  openConversations: number;
  closedWon?: number;
  avgResponseMinutes?: number | null;
  avgResponseTime?: number | null; // seconds (backend variant)
  replyRate: number; // 0-100
  slaBreachRate?: number; // 0-100
  slaBreaches?: number;
  conversionRate?: number; // 0..1
}

export type WhatsappTemplateCategory =
  | 'UTILITY'
  | 'MARKETING'
  | 'AUTHENTICATION';

export type WhatsappTemplateHeaderType =
  | 'NONE'
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'DOCUMENT';

export type WhatsappTemplateStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED'
  | 'ARCHIVED';

export type WhatsappTemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE';

export interface WhatsappTemplateButton {
  type: WhatsappTemplateButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  body: string;
  category: WhatsappTemplateCategory;
  language: string;
  status: WhatsappTemplateStatus;
  headerType: WhatsappTemplateHeaderType;
  headerText: string | null;
  /** Provider's upload-session handle (used at template approval). */
  headerMediaUrl: string | null;
  /** R2 storage key — backend signs a fresh URL at every send. */
  headerMediaStorageKey: string | null;
  headerMediaMimeType: string | null;
  footerText: string | null;
  buttons: WhatsappTemplateButton[] | null;
  variableLabels: string[];
  providerTemplateId: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappTemplateListResponse {
  items: WhatsappTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WhatsappStatus {
  connected: boolean;
  integratedNumber?: string;
  authKeyMasked?: string;
  connectionStatus?: string;
  isActive?: boolean;
  lastVerifiedAt?: string;
  webhookSecret?: string;
  autoCreateLead?: 'OFF' | 'PROMPT' | 'AUTO';
  stopKeywords?: string[];
  optInRequired?: boolean;
  templateNamespace?: string | null;
}

// ---------- helpers ----------

export function getCustomerInitials(c: { customerName?: string | null; customerNumber: string }): string {
  if (c.customerName) {
    const parts = c.customerName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Fall back to last 2 digits of phone number
  const digits = c.customerNumber.replace(/\D/g, '');
  return digits.slice(-2);
}

export function getCustomerDisplayName(c: { customerName?: string | null; customerNumber: string }): string {
  return c.customerName?.trim() || c.customerNumber;
}

export function isSessionExpired(windowExpiresAt: string | null | undefined): boolean {
  if (!windowExpiresAt) return true;
  return new Date(windowExpiresAt).getTime() < Date.now();
}

export function getSessionTimeRemainingMs(windowExpiresAt: string | null | undefined): number {
  if (!windowExpiresAt) return 0;
  return Math.max(0, new Date(windowExpiresAt).getTime() - Date.now());
}
