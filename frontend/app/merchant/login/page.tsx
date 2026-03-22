'use client';

import { useMerchantLoginViewModel } from '@/hooks/useMerchantLoginViewModel';

export default function MerchantLoginPage() {
  const { mid, password, error, isLoading, setMid, setPassword, handleLogin } =
    useMerchantLoginViewModel();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <main className="min-h-screen flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-[var(--color-primary-dark)] px-12 py-16">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-white/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">가맹점 포털</h1>
          <p className="text-white/70 text-base leading-relaxed">
            PG사 AI 어시스턴트로 결제 문의를
            <br />
            신속하게 해결하세요.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { icon: '💳', title: '거래 조회', desc: '결제 승인/실패 내역을 즉시 확인' },
              { icon: '📊', title: '정산 현황', desc: '일별·월별 정산 내역 조회' },
              { icon: '🔍', title: '오류 분석', desc: 'API 오류 원인과 해결 방법 안내' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 text-left bg-white/10 rounded-[var(--radius-lg)] p-4">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-8 py-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">가맹점 포털</h1>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-1">가맹점 포털 로그인</h2>
          <p className="text-sm text-[var(--color-neutral-500)] mb-8">
            가맹점 계정으로 로그인하세요.
          </p>

          <div className="space-y-4">
            {/* MID */}
            <div>
              <label
                htmlFor="mid"
                className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5"
              >
                가맹점 ID
              </label>
              <input
                id="mid"
                type="text"
                autoComplete="username"
                value={mid}
                onChange={(e) => setMid(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="가맹점 ID (예: M001)"
                className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
                aria-invalid={!!error}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
                aria-invalid={!!error}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)]"
                role="alert"
              >
                <svg className="w-4 h-4 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-[var(--color-danger)]">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
