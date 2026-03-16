'use client';

import { useKnowledgeBaseViewModel } from '@/hooks/useKnowledgeBaseViewModel';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function formatDate(dateStr: string): string {
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

export default function KnowledgePage() {
  const vm = useKnowledgeBaseViewModel();

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">지식 베이스</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">
            AI 응답 학습 데이터 관리 — 총 {vm.total}건
          </p>
        </div>
        <button
          type="button"
          onClick={vm.openCreateModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 문서
        </button>
      </div>

      {/* Error state */}
      {vm.error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-lg)]" role="alert">
          <svg className="w-5 h-5 text-[var(--color-danger)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-[var(--color-danger)]">{vm.error}</span>
        </div>
      )}

      {/* Content */}
      {vm.isLoading && vm.items.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" label="지식 베이스 불러오는 중" />
        </div>
      ) : vm.items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)]">
          <svg className="w-12 h-12 text-[var(--color-neutral-300)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm text-[var(--color-neutral-500)]">등록된 문서가 없습니다.</p>
          <button
            type="button"
            onClick={vm.openCreateModal}
            className="mt-3 text-sm text-[var(--color-primary)] hover:underline"
          >
            첫 문서를 추가해보세요
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vm.items.map((item) => (
            <div
              key={item.id}
              onClick={() => vm.openEditModal(item)}
              className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-neutral-200)] p-5 shadow-sm hover:shadow-md cursor-pointer transition-shadow group"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${item.active ? 'bg-[var(--color-success)]' : 'bg-[var(--color-neutral-300)]'}`}
                    title={item.active ? '활성' : '비활성'}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-3">
                <Badge label={item.category} variant="neutral" size="sm" />
              </div>

              {/* Content preview */}
              <p className="text-xs text-[var(--color-neutral-500)] line-clamp-2 mb-3">
                {item.content}
              </p>

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] text-[10px] rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-[10px] text-[var(--color-neutral-400)]">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-neutral-100)]">
                <span className="text-[11px] text-[var(--color-neutral-400)]">
                  {formatDate(item.updated_at)}
                </span>
                <span className={`text-[11px] font-medium ${item.active ? 'text-[var(--color-success)]' : 'text-[var(--color-neutral-400)]'}`}>
                  {item.active ? '활성' : '비활성'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      <Modal
        isOpen={vm.isModalOpen}
        onClose={vm.closeModal}
        title={vm.editingItem ? '문서 수정' : '새 문서 추가'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="kb-title" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
              제목 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              id="kb-title"
              type="text"
              value={vm.formData.title}
              onChange={(e) => vm.setFormField('title', e.target.value)}
              placeholder="문서 제목을 입력하세요"
              className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="kb-category" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
              카테고리 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              id="kb-category"
              type="text"
              value={vm.formData.category}
              onChange={(e) => vm.setFormField('category', e.target.value)}
              placeholder="예: FAQ, 정책, 기술지원"
              className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="kb-tags" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
              태그 (쉼표로 구분)
            </label>
            <input
              id="kb-tags"
              type="text"
              value={vm.formData.tags}
              onChange={(e) => vm.setFormField('tags', e.target.value)}
              placeholder="예: 환불, 배송, 주문취소"
              className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="kb-content" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">
              내용 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              id="kb-content"
              value={vm.formData.content}
              onChange={(e) => vm.setFormField('content', e.target.value)}
              placeholder="AI가 학습할 지식 내용을 상세히 작성해주세요."
              rows={8}
              className="w-full px-3.5 py-2.5 border border-[var(--color-neutral-300)] rounded-[var(--radius-md)] text-sm placeholder-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-vertical"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 px-3.5 bg-[var(--color-neutral-50)] rounded-[var(--radius-md)] border border-[var(--color-neutral-200)]">
            <div>
              <p className="text-sm font-medium text-[var(--color-neutral-700)]">활성화</p>
              <p className="text-xs text-[var(--color-neutral-500)]">비활성화 시 AI 학습에서 제외됩니다</p>
            </div>
            <button
              type="button"
              onClick={() => vm.setFormField('active', !vm.formData.active)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                vm.formData.active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-neutral-300)]'
              }`}
              role="switch"
              aria-checked={vm.formData.active}
              aria-label="활성화 토글"
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  vm.formData.active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Modal error */}
          {vm.error && vm.isModalOpen && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)]" role="alert">
              <span className="text-sm text-[var(--color-danger)]">{vm.error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {vm.editingItem ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('정말로 이 문서를 삭제하시겠습니까?')) {
                    vm.deleteItem(vm.editingItem!.id);
                    vm.closeModal();
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--color-danger)] bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-[var(--radius-md)] hover:opacity-80 transition-opacity"
              >
                삭제
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={vm.closeModal}
                disabled={vm.isSaving}
                className="px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-md)] hover:bg-[var(--color-neutral-50)] disabled:opacity-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={vm.saveItem}
                disabled={vm.isSaving}
                className="px-4 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {vm.isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
