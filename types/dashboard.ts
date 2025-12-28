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
  dealCount: number;
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
  totalDeals: number;
  totalContacts: number;
  totalOpenDeals: number;
  totalPipelineValue: number;

  // Month-over-month metrics
  contactsCreated: MetricWithChange;
  dealsWon: MetricWithChange;
  dealsLost: MetricWithChange;
  tasksClosed: MetricWithChange;
  eventsCompleted: MetricWithChange;
  callsCompleted: MetricWithChange;

  // Aggregations
  topCompanies: CompanyMetric[];
  openDealsByStage: StageMetric[];
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
  deal?: DashboardActivityRelation;
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
