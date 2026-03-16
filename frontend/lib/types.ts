// Shared domain types used across features

export type ConversationStatus = 'OPEN' | 'ESCALATED' | 'RESOLVED';
export type MessageSender = 'AI' | 'CUSTOMER' | 'ADMIN' | 'SYSTEM';

// Tool data types for rich message rendering
export interface ToolData {
  display_type: 'transaction_card' | 'settlement_table' | 'error_code' | 'api_log' | 'text';
  data: TransactionData | SettlementData | ErrorCodeData | ApiLogData | Record<string, unknown>;
}

export interface TransactionData {
  tid: string;
  amount: number;
  payment_method: string;
  card_company?: string;
  card_number_masked?: string;
  status: string;
  error_code?: string;
  error_message?: string;
  customer_name?: string;
  order_id?: string;
  approved_at?: string;
  cancelled_at?: string;
  created_at: string;
}

export interface SettlementData {
  settlement_date: string;
  total_amount: number;
  fee_amount: number;
  net_amount: number;
  transaction_count: number;
  status: string;
}

export interface ErrorCodeData {
  code: string;
  category: string;
  description: string;
  solution: string;
  severity: string;
}

export interface ApiLogData {
  endpoint: string;
  method: string;
  status_code: number;
  error_code?: string;
  error_message?: string;
  latency_ms: number;
  created_at: string;
}

export interface MerchantUser {
  id: number;
  email: string;
  role: 'MERCHANT' | 'ADMIN';
  merchant_id: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: MessageSender;
  text: string;
  confidence?: number;
  tool_name?: string;
  tool_data?: ToolData;
  created_at: string;
}

export interface Conversation {
  id: number;
  customer_name: string;
  customer_email: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages?: Message[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface DashboardStats {
  total_conversations: number;
  open_conversations: number;
  escalated_conversations: number;
  resolved_conversations: number;
  avg_resolution_time_minutes?: number;
  ai_resolution_rate?: number;
}

export interface KnowledgeItem {
  id: number;
  title: string;
  category: string;
  content: string;
  tags: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationResponse {
  id: number;
  access_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: ConversationStatus;
  created_at: string;
}

export interface SendMessageResponse {
  message: Message;
  escalated: boolean;
}
