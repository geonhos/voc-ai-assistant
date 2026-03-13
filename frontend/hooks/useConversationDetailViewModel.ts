'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Conversation, Message, ConversationStatus } from '@/lib/types';

interface ConversationDetailViewModel {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendAdminMessage: (text: string) => Promise<void>;
  updateStatus: (status: ConversationStatus) => Promise<void>;
  refresh: () => void;
}

export function useConversationDetailViewModel(id: string): ConversationDetailViewModel {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [conv, msgs] = await Promise.all([
        apiClient.get<Conversation>(`/admin/conversations/${id}`),
        apiClient.get<Message[]>(`/chat/conversations/${id}/messages`),
      ]);
      setConversation(conv);
      setMessages(msgs);
    } catch (err) {
      const message = err instanceof Error ? err.message : '대화를 불러올 수 없습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const sendAdminMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsSending(true);
      try {
        await apiClient.post(`/admin/conversations/${id}/messages`, { text: text.trim() });
        // Refresh messages after sending
        const msgs = await apiClient.get<Message[]>(`/chat/conversations/${id}/messages`);
        setMessages(msgs);
      } catch (err) {
        const message = err instanceof Error ? err.message : '메시지 전송에 실패했습니다.';
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [id],
  );

  const updateStatus = useCallback(
    async (status: ConversationStatus) => {
      try {
        // Use PATCH as per API spec
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/conversations/${id}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ status }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const updated: Conversation = await res.json();
        setConversation(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : '상태 변경에 실패했습니다.';
        setError(message);
      }
    },
    [id],
  );

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return {
    conversation,
    messages,
    isLoading,
    isSending,
    error,
    sendAdminMessage,
    updateStatus,
    refresh,
  };
}
