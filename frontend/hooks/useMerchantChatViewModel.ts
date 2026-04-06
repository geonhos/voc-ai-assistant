'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Message, Conversation, ChatResponse } from '@/lib/types';

interface MerchantChatViewModel {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: number | null;
  isLoading: boolean;
  isSending: boolean;
  sendError: string | null;
  clarificationState: string | null;
  quickOptions: string[][] | null;
  createConversation: () => Promise<number | null>;
  selectConversation: (id: number) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendQuickOption: (text: string) => Promise<void>;
  loadConversations: () => Promise<void>;
}

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ERRORS = 5;

export function useMerchantChatViewModel(): MerchantChatViewModel {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [clarificationState, setClarificationState] = useState<string | null>(null);
  const [quickOptions, setQuickOptions] = useState<string[][] | null>(null);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const pollErrorCountRef = useRef(0);

  const fetchMessages = useCallback(async (convId: number) => {
    try {
      const msgs = await apiClient.get<Message[]>(
        `/merchant/conversations/${convId}/messages`,
      );
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

  useEffect(() => {
    if (activeConversationId === null) return;

    const schedulePoll = () => {
      const jitter = Math.random() * 1000;
      pollingRef.current = setTimeout(() => {
        fetchMessages(activeConversationId).finally(() => {
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
  }, [activeConversationId, fetchMessages]);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await apiClient.get<Conversation[]>('/merchant/conversations');
      setConversations(convs);
    } catch {
      // Silently ignore load errors
    }
  }, []);

  const createConversation = useCallback(async (): Promise<number | null> => {
    try {
      const conversation = await apiClient.post<Conversation>(
        '/merchant/conversations',
        {},
      );
      setActiveConversationId(conversation.id);
      setMessages([]);
      lastMessageIdRef.current = 0;
      setConversations((prev) => [conversation, ...prev]);
      return conversation.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : '대화를 시작할 수 없습니다.';
      setSendError(message);
      return null;
    }
  }, []);

  const selectConversation = useCallback(async (id: number) => {
    setIsLoading(true);
    setActiveConversationId(id);
    lastMessageIdRef.current = 0;

    try {
      const msgs = await apiClient.get<Message[]>(`/merchant/conversations/${id}/messages`);
      setMessages(msgs);
      if (msgs.length > 0) {
        lastMessageIdRef.current = msgs[msgs.length - 1].id;
      }
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setSendError(null);
      setIsSending(true);

      let convId = activeConversationId;

      if (convId === null) {
        const newId = await createConversation();
        if (!newId) {
          setIsSending(false);
          return;
        }
        convId = newId;
      }

      // Optimistically add merchant message
      const optimisticMsg: Message = {
        id: Date.now(),
        conversation_id: convId,
        sender: 'CUSTOMER',
        text: text.trim(),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const response = await apiClient.post<ChatResponse>(
          `/merchant/conversations/${convId}/messages`,
          { text: text.trim() },
        );

        setClarificationState(response.clarification_state ?? null);
        setQuickOptions(response.quick_options ?? null);

        const msgs = await apiClient.get<Message[]>(
          `/merchant/conversations/${convId}/messages`,
        );
        setMessages(msgs);
        if (msgs.length > 0) {
          lastMessageIdRef.current = msgs[msgs.length - 1].id;
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        const message = err instanceof Error ? err.message : '메시지 전송에 실패했습니다.';
        setSendError(message);
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, createConversation],
  );

  const sendQuickOption = useCallback(
    async (text: string) => {
      await sendMessage(text);
    },
    [sendMessage],
  );

  return {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isSending,
    sendError,
    clarificationState,
    quickOptions,
    createConversation,
    selectConversation,
    sendMessage,
    sendQuickOption,
    loadConversations,
  };
}
