'use client';

import type { ClarificationData } from '@/lib/types';

interface ClarificationBubbleProps {
  data: ClarificationData;
  onOptionSelect?: (text: string) => void;
  disabled?: boolean;
}

export function ClarificationBubble({ data, onOptionSelect, disabled }: ClarificationBubbleProps) {
  const { questions, quick_options, accumulated_context, completeness_score, turn_count, max_turns } = data;
  const progress = Math.round(completeness_score * 100);
  const contextEntries = Object.entries(accumulated_context).filter(([key]) => key !== 'last_answer');

  return (
    <div className="mt-2 rounded-[var(--radius-lg)] border border-[var(--color-primary)] border-opacity-30 bg-[var(--color-primary-light)] p-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[var(--color-primary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-semibold text-[var(--color-primary)]">
            추가 정보 수집 중 ({turn_count}/{max_turns})
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div
            className="w-16 h-1.5 bg-[var(--color-neutral-200)] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`완성도 ${progress}%`}
          >
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--color-neutral-500)]">{progress}%</span>
        </div>
      </div>

      {/* Accumulated context tags */}
      {contextEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {contextEntries.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-white text-[10px] font-medium text-[var(--color-neutral-700)] border border-[var(--color-neutral-200)]"
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      {/* Questions with quick options */}
      <div className="space-y-3">
        {questions.map((question, qIdx) => (
          <div key={qIdx}>
            <p className="text-sm text-[var(--color-neutral-800)] mb-2">
              <span className="font-medium">Q{qIdx + 1}.</span> {question}
            </p>
            {quick_options[qIdx] && quick_options[qIdx].length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label={`질문 ${qIdx + 1} 선택지`}>
                {quick_options[qIdx].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onOptionSelect?.(option)}
                    disabled={disabled}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--color-primary)] text-[var(--color-primary)] bg-white hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
