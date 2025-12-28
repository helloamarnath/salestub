// Profile API for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profilePicture: string | null;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Update current user's profile
 */
export async function updateProfile(
  accessToken: string,
  data: UpdateProfileDto
): Promise<ApiResponse<UserProfile>> {
  return api.patch<UserProfile>('/api/v1/public/organization/profile', accessToken, data);
}

/**
 * Get current user's profile from the organization endpoint
 */
export async function getProfile(
  accessToken: string
): Promise<ApiResponse<UserProfile>> {
  return api.get<UserProfile>('/api/v1/public/organization/profile', accessToken);
}
