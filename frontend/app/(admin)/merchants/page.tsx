'use client';

import { useMerchantsViewModel } from '@/hooks/useMerchantsViewModel';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Merchant, MerchantStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function statusToVariant(status: MerchantStatus) {
  const map: Record<MerchantStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
    ACTIVE: 'success',
    SUSPENDED: 'danger',
    PENDING: 'warning',
    TERMINATED: 'neutral',
  };
  return map[status] ?? 'neutral';
}

function statusToLabel(status: MerchantStatus): string {
  const map: Record<MerchantStatus, string> = {
    ACTIVE: '운영 중',
    SUSPENDED: '정지',
    PENDING: '심사 중',
    TERMINATED: '해지',
  };
  return map[status] ?? status;
}

function formatFeeRate(settings: Merchant['settings']): string {
  if (!settings || typeof settings.fee_rate !== 'number') return '-';
  return `${settings.fee_rate}%`;
}

function formatSettlementCycle(settings: Merchant['settings']): string {
  if (!settings || typeof settings.settlement_cycle !== 'string') return '-';
  return String(settings.settlement_cycle);
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number | string;
  iconBg: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, iconBg, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[var(--color-neutral-500)]">{label}</p>
        <div
          className={`w-10 h-10 rounded-[var(--radius-lg)] ${iconBg} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-[var(--color-neutral-900)]">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  merchant: Merchant;
  onClose: () => void;
}

function DetailModal({ merchant, onClose }: DetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="가맹점 상세"
    >
      <div className="bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-neutral-200)]">
          <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">
            가맹점 상세
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[var(--color-primary)]">
                {merchant.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-neutral-900)]">{merchant.name}</p>
              <p className="text-xs text-[var(--color-neutral-500)]">{merchant.mid}</p>
            </div>
            <div className="ml-auto">
              <Badge
                label={statusToLabel(merchant.status)}
                variant={statusToVariant(merchant.status)}
                size="sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'MID', value: merchant.mid },
              { label: '사업자등록번호', value: merchant.business_number },
              { label: '수수료율', value: formatFeeRate(merchant.settings) },
              { label: '정산 주기', value: formatSettlementCycle(merchant.settings) },
              { label: '등록일', value: formatDate(merchant.created_at) },
              { label: '최종 수정', value: formatDate(merchant.updated_at) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] px-4 py-3"
              >
                <p className="text-xs text-[var(--color-neutral-500)] mb-0.5">{label}</p>
                <p className="text-sm font-medium text-[var(--color-neutral-900)]">{value}</p>
              </div>
            ))}
          </div>

          {merchant.settings && (
            <div className="bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] px-4 py-3">
              <p className="text-xs text-[var(--color-neutral-500)] mb-1">설정 (JSON)</p>
              <pre className="text-xs text-[var(--color-neutral-700)] overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(merchant.settings, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-[var(--color-neutral-200)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-50)] transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  formData: { mid: string; name: string; business_number: string };
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
  onFieldChange: (key: 'mid' | 'name' | 'business_number', value: string) => void;
}

function CreateModal({ formData, isSaving, error, onClose, onSave, onFieldChange }: CreateModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="가맹점 추가"
    >
      <div className="bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-neutral-200)]">
          <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">
            가맹점 추가
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)]">
            <svg className="w-4 h-4 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-[var(--color-danger)]">{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {(
            [
              { key: 'mid', label: '가맹점 MID', placeholder: '예: M006' },
              { key: 'name', label: '가맹점 이름', placeholder: '예: 베이킹하우스' },
              { key: 'business_number', label: '사업자등록번호', placeholder: '예: 678-90-12345' },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label
                htmlFor={`merchant-${key}`}
                className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1"
              >
                {label}
              </label>
              <input
                id={`merchant-${key}`}
                type="text"
                value={formData[key]}
                onChange={(e) => onFieldChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--color-neutral-200)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-50)] disabled:opacity-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
          >
            {isSaving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MerchantsPage() {
  const vm = useMerchantsViewModel();

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">가맹점 관리</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">
            등록된 PG 가맹점 현황
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={vm.refresh}
            disabled={vm.isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-50)] disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${vm.isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            새로고침
          </button>
          <button
            type="button"
            onClick={vm.openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            가맹점 추가
          </button>
        </div>
      </div>

      {/* Error state */}
      {vm.error && !vm.isCreateOpen && (
        <div
          className="mb-6 flex items-center gap-2 px-4 py-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-lg)]"
          role="alert"
        >
          <svg
            className="w-5 h-5 text-[var(--color-danger)] shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm text-[var(--color-danger)]">{vm.error}</span>
        </div>
      )}

      {/* Stats row */}
      {!vm.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard
            label="전체 가맹점"
            value={vm.stats.total}
            iconBg="bg-[var(--color-primary-light)]"
            icon={
              <svg
                className="w-5 h-5 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
          />
          <StatCard
            label="운영 중"
            value={vm.stats.active}
            iconBg="bg-[var(--color-success-light)]"
            icon={
              <svg
                className="w-5 h-5 text-[var(--color-success)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="정지"
            value={vm.stats.suspended}
            iconBg="bg-[var(--color-danger-light)]"
            icon={
              <svg
                className="w-5 h-5 text-[var(--color-danger)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Merchant table */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-[var(--color-neutral-200)]">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-neutral-400)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
              placeholder="MID, 이름 또는 사업자번호로 검색"
              className="w-full pl-9 pr-4 py-2 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading */}
        {vm.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" label="가맹점 목록 불러오는 중" />
          </div>
        ) : vm.filteredMerchants.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="w-12 h-12 text-[var(--color-neutral-300)] mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-sm text-[var(--color-neutral-500)]">
              {vm.search ? '검색 결과가 없습니다.' : '등록된 가맹점이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    가맹점
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    MID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    사업자등록번호
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    상태
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    수수료율
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    정산 주기
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wide">
                    등록일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {vm.filteredMerchants.map((merchant) => (
                  <tr
                    key={merchant.id}
                    onClick={() => vm.openDetail(merchant)}
                    className="hover:bg-[var(--color-neutral-50)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-[var(--color-primary)]">
                            {merchant.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-[var(--color-neutral-900)]">
                          {merchant.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-500)] font-mono text-xs">
                      {merchant.mid}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-500)]">
                      {merchant.business_number}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        label={statusToLabel(merchant.status)}
                        variant={statusToVariant(merchant.status)}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-700)]">
                      {formatFeeRate(merchant.settings)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-700)]">
                      {formatSettlementCycle(merchant.settings)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-neutral-500)]">
                      {formatDate(merchant.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Row count footer */}
        {!vm.isLoading && vm.filteredMerchants.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
            <p className="text-xs text-[var(--color-neutral-500)]">
              {vm.search
                ? `검색 결과 ${vm.filteredMerchants.length}건 (전체 ${vm.merchants.length}건)`
                : `총 ${vm.merchants.length}개 가맹점`}
            </p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {vm.isDetailOpen && vm.selectedMerchant && (
        <DetailModal merchant={vm.selectedMerchant} onClose={vm.closeDetail} />
      )}

      {/* Create modal */}
      {vm.isCreateOpen && (
        <CreateModal
          formData={vm.formData}
          isSaving={vm.isSaving}
          error={vm.error}
          onClose={vm.closeCreate}
          onSave={vm.saveMerchant}
          onFieldChange={vm.setFormField}
        />
      )}
    </div>
  );
}
