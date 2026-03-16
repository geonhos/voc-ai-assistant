'use client';

import type { ApiLogData } from '@/lib/types';

interface ApiLogTableProps {
  data: ApiLogData | ApiLogData[];
}

function MethodBadge({ method }: { method: string }) {
  const upper = method.toUpperCase();

  const config: Record<string, string> = {
    GET: 'bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-border)]',
    POST: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]',
    PUT: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning)]',
    PATCH: 'bg-orange-50 text-orange-600 border border-orange-300',
    DELETE: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[var(--color-danger)]',
  };

  const cls = config[upper] ?? 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] border border-[var(--color-neutral-300)]';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>
      {upper}
    </span>
  );
}

function StatusCode({ code }: { code: number }) {
  let cls = 'text-[var(--color-success)]';
  if (code >= 400 && code < 500) cls = 'text-[var(--color-warning)]';
  if (code >= 500) cls = 'text-[var(--color-danger)]';

  return <span className={`font-mono text-xs font-semibold ${cls}`}>{code}</span>;
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function ApiLogRow({ log }: { log: ApiLogData }) {
  return (
    <>
      <tr className="border-b border-[var(--color-neutral-100)]">
        <td className="px-3 py-2 whitespace-nowrap">
          <MethodBadge method={log.method} />
        </td>
        <td className="px-3 py-2 text-xs font-mono text-[var(--color-neutral-700)] max-w-[180px] truncate">
          {log.endpoint}
        </td>
        <td className="px-3 py-2 text-center whitespace-nowrap">
          <StatusCode code={log.status_code} />
        </td>
        <td className="px-3 py-2 text-right text-xs text-[var(--color-neutral-700)] whitespace-nowrap">
          {log.latency_ms.toLocaleString('ko-KR')}ms
        </td>
        <td className="px-3 py-2 text-xs text-[var(--color-neutral-500)] whitespace-nowrap">
          {formatDateTime(log.created_at)}
        </td>
      </tr>
      {(log.error_code || log.error_message) && (
        <tr className="bg-[var(--color-danger-light)] border-b border-[var(--color-neutral-100)]">
          <td colSpan={5} className="px-3 py-1.5">
            <div className="flex items-center gap-2 text-xs text-[var(--color-danger)]">
              {log.error_code && (
                <span className="font-mono font-semibold">[{log.error_code}]</span>
              )}
              {log.error_message && <span>{log.error_message}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ApiLogTable({ data }: ApiLogTableProps) {
  const logs = Array.isArray(data) ? data : [data];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[var(--color-neutral-200)]">
        <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-semibold text-[var(--color-neutral-900)]">API 로그</span>
        <span className="ml-auto text-xs text-[var(--color-neutral-500)]">{logs.length}건</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-[var(--color-neutral-50)]">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">메서드</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">엔드포인트</th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">상태</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">응답시간</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">시각</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {logs.map((log, idx) => (
              <ApiLogRow key={`${log.endpoint}-${log.created_at}-${idx}`} log={log} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
