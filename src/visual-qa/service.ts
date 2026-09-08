import {
  visualQAEngine,
  VisualQAEngine,
} from './engine';
import {
  visualQARepository,
  VisualQARepository,
} from './repository';
import {
  ResolvedVisualQAConfig,
  VisualQACapabilities,
  VisualQAConfig,
  VisualQAResult,
} from './types';
import { validateVisualQAConfig } from './validator';

export class VisualQAService {
  private engine: VisualQAEngine;
  private repo: VisualQARepository;

  constructor(engine?: VisualQAEngine, repo?: VisualQARepository) {
    this.engine = engine || visualQAEngine;
    this.repo = repo || visualQARepository;
  }

  public async compare(
    config: VisualQAConfig,
    options?: { signal?: AbortSignal }
  ): Promise<VisualQAResult> {
    const result = await this.engine.compare(config, options);

    try {
      this.repo.save(result);
    } catch (err: unknown) {
      console.error('Failed to persist Visual QA result in database:', err);
      result.warnings.push(
        `Persistence warning: comparison succeeded but failed to save in database: ${
          (err as Error).message
        }`
      );
    }

    return result;
  }

  public getComparisonById(id: string): VisualQAResult | null {
    return this.repo.getById(id);
  }

  public listComparisons(filter?: {
    baselineCaptureId?: string;
    currentCaptureId?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }): VisualQAResult[] {
    return this.repo.getAll(filter);
  }

  public validateConfig(rawConfig: unknown) {
    return validateVisualQAConfig(rawConfig);
  }

  public getCapabilities(): VisualQACapabilities {
    const defaultConfig: ResolvedVisualQAConfig = {
      baselineAssetPath: '',
      currentAssetPath: '',
      comparisonMode: 'all',
      pixelTolerance: 10,
      thresholdPercent: 0,
      diffColor: '#ff00ff',
      overlayOpacity: 0.5,
      outputFormat: 'png',
      generateDiff: true,
      generateOverlay: true,
      metadata: {},
    };

    return {
      supportedModes: ['pixel', 'overlay', 'diff', 'all'],
      supportedFormats: ['png', 'jpeg', 'webp'],
      defaultConfig,
    };
  }

  public deleteComparison(id: string): boolean {
    return this.repo.delete(id);
  }
}

const globalForVisualQAService = globalThis as unknown as {
  visualQAService: VisualQAService | undefined;
};

export const visualQAService =
  globalForVisualQAService.visualQAService ?? new VisualQAService();

if (process.env.NODE_ENV !== 'production') {
  globalForVisualQAService.visualQAService = visualQAService;
}
