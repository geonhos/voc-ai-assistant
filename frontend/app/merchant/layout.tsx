'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface MerchantLayoutProps {
  children: ReactNode;
}

function ChatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/merchant/chat', label: '새 문의', icon: <ChatIcon /> },
  { href: '/merchant/conversations', label: '대화 목록', icon: <ListIcon /> },
];

function MerchantSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/merchant/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-[var(--color-neutral-200)] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[var(--color-neutral-200)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">가맹점 포털</h2>
            <p className="text-xs text-[var(--color-neutral-500)]">AI 어시스턴트</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]'
              }`}
            >
              <span className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral-500)]'}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[var(--color-neutral-200)]">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-[var(--color-neutral-700)] truncate">{user.email}</p>
            <p className="text-[11px] text-[var(--color-neutral-500)]">가맹점</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--color-neutral-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          로그아웃
        </button>
      </div>
    </aside>
  );
}

function MerchantProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/merchant/login');
      return;
    }
    if (!isLoading && user && user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      router.replace('/merchant/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-50)]">
        <div className="text-center">
          <div
            className="inline-block w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="로딩 중"
          />
          <p className="mt-3 text-sm text-[var(--color-neutral-500)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default function MerchantLayout({ children }: MerchantLayoutProps) {
  return (
    <MerchantProtectedRoute>
      <div className="flex min-h-screen bg-[var(--color-neutral-50)]">
        <MerchantSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </MerchantProtectedRoute>
  );
}
