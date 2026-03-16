'use client';

import type { ConversationStatus } from '@/lib/types';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  size?: BadgeSize;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]',
  success: 'bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-border)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[var(--color-danger)]',
  neutral: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] border border-[var(--color-neutral-300)]',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ label, variant, size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {label}
    </span>
  );
}

export function statusToVariant(status: ConversationStatus): BadgeVariant {
  const map: Record<ConversationStatus, BadgeVariant> = {
    OPEN: 'primary',
    ESCALATED: 'warning',
    RESOLVED: 'success',
  };
  return map[status];
}

export function statusToLabel(status: ConversationStatus): string {
  const map: Record<ConversationStatus, string> = {
    OPEN: '진행 중',
    ESCALATED: '에스컬레이션',
    RESOLVED: '해결됨',
  };
  return map[status];
}
