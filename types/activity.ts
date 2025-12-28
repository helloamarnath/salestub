// Activity type definitions for SalesTub CRM Mobile App

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE';

export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ReminderType =
  | 'NONE'
  | 'AT_TIME'
  | 'FIVE_MIN'
  | 'TEN_MIN'
  | 'FIFTEEN_MIN'
  | 'THIRTY_MIN'
  | 'ONE_HOUR'
  | 'ONE_DAY';

export type ActivityPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ActivityOwner {
  membershipId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  type: ActivityType;
  status: ActivityStatus;
  dueDate?: string;
  completedDate?: string;
  duration?: number; // Duration in minutes
  outcome?: string;
  priority?: ActivityPriority;
  metadata?: Record<string, unknown>;
  // Reminder
  reminder: ReminderType;
  reminderSent: boolean;
  // Related entities
  leadId?: string;
  lead?: {
    id: string;
    title: string;
    displayId?: string;
  };
  contactId?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  dealId?: string;
  deal?: {
    id: string;
    title: string;
  };
  companyId?: string;
  company?: {
    id: string;
    name: string;
  };
  productId?: string;
  product?: {
    id: string;
    name: string;
  };
  // Owner
  ownerMembershipId: string;
  owner?: ActivityOwner;
  // Assignee
  assignedMembershipId: string;
  assignedTo?: ActivityOwner;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityDto {
  title: string;
  description?: string;
  type: ActivityType;
  status?: ActivityStatus;
  dueDate?: string;
  duration?: number;
  priority?: ActivityPriority;
  reminder?: ReminderType;
  leadId?: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  productId?: string;
  assignedMembershipId?: string;
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {
  outcome?: string;
  completedDate?: string;
}

export interface ActivityFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: ActivityType;
  status?: ActivityStatus;
  assignedTo?: string;
  leadId?: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
}

export interface PaginatedActivitiesResponse {
  data: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ActivityStats {
  total: number;
  byType: Record<ActivityType, { count: number; completed: number }>;
  byStatus: Record<ActivityStatus, { count: number }>;
}

// Activity type labels for display
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  TASK: 'Task',
  NOTE: 'Note',
};

// Activity type icons (Ionicons names)
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  CALL: 'call-outline',
  EMAIL: 'mail-outline',
  MEETING: 'people-outline',
  TASK: 'checkbox-outline',
  NOTE: 'document-text-outline',
};

// Activity type colors
export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  CALL: '#22c55e', // Green
  EMAIL: '#3b82f6', // Blue
  MEETING: '#8b5cf6', // Purple
  TASK: '#f59e0b', // Amber
  NOTE: '#64748b', // Slate
};

// Activity status labels
export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Activity status colors
export const ACTIVITY_STATUS_COLORS: Record<ActivityStatus, string> = {
  PENDING: '#f59e0b', // Amber
  IN_PROGRESS: '#3b82f6', // Blue
  COMPLETED: '#22c55e', // Green
  CANCELLED: '#64748b', // Slate
};

// Priority colors
export const ACTIVITY_PRIORITY_COLORS: Record<ActivityPriority, string> = {
  LOW: '#64748b', // Slate
  MEDIUM: '#f59e0b', // Amber
  HIGH: '#ef4444', // Red
};

// Format duration for display
export const formatDuration = (minutes?: number): string => {
  if (!minutes) return '';
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Format activity date for display
export const formatActivityDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();

  if (isToday) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (isYesterday) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Get relative time string
export const getRelativeTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 0) {
    // Future date
    const futureMins = Math.abs(diffMins);
    if (futureMins < 60) return `in ${futureMins}m`;
    const futureHours = Math.abs(diffHours);
    if (futureHours < 24) return `in ${futureHours}h`;
    const futureDays = Math.abs(diffDays);
    return `in ${futureDays}d`;
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
