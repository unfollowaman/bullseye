import { CreateProjectInput, UpdateProjectInput } from './types';
import { isValidUrl } from '@/utils/url-utils';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCreateProjectInput(input: CreateProjectInput): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Project input must be an object'] };
  }

  if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
    errors.push('Project name is required and cannot be empty');
  }

  if (input.defaultUrl !== undefined && input.defaultUrl !== null && input.defaultUrl.trim() !== '') {
    if (!isValidUrl(input.defaultUrl.trim())) {
      errors.push(`Invalid default URL format: '${input.defaultUrl}'. Must be a valid http:// or https:// URL.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateUpdateProjectInput(input: UpdateProjectInput): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Project update input must be an object'] };
  }

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim()) {
      errors.push('Project name cannot be empty');
    }
  }

  if (input.defaultUrl !== undefined && input.defaultUrl !== null && input.defaultUrl.trim() !== '') {
    if (!isValidUrl(input.defaultUrl.trim())) {
      errors.push(`Invalid default URL format: '${input.defaultUrl}'. Must be a valid http:// or https:// URL.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
