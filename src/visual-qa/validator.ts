import {
  ResolvedVisualQAConfig,
  VisualQAConfig,
  VisualQAOutputFormat,
  VisualQAValidationResult,
} from './types';

export function validateVisualQAConfig(
  rawConfig: unknown
): VisualQAValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawConfig || typeof rawConfig !== 'object') {
    return {
      valid: false,
      errors: ['Configuration must be a non-null object.'],
      warnings: [],
    };
  }

  const config = rawConfig as Partial<VisualQAConfig>;

  // Baseline asset path
  if (!config.baselineAssetPath || typeof config.baselineAssetPath !== 'string') {
    errors.push('baselineAssetPath is required and must be a string.');
  }

  // Current asset path
  if (!config.currentAssetPath || typeof config.currentAssetPath !== 'string') {
    errors.push('currentAssetPath is required and must be a string.');
  }

  // Comparison mode
  const validModes = ['pixel', 'overlay', 'diff', 'all'];
  let comparisonMode = config.comparisonMode || 'all';
  if (!validModes.includes(comparisonMode)) {
    warnings.push(`Invalid comparisonMode '${config.comparisonMode}'. Falling back to 'all'.`);
    comparisonMode = 'all';
  }

  // Pixel tolerance (0 to 255)
  let pixelTolerance = typeof config.pixelTolerance === 'number' ? config.pixelTolerance : 10;
  if (pixelTolerance < 0 || pixelTolerance > 255 || isNaN(pixelTolerance)) {
    warnings.push(`pixelTolerance must be between 0 and 255. Falling back to 10.`);
    pixelTolerance = 10;
  }

  // Pass threshold percent (0 to 100)
  let thresholdPercent = typeof config.thresholdPercent === 'number' ? config.thresholdPercent : 0;
  if (thresholdPercent < 0 || thresholdPercent > 100 || isNaN(thresholdPercent)) {
    warnings.push(`thresholdPercent must be between 0 and 100. Falling back to 0.0.`);
    thresholdPercent = 0;
  }

  // Diff color (hex format)
  let diffColor = typeof config.diffColor === 'string' ? config.diffColor.trim() : '#ff00ff';
  if (!/^#([0-9a-fA-F]{3}){1,2}$/.test(diffColor)) {
    warnings.push(`Invalid diffColor '${config.diffColor}'. Falling back to '#ff00ff'.`);
    diffColor = '#ff00ff';
  }

  // Overlay opacity (0.0 to 1.0)
  let overlayOpacity = typeof config.overlayOpacity === 'number' ? config.overlayOpacity : 0.5;
  if (overlayOpacity < 0 || overlayOpacity > 1 || isNaN(overlayOpacity)) {
    warnings.push(`overlayOpacity must be between 0.0 and 1.0. Falling back to 0.5.`);
    overlayOpacity = 0.5;
  }

  // Output format
  const validFormats: VisualQAOutputFormat[] = ['png', 'jpeg', 'webp'];
  let outputFormat = config.outputFormat || 'png';
  if (!validFormats.includes(outputFormat)) {
    warnings.push(`Invalid outputFormat '${config.outputFormat}'. Falling back to 'png'.`);
    outputFormat = 'png';
  }

  // Generate diff / overlay logic
  let generateDiff = typeof config.generateDiff === 'boolean' ? config.generateDiff : true;
  let generateOverlay = typeof config.generateOverlay === 'boolean' ? config.generateOverlay : true;

  if (comparisonMode === 'pixel' || comparisonMode === 'diff') {
    generateDiff = config.generateDiff !== false;
    generateOverlay = config.generateOverlay === true;
  } else if (comparisonMode === 'overlay') {
    generateDiff = config.generateDiff === true;
    generateOverlay = config.generateOverlay !== false;
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const sanitizedConfig: ResolvedVisualQAConfig = {
    baselineAssetPath: config.baselineAssetPath!,
    currentAssetPath: config.currentAssetPath!,
    baselineCaptureId: config.baselineCaptureId,
    currentCaptureId: config.currentCaptureId,
    comparisonMode,
    pixelTolerance,
    thresholdPercent,
    diffColor,
    overlayOpacity,
    outputFormat,
    generateDiff,
    generateOverlay,
    outputDir: config.outputDir,
    outputFilenamePrefix: config.outputFilenamePrefix,
    metadata: config.metadata || {},
  };

  return {
    valid: true,
    sanitizedConfig,
    errors: [],
    warnings,
  };
}
