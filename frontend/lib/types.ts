// Shared domain types used across features

export type ConversationStatus = 'OPEN' | 'ESCALATED' | 'RESOLVED';
export type MessageSender = 'AI' | 'CUSTOMER' | 'ADMIN' | 'SYSTEM';

export interface Message {
  id: number;
  conversation_id: number;
  sender: MessageSender;
  text: string;
  confidence?: number;
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
  status: ConversationStatus;
  created_at: string;
}

export interface SendMessageResponse {
  message: Message;
  escalated: boolean;
}
