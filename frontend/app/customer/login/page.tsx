'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface DemoAccount {
  name: string;
  email: string;
  password: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: '김고객',
    email: 'customer1@test.com',
    password: 'customer1234',
    description: '결제 오류 문의 이력 보유',
  },
  {
    name: '이고객',
    email: 'customer2@test.com',
    password: 'customer1234',
    description: 'API 연동 문의 이력 보유',
  },
];

export default function CustomerLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (account: DemoAccount) => {
    setIsLoading(account.email);
    setError(null);
    try {
      const response = await apiClient.post<{ access_token: string; refresh_token: string }>(
        '/auth/customer/login',
        { email: account.email, password: account.password },
      );
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user_role', 'CUSTOMER');
      router.push('/customer/conversations');
    } catch {
      setError('로그인에 실패했습니다.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">고객 포털</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-2">
            데모 계정을 선택하여 로그인하세요
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              onClick={() => handleLogin(account)}
              disabled={isLoading !== null}
              className="w-full flex items-center gap-4 p-4 border-2 border-[var(--color-neutral-200)] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-12 h-12 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                {account.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--color-neutral-900)]">{account.name}</p>
                <p className="text-xs text-[var(--color-neutral-500)]">{account.email}</p>
                <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">{account.description}</p>
              </div>
              {isLoading === account.email ? (
                <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-[var(--color-neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-[var(--color-neutral-400)] mt-6">
          POC 환경 — 데모 계정으로만 접속 가능합니다
        </p>
      </div>
    </div>
  );
}
