'use client';

import React, { useEffect, useState } from 'react';
import { CaptureControllerStatus } from '@/capture/types';
import { Navigation } from '@/components/Navigation';
import { RecipeManager } from '@/components/recipes/RecipeManager';

export default function RecipesPage() {
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
      } finally {
        setStatusLoading(false);
      }
    }
    checkStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <Navigation systemStatus={systemStatus} statusLoading={statusLoading} activeTab="recipes" />
        <RecipeManager />
      </div>
    </main>
  );
}
