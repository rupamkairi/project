const SERVER_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE = SERVER_ROOT + "/crm";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface ListResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

class CrmApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("platform_token");
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Request failed" };
      return { data };
    } catch {
      return { error: "Network error" };
    }
  }

  // Analytics
  async getAnalyticsOverview() {
    return this.request<any>("/analytics/overview");
  }

  // Contacts
  async getContacts(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/contacts${q}`);
  }
  async getContact(id: string) {
    return this.request<any>(`/contacts/${id}`);
  }
  async createContact(data: any) {
    return this.request<any>("/contacts", { method: "POST", body: JSON.stringify(data) });
  }
  async updateContact(id: string, data: any) {
    return this.request<any>(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteContact(id: string) {
    return this.request<any>(`/contacts/${id}`, { method: "DELETE" });
  }

  // Accounts
  async getAccounts(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/accounts${q}`);
  }
  async getAccount(id: string) {
    return this.request<any>(`/accounts/${id}`);
  }
  async createAccount(data: any) {
    return this.request<any>("/accounts", { method: "POST", body: JSON.stringify(data) });
  }
  async updateAccount(id: string, data: any) {
    return this.request<any>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteAccount(id: string) {
    return this.request<any>(`/accounts/${id}`, { method: "DELETE" });
  }

  // Leads
  async getLeads(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/leads${q}`);
  }
  async getLead(id: string) {
    return this.request<any>(`/leads/${id}`);
  }
  async createLead(data: any) {
    return this.request<any>("/leads", { method: "POST", body: JSON.stringify(data) });
  }
  async updateLead(id: string, data: any) {
    return this.request<any>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteLead(id: string) {
    return this.request<any>(`/leads/${id}`, { method: "DELETE" });
  }
  async qualifyLead(id: string) {
    return this.request<any>(`/leads/${id}/qualify`, { method: "POST" });
  }
  async disqualifyLead(id: string, reason: string) {
    return this.request<any>(`/leads/${id}/disqualify`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async convertLead(id: string) {
    return this.request<any>(`/leads/${id}/convert`, { method: "POST" });
  }

  // Deals
  async getDeals(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/deals${q}`);
  }
  async getDeal(id: string) {
    return this.request<any>(`/deals/${id}`);
  }
  async createDeal(data: any) {
    return this.request<any>("/deals", { method: "POST", body: JSON.stringify(data) });
  }
  async updateDeal(id: string, data: any) {
    return this.request<any>(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteDeal(id: string) {
    return this.request<any>(`/deals/${id}`, { method: "DELETE" });
  }
  async moveDeal(id: string, stageId: string) {
    return this.request<any>(`/deals/${id}/move`, { method: "POST", body: JSON.stringify({ stageId }) });
  }
  async winDeal(id: string) {
    return this.request<any>(`/deals/${id}/win`, { method: "POST" });
  }
  async loseDeal(id: string, lostReason: string) {
    return this.request<any>(`/deals/${id}/lose`, { method: "POST", body: JSON.stringify({ lostReason }) });
  }

  // Pipelines
  async getPipelines() {
    return this.request<ListResponse<any>>("/pipelines");
  }
  async getPipelineStages(pipelineId: string) {
    return this.request<any[]>(`/pipelines/${pipelineId}/stages`);
  }

  // Activities
  async getActivities(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/activities${q}`);
  }
  async createActivity(data: any) {
    return this.request<any>("/activities", { method: "POST", body: JSON.stringify(data) });
  }
  async updateActivity(id: string, data: any) {
    return this.request<any>(`/activities/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteActivity(id: string) {
    return this.request<any>(`/activities/${id}`, { method: "DELETE" });
  }
  async completeActivity(id: string, outcome?: string) {
    return this.request<any>(`/activities/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    });
  }

  // Campaigns
  async getCampaigns(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/campaigns${q}`);
  }
  async getCampaign(id: string) {
    return this.request<any>(`/campaigns/${id}`);
  }
  async createCampaign(data: any) {
    return this.request<any>("/campaigns", { method: "POST", body: JSON.stringify(data) });
  }
  async updateCampaign(id: string, data: any) {
    return this.request<any>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteCampaign(id: string) {
    return this.request<any>(`/campaigns/${id}`, { method: "DELETE" });
  }
  async sendCampaign(id: string) {
    return this.request<any>(`/campaigns/${id}/send`, { method: "POST" });
  }
  async pauseCampaign(id: string) {
    return this.request<any>(`/campaigns/${id}/pause`, { method: "POST" });
  }
  async cancelCampaign(id: string) {
    return this.request<any>(`/campaigns/${id}/cancel`, { method: "POST" });
  }

  // Segments
  async getSegments(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/segments${q}`);
  }
  async getSegment(id: string) {
    return this.request<any>(`/segments/${id}`);
  }
  async createSegment(data: any) {
    return this.request<any>("/segments", { method: "POST", body: JSON.stringify(data) });
  }
  async updateSegment(id: string, data: any) {
    return this.request<any>(`/segments/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deleteSegment(id: string) {
    return this.request<any>(`/segments/${id}`, { method: "DELETE" });
  }
  async getSegmentContacts(id: string) {
    return this.request<ListResponse<any>>(`/segments/${id}/contacts`);
  }

  // Tickets
  async getTickets(params?: Record<string, any>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<ListResponse<any>>(`/tickets${q}`);
  }
  async createTicket(data: any) {
    return this.request<any>("/tickets", { method: "POST", body: JSON.stringify(data) });
  }
  async resolveTicket(id: string) {
    return this.request<any>(`/tickets/${id}/resolve`, { method: "POST" });
  }
}

export const crmApi = new CrmApiClient();
