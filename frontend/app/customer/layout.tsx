'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    if (!token || role !== 'CUSTOMER') {
      if (pathname !== '/customer/login') {
        router.push('/customer/login');
      }
      return;
    }
    // Decode email from token (simple JWT parse)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.sub ? `User #${payload.sub}` : '');
    } catch {
      setUserEmail('');
    }
  }, [pathname, router]);

  if (pathname === '/customer/login') {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    router.push('/customer/login');
  };

  const navItems = [
    { href: '/customer/chat', label: '새 문의', icon: 'chat_bubble_outline' },
    { href: '/customer/conversations', label: '내 대화 목록', icon: 'forum' },
  ];

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
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]'
              }`}
            >
              <span className="material-icons-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--color-neutral-200)]">
          <p className="text-xs text-[var(--color-neutral-500)] mb-2">{userEmail}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]"
          >
            <span className="material-icons-outlined text-[16px]">logout</span>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
