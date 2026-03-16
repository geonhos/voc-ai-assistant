'use client';

import { use, useRef, useEffect, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useConversationDetailViewModel } from '@/hooks/useConversationDetailViewModel';
import { MessageBubble } from '@/components/MessageBubble';
import { Badge, statusToVariant, statusToLabel } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ConversationStatus } from '@/lib/types';

interface ConversationDetailPageProps {
  params: Promise<{ id: string }>;
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

export default function ConversationDetailPage({ params }: ConversationDetailPageProps) {
  const { id } = use(params);
  const vm = useConversationDetailViewModel(id);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vm.messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || vm.isSending) return;
    setInputText('');
    await vm.sendAdminMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStatusUpdate = (status: ConversationStatus) => {
    vm.updateStatus(status);
  };

  if (vm.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" label="대화 불러오는 중" />
      </div>
    );
  }

  if (vm.error && !vm.conversation) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-lg)]" role="alert">
          <svg className="w-5 h-5 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-[var(--color-danger)]">{vm.error}</span>
        </div>
      </div>
    );
  }

  const conv = vm.conversation;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="px-6 py-4 bg-white border-b border-[var(--color-neutral-200)] flex items-center gap-4">
        <Link
          href="/conversations"
          className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-900)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>
        <div className="h-5 w-px bg-[var(--color-neutral-200)]" />
        <h1 className="text-base font-semibold text-[var(--color-neutral-900)]">
          대화 #{id}
        </h1>
        {conv && (
          <Badge
            label={statusToLabel(conv.status)}
            variant={statusToVariant(conv.status)}
            size="sm"
          />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat log (left 2/3) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--color-neutral-200)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {vm.error && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-lg)]" role="alert">
                <span className="text-sm text-[var(--color-danger)]">{vm.error}</span>
              </div>
            )}

            {vm.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--color-neutral-400)] text-sm">
                메시지가 없습니다.
              </div>
            ) : (
              vm.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  sender={msg.sender}
                  text={msg.text}
                  timestamp={msg.created_at}
                  confidence={msg.confidence}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Admin input */}
          <div className="px-6 py-4 border-t border-[var(--color-neutral-200)] bg-white">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="상담사 메시지 입력... (Enter로 전송, Shift+Enter 줄 바꿈)"
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  disabled={vm.isSending}
                />
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={vm.isSending || !inputText.trim()}
                className="px-4 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-[var(--radius-lg)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
              >
                {vm.isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                전송
              </button>
            </div>
          </div>
        </div>

        {/* Info panel (right 1/3) */}
        <div className="w-80 shrink-0 bg-white overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Info */}
            <section>
              <h2 className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide mb-3">
                고객 정보
              </h2>
              {conv ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
                      <span className="text-sm font-bold text-[var(--color-primary)]">
                        {conv.customer_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                        {conv.customer_name}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-500)]">
                        {conv.customer_email}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-16 bg-[var(--color-neutral-100)] rounded-[var(--radius-md)] animate-pulse" />
              )}
            </section>

            <div className="h-px bg-[var(--color-neutral-100)]" />

            {/* Conversation Info */}
            <section>
              <h2 className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide mb-3">
                대화 정보
              </h2>
              {conv ? (
                <dl className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-[var(--color-neutral-500)]">상태</dt>
                    <dd>
                      <Badge
                        label={statusToLabel(conv.status)}
                        variant={statusToVariant(conv.status)}
                        size="sm"
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-[var(--color-neutral-500)]">시작 시간</dt>
                    <dd className="text-xs text-[var(--color-neutral-700)]">
                      {formatDate(conv.created_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-[var(--color-neutral-500)]">메시지 수</dt>
                    <dd className="text-xs font-medium text-[var(--color-neutral-700)]">
                      {vm.messages.length}건
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="h-24 bg-[var(--color-neutral-100)] rounded-[var(--radius-md)] animate-pulse" />
              )}
            </section>

            <div className="h-px bg-[var(--color-neutral-100)]" />

            {/* Actions */}
            <section>
              <h2 className="text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide mb-3">
                액션
              </h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('RESOLVED')}
                  disabled={!conv || conv.status === 'RESOLVED'}
                  className="w-full py-2 px-4 text-sm font-medium text-[var(--color-success)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-[var(--radius-md)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  해결 처리
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('ESCALATED')}
                  disabled={!conv || conv.status === 'ESCALATED'}
                  className="w-full py-2 px-4 text-sm font-medium text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-[var(--radius-md)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  재에스컬레이션
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('OPEN')}
                  disabled={!conv || conv.status === 'OPEN'}
                  className="w-full py-2 px-4 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-[var(--radius-md)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  진행 중으로 변경
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
