'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface MerchantLoginViewModel {
  mid: string;
  password: string;
  error: string | null;
  isLoading: boolean;
  setMid: (mid: string) => void;
  setPassword: (password: string) => void;
  handleLogin: () => Promise<void>;
}

export function useMerchantLoginViewModel(): MerchantLoginViewModel {
  const [mid, setMid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { merchantLogin } = useAuth();
  const router = useRouter();

  const handleLogin = useCallback(async () => {
    if (!mid.trim()) {
      setError('가맹점 ID를 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await merchantLogin(mid.trim(), password);
      router.replace('/merchant/chat');
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [mid, password, merchantLogin, router]);

  return {
    mid,
    password,
    error,
    isLoading,
    setMid,
    setPassword,
    handleLogin,
  };
}
