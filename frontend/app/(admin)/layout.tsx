import type { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar Navigation Placeholder */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">VOC AI Assistant</h2>
          <p className="text-xs text-neutral-500 mt-1">관리자 포털</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-neutral-100"
          >
            대시보드
          </a>
          <a
            href="/conversations"
            className="flex items-center px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-neutral-100"
          >
            대화 목록
          </a>
          <a
            href="/knowledge"
            className="flex items-center px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-neutral-100"
          >
            지식 베이스
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
