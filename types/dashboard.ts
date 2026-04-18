/**
 * Dashboard Types for Mobile App
 */

export interface MetricWithChange {
  thisMonth: number;
  lastMonth: number;
  change: number;
  changePercent: number;
}

export interface CompanyMetric {
  id: string;
  name: string;
  leadCount: number;
}

export interface StageMetric {
  stage: string;
  count: number;
  value: number;
}

export interface RevenueMetric {
  month: string;
  revenue: number;
}

export interface DashboardStats {
  // Total counts for KPI cards
  totalLeads: number;
  totalContacts: number;
  totalOpenLeads: number;
  totalPipelineValue: number;

  // Month-over-month metrics
  contactsCreated: MetricWithChange;
  leadsWon: MetricWithChange;
  leadsLost: MetricWithChange;
  tasksClosed: MetricWithChange;
  eventsCompleted: MetricWithChange;
  callsCompleted: MetricWithChange;

  // Aggregations
  topCompanies: CompanyMetric[];
  openLeadsByStage: StageMetric[];
  revenueWonByMonth: RevenueMetric[];
}

export interface DashboardActivityRelation {
  id: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  name?: string;
}

export interface DashboardActivity {
  id: string;
  title: string;
  description?: string;
  type: 'TASK' | 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  completedDate?: string;
  contact?: DashboardActivityRelation;
  company?: DashboardActivityRelation;
  lead?: DashboardActivityRelation;
}

export interface DashboardActivities {
  overdue: DashboardActivity[];
  dueToday: DashboardActivity[];
  upcoming: DashboardActivity[];
  recentCompleted: DashboardActivity[];
  counts: {
    overdue: number;
    dueToday: number;
    upcoming: number;
  };
}

export interface DashboardData {
  stats: DashboardStats | null;
  activities: DashboardActivities | null;
  isLoading: boolean;
  error: string | null;
}
