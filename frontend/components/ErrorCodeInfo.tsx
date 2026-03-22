'use client';

import type { ErrorCodeData } from '@/lib/types';

interface ErrorCodeInfoProps {
  data: ErrorCodeData;
}

function SeverityBadge({ severity }: { severity: string }) {
  const upper = severity.toUpperCase();

  const config: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-[var(--color-success-light)] border border-[var(--color-success-border)]', text: 'text-[var(--color-success)]' },
    MEDIUM: { bg: 'bg-[var(--color-warning-light)] border border-[var(--color-warning)]', text: 'text-[var(--color-warning)]' },
    HIGH: { bg: 'bg-orange-50 border border-orange-300', text: 'text-orange-600' },
    CRITICAL: { bg: 'bg-[var(--color-danger-light)] border border-[var(--color-danger)]', text: 'text-[var(--color-danger)]' },
  };

  const style = config[upper] ?? {
    bg: 'bg-[var(--color-neutral-100)] border border-[var(--color-neutral-300)]',
    text: 'text-[var(--color-neutral-700)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {severity}
    </span>
  );
}

export function ErrorCodeInfo({ data }: ErrorCodeInfoProps) {
  const solutionSteps = data.solution
    .split(/\n|(?<=\d\.)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const hasMultipleSteps = solutionSteps.length > 1;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--color-neutral-200)]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--color-neutral-900)]">오류 코드 정보</span>
        </div>
        <SeverityBadge severity={data.severity} />
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-[var(--color-neutral-50)] space-y-3">
        {/* Code + Category */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-base font-bold text-[var(--color-neutral-900)] bg-white border border-[var(--color-neutral-200)] px-3 py-1 rounded-[var(--radius-md)]">
            {data.code}
          </span>
          <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2.5 py-1 rounded-full">
            {data.category}
          </span>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide mb-1">설명</p>
          <p className="text-sm text-[var(--color-neutral-800)] leading-relaxed">{data.description}</p>
        </div>

        {/* Solution */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide mb-1.5">해결 방법</p>
          {hasMultipleSteps ? (
            <ol className="space-y-1.5">
              {solutionSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[var(--color-neutral-800)]">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-neutral-800)] leading-relaxed">{data.solution}</p>
          )}
        </div>
      </div>
    </div>
  );
}
