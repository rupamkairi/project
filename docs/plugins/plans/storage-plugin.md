# Storage Plugin - Documentation

## Overview

The Storage Plugin is a reusable fullstack capability for handling file uploads and management using S3-compatible object storage. It provides presigned URL-based uploads, file metadata storage in PostgreSQL, and a React-based upload component.

---

## 1. Architecture

### 1.1 How It Fits Into the Architecture

The Storage Plugin follows the **Plugin Pattern** (similar to Notification Plugin), sitting between Infrastructure and Compose layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: COMPOSE  (platform)    → Integration & orchestration              │
│  Layer 2: PLUGIN   (storage)     → Reusable storage capability              │
│  Layer 1: MODULE   (core)        → Domain primitives (future)              │
│  Layer 0: INFRA                 → S3 client, DB schema                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Plugin vs Module

| Aspect       | Plugin                       | Module                   |
| ------------ | ---------------------------- | ------------------------ |
| **Purpose**  | Infrastructure capabilities  | Domain capabilities      |
| **Examples** | Storage, Notification, Email | User Management, Billing |
| **Location** | `plugins/*/`                 | `modules/*/`             |
| **Owned by** | Core/Infra team              | Domain teams             |

### 1.3 Component Structure

```
plugins/storage/
├── server/                    # Elysia server plugin
│   ├── src/
│   │   ├── index.ts           # Plugin factory (createStoragePlugin)
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── routes/
│   │   │   ├── files.ts       # File CRUD endpoints
│   │   │   └── upload.ts      # Upload with presigned URLs
│   │   └── lib/
│   │       └── s3.ts          # S3 operations wrapper
│   └── package.json
│
└── web/                       # React components & API client
    ├── src/
    │   ├── index.ts           # Exports
    │   ├── lib/
    │   │   └── api.ts        # StorageApi client class
    │   └── components/
    │       └── file-upload.tsx
    └── package.json
```

### 1.4 Data Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client   │────▶│  Server Routes  │────▶│  Database   │     │     S3      │
│  (Browser) │     │  (Elysia)       │     │ (PostgreSQL)│     │ (Object     │
│            │◀────│                 │◀────│             │     │  Storage)   │
└─────────────┘     └─────────────────┘     └─────────────┘     └─────────────┘
      │                     │                                               │
      │  1. Request         │  2. Create DB record                          │
      │     presigned URL  │     with "pending" status                     │
      │                                        │                              │
      │  4. Complete       │  3. Upload directly to S3                     │
      │     upload        │     using presigned URL                         │
```

---

## 2. Integration Guide

### 2.1 Prerequisites

1. **Database Schema**: The `storage_files` table must exist in your database
2. **S3 Configuration**: Set environment variables for S3 access
3. **Plugin Registration**: Add to your compose's server and web

### 2.2 Environment Variables

Add to your `.env` file:

```env
# Storage - S3 Compatible
S3_ENDPOINT="https://your-bucket.s3.region.amazonaws.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="your-bucket-name"
S3_REGION="us-east-1"
S3_PUBLIC_URL="https://your-bucket.s3.region.amazonaws.com"  # optional
```

### 2.3 Server Integration

**Step 1: Add dependency**

```json
// composes/{name}/server/package.json
{
  "dependencies": {
    "@projectx/plugin-storage-server": "workspace:*"
  }
}
```

**Step 2: Import and register plugin**

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

**Step 3: Add schema to dbSchemas**

Ensure storage schema is registered in `apps/server/src/index.ts`:

```typescript
// apps/server/src/index.ts
import { storageFiles } from "@infra/db/schema/storage";

// In dbSchemas array:
dbSchemas.push(storageFiles);
```

### 2.4 Web Integration

**Step 1: Add dependency**

```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/plugin-storage-web": "workspace:*"
  }
}
```

**Step 2: Create API client**

```typescript
// composes/{name}/web/src/lib/storage.ts
import { createStorageApi } from "@projectx/plugin-storage-web";

const STORAGE_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:10050";

export const storageApi = createStorageApi(STORAGE_API_URL);
```

**Step 3: Use the Upload Component**

```tsx
// composes/{name}/web/src/routes/files.tsx
import { FileUpload } from "@projectx/plugin-storage-web";
import { storageApi } from "../lib/storage";

export function FilesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Files</h1>
      <FileUpload
        api={storageApi}
        accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
        maxSize={10 * 1024 * 1024} // 10MB
        folder="uploads"
        onUploadComplete={(file) => {
          console.log("Uploaded:", file);
        }}
      />
    </div>
  );
}
```

---

## 3. API Reference

### 3.1 Plugin API (Server-Side)

#### `createStoragePlugin(config)`

Creates the storage plugin with S3 configuration.

```typescript
import { createStoragePlugin } from "@projectx/plugin-storage-server";

const storage = createStoragePlugin({
  s3: {
    endpoint: "https://...",
    accessKeyId: "...",
    secretAccessKey: "...",
    bucket: "...",
    region: "...",
  },
});
```

**Config Type:**

```typescript
interface StoragePluginConfig {
  s3?: {
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    region?: string;
    publicUrl?: string;
  };
}
```

#### Programmatic Methods

```typescript
const {
  getUploadUrl,
  completeUpload,
  deleteFile,
  listFiles,
  getFile,
  getDownloadUrl,
} = storage;

// Get presigned upload URL
const { uploadUrl, fileId, key, expiresIn } = await getUploadUrl({
  filename: "image.jpg",
  contentType: "image/jpeg",
  folder: "avatars",
  organizationId: "org_123",
  actorId: "user_456",
});

// Complete upload
const { file } = await completeUpload({
  fileId: "file_xxx",
  metadata: { description: "Profile photo" },
  organizationId: "org_123",
});

// List files
const { files, total, page, limit } = await listFiles({
  page: 1,
  limit: 20,
  folder: "avatars",
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

// Delete file (soft delete)
await deleteFile({
  fileId: "file_xxx",
  organizationId: "org_123",
});
```

### 3.2 REST API Endpoints

All endpoints are prefixed with `/platform/plugin-storage`

#### GET `/files`

List files with pagination.

**Query Parameters:**

| Parameter   | Type   | Default | Description             |
| ----------- | ------ | ------- | ----------------------- |
| page        | number | 1       | Page number             |
| limit       | number | 20      | Items per page          |
| folder      | string | -       | Filter by folder prefix |
| contentType | string | -       | Filter by MIME type     |

**Headers:**

| Header            | Required | Description            |
| ----------------- | -------- | ---------------------- |
| x-organization-id | Yes      | Organization ID        |
| x-actor-id        | No       | Actor ID for user info |
| Authorization     | Yes      | Bearer token           |

**Response:**

```json
{
  "files": [
    {
      "id": "file_xxx",
      "organizationId": "org_123",
      "bucket": "my-bucket",
      "key": "avatars/123456_image.jpg",
      "filename": "image.jpg",
      "contentType": "image/jpeg",
      "size": 102400,
      "uploadedById": "user_456",
      "uploadedBy": {
        "id": "user_456",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "avatarUrl": "https://...",
        "type": "human",
        "status": "active"
      },
      "status": "complete",
      "meta": {},
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "deletedAt": null,
      "version": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

#### GET `/files/:id`

Get a single file by ID.

**Response:**

```json
{
  "id": "file_xxx",
  "organizationId": "org_123",
  "bucket": "my-bucket",
  "key": "avatars/123456_image.jpg",
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "size": 102400,
  "uploadedById": "user_456",
  "uploadedBy": {
    "id": "user_456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": null,
    "type": "human",
    "status": "active"
  },
  "status": "complete",
  "meta": {},
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "deletedAt": null,
  "version": 1
}
```

---

#### POST `/upload/url`

Get a presigned URL for uploading a file.

**Request Body:**

```json
{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "folder": "avatars"
}
```

| Field       | Type   | Required | Description                  |
| ----------- | ------ | -------- | ---------------------------- |
| filename    | string | Yes      | Original filename            |
| contentType | string | Yes      | MIME type (e.g., image/jpeg) |
| folder      | string | No       | Optional folder prefix       |

**Response:**

```json
{
  "uploadUrl": "https://my-bucket.s3.amazonaws.com/avatars/...&signature=...",
  "fileId": "file_xxx",
  "key": "avatars/1705312200000_abc123_image.jpg",
  "expiresIn": 3600
}
```

**Usage:**

```javascript
// 1. Get presigned URL
const { uploadUrl, fileId } = await fetch(
  "/platform/plugin-storage/upload/url",
  {
    method: "POST",
    headers: { "x-organization-id": "org_123" },
    body: JSON.stringify({ filename: "image.jpg", contentType: "image/jpeg" }),
  },
).then((r) => r.json());

// 2. Upload directly to S3
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
  body: fileBlob,
});

// 3. Mark upload as complete
await fetch("/platform/plugin-storage/upload/complete", {
  method: "POST",
  headers: { "x-organization-id": "org_123" },
  body: JSON.stringify({ fileId }),
});
```

---

#### POST `/upload/complete`

Mark an upload as complete.

**Request Body:**

```json
{
  "fileId": "file_xxx",
  "metadata": {
    "description": "Profile photo"
  }
}
```

| Field    | Type   | Required | Description                      |
| -------- | ------ | -------- | -------------------------------- |
| fileId   | string | Yes      | File ID from upload URL response |
| metadata | object | No       | Additional metadata              |

**Response:**

```json
{
  "file": {
    "id": "file_xxx",
    "organizationId": "org_123",
    "filename": "image.jpg",
    "status": "complete",
    "uploadedBy": { ... },
    ...
  }
}
```

---

#### DELETE `/files/:id`

Delete a file (soft delete - marks as deleted in DB).

**Response:**

```json
{
  "success": true
}
```

---

#### GET `/files/:id/download`

Get a presigned download URL for a file.

**Response:**

```json
{
  "url": "https://my-bucket.s3.amazonaws.com/...&signature=..."
}
```

---

### 3.3 Web API Client

#### `StorageApi` Class

```typescript
import { createStorageApi } from "@projectx/plugin-storage-web";

const api = createStorageApi("http://localhost:10050");
```

**Methods:**

```typescript
// Get presigned upload URL
const { uploadUrl, fileId, key, expiresIn } = await api.getUploadUrl(
  "image.jpg",
  "image/jpeg",
  "avatars", // optional folder
);

// Complete upload
const { file } = await api.completeUpload("file_xxx", { description: "..." });

// List files
const { files, total, page, limit } = await api.listFiles({
  page: 1,
  limit: 20,
  folder: "avatars",
  contentType: "image/jpeg",
});

// Get single file
const file = await api.getFile("file_xxx");

// Delete file
const { success } = await api.deleteFile("file_xxx");

// Get download URL
const { url } = await api.getDownloadUrl("file_xxx");
```

#### TypeScript Types

```typescript
// Exported from @projectx/plugin-storage-web
export interface StorageActor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  type: "human" | "system" | "api_key";
  status: "pending" | "active" | "suspended" | "deleted";
}

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
```

---

### 3.4 React Component

#### `FileUpload` Props

```tsx
import { FileUpload } from "@projectx/plugin-storage-web";
import { StorageApi } from "@projectx/plugin-storage-web";

interface FileUploadProps {
  api: StorageApi;
  accept?: Record<string, string[]>;
  maxSize?: number;
  folder?: string;
  onUploadComplete?: (file: StorageFile) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
}
```

| Prop             | Type       | Default  | Description                                                   |
| ---------------- | ---------- | -------- | ------------------------------------------------------------- |
| api              | StorageApi | required | API client instance                                           |
| accept           | Record     | -        | Accepted file types (e.g., `{ "image/*": [".jpg", ".png"] }`) |
| maxSize          | number     | -        | Max file size in bytes                                        |
| folder           | string     | -        | S3 folder prefix                                              |
| onUploadComplete | function   | -        | Callback on successful upload                                 |
| onUploadError    | function   | -        | Callback on error                                             |
| disabled         | boolean    | false    | Disable upload                                                |

---

## 4. Database Schema

### storage_files Table

| Column         | Type      | Constraints                 | Description             |
| -------------- | --------- | --------------------------- | ----------------------- |
| id             | text      | PK                          | ULID format (file_xxx)  |
| organizationId | text      | NOT NULL                    | Multi-tenant ID         |
| bucket         | text      | NOT NULL                    | S3 bucket name          |
| key            | text      | NOT NULL                    | S3 object key           |
| filename       | text      | NOT NULL                    | Original filename       |
| contentType    | text      | NOT NULL, DEFAULT ''        | MIME type               |
| size           | integer   | NOT NULL, DEFAULT 0         | File size in bytes      |
| meta           | jsonb     | NOT NULL, DEFAULT {}        | Additional metadata     |
| uploadedById   | text      | NOT NULL                    | Actor who uploaded      |
| status         | text      | NOT NULL, DEFAULT 'pending' | pending/complete/failed |
| createdAt      | timestamp | NOT NULL                    | Creation timestamp      |
| updatedAt      | timestamp | NOT NULL                    | Last update             |
| deletedAt      | timestamp | NULLABLE                    | Soft delete timestamp   |
| version        | integer   | NOT NULL, DEFAULT 1         | Optimistic concurrency  |

### Indexes

- `storage_files_org_created_at_idx`: (organizationId, createdAt)
- `storage_files_org_uploaded_by_id_idx`: (organizationId, uploadedById)

---

## 5. Security Considerations

1. **Organization Isolation**: All operations require `x-organization-id` header
2. **Presigned URLs**: Generated with 1-hour expiry (configurable)
3. **Soft Delete**: Files are marked as deleted, not physically removed
4. **Content Type Validation**: Server validates MIME types
5. **File Size Limits**: Should be enforced at application level

---

## 6. Error Handling

### Common Errors

| Status | Message                       | Description                            |
| ------ | ----------------------------- | -------------------------------------- |
| 400    | Invalid fileId                | File ID not found or already completed |
| 404    | File not found                | File doesn't exist                     |
| 500    | Failed to generate upload URL | S3 configuration error                 |
| 500    | Failed to complete upload     | Database error                         |

---

## 7. Migration

If adding storage to an existing database, generate and run migration:

```bash
cd apps/server
bun run db:generate
bun run db:migrate
```

The migration will create the `storage_files` table if it doesn't exist.
