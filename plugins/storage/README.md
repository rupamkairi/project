# Storage Plugin

A reusable fullstack plugin for file uploads and management using S3-compatible object storage.

## Features

- Presigned URL-based uploads (direct-to-S3)
- File metadata storage in PostgreSQL
- React upload component with drag & drop
- User information linking (uploadedBy)
- Soft delete support

## Quick Start

### 1. Server Integration

Add dependency to your compose server:

```json
// composes/{name}/server/package.json
{
  "dependencies": {
    "@projectx/plugin-storage-server": "workspace:*"
  }
}
```

Register the plugin:

```typescript
// composes/{name}/server/src/index.ts
import { Elysia } from "elysia";
import { createStoragePlugin } from "@projectx/plugin-storage-server";

const storagePlugin = createStoragePlugin({
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    publicUrl: process.env.S3_PUBLIC_URL,
  }
});

export const {name}Compose = new Elysia({ prefix: "/{name}" })
  .use(authRoutes)
  .use(userRoutes)
  .use(storagePlugin.plugin);
```

### 2. Web Integration

Add dependency to your compose web:

```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/plugin-storage-web": "workspace:*"
  }
}
```

Create API client:

```typescript
// composes/{name}/web/src/lib/storage.ts
import { createStorageApi } from "@projectx/plugin-storage-web";

const STORAGE_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:10050";
export const storageApi = createStorageApi(STORAGE_API_URL);
```

Use the upload component:

```tsx
// composes/{name}/web/src/routes/files.tsx
import { FileUpload } from "@projectx/plugin-storage-web";
import { storageApi } from "../lib/storage";

export function FilesPage() {
  return (
    <FileUpload
      api={storageApi}
      accept={{ "image/*": [".jpg", ".png"] }}
      maxSize={10 * 1024 * 1024}
      folder="uploads"
      onUploadComplete={(file) => console.log("Uploaded:", file)}
    />
  );
}
```

### 3. Environment Variables

```env
S3_ENDPOINT="https://your-bucket.s3.region.amazonaws.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="your-bucket"
S3_REGION="us-east-1"
S3_PUBLIC_URL="https://your-bucket.s3.region.amazonaws.com"
```

---

## API Reference

### REST Endpoints

All endpoints are prefixed with `/platform/plugin-storage`

| Method | Endpoint              | Description                |
| ------ | --------------------- | -------------------------- |
| GET    | `/files`              | List files with pagination |
| GET    | `/files/:id`          | Get single file            |
| POST   | `/upload/url`         | Get presigned upload URL   |
| POST   | `/upload/complete`    | Mark upload as complete    |
| DELETE | `/files/:id`          | Delete file                |
| GET    | `/files/:id/download` | Get download URL           |

---

#### GET `/files`

List files with pagination.

**Query Parameters:**

| Parameter   | Type   | Default | Description         |
| ----------- | ------ | ------- | ------------------- |
| page        | number | 1       | Page number         |
| limit       | number | 20      | Items per page      |
| folder      | string | -       | Filter by folder    |
| contentType | string | -       | Filter by MIME type |

**Headers:**

- `x-organization-id` (required)
- `Authorization` (required)

**Response:**

```json
{
  "files": [
    {
      "id": "file_xxx",
      "filename": "image.jpg",
      "contentType": "image/jpeg",
      "size": 102400,
      "uploadedById": "user_123",
      "uploadedBy": {
        "id": "user_123",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "avatarUrl": null,
        "type": "human",
        "status": "active"
      },
      "status": "complete",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

#### POST `/upload/url`

Get presigned URL for uploading.

**Request Body:**

```json
{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "folder": "avatars"
}
```

**Response:**

```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...&signature=...",
  "fileId": "file_xxx",
  "key": "avatars/1705312200000_abc_image.jpg",
  "expiresIn": 3600
}
```

---

#### POST `/upload/complete`

Mark upload as complete.

**Request Body:**

```json
{
  "fileId": "file_xxx",
  "metadata": { "description": "Profile photo" }
}
```

**Response:**

```json
{
  "file": {
    "id": "file_xxx",
    "status": "complete",
    ...
  }
}
```

---

#### DELETE `/files/:id`

Delete a file (soft delete).

**Response:**

```json
{
  "success": true
}
```

---

### Programmatic API

```typescript
const {
  getUploadUrl,
  completeUpload,
  deleteFile,
  listFiles,
  getFile,
  getDownloadUrl,
} = storagePlugin;

// Get presigned upload URL
const { uploadUrl, fileId } = await getUploadUrl({
  filename: "image.jpg",
  contentType: "image/jpeg",
  organizationId: "org_123",
  actorId: "user_456",
});

// Complete upload
const { file } = await completeUpload({
  fileId: "file_xxx",
  organizationId: "org_123",
});

// List files
const { files } = await listFiles({
  page: 1,
  limit: 20,
  organizationId: "org_123",
});

// Get single file
const file = await getFile({
  fileId: "file_xxx",
  organizationId: "org_123",
});

// Get download URL
const url = await getDownloadUrl({
  fileId: "file_xxx",
  organizationId: "org_123",
});

// Delete file
await deleteFile({
  fileId: "file_xxx",
  organizationId: "org_123",
});
```

---

### Web Client (StorageApi)

```typescript
import { createStorageApi } from "@projectx/plugin-storage-web";

const api = createStorageApi("http://localhost:10050");

// Get presigned upload URL
const { uploadUrl, fileId, key } = await api.getUploadUrl(
  "image.jpg",
  "image/jpeg",
  "avatars",
);

// Complete upload
const { file } = await api.completeUpload("file_xxx", { description: "..." });

// List files
const { files, total } = await api.listFiles({ page: 1, limit: 20 });

// Get file
const file = await api.getFile("file_xxx");

// Delete file
await api.deleteFile("file_xxx");

// Get download URL
const { url } = await api.getDownloadUrl("file_xxx");
```

---

## Types

### StorageFile

```typescript
interface StorageFile {
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
```

### StorageActor

```typescript
interface StorageActor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  type: "human" | "system" | "api_key";
  status: "pending" | "active" | "suspended" | "deleted";
}
```

---

## FileUpload Component

```tsx
import { FileUpload } from "@projectx/plugin-storage-web";

interface FileUploadProps {
  api: StorageApi;
  accept?: Record<string, string[]>; // e.g., { "image/*": [".jpg", ".png"] }
  maxSize?: number; // bytes
  folder?: string; // S3 folder prefix
  onUploadComplete?: (file: StorageFile) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
}
```

---

## Database Schema

The plugin requires the `storage_files` table:

| Column         | Type      | Description             |
| -------------- | --------- | ----------------------- |
| id             | text      | ULID format             |
| organizationId | text      | Multi-tenant ID         |
| bucket         | text      | S3 bucket               |
| key            | text      | S3 object key           |
| filename       | text      | Original filename       |
| contentType    | text      | MIME type               |
| size           | integer   | File size               |
| meta           | jsonb     | Metadata                |
| uploadedById   | text      | Uploader ID             |
| status         | text      | pending/complete/failed |
| createdAt      | timestamp | Creation time           |
| updatedAt      | timestamp | Last update             |
| deletedAt      | timestamp | Soft delete             |
| version        | integer   | Concurrency             |

Run migration:

```bash
cd apps/server
bun run db:generate
bun run db:migrate
```
