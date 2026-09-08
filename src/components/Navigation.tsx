'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CaptureControllerStatus } from '@/capture/types';

export type NavTabType = 'capture' | 'projects' | 'recipes' | 'history' | 'mockups' | 'visual-qa';

interface NavigationProps {
  systemStatus?: CaptureControllerStatus | null;
  statusLoading?: boolean;
  activeTab?: NavTabType;
  onTabChange?: (tab: NavTabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  systemStatus,
  statusLoading,
  activeTab,
  onTabChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const currentTab =
    activeTab ||
    (pathname === '/projects' || pathname?.startsWith('/projects/')
      ? 'projects'
      : pathname === '/recipes'
      ? 'recipes'
      : pathname === '/history' || pathname?.startsWith('/history/')
      ? 'history'
      : pathname === '/mockups'
      ? 'mockups'
      : pathname === '/visual-qa'
      ? 'visual-qa'
      : 'capture');

  const handleTabClick = (tab: NavTabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      const targetPath = tab === 'capture' ? '/' : `/${tab}`;
      router.push(targetPath);
    }
  };

  return (
    <header className="space-y-4 border-b border-gray-200 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Bullseye Dashboard
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded border border-blue-200">
              Phase 9
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Local-first website screenshots, recordings, project management & capture history.
          </p>
        </div>

        {/* System Status Widget */}
        {systemStatus !== undefined && (
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
        )}
      </div>

      {/* Global Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold text-gray-600">
        <button
          type="button"
          data-testid="nav-tab-capture"
          onClick={() => handleTabClick('capture')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentTab === 'capture'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          Capture
        </button>
        <button
          type="button"
          data-testid="nav-tab-projects"
          onClick={() => handleTabClick('projects')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentTab === 'projects'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          Projects
        </button>
        <button
          type="button"
          data-testid="nav-tab-recipes"
          onClick={() => handleTabClick('recipes')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentTab === 'recipes'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          Recipes
        </button>
        <button
          type="button"
          data-testid="nav-tab-history"
          onClick={() => handleTabClick('history')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          History
        </button>
        <button
          type="button"
          data-testid="nav-tab-mockups"
          onClick={() => handleTabClick('mockups')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentTab === 'mockups'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          Mockups
        </button>
        <button
          type="button"
          data-testid="nav-tab-visual-qa"
          onClick={() => handleTabClick('visual-qa')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentTab === 'visual-qa'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'hover:text-gray-900 hover:bg-gray-200/50'
          }`}
        >
          Visual QA
        </button>
      </nav>
    </header>
  );
};
