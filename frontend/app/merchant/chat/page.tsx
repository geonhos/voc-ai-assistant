'use client';

import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import { useMerchantChatViewModel } from '@/hooks/useMerchantChatViewModel';
import { MessageBubble } from '@/components/MessageBubble';
import { useAuth } from '@/contexts/AuthContext';

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-white border border-[var(--color-neutral-200)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[var(--color-neutral-400)] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MerchantChatPage() {
  const vm = useMerchantChatViewModel();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vm.messages, vm.isSending]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || vm.isSending || vm.isLoading) return;
    setInputText('');
    await vm.sendMessage(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-neutral-50)]">
      {/* Page Header */}
      <div className="px-6 py-4 bg-white border-b border-[var(--color-neutral-200)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-neutral-900)]">AI 문의 채팅</h1>
            <p className="text-sm text-[var(--color-neutral-500)]">
              결제, 정산, 오류에 대해 AI 어시스턴트에게 문의하세요.
            </p>
          </div>
          {user && (
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--color-neutral-700)]">{user.email}</p>
              <p className="text-xs text-[var(--color-neutral-500)]">가맹점</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-4" style={{ minHeight: 0 }}>
        <div className="flex-1 bg-white rounded-[var(--radius-xl)] shadow-sm border border-[var(--color-neutral-200)] flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-neutral-200)] bg-white">
            <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-neutral-900)]">AI 어시스턴트</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-xs text-[var(--color-neutral-500)]">온라인</span>
              </div>
            </div>
            {vm.clarificationState === 'GATHERING_INFO' && (
              <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-medium rounded-full">
                <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse" />
                추가 정보 수집 중...
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {vm.messages.length === 0 && !vm.isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-white border border-[var(--color-neutral-200)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
                  <p className="text-sm text-[var(--color-neutral-800)]">
                    안녕하세요! PG AI 어시스턴트입니다.
                    <br />
                    결제 오류, 정산 문의, API 연동 등 무엇이든 문의하세요.
                  </p>
                </div>
              </div>
            )}

            {vm.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                sender={msg.sender}
                text={msg.text}
                timestamp={msg.created_at}
                confidence={msg.confidence}
                toolData={msg.tool_data}
                onOptionSelect={vm.sendQuickOption}
                disabled={vm.isSending}
              />
            ))}

            {(vm.isSending || vm.isLoading) && <TypingIndicator />}

            {vm.sendError && (
              <div className="text-center mb-2">
                <span className="text-xs text-[var(--color-danger)]">{vm.sendError}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-[var(--color-neutral-200)] bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="결제 오류, 정산 문의 등을 입력하세요... (Enter로 전송)"
                rows={1}
                className="flex-1 px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                style={{ maxHeight: '120px' }}
                disabled={vm.isSending || vm.isLoading}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={vm.isSending || vm.isLoading || !inputText.trim()}
                className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white flex items-center justify-center hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="전송"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-neutral-400)] mt-1.5 text-center">
              Shift+Enter로 줄 바꿈
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
