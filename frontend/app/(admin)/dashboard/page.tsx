'use client';

import { useDashboardViewModel } from '@/hooks/useDashboardViewModel';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface KpiCardProps {
  label: string;
  value: number | string;
  iconBg: string;
  icon: React.ReactNode;
  description?: string;
}

function KpiCard({ label, value, iconBg, icon, description }: KpiCardProps) {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[var(--color-neutral-500)]">{label}</p>
        <div className={`w-10 h-10 rounded-[var(--radius-lg)] ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-[var(--color-neutral-900)]">{value}</p>
      {description && (
        <p className="text-xs text-[var(--color-neutral-500)] mt-1">{description}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { stats, isLoading, error, refresh } = useDashboardViewModel();

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">대시보드</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">VOC 현황 및 통계</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-50)] disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-lg)]" role="alert">
          <svg className="w-5 h-5 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-[var(--color-danger)]">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !stats ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" label="통계 불러오는 중" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <KpiCard
              label="총 대화"
              value={stats?.total_conversations ?? 0}
              iconBg="bg-[var(--color-primary-light)]"
              icon={
                <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              }
            />
            <KpiCard
              label="진행 중"
              value={stats?.open_conversations ?? 0}
              iconBg="bg-[var(--color-success-light)]"
              icon={
                <svg className="w-5 h-5 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KpiCard
              label="에스컬레이션"
              value={stats?.escalated_conversations ?? 0}
              iconBg="bg-[var(--color-warning-light)]"
              icon={
                <svg className="w-5 h-5 text-[var(--color-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <KpiCard
              label="해결됨"
              value={stats?.resolved_conversations ?? 0}
              iconBg="bg-[var(--color-neutral-100)]"
              icon={
                <svg className="w-5 h-5 text-[var(--color-neutral-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 13l4 4L19 7" />
                </svg>
              }
            />
          </div>

          {/* Additional stats row */}
          {stats && (stats.avg_resolution_time_minutes !== undefined || stats.ai_resolution_rate !== undefined) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {stats.avg_resolution_time_minutes !== undefined && (
                <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-6 shadow-sm">
                  <p className="text-sm font-medium text-[var(--color-neutral-500)] mb-2">평균 해결 시간</p>
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                    {stats.avg_resolution_time_minutes.toFixed(1)}분
                  </p>
                </div>
              )}
              {stats.ai_resolution_rate !== undefined && (
                <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-6 shadow-sm">
                  <p className="text-sm font-medium text-[var(--color-neutral-500)] mb-2">AI 해결률</p>
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)]">
                    {(stats.ai_resolution_rate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart placeholder */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-8 shadow-sm">
            <p className="text-sm font-semibold text-[var(--color-neutral-700)] mb-2">대화 추이</p>
            <div className="flex items-center justify-center h-48 bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] border border-dashed border-[var(--color-neutral-300)]">
              <div className="text-center">
                <svg className="w-10 h-10 text-[var(--color-neutral-300)] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm text-[var(--color-neutral-400)]">
                  차트 영역 — Phase 4에서 Recharts 연동
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
