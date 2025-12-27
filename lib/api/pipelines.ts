// Pipelines API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';

export interface PipelineStage {
  id: string;
  name: string;
  type: string;
  color?: string;
  order: number;
  probability?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  type: 'LEAD' | 'DEAL';
  description?: string;
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const PIPELINES_BASE = '/api/v1/pipelines';

/**
 * Get all pipelines
 */
export async function getPipelines(
  token: string | null
): Promise<ApiResponse<Pipeline[]>> {
  return api.get<Pipeline[]>(PIPELINES_BASE, token);
}

/**
 * Get pipeline by ID
 */
export async function getPipeline(
  token: string | null,
  id: string
): Promise<ApiResponse<Pipeline>> {
  return api.get<Pipeline>(`${PIPELINES_BASE}/${id}`, token);
}
