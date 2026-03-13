'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeItem, PaginatedResponse } from '@/lib/types';

interface KnowledgeFormData {
  title: string;
  category: string;
  content: string;
  tags: string; // comma-separated string for the form
  active: boolean;
}

interface KnowledgeBaseViewModel {
  items: KnowledgeItem[];
  total: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isModalOpen: boolean;
  editingItem: KnowledgeItem | null;
  formData: KnowledgeFormData;
  openCreateModal: () => void;
  openEditModal: (item: KnowledgeItem) => void;
  closeModal: () => void;
  setFormField: <K extends keyof KnowledgeFormData>(key: K, value: KnowledgeFormData[K]) => void;
  saveItem: () => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  refresh: () => void;
}

const DEFAULT_FORM: KnowledgeFormData = {
  title: '',
  category: '',
  content: '',
  tags: '',
  active: true,
};

export function useKnowledgeBaseViewModel(): KnowledgeBaseViewModel {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [formData, setFormData] = useState<KnowledgeFormData>(DEFAULT_FORM);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<PaginatedResponse<KnowledgeItem>>(
        '/knowledge/?skip=0&limit=100',
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : '지식 베이스를 불러올 수 없습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreateModal = useCallback(() => {
    setEditingItem(null);
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      content: item.content,
      tags: item.tags.join(', '),
      active: item.active,
    });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(DEFAULT_FORM);
  }, []);

  const setFormField = useCallback(
    <K extends keyof KnowledgeFormData>(key: K, value: KnowledgeFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const saveItem = useCallback(async () => {
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!formData.category.trim()) {
      setError('카테고리를 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const parsedTags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      content: formData.content.trim(),
      tags: parsedTags,
      active: formData.active,
    };

    try {
      if (editingItem) {
        // Use PATCH as per API spec
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/knowledge/${editingItem.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
      } else {
        await apiClient.post('/knowledge/', payload);
      }
      closeModal();
      setRefreshTick((t) => t + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingItem, closeModal]);

  const deleteItem = useCallback(async (id: number) => {
    try {
      // DELETE returns 204 No Content — bypass apiClient's .json() call
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/knowledge/${id}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setRefreshTick((t) => t + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : '삭제에 실패했습니다.';
      setError(message);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return {
    items,
    total,
    isLoading,
    isSaving,
    error,
    isModalOpen,
    editingItem,
    formData,
    openCreateModal,
    openEditModal,
    closeModal,
    setFormField,
    saveItem,
    deleteItem,
    refresh,
  };
}
