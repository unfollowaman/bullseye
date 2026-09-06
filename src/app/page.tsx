'use client';

import React, { useEffect, useState } from 'react';
import { CaptureControllerStatus } from '@/capture/types';
import { CaptureForm } from '@/components/CaptureForm';

export default function HomePage() {
  const [systemStatus, setSystemStatus] = useState<CaptureControllerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/capture/status');
        if (res.ok) {
          const data: CaptureControllerStatus = await res.json();
          setSystemStatus(data);
        }
      } catch {
        // Ignore background health check errors
      } finally {
        setStatusLoading(false);
      }
    }
    checkStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Bullseye Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Local-first website screenshots and WebM screen recording engine.
            </p>
          </div>

          {/* System Status Widget */}
          <div
            data-testid="system-status-card"
            className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-sm flex items-center gap-3 self-start sm:self-auto"
          >
            <div className="font-semibold text-gray-700">System Status:</div>
            {statusLoading ? (
              <span className="text-gray-400">Checking...</span>
            ) : systemStatus ? (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    systemStatus.ready ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="font-medium text-gray-800">
                  {systemStatus.ready ? 'Ready' : 'Unavailable'}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  Active: <strong>{systemStatus.activeCaptures}</strong>
                </span>
              </div>
            ) : (
              <span className="text-red-500 font-medium">Offline</span>
            )}
          </div>
        </header>

        {/* Main Capture Form & Results */}
        <section data-testid="main-capture-section">
          <CaptureForm />
        </section>
      </div>
    </main>
  );
}
