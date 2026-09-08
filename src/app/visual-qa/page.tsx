'use client';

import React, { useEffect, useState } from 'react';
import { CaptureControllerStatus } from '@/capture/types';
import { Navigation } from '@/components/Navigation';
import { VisualQAManager } from '@/components/visual-qa/VisualQAManager';

export default function VisualQAPage() {
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
        // Ignore health check error
      } finally {
        setStatusLoading(false);
      }
    }
    checkStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <Navigation
          systemStatus={systemStatus}
          statusLoading={statusLoading}
          activeTab="visual-qa"
        />
        <VisualQAManager />
      </div>
    </main>
  );
}
