// WhatsApp CRM API — full surface mirroring the web client so future features
// (templates CRUD, settings/admin, compliance) only need UI, not plumbing.

import { api, ApiResponse } from './client';
import type {
  WaConversation,
  WaConversationDetail,
  WaConversationsListResponse,
  WaConvStatus,
  WaListFilter,
  WaMessage,
  WaContactContext,
  WaAnalytics,
  WhatsappTemplate,
  WhatsappTemplateCategory,
  WhatsappTemplateStatus,
  WhatsappTemplateButton,
  WhatsappTemplateListResponse,
  WhatsappStatus,
} from '@/types/whatsapp';

const BASE = '/api/v1/whatsapp';
const TEMPLATES_BASE = '/api/v1/whatsapp-templates';

// ============ Conversations / Inbox ============

export interface ListConversationsFilters {
  filter?: WaListFilter;
  status?: WaConvStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listConversations(
  token: string | null,
  filters: ListConversationsFilters = {},
): Promise<ApiResponse<WaConversationsListResponse>> {
  const params: Record<string, string | number | undefined> = {
    filter: filters.filter,
    status: filters.status,
    search: filters.search,
    page: filters.page ?? 1,
    limit: filters.limit ?? 30,
  };
  return api.get<WaConversationsListResponse>(`${BASE}/conversations`, token, params);
}

export async function getUnreadCount(
  token: string | null,
): Promise<ApiResponse<{ unread: number }>> {
  return api.get<{ unread: number }>(`${BASE}/unread-count`, token);
}

export async function getConversation(
  token: string | null,
  conversationId: string,
): Promise<ApiResponse<WaConversationDetail>> {
  return api.get<WaConversationDetail>(`${BASE}/conversations/${conversationId}`, token);
}

export async function startConversation(
  token: string | null,
  data: { phone: string; leadId?: string; contactId?: string; customerName?: string },
): Promise<ApiResponse<WaConversationDetail>> {
  return api.post<WaConversationDetail>(`${BASE}/conversations/start`, token, data);
}

export async function getContactContext(
  token: string | null,
  conversationId: string,
): Promise<ApiResponse<WaContactContext>> {
  return api.get<WaContactContext>(
    `${BASE}/conversations/${conversationId}/contact-context`,
    token,
  );
}

export async function listConversationsByEntity(
  token: string | null,
  args: { leadId?: string; contactId?: string },
): Promise<ApiResponse<WaConversation[]>> {
  return api.get<WaConversation[]>(`${BASE}/conversations/by-entity`, token, {
    leadId: args.leadId,
    contactId: args.contactId,
  });
}

export interface UpdateConversationDto {
  status?: WaConvStatus;
  assignedToId?: string | null;
  notes?: string | null;
  snoozedUntil?: string | null;
  leadId?: string | null;
  contactId?: string | null;
}

export async function updateConversation(
  token: string | null,
  conversationId: string,
  data: UpdateConversationDto,
): Promise<ApiResponse<WaConversation>> {
  return api.patch<WaConversation>(`${BASE}/conversations/${conversationId}`, token, data);
}

// ============ Messages ============

/**
 * Send a message to a conversation.
 *
 * Inside the 24-hour customer-service window: pass `body` for free-form text.
 * Outside the window (or to initiate a new chat): pass `templateId` + the
 * positional `variables` for the template. The server validates that the
 * template is `APPROVED` and that variable count matches the body.
 */
export async function sendMessage(
  token: string | null,
  conversationId: string,
  data: { body?: string; templateId?: string; variables?: string[] },
): Promise<ApiResponse<WaMessage>> {
  return api.post<WaMessage>(`${BASE}/conversations/${conversationId}/send`, token, data);
}

export async function retryMessage(
  token: string | null,
  conversationId: string,
  messageId: string,
): Promise<ApiResponse<WaMessage>> {
  return api.post<WaMessage>(
    `${BASE}/conversations/${conversationId}/messages/${messageId}/retry`,
    token,
    {},
  );
}

/**
 * Send media — multipart upload. The base `api.post` helper sends JSON, so this
 * uses fetch directly with a FormData body. Native file objects come from
 * expo-document-picker / expo-image-picker as `{ uri, name, type }`.
 */
export async function sendMedia(
  token: string | null,
  conversationId: string,
  file: { uri: string; name: string; type: string },
  caption?: string,
): Promise<ApiResponse<WaMessage>> {
  if (!token) {
    return { success: false, error: { message: 'Not authenticated', statusCode: 401 } };
  }
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const form = new FormData();
    // React Native FormData needs the file as a { uri, name, type } object
    // and casts to `any` to satisfy the global FormData type.
    form.append(
      'file',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { uri: file.uri, name: file.name, type: file.type } as any,
    );
    if (caption) form.append('caption', caption);

    const res = await fetch(
      `${baseUrl}${BASE}/conversations/${conversationId}/send-media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errBody.message || `Upload failed (${res.status})`,
          statusCode: res.status,
        },
      };
    }
    const data = (await res.json()) as WaMessage;
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: {
        message: e instanceof Error ? e.message : 'Upload failed',
        statusCode: 0,
      },
    };
  }
}

// ============ Analytics + Usage ============

export async function getAnalytics(
  token: string | null,
): Promise<ApiResponse<WaAnalytics>> {
  return api.get<WaAnalytics>(`${BASE}/analytics`, token);
}

export async function getUsage(
  token: string | null,
): Promise<
  ApiResponse<{
    period: string;
    templateSends: number;
    freeFormSends: number;
    costInPaisa: number;
  }>
> {
  return api.get(`${BASE}/usage`, token);
}

// ============ Compliance ============

export async function recordOptIn(
  token: string | null,
  contactId: string,
  source?: string,
): Promise<ApiResponse<{ id: string; whatsappOptInAt?: string; whatsappOptedOutAt?: string | null }>> {
  return api.post(`${BASE}/contacts/${contactId}/opt-in`, token, { source });
}

export async function recordOptOut(
  token: string | null,
  contactId: string,
): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(`${BASE}/contacts/${contactId}/opt-in`, token);
}

export async function eraseContactData(
  token: string | null,
  contactId: string,
): Promise<
  ApiResponse<{ contactId: string; erased: boolean; messagesRemoved?: number; conversationsRemoved?: number }>
> {
  return api.delete(`${BASE}/contacts/${contactId}/data`, token);
}

// ============ Config ============

export async function getConfig(
  token: string | null,
): Promise<ApiResponse<WhatsappStatus>> {
  return api.get<WhatsappStatus>(`${BASE}/config`, token);
}

export async function saveConfig(
  token: string | null,
  data: { integratedNumber: string; authKey: string },
): Promise<ApiResponse<{ success: boolean; webhookSecret: string }>> {
  return api.post(`${BASE}/config`, token, data);
}

export async function verifyConfig(
  token: string | null,
  data: { integratedNumber: string; authKey: string },
): Promise<ApiResponse<{ valid: boolean; error?: string }>> {
  return api.post(`${BASE}/config/verify`, token, data);
}

export async function disconnectConfig(
  token: string | null,
): Promise<ApiResponse<{ success: boolean }>> {
  return api.delete(`${BASE}/config`, token);
}

export async function regenerateWebhookSecret(
  token: string | null,
): Promise<ApiResponse<{ webhookSecret: string }>> {
  return api.post(`${BASE}/config/regenerate-secret`, token, {});
}

export async function updatePolicy(
  token: string | null,
  data: {
    autoCreateLead?: 'OFF' | 'PROMPT' | 'AUTO';
    stopKeywords?: string[];
    optInRequired?: boolean;
    templateNamespace?: string | null;
  },
): Promise<ApiResponse<WhatsappStatus>> {
  return api.patch(`${BASE}/config/policy`, token, data);
}

// ============ Templates ============

export interface ListTemplatesQuery {
  search?: string;
  category?: WhatsappTemplateCategory;
  status?: WhatsappTemplateStatus;
  language?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTemplatePayload {
  name: string;
  body: string;
  category?: WhatsappTemplateCategory;
  language?: string;
  headerText?: string;
  footerText?: string;
  buttons?: WhatsappTemplateButton[];
  variableLabels?: string[];
  status?: WhatsappTemplateStatus;
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export async function listTemplates(
  token: string | null,
  query: ListTemplatesQuery = {},
): Promise<ApiResponse<WhatsappTemplateListResponse>> {
  const params: Record<string, string | number | undefined> = {
    search: query.search,
    category: query.category,
    status: query.status,
    language: query.language,
    page: query.page,
    pageSize: query.pageSize,
  };
  return api.get<WhatsappTemplateListResponse>(TEMPLATES_BASE, token, params);
}

export async function getTemplate(
  token: string | null,
  templateId: string,
): Promise<ApiResponse<WhatsappTemplate>> {
  return api.get<WhatsappTemplate>(`${TEMPLATES_BASE}/${templateId}`, token);
}

export async function createTemplate(
  token: string | null,
  data: CreateTemplatePayload,
): Promise<ApiResponse<WhatsappTemplate>> {
  return api.post<WhatsappTemplate>(TEMPLATES_BASE, token, data);
}

export async function updateTemplate(
  token: string | null,
  templateId: string,
  data: UpdateTemplatePayload,
): Promise<ApiResponse<WhatsappTemplate>> {
  return api.patch<WhatsappTemplate>(`${TEMPLATES_BASE}/${templateId}`, token, data);
}

export async function deleteTemplate(
  token: string | null,
  templateId: string,
): Promise<ApiResponse<WhatsappTemplate>> {
  return api.delete<WhatsappTemplate>(`${TEMPLATES_BASE}/${templateId}`, token);
}

export async function submitTemplateForApproval(
  token: string | null,
  templateId: string,
): Promise<ApiResponse<WhatsappTemplate>> {
  return api.post<WhatsappTemplate>(
    `${TEMPLATES_BASE}/${templateId}/submit`,
    token,
    {},
  );
}

export async function syncTemplatesFromProvider(
  token: string | null,
): Promise<
  ApiResponse<{ imported: number; updated: number; namespaceSet: boolean }>
> {
  return api.post(`${TEMPLATES_BASE}/sync`, token, {});
}

export async function refreshPendingTemplateStatuses(
  token: string | null,
): Promise<ApiResponse<{ checked: number; updated: number }>> {
  return api.post(`${TEMPLATES_BASE}/sync-status`, token, {});
}

/**
 * Upload a sample image / video / document to use as a template HEADER.
 * Multipart upload via raw fetch since `api.post` is JSON-only.
 */
export async function uploadTemplateHeaderMedia(
  token: string | null,
  file: { uri: string; name: string; type: string },
): Promise<
  ApiResponse<{ providerHandle: string; storageKey: string; mimeType: string }>
> {
  if (!token) {
    return { success: false, error: { message: 'Not authenticated', statusCode: 401 } };
  }
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const form = new FormData();
    // React Native FormData accepts the {uri, name, type} shape; cast to any
    // for the global FormData typing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    const res = await fetch(`${baseUrl}${TEMPLATES_BASE}/upload-header-media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errBody.message || `Upload failed (${res.status})`,
          statusCode: res.status,
        },
      };
    }
    const data = (await res.json()) as {
      providerHandle: string;
      storageKey: string;
      mimeType: string;
    };
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: {
        message: e instanceof Error ? e.message : 'Upload failed',
        statusCode: 0,
      },
    };
  }
}
