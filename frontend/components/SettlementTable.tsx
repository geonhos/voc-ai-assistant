'use client';

import type { SettlementData } from '@/lib/types';

interface SettlementTableProps {
  data: SettlementData | SettlementData[];
}

function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();

  const config: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETED: { bg: 'bg-[var(--color-success-light)] border border-[var(--color-success-border)]', text: 'text-[var(--color-success)]', label: '완료' },
    PENDING: { bg: 'bg-[var(--color-primary-light)] border border-[var(--color-primary)]', text: 'text-[var(--color-primary)]', label: '대기' },
    DELAYED: { bg: 'bg-[var(--color-danger-light)] border border-[var(--color-danger)]', text: 'text-[var(--color-danger)]', label: '지연' },
  };

  const style = config[upper] ?? {
    bg: 'bg-[var(--color-warning-light)] border border-[var(--color-warning)]',
    text: 'text-[var(--color-warning)]',
    label: status,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function SettlementRow({ row }: { row: SettlementData }) {
  return (
    <tr className="border-b border-[var(--color-neutral-100)] last:border-0">
      <td className="px-3 py-2.5 text-xs text-[var(--color-neutral-700)] whitespace-nowrap">{row.settlement_date}</td>
      <td className="px-3 py-2.5 text-xs text-right font-medium text-[var(--color-neutral-900)] whitespace-nowrap">
        {formatAmount(row.total_amount)}
      </td>
      <td className="px-3 py-2.5 text-xs text-right text-[var(--color-danger)] whitespace-nowrap">
        -{formatAmount(row.fee_amount)}
      </td>
      <td className="px-3 py-2.5 text-xs text-right font-semibold text-[var(--color-primary)] whitespace-nowrap">
        {formatAmount(row.net_amount)}
      </td>
      <td className="px-3 py-2.5 text-xs text-right text-[var(--color-neutral-700)] whitespace-nowrap">
        {row.transaction_count.toLocaleString('ko-KR')}건
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

export function SettlementTable({ data }: SettlementTableProps) {
  const rows = Array.isArray(data) ? data : [data];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[var(--color-neutral-200)]">
        <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-semibold text-[var(--color-neutral-900)]">정산 내역</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-[var(--color-neutral-50)]">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">정산일</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">총 금액</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">수수료</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">순 정산액</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">건수</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, idx) => (
              <SettlementRow key={`${row.settlement_date}-${idx}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
