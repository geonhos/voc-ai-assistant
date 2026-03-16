const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refresh_token')
      : null;
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      ...extraHeaders,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    // Auto-refresh on 401 and retry once
    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
        });
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      const detail = Array.isArray(error.detail)
        ? error.detail.map((e: { msg?: string }) => e.msg).join(', ')
        : error.detail;
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(path: string, extraHeaders?: Record<string, string>) {
    return this.request<T>(path, {}, extraHeaders);
  }

  post<T>(path: string, body: unknown, extraHeaders?: Record<string, string>) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }, extraHeaders);
  }

  put<T>(path: string, body: unknown, extraHeaders?: Record<string, string>) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) }, extraHeaders);
  }

  patch<T>(path: string, body: unknown, extraHeaders?: Record<string, string>) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, extraHeaders);
  }

  delete<T>(path: string, extraHeaders?: Record<string, string>) {
    return this.request<T>(path, { method: 'DELETE' }, extraHeaders);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
