'use client';

import type { MessageSender, ToolData, TransactionData, SettlementData, ErrorCodeData, ApiLogData, ClarificationData } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import { TransactionCard } from './TransactionCard';
import { SettlementTable } from './SettlementTable';
import { ErrorCodeInfo } from './ErrorCodeInfo';
import { ApiLogTable } from './ApiLogTable';
import { ClarificationBubble } from './ClarificationBubble';

interface MessageBubbleProps {
  sender: MessageSender;
  text: string;
  timestamp: string;
  confidence?: number;
  toolData?: ToolData;
  onOptionSelect?: (text: string) => void;
  disabled?: boolean;
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

interface ToolDataRendererProps {
  toolData: ToolData;
  onOptionSelect?: (text: string) => void;
  disabled?: boolean;
}

function ToolDataRenderer({ toolData, onOptionSelect, disabled }: ToolDataRendererProps) {
  return (
    <div className="mt-2">
      {toolData.display_type === 'transaction_card' && (
        <TransactionCard data={toolData.data as TransactionData} />
      )}
      {toolData.display_type === 'settlement_table' && (
        <SettlementTable data={toolData.data as SettlementData} />
      )}
      {toolData.display_type === 'error_code' && (
        <ErrorCodeInfo data={toolData.data as ErrorCodeData} />
      )}
      {toolData.display_type === 'api_log' && (
        <ApiLogTable data={toolData.data as ApiLogData} />
      )}
      {toolData.display_type === 'clarification' && (
        <ClarificationBubble
          data={toolData.data as ClarificationData}
          onOptionSelect={onOptionSelect}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export function MessageBubble({ sender, text, timestamp, confidence, toolData, onOptionSelect, disabled }: MessageBubbleProps) {
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
          <div className="text-sm leading-relaxed prose prose-sm prose-neutral max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5">
            <ReactMarkdown skipHtml>{text}</ReactMarkdown>
          </div>
          {toolData && <ToolDataRenderer toolData={toolData} onOptionSelect={onOptionSelect} disabled={disabled} />}
        </div>
        <p className="text-[11px] text-[var(--color-neutral-500)] mt-1">
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
