'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-12 h-12 border-4',
};

export function LoadingSpinner({ size = 'md', label = '로딩 중' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center" role="status" aria-label={label}>
      <div
        className={`${sizeClasses[size]} border-[var(--color-primary)] border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );
}
