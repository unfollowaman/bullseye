import { PresetRepository, presetRepository } from './repository';
import { validateCapturePresetInput } from './validator';
import {
  CapturePreset,
  CreateCapturePresetInput,
  UpdateCapturePresetInput,
  PresetValidationResult,
  DevicePreset,
} from './types';
import { getBuiltInDevicePresets, getBuiltInDevicePresetById } from './devices';

export class PresetService {
  private repo: PresetRepository;

  constructor(customRepo?: PresetRepository) {
    this.repo = customRepo || presetRepository;
  }

  public getAllDevicePresets(): DevicePreset[] {
    return getBuiltInDevicePresets();
  }

  public getDevicePresetById(id: string): DevicePreset | undefined {
    return getBuiltInDevicePresetById(id);
  }

  public getAllCapturePresets(): CapturePreset[] {
    return this.repo.findAll();
  }

  public getCapturePresetById(id: string): CapturePreset | undefined {
    return this.repo.findById(id);
  }

  public createCapturePreset(input: CreateCapturePresetInput): {
    preset?: CapturePreset;
    validation: PresetValidationResult;
  } {
    const validation = validateCapturePresetInput(input, true);
    if (!validation.valid) {
      return { validation };
    }

    const preset = this.repo.create(input);
    return { preset, validation: { valid: true, errors: [] } };
  }

  public updateCapturePreset(
    id: string,
    input: UpdateCapturePresetInput
  ): { preset?: CapturePreset; validation: PresetValidationResult; error?: string } {
    const existing = this.repo.findById(id);
    if (!existing) {
      return {
        validation: { valid: false, errors: [`Preset '${id}' not found.`] },
        error: `Preset '${id}' not found.`,
      };
    }

    if (existing.isBuiltIn) {
      return {
        validation: {
          valid: false,
          errors: [`Built-in preset '${existing.name}' cannot be modified. Duplicate it first.`],
        },
        error: `Built-in preset '${existing.name}' cannot be modified. Duplicate it first.`,
      };
    }

    const validation = validateCapturePresetInput(input, false);
    if (!validation.valid) {
      return { validation };
    }

    const preset = this.repo.update(id, input);
    return { preset, validation: { valid: true, errors: [] } };
  }

  public deleteCapturePreset(id: string): { success: boolean; error?: string } {
    try {
      const deleted = this.repo.delete(id);
      return { success: deleted };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      return { success: false, error: msg };
    }
  }

  public duplicateCapturePreset(
    id: string,
    newName?: string
  ): { preset?: CapturePreset; error?: string } {
    try {
      const preset = this.repo.duplicate(id, newName);
      return { preset };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Duplication failed';
      return { error: msg };
    }
  }
}

export const presetService = new PresetService();
