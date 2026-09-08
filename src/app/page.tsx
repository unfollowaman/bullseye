'use client';

import React, { useEffect, useState } from 'react';
import { CaptureControllerStatus } from '@/capture/types';
import { Navigation } from '@/components/Navigation';
import { CaptureForm } from '@/components/CaptureForm';
import { ProjectManager } from '@/components/projects/ProjectManager';
import { RecipeManager } from '@/components/recipes/RecipeManager';
import { HistoryManager } from '@/components/history/HistoryManager';
import { MockupGenerator } from '@/components/mockups/MockupGenerator';

export default function HomePage() {
  const [systemStatus, setSystemStatus] = useState<CaptureControllerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'capture' | 'projects' | 'recipes' | 'history' | 'mockups'>('capture');

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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Header */}
        <Navigation
          systemStatus={systemStatus}
          statusLoading={statusLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === 'capture' && (
          <section data-testid="main-capture-section">
            <CaptureForm />
          </section>
        )}

        {activeTab === 'projects' && (
          <section data-testid="main-projects-section">
            <ProjectManager />
          </section>
        )}

        {activeTab === 'recipes' && (
          <section data-testid="main-recipes-section">
            <RecipeManager />
          </section>
        )}

        {activeTab === 'history' && (
          <section data-testid="main-history-section">
            <HistoryManager />
          </section>
        )}

        {activeTab === 'mockups' && (
          <section data-testid="main-mockups-section">
            <MockupGenerator />
          </section>
        )}
      </div>
    </main>
  );
}
