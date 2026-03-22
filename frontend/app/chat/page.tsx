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

function ContactForm({
  onSubmit,
  error,
}: {
  onSubmit: (name: string, email: string, phone: string) => void;
  error: string | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    onSubmit(name, email, phone);
  };

  return (
    <div className="mx-4 my-3 p-4 bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-[var(--radius-lg)]">
      <div className="flex items-start gap-2.5 mb-3">
        <svg className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">전문 상담사 연결</p>
          <p className="text-xs text-[var(--color-neutral-600)] mt-0.5">
            원활한 상담을 위해 연락처를 남겨주세요.
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full px-3 py-2 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="w-full px-3 py-2 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호 (예: 010-1234-5678)"
          className="w-full px-3 py-2 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
        {error && (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || !email.trim() || !phone.trim()}
          className="w-full py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          연락처 전송
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
  }, [vm.messages, vm.isSending, vm.showContactForm]);

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
    <main className="min-h-screen bg-[var(--color-neutral-50)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[var(--radius-xl)] shadow-lg flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)', minHeight: '560px' }}>

        {/* Header */}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Welcome message when no messages yet */}
          {vm.messages.length === 0 && !vm.isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-white border border-[var(--color-neutral-200)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
                <p className="text-sm text-[var(--color-neutral-800)]">
                  안녕하세요! AI 어시스턴트입니다. 무엇을 도와드릴까요?
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
            />
          ))}

          {(vm.isSending || vm.isLoading) && <TypingIndicator />}

          {/* Contact form on escalation */}
          {vm.showContactForm && (
            <ContactForm
              onSubmit={vm.submitContact}
              error={vm.contactError}
            />
          )}

          {/* Contact submitted confirmation */}
          {vm.contactSubmitted && (
            <div className="my-3 p-3.5 bg-green-50 border border-green-300 rounded-[var(--radius-lg)]">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-700">연락처 전송 완료</p>
                  <p className="text-xs text-[var(--color-neutral-600)] mt-0.5">
                    담당 상담사가 곧 연락드리겠습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Escalation notice (when contact already submitted) */}
          {vm.isEscalated && !vm.showContactForm && !vm.contactSubmitted && (
            <div className="my-4 p-3.5 bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-[var(--radius-lg)]">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-warning)]">상담사 연결 중</p>
                  <p className="text-xs text-[var(--color-neutral-600)] mt-0.5">
                    담당 상담사가 곧 응답할 예정입니다.
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
              placeholder={vm.isEscalated ? "상담사 연결 대기 중..." : "메시지를 입력하세요... (Enter로 전송)"}
              rows={1}
              className="flex-1 px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              style={{ maxHeight: '120px' }}
              disabled={vm.isSending || vm.isLoading || vm.isEscalated}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={vm.isSending || vm.isLoading || !inputText.trim() || vm.isEscalated}
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
    </main>
  );
}
