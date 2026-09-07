import { CapturePreset, PresetValidationResult, CreateCapturePresetInput, UpdateCapturePresetInput } from './types';
import { BUILTIN_DEVICE_PRESETS } from './devices';

export function validateCapturePresetInput(
  input: CreateCapturePresetInput | UpdateCapturePresetInput,
  isCreate = true
): PresetValidationResult {
  const errors: string[] = [];

  if (isCreate) {
    const createInput = input as CreateCapturePresetInput;
    if (!createInput.name || !createInput.name.trim()) {
      errors.push('Preset name is required.');
    }
    if (!createInput.config) {
      errors.push('Capture configuration is required.');
    }
  }

  if (input.name !== undefined && !input.name.trim()) {
    errors.push('Preset name cannot be empty.');
  }

  if (input.config) {
    const cfg = input.config;

    if (cfg.viewport) {
      if (typeof cfg.viewport.width !== 'number' || cfg.viewport.width <= 0) {
        errors.push('Viewport width must be a positive number.');
      }
      if (typeof cfg.viewport.height !== 'number' || cfg.viewport.height <= 0) {
        errors.push('Viewport height must be a positive number.');
      }
    }

    if (cfg.deviceScaleFactor !== undefined) {
      if (typeof cfg.deviceScaleFactor !== 'number' || cfg.deviceScaleFactor <= 0) {
        errors.push('Device scale factor (DPR) must be a positive number.');
      }
    }

    if (cfg.captureType === 'recording' || cfg.type === 'recording' || cfg.captureType === 'both' || cfg.type === 'both') {
      const durationMs = cfg.recordingOptions?.durationMs ?? cfg.recordingDurationMs;
      if (durationMs !== undefined) {
        if (typeof durationMs !== 'number' || durationMs < 1000) {
          errors.push('Recording duration must be at least 1000ms (1 second).');
        }
      }
    }

    if (cfg.timeoutOptions?.timeoutMs !== undefined) {
      if (typeof cfg.timeoutOptions.timeoutMs !== 'number' || cfg.timeoutOptions.timeoutMs < 1000) {
        errors.push('Timeout limit must be at least 1000ms.');
      }
    }

    if (cfg.stabilizationOptions?.additionalWaitMs !== undefined) {
      if (typeof cfg.stabilizationOptions.additionalWaitMs !== 'number' || cfg.stabilizationOptions.additionalWaitMs < 0) {
        errors.push('Additional wait time cannot be negative.');
      }
    }
  }

  if (input.devicePresetId) {
    if (input.devicePresetId.startsWith('unsupported_')) {
      errors.push(`Unsupported device preset: '${input.devicePresetId}'.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
