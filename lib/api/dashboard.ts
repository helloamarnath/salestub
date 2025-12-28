/**
 * Dashboard API Module for Mobile App
 */

import { api, ApiResponse } from './client';
import { DashboardStats, DashboardActivities } from '@/types/dashboard';

/**
 * Fetch dashboard statistics
 * Returns total counts, month-over-month metrics, pipeline data, and revenue trends
 */
export async function getDashboardStats(
  accessToken: string | null
): Promise<ApiResponse<DashboardStats>> {
  return api.get<DashboardStats>('/api/v1/dashboard/stats', accessToken);
}

/**
 * Fetch categorized dashboard activities
 * Returns overdue, due today, upcoming, and recently completed activities
 */
export async function getDashboardActivities(
  accessToken: string | null
): Promise<ApiResponse<DashboardActivities>> {
  return api.get<DashboardActivities>(
    '/api/v1/activities/dashboard/categorized',
    accessToken
  );
}

/**
 * Fetch all dashboard data in parallel
 * Combines stats and activities into a single call
 */
export async function getDashboardData(accessToken: string | null): Promise<{
  stats: ApiResponse<DashboardStats>;
  activities: ApiResponse<DashboardActivities>;
}> {
  const [stats, activities] = await Promise.all([
    getDashboardStats(accessToken),
    getDashboardActivities(accessToken),
  ]);

  return { stats, activities };
}
