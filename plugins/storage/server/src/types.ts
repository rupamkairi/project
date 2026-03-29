// Storage Plugin Configuration
export interface StoragePluginConfig {
  s3?: {
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    region?: string;
    publicUrl?: string;
  };
}

// User info from actors table
export interface StorageActor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  type: "human" | "system" | "api_key";
  status: "pending" | "active" | "suspended" | "deleted";
}

// File metadata from database
export interface StorageFile {
  id: string;
  organizationId: string;
  bucket: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  meta: Record<string, unknown>;
  uploadedById: string;
  uploadedBy?: StorageActor;
  status: "pending" | "complete" | "failed";
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  version: number;
}

// Request types
export interface GetUploadUrlRequest {
  filename: string;
  contentType: string;
  folder?: string;
}

export interface GetUploadUrlResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  expiresIn: number;
}

export interface CompleteUploadRequest {
  fileId: string;
  metadata?: Record<string, unknown>;
}

export interface CompleteUploadResponse {
  file: StorageFile;
}

export interface ListFilesQuery {
  page?: number;
  limit?: number;
  folder?: string;
  contentType?: string;
}

export interface ListFilesResponse {
  files: StorageFile[];
  total: number;
  page: number;
  limit: number;
}

// Plugin return type
export interface StoragePlugin {
  plugin: unknown;
  config: StoragePluginConfig;
  getUploadUrl: (
    params: GetUploadUrlRequest & { organizationId: string; actorId: string },
  ) => Promise<GetUploadUrlResponse>;
  completeUpload: (
    params: CompleteUploadRequest & { organizationId: string; actorId: string },
  ) => Promise<CompleteUploadResponse>;
  deleteFile: (params: {
    fileId: string;
    organizationId: string;
  }) => Promise<void>;
  listFiles: (
    params: ListFilesQuery & { organizationId: string },
  ) => Promise<ListFilesResponse>;
  getFile: (params: {
    fileId: string;
    organizationId: string;
  }) => Promise<StorageFile | null>;
  getDownloadUrl: (params: {
    fileId: string;
    organizationId: string;
  }) => Promise<string>;
}
