'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Conversation, ConversationStatus, PaginatedResponse } from '@/lib/types';

type StatusFilter = 'ALL' | ConversationStatus;

interface ConversationListViewModel {
  conversations: Conversation[];
  total: number;
  isLoading: boolean;
  error: string | null;
  search: string;
  statusFilter: StatusFilter;
  page: number;
  pageSize: number;
  setSearch: (v: string) => void;
  setStatusFilter: (v: StatusFilter) => void;
  goToPage: (p: number) => void;
  refresh: () => void;
}

const PAGE_SIZE = 20;

export function useConversationListViewModel(): ConversationListViewModel {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('skip', String(page * PAGE_SIZE));
      params.set('limit', String(PAGE_SIZE));

      const data = await apiClient.get<PaginatedResponse<Conversation>>(
        `/admin/conversations?${params.toString()}`,
      );
      setConversations(data.items);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : '대화 목록을 불러올 수 없습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Reset page when filter changes
  const handleSetStatusFilter = useCallback((v: StatusFilter) => {
    setStatusFilter(v);
    setPage(0);
  }, []);

  const handleSetSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  // Client-side search filtering
  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          c.customer_email.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return {
    conversations: filtered,
    total,
    isLoading,
    error,
    search,
    statusFilter,
    page,
    pageSize: PAGE_SIZE,
    setSearch: handleSetSearch,
    setStatusFilter: handleSetStatusFilter,
    goToPage: setPage,
    refresh,
  };
}
