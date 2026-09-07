'use client';

import React, { useState } from 'react';
import { CaptureAction, ActionType } from '@/capture/types';

interface ActionEditorProps {
  actions: CaptureAction[];
  onChange: (actions: CaptureAction[]) => void;
  disabled?: boolean;
}

export const ActionEditor: React.FC<ActionEditorProps> = ({
  actions,
  onChange,
  disabled = false,
}) => {
  const [selectedType, setSelectedType] = useState<ActionType>('wait');

  const addAction = () => {
    let newAction: CaptureAction;

    switch (selectedType) {
      case 'wait':
        newAction = { type: 'wait', durationMs: 1000 };
        break;
      case 'scroll':
        newAction = { type: 'scroll', y: 500 };
        break;
      case 'smooth_scroll':
        newAction = { type: 'smooth_scroll', y: 500, durationMs: 1000 };
        break;
      case 'mouse_move':
        newAction = { type: 'mouse_move', x: 100, y: 100 };
        break;
      case 'click':
        newAction = { type: 'click', selector: 'button' };
        break;
      case 'hover':
        newAction = { type: 'hover', selector: 'a' };
        break;
      case 'type_text':
        newAction = { type: 'type_text', selector: 'input', text: 'Hello' };
        break;
      case 'key_press':
        newAction = { type: 'key_press', key: 'Enter' };
        break;
      default:
        newAction = { type: 'wait', durationMs: 1000 };
    }

    onChange([...actions, newAction]);
  };

  const removeAction = (index: number) => {
    const next = [...actions];
    next.splice(index, 1);
    onChange(next);
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === actions.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...actions];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  const updateActionParam = (
    index: number,
    field: string,
    value: string | number | boolean | undefined
  ) => {
    const next = [...actions];
    const current = { ...next[index] } as Record<string, unknown>;
    if (value === '' || value === undefined) {
      delete current[field];
    } else {
      current[field] = value;
    }
    next[index] = current as unknown as CaptureAction;
    onChange(next);
  };

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">Action Sequence ({actions.length})</h4>
        <div className="flex items-center gap-2">
          <select
            data-testid="add-action-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ActionType)}
            disabled={disabled}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="wait">Wait</option>
            <option value="scroll">Scroll</option>
            <option value="smooth_scroll">Smooth Scroll</option>
            <option value="mouse_move">Mouse Move</option>
            <option value="click">Click</option>
            <option value="hover">Hover</option>
            <option value="type_text">Type Text</option>
            <option value="key_press">Key Press</option>
          </select>
          <button
            type="button"
            data-testid="add-action-btn"
            onClick={addAction}
            disabled={disabled}
            className="text-xs bg-blue-600 text-white font-medium px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 transition"
          >
            + Add Action
          </button>
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-500 italic bg-white border border-dashed border-gray-200 rounded">
          No actions added yet. Execution will capture target directly.
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div
              key={index}
              data-testid={`action-item-${index}`}
              className="bg-white border border-gray-200 rounded p-3 text-xs space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                  #{index + 1} - {action.type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid={`action-move-up-${index}`}
                    onClick={() => moveAction(index, 'up')}
                    disabled={disabled || index === 0}
                    className="px-1.5 py-0.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    title="Move Up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    data-testid={`action-move-down-${index}`}
                    onClick={() => moveAction(index, 'down')}
                    disabled={disabled || index === actions.length - 1}
                    className="px-1.5 py-0.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    title="Move Down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    data-testid={`action-remove-${index}`}
                    onClick={() => removeAction(index)}
                    disabled={disabled}
                    className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 ml-1 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Parameter Editor based on Action Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {action.type === 'wait' && (
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-0.5">Duration (ms)</label>
                    <input
                      type="number"
                      data-testid={`action-${index}-durationMs`}
                      value={action.durationMs ?? 1000}
                      onChange={(e) =>
                        updateActionParam(index, 'durationMs', parseInt(e.target.value, 10) || 0)
                      }
                      disabled={disabled}
                      className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {(action.type === 'scroll' || action.type === 'smooth_scroll') && (
                  <>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Scroll Y (px)</label>
                      <input
                        type="number"
                        data-testid={`action-${index}-y`}
                        value={action.y ?? 0}
                        onChange={(e) =>
                          updateActionParam(index, 'y', parseInt(e.target.value, 10) || 0)
                        }
                        disabled={disabled}
                        className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Scroll X (px)</label>
                      <input
                        type="number"
                        data-testid={`action-${index}-x`}
                        value={action.x ?? 0}
                        onChange={(e) =>
                          updateActionParam(index, 'x', parseInt(e.target.value, 10) || 0)
                        }
                        disabled={disabled}
                        className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {action.type === 'smooth_scroll' && (
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">Duration (ms)</label>
                        <input
                          type="number"
                          data-testid={`action-${index}-durationMs`}
                          value={action.durationMs ?? 1000}
                          onChange={(e) =>
                            updateActionParam(index, 'durationMs', parseInt(e.target.value, 10) || 0)
                          }
                          disabled={disabled}
                          className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </>
                )}

                {action.type === 'mouse_move' && (
                  <>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">X Position (px)</label>
                      <input
                        type="number"
                        data-testid={`action-${index}-x`}
                        value={action.x ?? 0}
                        onChange={(e) =>
                          updateActionParam(index, 'x', parseInt(e.target.value, 10) || 0)
                        }
                        disabled={disabled}
                        className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">Y Position (px)</label>
                      <input
                        type="number"
                        data-testid={`action-${index}-y`}
                        value={action.y ?? 0}
                        onChange={(e) =>
                          updateActionParam(index, 'y', parseInt(e.target.value, 10) || 0)
                        }
                        disabled={disabled}
                        className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {(action.type === 'click' || action.type === 'hover' || action.type === 'type_text') && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-gray-500 mb-0.5">CSS Selector</label>
                    <input
                      type="text"
                      data-testid={`action-${index}-selector`}
                      value={action.selector ?? ''}
                      onChange={(e) => updateActionParam(index, 'selector', e.target.value)}
                      placeholder="#element-id or .button-class"
                      disabled={disabled}
                      className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {action.type === 'type_text' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-gray-500 mb-0.5">Text to Type</label>
                    <input
                      type="text"
                      data-testid={`action-${index}-text`}
                      value={action.text ?? ''}
                      onChange={(e) => updateActionParam(index, 'text', e.target.value)}
                      placeholder="Type text..."
                      disabled={disabled}
                      className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {action.type === 'key_press' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-gray-500 mb-0.5">Keyboard Key</label>
                    <input
                      type="text"
                      data-testid={`action-${index}-key`}
                      value={action.key ?? ''}
                      onChange={(e) => updateActionParam(index, 'key', e.target.value)}
                      placeholder="Enter, Tab, Escape, ArrowDown..."
                      disabled={disabled}
                      className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
