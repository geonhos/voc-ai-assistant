'use client';

import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import { useCustomerChatViewModel } from '@/hooks/useCustomerChatViewModel';
import { MessageBubble } from '@/components/MessageBubble';

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

function InitialForm({
  customerName,
  customerEmail,
  topic,
  isLoading,
  error,
  setCustomerName,
  setCustomerEmail,
  setTopic,
  onStart,
}: {
  customerName: string;
  customerEmail: string;
  topic: string;
  isLoading: boolean;
  error: string | null;
  setCustomerName: (v: string) => void;
  setCustomerEmail: (v: string) => void;
  setTopic: (v: string) => void;
  onStart: () => void;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onStart();
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">고객 지원</h1>
        <p className="text-sm text-[var(--color-neutral-500)] mt-1">
          AI 어시스턴트가 빠르게 도와드리겠습니다.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
            이름 <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="홍길동"
            className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="customerEmail" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
            이메일 <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="hong@example.com"
            className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
            문의 내용 <span className="text-[var(--color-danger)]">*</span>
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="무엇을 도와드릴까요? 자세히 설명해 주세요."
            rows={3}
            className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)]" role="alert">
            <svg className="w-4 h-4 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-[var(--color-danger)]">{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={isLoading}
          className="w-full py-2.5 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              연결 중...
            </>
          ) : (
            '시작하기'
          )}
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const vm = useCustomerChatViewModel();
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vm.messages, vm.isSending]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || vm.isSending) return;
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

  const isInChat = vm.conversationId !== null;

  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[var(--radius-xl)] shadow-lg flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)', minHeight: '560px' }}>

        {/* Header (shown in chat mode) */}
        {isInChat && (
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
          </div>
        )}

        {/* Content */}
        {!isInChat ? (
          <InitialForm
            customerName={vm.customerName}
            customerEmail={vm.customerEmail}
            topic={vm.topic}
            isLoading={vm.isLoading}
            error={vm.startError}
            setCustomerName={vm.setCustomerName}
            setCustomerEmail={vm.setCustomerEmail}
            setTopic={vm.setTopic}
            onStart={vm.startConversation}
          />
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {vm.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  sender={msg.sender}
                  text={msg.text}
                  timestamp={msg.created_at}
                  confidence={msg.confidence}
                />
              ))}

              {vm.isSending && <TypingIndicator />}

              {/* Escalation notice */}
              {vm.isEscalated && (
                <div className="my-4 p-3.5 bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-[var(--radius-lg)]">
                  <div className="flex items-start gap-2.5">
                    <svg className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-warning)]">상담사 연결 중</p>
                      <p className="text-xs text-[var(--color-neutral-600)] mt-0.5">
                        문의 내용을 검토한 후 담당 상담사가 곧 응답할 예정입니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  placeholder="메시지를 입력하세요... (Enter로 전송)"
                  rows={1}
                  className="flex-1 px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  style={{ maxHeight: '120px' }}
                  disabled={vm.isSending}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={vm.isSending || !inputText.trim()}
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
          </>
        )}
      </div>
    </main>
  );
}
