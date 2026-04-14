'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message, Conversation, ChatResponse } from '@/lib/types';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ERRORS = 5;

export default function CustomerChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-[var(--color-neutral-400)]">로딩 중...</div>}>
      <CustomerChatContent />
    </Suspense>
  );
}

function CustomerChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('id');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [convId, setConvId] = useState<number | null>(conversationId ? Number(conversationId) : null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const pollErrorCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (id: number) => {
    try {
      const msgs = await apiClient.get<Message[]>(`/customer/conversations/${id}/messages`);
      pollErrorCountRef.current = 0;
      if (msgs.length > 0) {
        const latest = msgs[msgs.length - 1];
        if (latest.id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = latest.id;
          setMessages(msgs);
        }
      }
    } catch {
      pollErrorCountRef.current += 1;
      if (pollErrorCountRef.current >= POLL_MAX_ERRORS) {
        if (pollingRef.current !== null) {
          clearTimeout(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (convId) {
      fetchMessages(convId);
    }
  }, [convId, fetchMessages]);

  // Polling
  useEffect(() => {
    if (convId === null) return;

    const schedulePoll = () => {
      const jitter = Math.random() * 1000;
      pollingRef.current = setTimeout(() => {
        fetchMessages(convId).finally(() => {
          if (pollErrorCountRef.current < POLL_MAX_ERRORS) {
            schedulePoll();
          }
        });
      }, POLL_INTERVAL_MS + jitter);
    };
    schedulePoll();

    return () => {
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
      }
    };
  }, [convId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setSendError(null);
    let currentConvId = convId;

    // Create conversation if none exists
    if (!currentConvId) {
      try {
        const conv = await apiClient.post<Conversation>('/customer/conversations', {});
        currentConvId = conv.id;
        setConvId(conv.id);
        router.replace(`/customer/chat?id=${conv.id}`);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : '대화를 시작할 수 없습니다.');
        return;
      }
    }

    // Optimistic update
    const optimisticMsg: Message = {
      id: Date.now(),
      conversation_id: currentConvId,
      sender: 'CUSTOMER',
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setIsSending(true);

    try {
      await apiClient.post<ChatResponse>(
        `/customer/conversations/${currentConvId}/messages`,
        { text },
      );
      await fetchMessages(currentConvId);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setSendError(err instanceof Error ? err.message : '메시지 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-neutral-200)] bg-white">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
          <span className="text-xs text-white font-bold">AI</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">AI 상담</p>
          <p className="text-xs text-[var(--color-success)]">온라인</p>
        </div>
        {convId && (
          <span className="ml-auto text-xs text-[var(--color-neutral-400)]">대화 #{convId}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {!convId && messages.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-[var(--color-neutral-300)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-[var(--color-neutral-600)] font-medium">무엇을 도와드릴까요?</p>
            <p className="text-sm text-[var(--color-neutral-400)] mt-1">결제, 정산, API 등 무엇이든 문의하세요.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            sender={msg.sender}
            text={msg.text}
            timestamp={msg.created_at}
            confidence={msg.confidence}
            toolData={msg.tool_data}
          />
        ))}
        {sendError && (
          <div className="text-center py-2">
            <span className="text-xs text-[var(--color-danger)]">{sendError}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--color-neutral-200)] bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder="메시지를 입력하세요... (Enter로 전송)"
            rows={1}
            className="flex-1 resize-none border border-[var(--color-neutral-300)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            {isSending ? '...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
