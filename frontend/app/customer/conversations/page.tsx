'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Badge, statusToVariant, statusToLabel } from '@/components/Badge';
import { formatDate } from '@/lib/utils';
import type { Conversation } from '@/lib/types';

export default function CustomerConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setError(null);
    try {
      const data = await apiClient.get<Conversation[]>('/customer/conversations');
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewConversation = async () => {
    setError(null);
    try {
      const conv = await apiClient.post<Conversation>('/customer/conversations', {});
      router.push(`/customer/chat?id=${conv.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화를 시작할 수 없습니다.');
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
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          새 문의
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && conversations.length === 0 && !error && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-[var(--color-neutral-300)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
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
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => router.push(`/customer/chat?id=${conv.id}`)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[var(--color-neutral-200)] rounded-xl hover:border-[var(--color-primary)] hover:shadow-sm transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-neutral-100)] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-neutral-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-neutral-900)]">
                  대화 #{conv.id}
                </p>
                <p className="text-xs text-[var(--color-neutral-400)]">
                  {formatDate(conv.created_at)}
                </p>
              </div>
            </div>
            <Badge
              label={statusToLabel(conv.status)}
              variant={statusToVariant(conv.status)}
              size="md"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
