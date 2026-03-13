'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface LoginViewModel {
  email: string;
  password: string;
  error: string | null;
  isLoading: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  handleLogin: () => Promise<void>;
}

export function useLoginViewModel(): LoginViewModel {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = useCallback(async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, router]);

  return {
    email,
    password,
    error,
    isLoading,
    setEmail,
    setPassword,
    handleLogin,
  };
}
