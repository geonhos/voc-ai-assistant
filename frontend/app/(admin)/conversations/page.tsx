'use client';

import { useRouter } from 'next/navigation';
import { useConversationListViewModel } from '@/hooks/useConversationListViewModel';
import { Badge, statusToVariant, statusToLabel } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ConversationStatus } from '@/lib/types';

type StatusFilter = 'ALL' | ConversationStatus;

const FILTER_TABS: { label: string; value: StatusFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: '진행중', value: 'OPEN' },
  { label: '에스컬레이션', value: 'ESCALATED' },
  { label: '해결됨', value: 'RESOLVED' },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ConversationsPage() {
  const router = useRouter();
  const vm = useConversationListViewModel();

  const totalPages = Math.max(1, Math.ceil(vm.total / vm.pageSize));

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">대화 목록</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">
            총 {vm.total}건의 대화
          </p>
        </div>
        <button
          type="button"
          onClick={vm.refresh}
          disabled={vm.isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-50)] disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${vm.isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {/* Error state */}
      {vm.error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-lg)]" role="alert">
          <svg className="w-5 h-5 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-[var(--color-danger)]">{vm.error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-neutral-200)] flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
              placeholder="이름 또는 이메일로 검색"
              className="w-full pl-9 pr-4 py-2 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1">
            {FILTER_TABS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => vm.setStatusFilter(value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors ${
                  vm.statusFilter === value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-200)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {vm.isLoading && vm.conversations.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" label="목록 불러오는 중" />
          </div>
        ) : vm.conversations.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 text-[var(--color-neutral-300)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm text-[var(--color-neutral-500)]">조건에 맞는 대화가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">고객</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">시작 시간</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">메시지</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {vm.conversations.map((conv) => (
                  <tr
                    key={conv.id}
                    onClick={() => router.push(`/conversations/${conv.id}`)}
                    className="hover:bg-[var(--color-neutral-50)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-[var(--color-primary)]">
                            {conv.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-[var(--color-neutral-900)]">
                          {conv.customer_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-500)]">
                      {conv.customer_email}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        label={statusToLabel(conv.status)}
                        variant={statusToVariant(conv.status)}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-500)]">
                      {formatDate(conv.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[var(--color-neutral-700)] font-medium">
                      {conv.message_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {vm.conversations.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
            <p className="text-xs text-[var(--color-neutral-500)]">
              {vm.page * vm.pageSize + 1}–{Math.min((vm.page + 1) * vm.pageSize, vm.total)} / {vm.total}건
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => vm.goToPage(vm.page - 1)}
                disabled={vm.page === 0}
                className="px-3 py-1.5 text-xs font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              <span className="text-xs text-[var(--color-neutral-500)]">
                {vm.page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => vm.goToPage(vm.page + 1)}
                disabled={vm.page >= totalPages - 1}
                className="px-3 py-1.5 text-xs font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
