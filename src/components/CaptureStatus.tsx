'use client';

import React from 'react';
import { JobStatus } from '@/capture/types';

export type ExtendedJobStatus = JobStatus | 'idle' | 'validating';

export interface CaptureStatusProps {
  status: ExtendedJobStatus;
  progressMessage?: string;
  onCancel?: () => void;
  cancelling?: boolean;
}

export const CaptureStatus: React.FC<CaptureStatusProps> = ({
  status,
  progressMessage,
  onCancel,
  cancelling = false,
}) => {
  if (status === 'idle') {
    return null;
  }

  const getStatusBadgeClass = () => {
    switch (status) {
      case 'validating':
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'validating':
        return 'Validating Options...';
      case 'pending':
        return 'Pending Job Queue...';
      case 'running':
        return 'Capture In Progress...';
      case 'completed':
        return 'Capture Completed Successfully';
      case 'partial':
        return 'Partially Completed';
      case 'failed':
        return 'Capture Failed';
      case 'cancelled':
        return 'Capture Cancelled';
      default:
        return status;
    }
  };

  const isRunningOrPending = status === 'pending' || status === 'running' || status === 'validating';

  return (
    <div
      data-testid="capture-status-container"
      className="p-4 rounded-lg border bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
    >
      <div className="flex items-center gap-3">
        {isRunningOrPending && (
          <div
            data-testid="status-spinner"
            className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span
              data-testid="status-badge"
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass()}`}
            >
              {getStatusLabel()}
            </span>
          </div>
          {progressMessage && (
            <p className="text-gray-600 text-xs mt-1" data-testid="status-progress-message">
              {progressMessage}
            </p>
          )}
        </div>
      </div>

      {isRunningOrPending && onCancel && (
        <button
          type="button"
          data-testid="cancel-capture-button"
          onClick={onCancel}
          disabled={cancelling}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-xs transition-colors disabled:bg-red-300 disabled:cursor-not-allowed flex-shrink-0"
        >
          {cancelling ? 'Cancelling...' : 'Cancel Capture'}
        </button>
      )}
    </div>
  );
};
