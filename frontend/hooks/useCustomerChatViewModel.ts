'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  Message,
  CreateConversationResponse,
  SendMessageResponse,
} from '@/lib/types';

interface CustomerChatViewModel {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isEscalated: boolean;
  conversationId: number | null;
  customerName: string;
  customerEmail: string;
  topic: string;
  setCustomerName: (v: string) => void;
  setCustomerEmail: (v: string) => void;
  setTopic: (v: string) => void;
  startConversation: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startError: string | null;
  sendError: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function useCustomerChatViewModel(): CustomerChatViewModel {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [startError, setStartError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const accessTokenRef = useRef<string | null>(null);

  const getConvHeaders = useCallback(() => {
    return accessTokenRef.current
      ? { 'X-Conversation-Token': accessTokenRef.current }
      : undefined;
  }, []);

  const fetchMessages = useCallback(async (convId: number) => {
    try {
      const msgs = await apiClient.get<Message[]>(
        `/chat/conversations/${convId}/messages`,
        getConvHeaders(),
      );
      if (msgs.length > 0) {
        const latest = msgs[msgs.length - 1];
        if (latest.id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = latest.id;
          setMessages(msgs);
        }
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [getConvHeaders]);

  useEffect(() => {
    if (conversationId === null) return;

    // Stop polling if conversation is escalated
    if (isEscalated) return;

    pollingRef.current = setInterval(() => {
      fetchMessages(conversationId);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
      }
    };
  }, [conversationId, isEscalated, fetchMessages]);

  const startConversation = useCallback(async () => {
    if (!customerName.trim()) {
      setStartError('이름을 입력해주세요.');
      return;
    }
    if (!customerEmail.trim()) {
      setStartError('이메일을 입력해주세요.');
      return;
    }
    if (!topic.trim()) {
      setStartError('문의 내용을 입력해주세요.');
      return;
    }

    setStartError(null);
    setIsLoading(true);

    try {
      const conversation = await apiClient.post<CreateConversationResponse>(
        '/chat/conversations',
        {
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          initial_message: topic.trim(),
        },
      );

      setConversationId(conversation.id);
      accessTokenRef.current = conversation.access_token;

      // Load initial messages
      const headers = { 'X-Conversation-Token': conversation.access_token };
      const msgs = await apiClient.get<Message[]>(
        `/chat/conversations/${conversation.id}/messages`,
        headers,
      );
      setMessages(msgs);
      if (msgs.length > 0) {
        lastMessageIdRef.current = msgs[msgs.length - 1].id;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '대화를 시작할 수 없습니다.';
      setStartError(message);
    } finally {
      setIsLoading(false);
    }
  }, [customerName, customerEmail, topic]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || conversationId === null) return;

      setSendError(null);
      setIsSending(true);

      // Optimistically add customer message
      const optimisticMsg: Message = {
        id: Date.now(),
        conversation_id: conversationId,
        sender: 'CUSTOMER',
        text: text.trim(),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const response = await apiClient.post<SendMessageResponse>(
          `/chat/conversations/${conversationId}/messages`,
          { text: text.trim() },
          getConvHeaders(),
        );

        // Replace optimistic with real messages
        const msgs = await apiClient.get<Message[]>(
          `/chat/conversations/${conversationId}/messages`,
          getConvHeaders(),
        );
        setMessages(msgs);
        if (msgs.length > 0) {
          lastMessageIdRef.current = msgs[msgs.length - 1].id;
        }

        if (response.escalated) {
          setIsEscalated(true);
        }
      } catch (err) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        const message = err instanceof Error ? err.message : '메시지 전송에 실패했습니다.';
        setSendError(message);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, getConvHeaders],
  );

  return {
    messages,
    isLoading,
    isSending,
    isEscalated,
    conversationId,
    customerName,
    customerEmail,
    topic,
    setCustomerName,
    setCustomerEmail,
    setTopic,
    startConversation,
    sendMessage,
    startError,
    sendError,
  };
}
