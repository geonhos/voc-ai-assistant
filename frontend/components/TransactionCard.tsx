'use client';

import type { TransactionData } from '@/lib/types';

interface TransactionCardProps {
  data: TransactionData;
}

function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();

  const config: Record<string, { bg: string; text: string; label: string }> = {
    SUCCESS: { bg: 'bg-[var(--color-success-light)] border border-[var(--color-success-border)]', text: 'text-[var(--color-success)]', label: '승인' },
    APPROVED: { bg: 'bg-[var(--color-success-light)] border border-[var(--color-success-border)]', text: 'text-[var(--color-success)]', label: '승인' },
    FAIL: { bg: 'bg-[var(--color-danger-light)] border border-[var(--color-danger)]', text: 'text-[var(--color-danger)]', label: '실패' },
    FAILED: { bg: 'bg-[var(--color-danger-light)] border border-[var(--color-danger)]', text: 'text-[var(--color-danger)]', label: '실패' },
    CANCEL: { bg: 'bg-[var(--color-warning-light)] border border-[var(--color-warning)]', text: 'text-[var(--color-warning)]', label: '취소' },
    CANCELLED: { bg: 'bg-[var(--color-warning-light)] border border-[var(--color-warning)]', text: 'text-[var(--color-warning)]', label: '취소' },
  };

  const style = config[upper] ?? {
    bg: 'bg-[var(--color-neutral-100)] border border-[var(--color-neutral-300)]',
    text: 'text-[var(--color-neutral-700)]',
    label: status,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function TransactionCard({ data }: TransactionCardProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--color-neutral-200)]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--color-neutral-900)]">거래 정보</span>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Amount */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[var(--color-neutral-900)]">
            {data.amount.toLocaleString('ko-KR')}
          </span>
          <span className="text-base font-medium text-[var(--color-neutral-700)]">원</span>
        </div>

        {/* TID */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">거래 ID</p>
            <p className="font-mono text-xs text-[var(--color-neutral-900)] break-all">{data.tid}</p>
          </div>

          <div>
            <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">결제 수단</p>
            <p className="text-sm text-[var(--color-neutral-900)]">{data.payment_method}</p>
          </div>

          {data.card_company && (
            <div>
              <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">카드사</p>
              <p className="text-sm text-[var(--color-neutral-900)]">{data.card_company}</p>
            </div>
          )}

          {data.card_number_masked && (
            <div>
              <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">카드번호</p>
              <p className="font-mono text-sm text-[var(--color-neutral-900)]">{data.card_number_masked}</p>
            </div>
          )}

          {data.customer_name && (
            <div>
              <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">고객명</p>
              <p className="text-sm text-[var(--color-neutral-900)]">{data.customer_name}</p>
            </div>
          )}

          {data.order_id && (
            <div>
              <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">주문번호</p>
              <p className="font-mono text-xs text-[var(--color-neutral-900)]">{data.order_id}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">거래 시각</p>
            <p className="text-xs text-[var(--color-neutral-900)]">{formatDateTime(data.created_at)}</p>
          </div>

          {data.approved_at && (
            <div>
              <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">승인 시각</p>
              <p className="text-xs text-[var(--color-neutral-900)]">{formatDateTime(data.approved_at)}</p>
            </div>
          )}

          {data.cancelled_at && (
            <div>
              <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">취소 시각</p>
              <p className="text-xs text-[var(--color-neutral-900)]">{formatDateTime(data.cancelled_at)}</p>
            </div>
          )}
        </div>

        {/* Error info */}
        {(data.error_code || data.error_message) && (
          <div className="mt-2 px-3 py-2.5 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)]">
            {data.error_code && (
              <p className="text-xs font-semibold text-[var(--color-danger)] mb-0.5">
                오류 코드: {data.error_code}
              </p>
            )}
            {data.error_message && (
              <p className="text-xs text-[var(--color-danger)]">{data.error_message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
