import { dbManager, DatabaseManager } from '@/db';
import { CapturePreset, CreateCapturePresetInput, UpdateCapturePresetInput } from './types';
import { getBuiltInCapturePresets, getBuiltInCapturePresetById } from './capture-presets';

export interface RawDbPreset {
  id: string;
  name: string;
  description: string | null;
  is_built_in: number;
  device_preset_id: string | null;
  config: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export class PresetRepository {
  private dbManager: DatabaseManager;

  constructor(customDbManager?: DatabaseManager) {
    this.dbManager = customDbManager || dbManager;
  }

  private mapRawToPreset(raw: RawDbPreset): CapturePreset {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description || undefined,
      isBuiltIn: Boolean(raw.is_built_in),
      devicePresetId: raw.device_preset_id || undefined,
      config: JSON.parse(raw.config),
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      version: raw.version,
    };
  }

  public findAll(): CapturePreset[] {
    const db = this.dbManager.getDb();
    const rows = db.prepare('SELECT * FROM capture_presets ORDER BY name ASC').all() as unknown[] as RawDbPreset[];
    const dbPresets = rows.map((r) => this.mapRawToPreset(r));

    // Combine built-in presets and custom db presets
    const builtIns = getBuiltInCapturePresets();
    return [...builtIns, ...dbPresets];
  }

  public findById(id: string): CapturePreset | undefined {
    const builtIn = getBuiltInCapturePresetById(id);
    if (builtIn) return builtIn;

    const db = this.dbManager.getDb();
    const row = db.prepare('SELECT * FROM capture_presets WHERE id = ?').get(id) as RawDbPreset | undefined;
    if (!row) return undefined;

    return this.mapRawToPreset(row);
  }

  public create(input: CreateCapturePresetInput): CapturePreset {
    const db = this.dbManager.getDb();
    const id = `preset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const newPreset: CapturePreset = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      isBuiltIn: false,
      devicePresetId: input.devicePresetId || undefined,
      config: input.config,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    db.prepare(`
      INSERT INTO capture_presets (id, name, description, is_built_in, device_preset_id, config, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newPreset.id,
      newPreset.name,
      newPreset.description || null,
      0,
      newPreset.devicePresetId || null,
      JSON.stringify(newPreset.config),
      newPreset.createdAt,
      newPreset.updatedAt,
      newPreset.version
    );

    return newPreset;
  }

  public update(id: string, input: UpdateCapturePresetInput): CapturePreset {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Capture preset with ID '${id}' not found.`);
    }

    if (existing.isBuiltIn) {
      throw new Error(`Built-in preset '${existing.name}' cannot be modified. Duplicate it to create a customizable preset.`);
    }

    const db = this.dbManager.getDb();
    const now = new Date().toISOString();

    const updatedName = input.name !== undefined ? input.name.trim() : existing.name;
    const updatedDescription = input.description !== undefined ? input.description?.trim() || null : existing.description || null;
    const updatedDevicePresetId = input.devicePresetId !== undefined ? input.devicePresetId || null : existing.devicePresetId || null;
    const updatedConfig = input.config !== undefined ? input.config : existing.config;

    db.prepare(`
      UPDATE capture_presets
      SET name = ?, description = ?, device_preset_id = ?, config = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedName,
      updatedDescription,
      updatedDevicePresetId,
      JSON.stringify(updatedConfig),
      now,
      id
    );

    return this.findById(id)!;
  }

  public delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    if (existing.isBuiltIn) {
      throw new Error(`Built-in preset '${existing.name}' cannot be deleted.`);
    }

    const db = this.dbManager.getDb();
    db.prepare('DELETE FROM capture_presets WHERE id = ?').run(id);
    return true;
  }

  public duplicate(id: string, newName?: string): CapturePreset {
    const source = this.findById(id);
    if (!source) {
      throw new Error(`Capture preset with ID '${id}' not found for duplication.`);
    }

    const nameToUse = newName?.trim() || `${source.name} (Copy)`;
    return this.create({
      name: nameToUse,
      description: source.description,
      devicePresetId: source.devicePresetId,
      config: JSON.parse(JSON.stringify(source.config)),
    });
  }
}

export const presetRepository = new PresetRepository();
