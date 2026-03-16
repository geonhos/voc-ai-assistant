'use client';

import type { MessageSender } from '@/lib/types';

interface MessageBubbleProps {
  sender: MessageSender;
  text: string;
  timestamp: string;
  confidence?: number;
}

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function MessageBubble({ sender, text, timestamp, confidence }: MessageBubbleProps) {
  if (sender === 'SYSTEM') {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[var(--color-neutral-200)]" />
        <span className="text-xs text-[var(--color-neutral-500)] bg-[var(--color-neutral-100)] px-3 py-1 rounded-full whitespace-nowrap">
          {text}
        </span>
        <div className="flex-1 h-px bg-[var(--color-neutral-200)]" />
      </div>
    );
  }

  if (sender === 'CUSTOMER') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%]">
          <div className="bg-[var(--color-primary)] text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
          <p className="text-[11px] text-[var(--color-neutral-500)] text-right mt-1">
            {formatTime(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (sender === 'ADMIN') {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[75%]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[var(--color-success)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-2 py-0.5 rounded-full">
              상담사
            </span>
          </div>
          <div className="bg-[var(--color-success-light)] border border-[var(--color-success-border)] text-[var(--color-neutral-900)] rounded-2xl rounded-tl-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
          <p className="text-[11px] text-[var(--color-neutral-500)] mt-1">
            {formatTime(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // AI sender
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">AI</span>
          </div>
          <span className="text-xs text-[var(--color-neutral-500)]">AI 어시스턴트</span>
          {confidence !== undefined && (
            <span className="text-[11px] text-[var(--color-neutral-400)]">
              ({Math.round(confidence * 100)}%)
            </span>
          )}
        </div>
        <div className="bg-white border border-[var(--color-neutral-200)] text-[var(--color-neutral-900)] rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
        <p className="text-[11px] text-[var(--color-neutral-500)] mt-1">
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
