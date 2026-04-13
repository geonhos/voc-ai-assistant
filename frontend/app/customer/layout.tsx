'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/customer/chat', label: '새 문의', Icon: ChatIcon },
  { href: '/customer/conversations', label: '내 대화 목록', Icon: ListIcon },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    if (!token || role !== 'CUSTOMER') {
      setIsAuthChecking(false);
      if (pathname !== '/customer/login') {
        router.push('/customer/login');
      }
      return;
    }
    apiClient
      .get<{ id: number; email: string; role: string }>('/auth/me')
      .then((data) => {
        setUserEmail(data.email || `User #${data.id}`);
      })
      .catch(() => {
        setUserEmail('');
        router.push('/customer/login');
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, [pathname, router]);

  if (pathname === '/customer/login') {
    return <>{children}</>;
  }

  if (isAuthChecking) {
    return <div className="flex items-center justify-center h-screen text-sm text-[var(--color-neutral-400)]">로딩 중...</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    router.push('/customer/login');
  };

  return (
    <div className="flex h-screen bg-[var(--color-neutral-50)]">
      <aside className="w-56 bg-white border-r border-[var(--color-neutral-200)] flex flex-col">
        <div className="p-4 border-b border-[var(--color-neutral-200)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <span className="text-sm text-white font-bold">C</span>
            </div>
            <div>
              <h2 className="font-bold text-sm text-[var(--color-neutral-900)]">고객 포털</h2>
              <p className="text-[11px] text-[var(--color-neutral-500)]">AI 상담</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === href
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--color-neutral-200)]">
          <p className="text-xs text-[var(--color-neutral-500)] mb-2">{userEmail}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]"
          >
            <LogoutIcon className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
