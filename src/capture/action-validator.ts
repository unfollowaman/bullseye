import { ActionType } from './action-types';

export interface ActionValidationResult {
  valid: boolean;
  errors: string[];
}

const SUPPORTED_ACTION_TYPES: ActionType[] = [
  'wait',
  'scroll',
  'smooth_scroll',
  'smoothScroll',
  'mouse_move',
  'mouseMove',
  'click',
  'hover',
  'type_text',
  'typeText',
  'type',
  'key_press',
  'keyPress',
  'keyboard_press',
];

export const MAX_WAIT_DURATION_MS = 60000;

export function validateAction(action: unknown, index: number = 0): ActionValidationResult {
  const errors: string[] = [];
  const prefix = `Action[${index}]`;

  if (!action || typeof action !== 'object') {
    return {
      valid: false,
      errors: [`${prefix} must be an object`],
    };
  }

  const act = action as Record<string, unknown>;

  if (!act.type || typeof act.type !== 'string') {
    return {
      valid: false,
      errors: [`${prefix} requires a valid 'type' string property`],
    };
  }

  const type = act.type as ActionType;
  if (!SUPPORTED_ACTION_TYPES.includes(type)) {
    return {
      valid: false,
      errors: [`${prefix} has unsupported type '${act.type}'. Supported actions: wait, scroll, smooth_scroll, mouse_move, click, hover, type_text, key_press`],
    };
  }

  // Validate optional actionTimeoutMs
  if (act.actionTimeoutMs !== undefined) {
    if (typeof act.actionTimeoutMs !== 'number' || act.actionTimeoutMs <= 0 || isNaN(act.actionTimeoutMs)) {
      errors.push(`${prefix} (${type}) 'actionTimeoutMs' must be a positive number`);
    }
  }

  switch (type) {
    case 'wait': {
      if (typeof act.durationMs !== 'number' || isNaN(act.durationMs)) {
        errors.push(`${prefix} (wait) requires numeric 'durationMs'`);
      } else if (act.durationMs < 0) {
        errors.push(`${prefix} (wait) 'durationMs' cannot be negative`);
      } else if (act.durationMs > MAX_WAIT_DURATION_MS) {
        errors.push(`${prefix} (wait) 'durationMs' exceeds maximum limit of ${MAX_WAIT_DURATION_MS}ms`);
      }
      break;
    }

    case 'scroll': {
      if (typeof act.y !== 'number' || isNaN(act.y) || !isFinite(act.y)) {
        errors.push(`${prefix} (scroll) requires numeric 'y' scroll distance/offset`);
      }
      if (act.x !== undefined) {
        if (typeof act.x !== 'number' || isNaN(act.x) || !isFinite(act.x)) {
          errors.push(`${prefix} (scroll) 'x' must be a finite number if specified`);
        }
      }
      if (act.durationMs !== undefined) {
        if (typeof act.durationMs !== 'number' || act.durationMs < 0 || isNaN(act.durationMs)) {
          errors.push(`${prefix} (scroll) 'durationMs' must be a non-negative number`);
        }
      }
      break;
    }

    case 'smooth_scroll':
    case 'smoothScroll': {
      if (typeof act.y !== 'number' || isNaN(act.y) || !isFinite(act.y)) {
        errors.push(`${prefix} (${type}) requires numeric 'y' scroll distance/offset`);
      }
      if (act.x !== undefined) {
        if (typeof act.x !== 'number' || isNaN(act.x) || !isFinite(act.x)) {
          errors.push(`${prefix} (${type}) 'x' must be a finite number if specified`);
        }
      }
      if (act.durationMs !== undefined) {
        if (typeof act.durationMs !== 'number' || act.durationMs < 0 || isNaN(act.durationMs)) {
          errors.push(`${prefix} (${type}) 'durationMs' must be a non-negative number`);
        }
      }
      break;
    }

    case 'mouse_move':
    case 'mouseMove': {
      if (typeof act.x !== 'number' || act.x < 0 || isNaN(act.x)) {
        errors.push(`${prefix} (${type}) requires non-negative numeric 'x' coordinate`);
      }
      if (typeof act.y !== 'number' || act.y < 0 || isNaN(act.y)) {
        errors.push(`${prefix} (${type}) requires non-negative numeric 'y' coordinate`);
      }
      if (act.durationMs !== undefined) {
        if (typeof act.durationMs !== 'number' || act.durationMs < 0 || isNaN(act.durationMs)) {
          errors.push(`${prefix} (${type}) 'durationMs' must be a non-negative number`);
        }
      }
      break;
    }

    case 'click': {
      const hasCoords = typeof act.x === 'number' && typeof act.y === 'number';
      const hasSelector = typeof act.selector === 'string' && act.selector.trim().length > 0;

      if (!hasCoords && !hasSelector) {
        errors.push(`${prefix} (click) requires either 'x' and 'y' numeric coordinates or a non-empty 'selector'`);
      } else {
        if (act.x !== undefined && (typeof act.x !== 'number' || act.x < 0 || isNaN(act.x))) {
          errors.push(`${prefix} (click) 'x' coordinate must be non-negative`);
        }
        if (act.y !== undefined && (typeof act.y !== 'number' || act.y < 0 || isNaN(act.y))) {
          errors.push(`${prefix} (click) 'y' coordinate must be non-negative`);
        }
      }
      if (act.button !== undefined && !['left', 'right', 'middle'].includes(act.button as string)) {
        errors.push(`${prefix} (click) 'button' must be 'left', 'right', or 'middle'`);
      }
      if (act.clickCount !== undefined) {
        if (typeof act.clickCount !== 'number' || act.clickCount <= 0 || !Number.isInteger(act.clickCount)) {
          errors.push(`${prefix} (click) 'clickCount' must be a positive integer`);
        }
      }
      break;
    }

    case 'hover': {
      const hasCoords = typeof act.x === 'number' && typeof act.y === 'number';
      const hasSelector = typeof act.selector === 'string' && act.selector.trim().length > 0;

      if (!hasCoords && !hasSelector) {
        errors.push(`${prefix} (hover) requires either 'x' and 'y' numeric coordinates or a non-empty 'selector'`);
      } else {
        if (act.x !== undefined && (typeof act.x !== 'number' || act.x < 0 || isNaN(act.x))) {
          errors.push(`${prefix} (hover) 'x' coordinate must be non-negative`);
        }
        if (act.y !== undefined && (typeof act.y !== 'number' || act.y < 0 || isNaN(act.y))) {
          errors.push(`${prefix} (hover) 'y' coordinate must be non-negative`);
        }
      }
      if (act.durationMs !== undefined) {
        if (typeof act.durationMs !== 'number' || act.durationMs < 0 || isNaN(act.durationMs)) {
          errors.push(`${prefix} (hover) 'durationMs' must be a non-negative number`);
        }
      }
      break;
    }

    case 'type_text':
    case 'typeText':
    case 'type': {
      if (typeof act.text !== 'string') {
        errors.push(`${prefix} (${type}) requires string 'text'`);
      }
      if (act.delayMs !== undefined) {
        if (typeof act.delayMs !== 'number' || act.delayMs < 0 || isNaN(act.delayMs)) {
          errors.push(`${prefix} (${type}) 'delayMs' must be a non-negative number`);
        }
      }
      break;
    }

    case 'key_press':
    case 'keyPress':
    case 'keyboard_press': {
      if (typeof act.key !== 'string' || act.key.trim().length === 0) {
        errors.push(`${prefix} (${type}) requires non-empty string 'key'`);
      }
      if (act.modifiers !== undefined) {
        if (!Array.isArray(act.modifiers) || act.modifiers.some((m) => typeof m !== 'string')) {
          errors.push(`${prefix} (${type}) 'modifiers' must be an array of strings`);
        }
      }
      if (act.delayMs !== undefined) {
        if (typeof act.delayMs !== 'number' || act.delayMs < 0 || isNaN(act.delayMs)) {
          errors.push(`${prefix} (${type}) 'delayMs' must be a non-negative number`);
        }
      }
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateActions(actions: unknown): ActionValidationResult {
  if (actions === undefined || actions === null) {
    return { valid: true, errors: [] };
  }

  if (!Array.isArray(actions)) {
    return {
      valid: false,
      errors: ['Actions must be an array of action objects'],
    };
  }

  const allErrors: string[] = [];

  actions.forEach((act, idx) => {
    const res = validateAction(act, idx);
    if (!res.valid) {
      allErrors.push(...res.errors);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
