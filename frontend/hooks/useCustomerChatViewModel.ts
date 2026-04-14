'use client';

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/usePolling';
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
  showContactForm: boolean;
  contactSubmitted: boolean;
  conversationId: number | null;
  sendMessage: (text: string) => Promise<void>;
  submitContact: (name: string, email: string, phone: string) => Promise<void>;
  sendError: string | null;
  contactError: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function useCustomerChatViewModel(): CustomerChatViewModel {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const lastMessageIdRef = useRef<number>(0);
  const accessTokenRef = useRef<string | null>(null);

  const getConvHeaders = useCallback(() => {
    return accessTokenRef.current
      ? { 'X-Conversation-Token': accessTokenRef.current }
      : undefined;
  }, []);

  const fetchMessages = useCallback(async (convId: number) => {
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
  }, [getConvHeaders]);

  const pollCallback = useCallback(async () => {
    if (conversationId !== null) {
      await fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  usePolling(pollCallback, POLL_INTERVAL_MS, conversationId !== null && !isEscalated);

  // Create conversation on first message
  const ensureConversation = useCallback(async (firstMessage: string): Promise<{id: number; token: string} | null> => {
    try {
      const conversation = await apiClient.post<CreateConversationResponse>(
        '/chat/conversations',
        { initial_message: firstMessage },
      );
      setConversationId(conversation.id);
      accessTokenRef.current = conversation.access_token;
      return { id: conversation.id, token: conversation.access_token };
    } catch (err) {
      const message = err instanceof Error ? err.message : '대화를 시작할 수 없습니다.';
      setSendError(message);
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setSendError(null);
      setIsSending(true);

      let convId = conversationId;
      let headers = getConvHeaders();

      // Auto-create conversation on first message
      if (convId === null) {
        const result = await ensureConversation(text.trim());
        if (!result) {
          setIsSending(false);
          return;
        }
        convId = result.id;
        headers = { 'X-Conversation-Token': result.token };
      }

      // Optimistically add customer message
      const optimisticMsg: Message = {
        id: Date.now(),
        conversation_id: convId,
        sender: 'CUSTOMER',
        text: text.trim(),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const response = await apiClient.post<SendMessageResponse>(
          `/chat/conversations/${convId}/messages`,
          { text: text.trim() },
          headers,
        );

        // Refresh real messages
        const msgs = await apiClient.get<Message[]>(
          `/chat/conversations/${convId}/messages`,
          headers,
        );
        setMessages(msgs);
        if (msgs.length > 0) {
          lastMessageIdRef.current = msgs[msgs.length - 1].id;
        }

        if (response.escalated) {
          setIsEscalated(true);
          setShowContactForm(true);
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        const message = err instanceof Error ? err.message : '메시지 전송에 실패했습니다.';
        setSendError(message);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, getConvHeaders, ensureConversation],
  );

  const submitContact = useCallback(
    async (name: string, email: string, phone: string) => {
      if (conversationId === null) return;
      setContactError(null);

      try {
        await apiClient.patch(
          `/chat/conversations/${conversationId}/contact`,
          {
            customer_name: name.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
          },
          getConvHeaders(),
        );
        setContactSubmitted(true);
        setShowContactForm(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : '연락처 저장에 실패했습니다.';
        setContactError(message);
      }
    },
    [conversationId, getConvHeaders],
  );

  return {
    messages,
    isLoading,
    isSending,
    isEscalated,
    showContactForm,
    contactSubmitted,
    conversationId,
    sendMessage,
    submitContact,
    sendError,
    contactError,
  };
}
