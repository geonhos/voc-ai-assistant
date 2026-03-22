'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Conversation } from '@/lib/types';

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  OPEN: { text: '진행 중', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ESCALATED: { text: '상담사 연결', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESOLVED: { text: '해결됨', className: 'bg-green-50 text-green-700 border-green-200' },
};

export default function CustomerConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiClient.get<Conversation[]>('/customer/conversations');
      setConversations(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewConversation = async () => {
    try {
      const conv = await apiClient.post<Conversation>('/customer/conversations', {});
      router.push(`/customer/chat?id=${conv.id}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">내 대화 목록</h1>
          <p className="text-sm text-[var(--color-neutral-500)]">
            {isLoading ? '불러오는 중...' : `총 ${conversations.length}건`}
          </p>
        </div>
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <span className="material-icons-outlined text-[18px]">add</span>
          새 문의
        </button>
      </div>

      {!isLoading && conversations.length === 0 && (
        <div className="text-center py-16">
          <span className="material-icons-outlined text-5xl text-[var(--color-neutral-300)] mb-4 block">forum</span>
          <p className="text-[var(--color-neutral-500)]">아직 대화 이력이 없습니다.</p>
          <button
            onClick={handleNewConversation}
            className="mt-4 text-sm text-[var(--color-primary)] font-medium hover:underline"
          >
            첫 문의를 시작해보세요
          </button>
        </div>
      )}

      <div className="space-y-2">
        {conversations.map((conv) => {
          const status = STATUS_LABELS[conv.status] || STATUS_LABELS.OPEN;
          return (
            <button
              key={conv.id}
              onClick={() => router.push(`/customer/chat?id=${conv.id}`)}
              className="w-full flex items-center justify-between p-4 bg-white border border-[var(--color-neutral-200)] rounded-xl hover:border-[var(--color-primary)] hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-neutral-100)] rounded-full flex items-center justify-center">
                  <span className="material-icons-outlined text-[20px] text-[var(--color-neutral-500)]">chat</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-neutral-900)]">
                    대화 #{conv.id}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-400)]">
                    {new Date(conv.created_at).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.className}`}>
                {status.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
