'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Merchant, MerchantCreate, MerchantStatus } from '@/lib/types';

interface MerchantStats {
  total: number;
  active: number;
  suspended: number;
}

interface MerchantsViewModel {
  merchants: Merchant[];
  stats: MerchantStats;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  selectedMerchant: Merchant | null;
  isDetailOpen: boolean;
  isCreateOpen: boolean;
  formData: MerchantCreate;
  openDetail: (merchant: Merchant) => void;
  closeDetail: () => void;
  openCreate: () => void;
  closeCreate: () => void;
  setFormField: <K extends keyof MerchantCreate>(key: K, value: MerchantCreate[K]) => void;
  saveMerchant: () => Promise<void>;
  refresh: () => void;
  filteredMerchants: Merchant[];
}

const DEFAULT_FORM: MerchantCreate = {
  mid: '',
  name: '',
  business_number: '',
};

function computeStats(merchants: Merchant[]): MerchantStats {
  return {
    total: merchants.length,
    active: merchants.filter((m) => m.status === 'ACTIVE').length,
    suspended: merchants.filter((m) => m.status === 'SUSPENDED').length,
  };
}

export function useMerchantsViewModel(): MerchantsViewModel {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<MerchantCreate>(DEFAULT_FORM);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchMerchants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Merchant[]>('/admin/merchants/?skip=0&limit=200');
      setMerchants(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '가맹점 목록을 불러올 수 없습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const filteredMerchants = merchants.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.mid.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.business_number.toLowerCase().includes(q)
    );
  });

  const stats = computeStats(merchants);

  const openDetail = useCallback((merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setIsDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedMerchant(null);
  }, []);

  const openCreate = useCallback(() => {
    setFormData(DEFAULT_FORM);
    setError(null);
    setIsCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setIsCreateOpen(false);
    setFormData(DEFAULT_FORM);
    setError(null);
  }, []);

  const setFormField = useCallback(
    <K extends keyof MerchantCreate>(key: K, value: MerchantCreate[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const saveMerchant = useCallback(async () => {
    if (!formData.mid.trim()) {
      setError('가맹점 MID를 입력해주세요.');
      return;
    }
    if (!formData.name.trim()) {
      setError('가맹점 이름을 입력해주세요.');
      return;
    }
    if (!formData.business_number.trim()) {
      setError('사업자등록번호를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: MerchantCreate = {
      mid: formData.mid.trim(),
      name: formData.name.trim(),
      business_number: formData.business_number.trim(),
    };

    try {
      await apiClient.post('/admin/merchants/', payload);
      closeCreate();
      setRefreshTick((t) => t + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : '가맹점 등록에 실패했습니다.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, closeCreate]);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return {
    merchants,
    stats,
    isLoading,
    isSaving,
    error,
    search,
    setSearch,
    selectedMerchant,
    isDetailOpen,
    isCreateOpen,
    formData,
    openDetail,
    closeDetail,
    openCreate,
    closeCreate,
    setFormField,
    saveMerchant,
    refresh,
    filteredMerchants,
  };
}
