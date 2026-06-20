export interface CheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
  expiresAt: number;
}

export interface SessionStatus {
  id: string;
  amount: { amount: number; currency: string };
  status: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export function createPaymentApiClient(baseUrl: string) {
  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Payment API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(`Payment API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    initiateCheckout(req: CheckoutRequest): Promise<CheckoutResponse> {
      return post<CheckoutResponse>("/payment/session", req);
    },

    getSessionStatus(sessionId: string): Promise<SessionStatus> {
      return get<SessionStatus>(`/payment/session/${sessionId}`);
    },
  };
}
