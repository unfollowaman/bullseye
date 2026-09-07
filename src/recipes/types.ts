import { UnifiedCaptureConfig, CaptureAction } from '@/capture/types';

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  projectId?: string; // Optional reference to Project ID
  config: UnifiedCaptureConfig;
  actions: CaptureAction[];
  createdAt: string;
  updatedAt: string;
  version: number; // Schema version (e.g., 1)
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  projectId?: string;
  config: UnifiedCaptureConfig;
  actions?: CaptureAction[];
}

export interface UpdateRecipeInput {
  name?: string;
  description?: string;
  projectId?: string | null; // Allow setting, changing, or clearing projectId
  config?: UnifiedCaptureConfig;
  actions?: CaptureAction[];
}

export interface RecipeValidationResult {
  valid: boolean;
  errors: string[];
}
