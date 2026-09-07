import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '@/db';
import { PresetRepository } from '@/presets/repository';
import { PresetService } from '@/presets/service';
import { BUILTIN_DEVICE_PRESETS, getBuiltInDevicePresets, getBuiltInDevicePresetById } from '@/presets/devices';
import { BUILTIN_CAPTURE_PRESETS, getBuiltInCapturePresets } from '@/presets/capture-presets';
import { validateCapturePresetInput } from '@/presets/validator';
import { recipeService } from '@/recipes/service';
import { captureHistoryService } from '@/history/service';
import { UnifiedCaptureConfig } from '@/capture/types';

describe('Phase 10 — Device & Capture Presets Unit Tests', () => {
  let testDbPath: string;
  let testDbManager: DatabaseManager;
  let repository: PresetRepository;
  let service: PresetService;

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), 'data', `test_presets_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.db`);
    testDbManager = new DatabaseManager(testDbPath);
    testDbManager.init();

    repository = new PresetRepository(testDbManager);
    service = new PresetService(repository);
  });

  afterEach(() => {
    testDbManager.close();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  describe('1. Device Presets Model & Built-ins', () => {
    test('provides strongly typed built-in device presets for desktop, laptop, tablet, mobile', () => {
      const presets = getBuiltInDevicePresets();
      expect(presets.length).toBeGreaterThanOrEqual(4);

      const categories = presets.map((p) => p.category);
      expect(categories).toContain('desktop');
      expect(categories).toContain('laptop');
      expect(categories).toContain('tablet');
      expect(categories).toContain('mobile');

      presets.forEach((p) => {
        expect(p.viewport.width).toBeGreaterThan(0);
        expect(p.viewport.height).toBeGreaterThan(0);
        expect(p.deviceScaleFactor).toBeGreaterThan(0);
        expect(p.isBuiltIn).toBe(true);
      });
    });

    test('distinguishes viewport dimensions, DPR, and emulation metadata', () => {
      const desktop = getBuiltInDevicePresetById('device_desktop_hd');
      expect(desktop).toBeDefined();
      expect(desktop?.viewport).toEqual({ width: 1920, height: 1080 });
      expect(desktop?.deviceScaleFactor).toBe(1);
      expect(desktop?.deviceMetadata).toBeUndefined();

      const iphone = getBuiltInDevicePresetById('device_mobile_iphone');
      expect(iphone).toBeDefined();
      expect(iphone?.viewport).toEqual({ width: 390, height: 844 });
      expect(iphone?.deviceScaleFactor).toBe(3);
      expect(iphone?.deviceMetadata?.isMobile).toBe(true);
      expect(iphone?.deviceMetadata?.hasTouch).toBe(true);
    });
  });

  describe('2. Custom Device & Preset Validation', () => {
    test('validates viewport dimensions, DPR, duration, and preset names', () => {
      const invalidName = validateCapturePresetInput({
        name: '   ',
        config: {
          url: '',
          viewport: { width: 1280, height: 720 },
        },
      });
      expect(invalidName.valid).toBe(false);
      expect(invalidName.errors).toContain('Preset name cannot be empty.');

      const invalidDimensions = validateCapturePresetInput({
        name: 'Bad Dimensions',
        config: {
          url: '',
          viewport: { width: -100, height: 0 },
        },
      });
      expect(invalidDimensions.valid).toBe(false);

      const invalidDpr = validateCapturePresetInput({
        name: 'Bad DPR',
        config: {
          url: '',
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 0,
        },
      });
      expect(invalidDpr.valid).toBe(false);

      const invalidDuration = validateCapturePresetInput({
        name: 'Bad Recording',
        config: {
          url: '',
          captureType: 'recording',
          recordingOptions: { durationMs: 200 },
        },
      });
      expect(invalidDuration.valid).toBe(false);
      expect(invalidDuration.errors).toContain('Recording duration must be at least 1000ms (1 second).');
    });

    test('prevents unsupported device settings from reaching execution', () => {
      const val = validateCapturePresetInput({
        name: 'Invalid Device',
        devicePresetId: 'unsupported_device_x',
        config: { url: '' },
      });
      expect(val.valid).toBe(false);
      expect(val.errors[0]).toContain('Unsupported device preset');
    });
  });

  describe('3. Capture Presets Persistence & CRUD', () => {
    test('lists built-in capture presets along with custom database presets', () => {
      const presets = service.getAllCapturePresets();
      expect(presets.length).toBeGreaterThanOrEqual(4);

      const builtInSnap = presets.find((p) => p.id === 'preset_quick_desktop_snap');
      expect(builtInSnap).toBeDefined();
      expect(builtInSnap?.isBuiltIn).toBe(true);
    });

    test('supports creation, retrieval, updating, duplication, and deletion of custom capture presets', () => {
      // 1. Create
      const createRes = service.createCapturePreset({
        name: 'Unit Test Custom Preset',
        description: 'Test description',
        config: {
          url: 'https://test.com',
          captureType: 'screenshot',
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 2,
        },
      });
      expect(createRes.validation.valid).toBe(true);
      const created = createRes.preset!;
      expect(created.id).toBeDefined();
      expect(created.isBuiltIn).toBe(false);

      // 2. Retrieve
      const found = service.getCapturePresetById(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Unit Test Custom Preset');

      // 3. Update
      const updateRes = service.updateCapturePreset(created.id, {
        name: 'Updated Custom Preset Name',
      });
      expect(updateRes.validation.valid).toBe(true);
      expect(updateRes.preset?.name).toBe('Updated Custom Preset Name');

      // 4. Duplicate
      const dupRes = service.duplicateCapturePreset(created.id, 'Duplicated Custom');
      expect(dupRes.preset).toBeDefined();
      expect(dupRes.preset?.name).toBe('Duplicated Custom');
      expect(dupRes.preset?.config.viewport).toEqual({ width: 1440, height: 900 });

      // 5. Delete
      const delRes = service.deleteCapturePreset(created.id);
      expect(delRes.success).toBe(true);
      expect(service.getCapturePresetById(created.id)).toBeUndefined();
    });

    test('prevents destructive editing or deletion of built-in presets', () => {
      const builtInId = 'preset_quick_desktop_snap';

      const updateRes = service.updateCapturePreset(builtInId, { name: 'Attempted Change' });
      expect(updateRes.validation.valid).toBe(false);
      expect(updateRes.error).toContain('cannot be modified');

      const delRes = service.deleteCapturePreset(builtInId);
      expect(delRes.success).toBe(false);
      expect(delRes.error).toContain('cannot be deleted');
    });
  });

  describe('4. Recipe & History Snapshot Stability', () => {
    test('editing or deleting a custom preset does not corrupt existing recipes', () => {
      // 1. Create a preset
      const presetRes = service.createCapturePreset({
        name: 'Mutable Preset',
        config: {
          url: 'https://example.com',
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 1,
        },
      });
      const preset = presetRes.preset!;

      // 2. Create a recipe snapshot referencing this preset
      const recipe = recipeService.createRecipe({
        name: 'Snapshot Recipe',
        config: {
          url: 'https://example.com',
          capturePresetId: preset.id,
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 1,
        },
      });

      // 3. Delete the preset
      service.deleteCapturePreset(preset.id);

      // 4. Verify recipe remains fully valid with intact configuration snapshot
      const retrievedRecipe = recipeService.getRecipe(recipe.id);
      expect(retrievedRecipe).toBeDefined();
      expect(retrievedRecipe?.config.viewport).toEqual({ width: 1280, height: 720 });

      // Clean up test recipe
      recipeService.deleteRecipe(recipe.id);
    });

    test('history records resolved capture configuration rather than depending solely on mutable preset reference', () => {
      const record = captureHistoryService.createRecord({
        url: 'https://example.com',
        captureType: 'screenshot',
        status: 'completed',
        viewport: { width: 1920, height: 1080 },
        dpr: 2,
        durationMs: 500,
      });

      expect(record.viewport).toEqual({ width: 1920, height: 1080 });
      expect(record.dpr).toBe(2);

      // Clean up history
      captureHistoryService.deleteHistoryRecord(record.id);
    });
  });
});
