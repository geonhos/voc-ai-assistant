'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMerchantChatViewModel } from '@/hooks/useMerchantChatViewModel';
import type { ConversationStatus } from '@/lib/types';

function StatusBadge({ status }: { status: ConversationStatus }) {
  const config: Record<ConversationStatus, { bg: string; text: string; label: string }> = {
    OPEN: {
      bg: 'bg-[var(--color-primary-light)] border border-[var(--color-primary)]',
      text: 'text-[var(--color-primary)]',
      label: '진행 중',
    },
    ESCALATED: {
      bg: 'bg-[var(--color-warning-light)] border border-[var(--color-warning)]',
      text: 'text-[var(--color-warning)]',
      label: '상담사 연결',
    },
    RESOLVED: {
      bg: 'bg-[var(--color-success-light)] border border-[var(--color-success-border)]',
      text: 'text-[var(--color-success)]',
      label: '해결됨',
    },
  };

  const style = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function formatDate(dateStr: string): string {
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

export default function MerchantConversationsPage() {
  const vm = useMerchantChatViewModel();
  const router = useRouter();

  useEffect(() => {
    vm.loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewConversation = async () => {
    const id = await vm.createConversation();
    if (id !== null) {
      router.push('/merchant/chat');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">대화 목록</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
            이전 문의 내역을 확인하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewConversation}
          disabled={vm.isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 문의
        </button>
      </div>

      {/* List */}
      {vm.conversations.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--color-neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-neutral-700)] mb-1">문의 내역이 없습니다</p>
          <p className="text-xs text-[var(--color-neutral-500)] mb-4">새 문의를 시작해보세요.</p>
          <button
            type="button"
            onClick={handleNewConversation}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            첫 문의 시작하기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] overflow-hidden">
          <ul className="divide-y divide-[var(--color-neutral-100)]">
            {vm.conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => {
                    vm.selectConversation(conv.id);
                    router.push('/merchant/chat');
                  }}
                  className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[var(--color-neutral-50)] transition-colors"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--color-neutral-900)]">
                        문의 #{conv.id}
                      </span>
                      <StatusBadge status={conv.status} />
                    </div>
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      메시지 {conv.message_count}건 · {formatDate(conv.updated_at)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-[var(--color-neutral-400)] shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
