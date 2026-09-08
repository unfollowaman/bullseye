import { captureHistoryRepository, CaptureHistoryRepository } from '../history/repository';
import { MockupOutputMetadata } from '../history/types';
import { mockupEngine, MockupEngine } from './engine';
import { mockupRepository, MockupRepository } from './repository';
import { MOCKUP_CAPABILITIES } from './templates';
import {
  MockupCapabilitiesResponse,
  MockupConfig,
  MockupResult,
} from './types';
import { validateMockupConfig } from './validator';

export class MockupService {
  private engine: MockupEngine;
  private repo: MockupRepository;
  private historyRepo: CaptureHistoryRepository;

  constructor(
    engine?: MockupEngine,
    repo?: MockupRepository,
    historyRepo?: CaptureHistoryRepository
  ) {
    this.engine = engine || mockupEngine;
    this.repo = repo || mockupRepository;
    this.historyRepo = historyRepo || captureHistoryRepository;
  }

  public async generateMockup(
    config: MockupConfig,
    options?: { signal?: AbortSignal }
  ): Promise<MockupResult> {
    const result = await this.engine.generateMockup(config, options);

    this.repo.save(result);

    if (result.sourceCaptureId) {
      try {
        const historyRecord = this.historyRepo.getById(result.sourceCaptureId);
        if (historyRecord) {
          const mockupMeta: MockupOutputMetadata = {
            id: result.id,
            mockupType: result.mockupType,
            path: result.generatedAsset.webPath,
            width: result.generatedAsset.width,
            height: result.generatedAsset.height,
            sizeBytes: result.generatedAsset.sizeBytes,
            format: result.generatedAsset.format,
            createdAt: result.createdAt,
          };

          const existingMockups = historyRecord.outputs.mockups || [];
          historyRecord.outputs.mockups = [...existingMockups, mockupMeta];

          this.historyRepo.save(historyRecord);
        }
      } catch (err) {
        console.warn(`Failed to associate mockup with history record '${result.sourceCaptureId}':`, err);
      }
    }

    return result;
  }

  public getMockupById(id: string): MockupResult | null {
    return this.repo.getById(id);
  }

  public listMockups(filter?: { sourceCaptureId?: string; mockupType?: string; limit?: number; offset?: number }): MockupResult[] {
    return this.repo.getAll(filter);
  }

  public getCapabilities(): MockupCapabilitiesResponse {
    return MOCKUP_CAPABILITIES;
  }

  public validateConfig(config: unknown) {
    return validateMockupConfig(config);
  }

  public deleteMockup(id: string): boolean {
    return this.repo.delete(id);
  }
}

const globalForMockupService = globalThis as unknown as {
  mockupService: MockupService | undefined;
};

export const mockupService =
  globalForMockupService.mockupService ?? new MockupService();

if (process.env.NODE_ENV !== 'production') {
  globalForMockupService.mockupService = mockupService;
}
