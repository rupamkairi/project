export class StorageApi {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token || "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const organizationId =
      typeof window !== "undefined"
        ? localStorage.getItem("organizationId") || "default"
        : "default";

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "x-organization-id": organizationId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: `API Error: ${response.status}` }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async getUploadUrl(
    filename: string,
    contentType: string,
    folder?: string,
  ): Promise<{
    uploadUrl: string;
    fileId: string;
    key: string;
    expiresIn: number;
  }> {
    return this.request("/platform/plugin-storage/upload/url", {
      method: "POST",
      body: JSON.stringify({ filename, contentType, folder }),
    });
  }

  async completeUpload(
    fileId: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ file: unknown }> {
    return this.request("/platform/plugin-storage/upload/complete", {
      method: "POST",
      body: JSON.stringify({ fileId, metadata }),
    });
  }

  async listFiles(params?: {
    page?: number;
    limit?: number;
    folder?: string;
    contentType?: string;
  }): Promise<{
    files: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.folder) searchParams.set("folder", params.folder);
    if (params?.contentType)
      searchParams.set("contentType", params.contentType);

    const query = searchParams.toString();
    return this.request(
      `/platform/plugin-storage/files${query ? `?${query}` : ""}`,
    );
  }

  async getFile(fileId: string): Promise<unknown> {
    return this.request(`/platform/plugin-storage/files/${fileId}`);
  }

  async deleteFile(fileId: string): Promise<{ success: boolean }> {
    return this.request(`/platform/plugin-storage/files/${fileId}`, {
      method: "DELETE",
    });
  }

  async getDownloadUrl(fileId: string): Promise<{ url: string }> {
    return this.request(`/platform/plugin-storage/files/${fileId}/download`);
  }
}

export function createStorageApi(baseUrl: string, token?: string): StorageApi {
  return new StorageApi(baseUrl, token);
}
