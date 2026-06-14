# Storage Plugin

Reusable fullstack plugin for file uploads and management using S3-compatible object storage.

**Packages:**
- `@projectx/plugin-storage-server` — Elysia plugin, REST endpoints, S3 operations
- `@projectx/plugin-storage-web` — API client, `FileUpload` React component

→ Plugin system overview: [README.md](./README.md)

---

## Features

- Presigned URL-based uploads (direct-to-S3, no server proxying)
- File metadata storage in PostgreSQL
- React upload component with drag-and-drop
- Uploader identity linking (`uploadedBy`)
- Soft delete support

---

## Architecture

```
Client (browser)
  │ 1. POST /upload/url → get presigned URL + fileId
  │ 3. PUT presigned-url (direct to S3)
  │ 4. POST /upload/complete → mark file as complete
  ▼
Server (Elysia plugin)
  ├─ creates DB record with status "pending"
  └─ updates DB record to status "complete"
      ▼
  PostgreSQL (storage_files table)
  S3 (object stored directly)
```

### Component structure

```
plugins/storage/
├── server/
│   └── src/
│       ├── index.ts           ← createStoragePlugin(config) factory
│       ├── types.ts
│       ├── routes/
│       │   ├── files.ts       ← file CRUD endpoints
│       │   └── upload.ts      ← presigned URL endpoints
│       └── lib/s3.ts          ← S3 operations
└── web/
    └── src/
        ├── index.ts
        ├── lib/api.ts         ← StorageApi client class
        └── components/file-upload.tsx
```

---

## Integration

### Environment variables

```env
S3_ENDPOINT="https://your-bucket.s3.region.amazonaws.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="your-bucket-name"
S3_REGION="us-east-1"
S3_PUBLIC_URL="https://your-bucket.s3.region.amazonaws.com"
```

### Server

**1. Add dependency:**
```json
// composes/{name}/server/package.json
{
  "dependencies": {
    "@projectx/plugin-storage-server": "workspace:*"
  }
}
```

**2. Register plugin:**
```typescript
import { createStoragePlugin } from "@projectx/plugin-storage-server";

const storage = createStoragePlugin({
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    publicUrl: process.env.S3_PUBLIC_URL,
  },
});

export const myCompose = new Elysia({ prefix: "/myname" })
  .use(authRoutes)
  .use(storage.plugin);
```

**3. Register DB schema** in `apps/server/src/index.ts`:
```typescript
import { storageFiles } from "@infra/db/schema/storage";
dbSchemas.push(storageFiles);
```

**4. Run migration:**
```bash
cd apps/server
bun run db:generate
bun run db:migrate
```

### Web

**1. Add dependency:**
```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/plugin-storage-web": "workspace:*"
  }
}
```

**2. Create API client:**
```typescript
// composes/{name}/web/src/lib/storage.ts
import { createStorageApi } from "@projectx/plugin-storage-web";
export const storageApi = createStorageApi(import.meta.env.VITE_API_URL || "http://localhost:10050");
```

**3. Use upload component:**
```tsx
import { FileUpload } from "@projectx/plugin-storage-web";
import { storageApi } from "../lib/storage";

function FilesPage() {
  return (
    <FileUpload
      api={storageApi}
      accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
      maxSize={10 * 1024 * 1024}
      folder="uploads"
      onUploadComplete={(file) => console.log("Uploaded:", file)}
    />
  );
}
```

---

## REST API Reference

All endpoints prefixed with `/platform/plugin-storage`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/files` | List files with pagination |
| GET | `/files/:id` | Get single file |
| POST | `/upload/url` | Get presigned upload URL |
| POST | `/upload/complete` | Mark upload as complete |
| DELETE | `/files/:id` | Delete file (soft delete) |
| GET | `/files/:id/download` | Get presigned download URL |

**Required headers for all requests:**
- `x-organization-id` (required)
- `Authorization` (required)

### GET `/files`

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| folder | string | — | Filter by folder prefix |
| contentType | string | — | Filter by MIME type |

**Response:**
```json
{
  "files": [
    {
      "id": "file_xxx",
      "organizationId": "org_123",
      "filename": "image.jpg",
      "contentType": "image/jpeg",
      "size": 102400,
      "uploadedById": "user_456",
      "uploadedBy": { "id": "user_456", "email": "user@example.com", ... },
      "status": "complete",
      "meta": {},
      "createdAt": "2024-01-15T10:30:00Z",
      "deletedAt": null,
      "version": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### POST `/upload/url`

**Request:**
```json
{ "filename": "image.jpg", "contentType": "image/jpeg", "folder": "avatars" }
```

**Response:**
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...&signature=...",
  "fileId": "file_xxx",
  "key": "avatars/1705312200000_abc123_image.jpg",
  "expiresIn": 3600
}
```

**Full upload flow:**
```javascript
// 1. Get presigned URL
const { uploadUrl, fileId } = await fetch("/platform/plugin-storage/upload/url", {
  method: "POST",
  headers: { "x-organization-id": "org_123" },
  body: JSON.stringify({ filename: "image.jpg", contentType: "image/jpeg" }),
}).then(r => r.json());

// 2. Upload directly to S3
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
  body: fileBlob,
});

// 3. Complete
await fetch("/platform/plugin-storage/upload/complete", {
  method: "POST",
  headers: { "x-organization-id": "org_123" },
  body: JSON.stringify({ fileId }),
});
```

---

## Programmatic API (server-side)

```typescript
const {
  getUploadUrl, completeUpload, deleteFile,
  listFiles, getFile, getDownloadUrl,
} = storage;

const { uploadUrl, fileId } = await getUploadUrl({
  filename: "image.jpg",
  contentType: "image/jpeg",
  folder: "avatars",
  organizationId: "org_123",
  actorId: "user_456",
});
```

---

## Web client API

```typescript
import { createStorageApi } from "@projectx/plugin-storage-web";
const api = createStorageApi("http://localhost:10050");

const { uploadUrl, fileId } = await api.getUploadUrl("image.jpg", "image/jpeg", "avatars");
const { file } = await api.completeUpload("file_xxx", { description: "..." });
const { files, total } = await api.listFiles({ page: 1, limit: 20 });
const file = await api.getFile("file_xxx");
const { url } = await api.getDownloadUrl("file_xxx");
await api.deleteFile("file_xxx");
```

---

## Types

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

interface StorageActor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  type: "human" | "system" | "api_key";
  status: "pending" | "active" | "suspended" | "deleted";
}

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

---

## FileUpload component props

```tsx
interface FileUploadProps {
  api: StorageApi;
  accept?: Record<string, string[]>; // e.g. { "image/*": [".jpg", ".png"] }
  maxSize?: number;                   // bytes
  folder?: string;                    // S3 folder prefix
  onUploadComplete?: (file: StorageFile) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
}
```

---

## Database schema

Table: `storage_files`

| Column | Type | Description |
|---|---|---|
| id | text | ULID (e.g. `file_xxx`) |
| organizationId | text | Multi-tenant ID |
| bucket | text | S3 bucket |
| key | text | S3 object key |
| filename | text | Original filename |
| contentType | text | MIME type |
| size | integer | File size (bytes) |
| meta | jsonb | Additional metadata |
| uploadedById | text | Actor who uploaded |
| status | text | `pending` / `complete` / `failed` |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |
| deletedAt | timestamp | Soft delete (nullable) |
| version | integer | Optimistic concurrency |

Indexes: `(organizationId, createdAt)`, `(organizationId, uploadedById)`

---

## Security

- All operations require `x-organization-id` — full org isolation
- Presigned URLs expire in 1 hour
- Soft delete only — files are never physically removed via API
- Content type is validated server-side
- SMTP/S3 credentials stored in env vars, never in code

---

## Errors

| Status | Message | Cause |
|---|---|---|
| 400 | Invalid fileId | File not found or already completed |
| 404 | File not found | File doesn't exist or was hard-deleted |
| 500 | Failed to generate upload URL | S3 config error |
| 500 | Failed to complete upload | DB error |
