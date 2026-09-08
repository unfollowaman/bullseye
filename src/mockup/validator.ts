import {
  MockupBackground,
  MockupConfig,
  MockupOutputFormat,
  MockupType,
} from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedConfig?: MockupConfig;
}

const SUPPORTED_TYPES: MockupType[] = ['browser', 'laptop', 'phone', 'presentation'];
const SUPPORTED_FORMATS: MockupOutputFormat[] = ['png', 'jpeg', 'webp'];

export function validateMockupConfig(config: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: ['Configuration must be a non-null object.'],
      warnings: [],
    };
  }

  const raw = config as Partial<MockupConfig>;

  if (!raw.type || !SUPPORTED_TYPES.includes(raw.type as MockupType)) {
    errors.push(
      `Invalid mockup type: '${raw.type}'. Must be one of: ${SUPPORTED_TYPES.join(', ')}.`
    );
  }

  if (!raw.sourceAssetPath || typeof raw.sourceAssetPath !== 'string' || !raw.sourceAssetPath.trim()) {
    errors.push('Missing or invalid sourceAssetPath. Must be a non-empty string.');
  }

  const outputFormat: MockupOutputFormat = raw.outputFormat || 'png';
  if (raw.outputFormat && !SUPPORTED_FORMATS.includes(raw.outputFormat)) {
    errors.push(
      `Invalid outputFormat: '${raw.outputFormat}'. Must be one of: ${SUPPORTED_FORMATS.join(', ')}.`
    );
  }

  let width = raw.width;
  let height = raw.height;

  if (width !== undefined) {
    if (typeof width !== 'number' || isNaN(width) || width <= 0 || width > 8192) {
      errors.push('Width must be a positive integer up to 8192 pixels.');
    } else {
      width = Math.round(width);
    }
  }

  if (height !== undefined) {
    if (typeof height !== 'number' || isNaN(height) || height <= 0 || height > 8192) {
      errors.push('Height must be a positive integer up to 8192 pixels.');
    } else {
      height = Math.round(height);
    }
  }

  let padding = raw.padding;
  if (padding !== undefined) {
    if (typeof padding !== 'number' || isNaN(padding) || padding < 0 || padding > 500) {
      errors.push('Padding must be a non-negative number up to 500 pixels.');
    } else {
      padding = Math.round(padding);
    }
  }

  if (raw.fitMode && !['cover', 'contain', 'fill'].includes(raw.fitMode)) {
    errors.push(`Invalid fitMode: '${raw.fitMode}'. Must be 'cover', 'contain', or 'fill'.`);
  }

  let bg: MockupBackground | undefined = raw.background;
  if (bg) {
    if (typeof bg !== 'object' || !['solid', 'gradient', 'transparent'].includes(bg.type)) {
      errors.push("Invalid background configuration. Type must be 'solid', 'gradient', or 'transparent'.");
    } else if (bg.type === 'solid' && (!bg.color || typeof bg.color !== 'string')) {
      errors.push("Solid background requires a valid 'color' string.");
    } else if (bg.type === 'gradient') {
      if (!bg.startColor || typeof bg.startColor !== 'string') {
        errors.push("Gradient background requires 'startColor'.");
      }
      if (!bg.stopColor || typeof bg.stopColor !== 'string') {
        errors.push("Gradient background requires 'stopColor'.");
      }
    }
  } else {
    if (raw.type === 'phone' || raw.type === 'laptop') {
      bg = { type: 'gradient', startColor: '#4f46e5', stopColor: '#06b6d4', angle: 135 };
    } else if (raw.type === 'presentation') {
      bg = { type: 'gradient', startColor: '#1e293b', stopColor: '#0f172a', angle: 135 };
    } else {
      bg = { type: 'solid', color: '#0f172a' };
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const sanitizedConfig: MockupConfig = {
    type: raw.type as MockupType,
    sourceAssetPath: raw.sourceAssetPath!.trim(),
    sourceCaptureId: raw.sourceCaptureId,
    outputFormat,
    outputDir: raw.outputDir,
    outputFilename: raw.outputFilename,
    width,
    height,
    padding,
    scale: raw.scale !== undefined && !isNaN(raw.scale) ? Math.max(0.1, Math.min(5.0, raw.scale)) : 1.0,
    fitMode: raw.fitMode || 'cover',
    background: bg,
    visualOptions: {
      shadow: raw.visualOptions?.shadow !== false,
      shadowBlur: raw.visualOptions?.shadowBlur,
      shadowOpacity: raw.visualOptions?.shadowOpacity,
      borderRadius: raw.visualOptions?.borderRadius,
      browserTitle: raw.visualOptions?.browserTitle,
      browserUrl: raw.visualOptions?.browserUrl,
      showWindowControls: raw.visualOptions?.showWindowControls !== false,
      deviceColor: raw.visualOptions?.deviceColor,
    },
  };

  return {
    valid: true,
    errors: [],
    warnings,
    sanitizedConfig,
  };
}
