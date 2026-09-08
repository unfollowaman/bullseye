export type ActionType =
  | 'wait'
  | 'pause'
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
  | 'keyboard_press'
  | 'set_cursor_visibility'
  | 'setCursorVisibility';

export type MovementEasing = 'linear' | 'ease-in-out' | 'ease-in' | 'ease-out';

export interface BaseAction {
  type: ActionType;
  actionTimeoutMs?: number;
  postPauseMs?: number;
  pauseMs?: number;
}

export interface WaitAction extends BaseAction {
  type: 'wait' | 'pause';
  durationMs: number;
}

export interface ScrollAction extends BaseAction {
  type: 'scroll';
  x?: number;
  y: number;
  durationMs?: number;
  easing?: MovementEasing;
  smooth?: boolean;
}

export interface SmoothScrollAction extends BaseAction {
  type: 'smooth_scroll' | 'smoothScroll';
  x?: number;
  y: number;
  durationMs?: number;
  easing?: MovementEasing;
}

export interface MouseMoveAction extends BaseAction {
  type: 'mouse_move' | 'mouseMove';
  x: number;
  y: number;
  durationMs?: number;
  easing?: MovementEasing;
  smooth?: boolean;
}

export interface ClickAction extends BaseAction {
  type: 'click';
  x?: number;
  y?: number;
  selector?: string;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  durationMs?: number;
  showIndicator?: boolean;
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

export interface SetCursorVisibilityAction extends BaseAction {
  type: 'set_cursor_visibility' | 'setCursorVisibility';
  visible: boolean;
}

export type CaptureAction =
  | WaitAction
  | ScrollAction
  | SmoothScrollAction
  | MouseMoveAction
  | ClickAction
  | HoverAction
  | TypeTextAction
  | KeyPressAction
  | SetCursorVisibilityAction;

export interface AdvancedRecordingConfig {
  cursorEnabled?: boolean;
  cursorSize?: number;
  cursorStyle?: 'default' | 'dot' | 'pointer' | 'brand';
  cursorSmoothing?: boolean;
  clickIndicatorEnabled?: boolean;
  clickIndicatorSize?: number;
  clickIndicatorDurationMs?: number;
  clickIndicatorColor?: string;
  smoothScrollingEnabled?: boolean;
  actionPacingMs?: number;
  defaultPauseMs?: number;
}

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
  advancedRecordingOptions?: AdvancedRecordingConfig;
}
