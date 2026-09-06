export type ActionType =
  | 'wait'
  | 'scroll'
  | 'smooth_scroll'
  | 'smoothScroll'
  | 'mouse_move'
  | 'mouseMove'
  | 'click'
  | 'hover'
  | 'type_text'
  | 'typeText'
  | 'type'
  | 'key_press'
  | 'keyPress'
  | 'keyboard_press';

export interface BaseAction {
  type: ActionType;
  actionTimeoutMs?: number;
}

export interface WaitAction extends BaseAction {
  type: 'wait';
  durationMs: number;
}

export interface ScrollAction extends BaseAction {
  type: 'scroll';
  x?: number;
  y: number;
  durationMs?: number;
}

export interface SmoothScrollAction extends BaseAction {
  type: 'smooth_scroll' | 'smoothScroll';
  x?: number;
  y: number;
  durationMs?: number;
}

export interface MouseMoveAction extends BaseAction {
  type: 'mouse_move' | 'mouseMove';
  x: number;
  y: number;
  durationMs?: number;
}

export interface ClickAction extends BaseAction {
  type: 'click';
  x?: number;
  y?: number;
  selector?: string;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  durationMs?: number;
}

export interface HoverAction extends BaseAction {
  type: 'hover';
  x?: number;
  y?: number;
  selector?: string;
  durationMs?: number;
}

export interface TypeTextAction extends BaseAction {
  type: 'type_text' | 'typeText' | 'type';
  text: string;
  selector?: string;
  delayMs?: number;
}

export interface KeyPressAction extends BaseAction {
  type: 'key_press' | 'keyPress' | 'keyboard_press';
  key: string;
  modifiers?: string[];
  delayMs?: number;
}

export type CaptureAction =
  | WaitAction
  | ScrollAction
  | SmoothScrollAction
  | MouseMoveAction
  | ClickAction
  | HoverAction
  | TypeTextAction
  | KeyPressAction;

export interface ActionDiagnostic {
  index: number;
  actionType: string;
  action: CaptureAction;
  status: 'completed' | 'failed' | 'skipped' | 'cancelled';
  startTime: string;
  completionTime: string;
  durationMs: number;
  error?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  diagnostics: ActionDiagnostic[];
  totalDurationMs: number;
  error?: string;
}

export interface ActionExecutorOptions {
  cancellationToken?: { cancelled: boolean };
  defaultTimeoutMs?: number;
}
