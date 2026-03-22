'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message, Conversation, ChatResponse } from '@/lib/types';

export default function CustomerChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('id');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [convId, setConvId] = useState<number | null>(conversationId ? Number(conversationId) : null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (id: number) => {
    try {
      const msgs = await apiClient.get<Message[]>(`/customer/conversations/${id}/messages`);
      setMessages(msgs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (convId) {
      fetchMessages(convId);
    }
  }, [convId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    let currentConvId = convId;

    // Create conversation if none exists
    if (!currentConvId) {
      try {
        const conv = await apiClient.post<Conversation>('/customer/conversations', {});
        currentConvId = conv.id;
        setConvId(conv.id);
        router.replace(`/customer/chat?id=${conv.id}`);
      } catch {
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
    } catch {
      // remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
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
            <span className="material-icons-outlined text-5xl text-[var(--color-neutral-300)] mb-4 block">support_agent</span>
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
