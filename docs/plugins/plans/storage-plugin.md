# Storage Plugin - Fullstack Implementation Plan

## Overview

This document outlines the implementation plan for an S3-based Storage Plugin for file uploads with metadata stored in the database. The plugin follows the same architecture pattern as the existing Notification Plugin.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: COMPOSE  (platform)    → Integration & orchestration              │
│  Layer 2: PLUGIN   (storage)     → Reusable storage capability              │
│  Layer 1: MODULE   (storage)     → Domain primitives (future)              │
│  Layer 0: INFRA                 → S3 client, DB schema                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## S3 Configuration

### Environment Variables

Add to both `.env` (root) and `apps/server/.env`:

```env
# Storage - Development (S3 Compatible)
S3_ENDPOINT="https://ebc-develop.s3.ap-south-1.amazonaws.com"
S3_ACCESS_KEY_ID="AKIA4DU6QL24XCUDK7E7"
S3_SECRET_ACCESS_KEY="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"
S3_BUCKET="ebc-develop"
S3_REGION="ap-south-1"
# S3_PUBLIC_URL="https://ebc-develop.s3.ap-south-1.amazonaws.com"
```

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Add S3 Environment Variables (`apps/server/src/infra/env.ts`)
- Add S3 env vars with validation
- Schema: `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_URL` (optional)

#### 1.2 Create Database Schema (`apps/server/src/infra/db/schema/storage.ts`)
Create `storage_files` table:

| Column | Type | Description |
|--------|------|-------------|
| id | text (PK) | ULID format |
| organizationId | text | Multi-tenancy |
| bucket | text | S3 bucket name |
| key | text | S3 object key (path) |
| filename | text | Original filename |
| contentType | text | MIME type |
| size | integer | File size in bytes |
| meta | jsonb | Additional metadata |
| uploadedById | text | Actor who uploaded |
| createdAt | timestamp | Upload timestamp |
| updatedAt | timestamp | Last update |
| deletedAt | timestamp | Soft delete |
| version | integer | Optimistic concurrency |

Indexes: `organizationId`, `uploadedById`, `createdAt`

#### 1.3 Create S3 Client (`apps/server/src/infra/storage/s3.ts`)
- Create `@aws-sdk/client-s3` wrapper
- Support presigned URL generation for upload
- Support direct upload to S3
- Helper functions: `uploadFile()`, `deleteFile()`, `getSignedUrl()`, `getObjectUrl()`

#### 1.4 Export Schema in Index (`apps/server/src/infra/db/schema/index.ts`)
- Re-export storage schema

---

### Phase 2: Storage Plugin - Server

#### 2.1 Create Plugin Directory Structure

```
plugins/storage/
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              ← Plugin factory
│       ├── types.ts              ← Type definitions
│       ├── routes/
│       │   ├── files.ts          ← File CRUD routes
│       │   └── upload.ts         ← Upload with presigned URL
│       └── lib/
│           └── s3.ts             ← S3 operations wrapper
└── web/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              ← Exports
        ├── lib/
        │   └── api.ts            ← API client
        └── components/
            └── file-upload.tsx   ← Upload UI component
```

#### 2.2 Plugin Package Configuration

**Server (`plugins/storage/server/package.json`):**
```json
{
  "name": "@projectx/plugin-storage-server",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts"
  },
  "dependencies": {
    "elysia": "^1.4.25",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0"
  },
  "devDependencies": {
    "@projectx/config": "workspace:*",
    "bun-types": "^1.0.0",
    "typescript": "^5.3.3"
  }
}
```

**Web (`plugins/storage/web/package.json`):**
```json
{
  "name": "@projectx/plugin-storage-web",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./api": "./src/lib/api.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "dependencies": {
    "@projectx/ui": "workspace:*",
    "lucide-react": "^0.577.0",
    "react": "^19.0.0",
    "react-dropzone": "^14.2.3"
  },
  "peerDependencies": {
    "@projectx/shared-router": "workspace:*"
  }
}
```

#### 2.3 Plugin API Design

**Server Routes (`/platform/plugin-storage/*`):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/files` | List files with pagination |
| GET | `/files/:id` | Get file metadata |
| POST | `/files/upload-url` | Get presigned URL for upload |
| POST | `/files/complete` | Mark upload as complete (save to DB) |
| DELETE | `/files/:id` | Delete file (S3 + DB) |
| GET | `/files/:id/download` | Get download URL |

**Request/Response Types:**

```typescript
interface FileMetadata {
  id: string;
  organizationId: string;
  bucket: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  meta: Record<string, unknown>;
  uploadedById: string;
  createdAt: Date;
  url?: string;  // Full URL for public files
}

interface GetUploadUrlRequest {
  filename: string;
  contentType: string;
  folder?: string;  // Optional folder prefix
}

interface GetUploadUrlResponse {
  uploadUrl: string;      // Presigned PUT URL
  fileId: string;         // Generated file ID
  key: string;            // S3 object key
  expiresIn: number;      // URL expiry seconds
}

interface CompleteUploadRequest {
  fileId: string;
  metadata?: Record<string, unknown>;
}

interface CompleteUploadResponse {
  file: FileMetadata;
}
```

---

### Phase 3: Platform Compose Integration

#### 3.1 Server Integration

**Update `composes/platform/server/package.json`:**
```json
{
  "dependencies": {
    "@projectx/plugin-storage-server": "workspace:*"
  }
}
```

**Update `composes/platform/server/src/index.ts`:**
```typescript
import { createStoragePlugin } from "@projectx/plugin-storage-server";

const storagePlugin = createStoragePlugin({
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
  }
});

export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(authRoutes)
  // ... other routes
  .use(storagePlugin.plugin as any);

export const { getUploadUrl, completeUpload, deleteFile, listFiles } = storagePlugin;
```

#### 3.2 Web Integration

**Update `composes/platform/web/package.json`:**
```json
{
  "dependencies": {
    "@projectx/plugin-storage-web": "workspace:*"
  }
}
```

**Create `composes/platform/web/src/routes/files.tsx`:**
```typescript
import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { FileUploadComponent } from "@projectx/plugin-storage-web/components/file-upload";
import { filesApi } from "@projectx/plugin-storage-web/api";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/files",
  component: FilesPage,
});

function FilesPage() {
  return (
    <div className="h-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Files</h1>
      <FileUploadComponent api={filesApi} />
    </div>
  );
}
```

**Update `composes/platform/web/src/routes/index.ts`:**
- Add `dashboardFilesRoute` to children

**Update `composes/platform/web/src/manifest.ts`:**
- Add Files nav item

---

### Phase 4: Upload UI Component

#### 4.1 File Upload Component (`plugins/storage/web/src/components/file-upload.tsx`)

Features:
- Drag & drop zone using `react-dropzone`
- File type validation
- Progress indicator
- File list with delete capability
- Thumbnail preview for images

```typescript
interface FileUploadProps {
  api: StorageApi;
  accept?: Record<string, string[]>;
  maxSize?: number;  // in bytes
  folder?: string;
  onUploadComplete?: (file: FileMetadata) => void;
}
```

UI Structure:
- Dropzone area with dashed border
- File input button
- Upload progress bar
- File list table with: filename, size, type, actions
- Delete confirmation modal

---

### Phase 5: Workspace Configuration

#### 5.1 Update `turbo.json`
- Already supports `plugins/*/` pattern via workspace config

#### 5.2 Update Root `package.json`
- Already includes `plugins/*/server` and `plugins/*/web` in workspaces

---

## File List

### New Files to Create

#### Infrastructure (apps/server)
1. `apps/server/src/infra/storage/s3.ts` - S3 client wrapper
2. `apps/server/src/infra/db/schema/storage.ts` - Database schema
3. Update `apps/server/src/infra/env.ts` - Add S3 env vars

#### Storage Plugin Server
4. `plugins/storage/server/package.json`
5. `plugins/storage/server/tsconfig.json`
6. `plugins/storage/server/src/index.ts`
7. `plugins/storage/server/src/types.ts`
8. `plugins/storage/server/src/routes/files.ts`
9. `plugins/storage/server/src/routes/upload.ts`
10. `plugins/storage/server/src/lib/s3.ts`

#### Storage Plugin Web
11. `plugins/storage/web/package.json`
12. `plugins/storage/web/tsconfig.json`
13. `plugins/storage/web/src/index.ts`
14. `plugins/storage/web/src/lib/api.ts`
15. `plugins/storage/web/src/components/file-upload.tsx`

#### Platform Compose Updates
16. Update `composes/platform/server/package.json`
17. Update `composes/platform/server/src/index.ts`
18. Update `composes/platform/web/package.json`
19. Update `composes/platform/web/src/routes/index.ts`
20. Create `composes/platform/web/src/routes/files.tsx`
21. Update `composes/platform/web/src/manifest.ts`

#### Environment
22. Update root `.env`
23. Update `apps/server/.env`

---

## Implementation Order

1. **Phase 1**: Core Infrastructure (env, schema, s3 client)
2. **Phase 2**: Storage Plugin Server (create plugin structure, routes)
3. **Phase 2**: Storage Plugin Web (create UI components)
4. **Phase 3**: Platform Compose Integration (server + web)
5. **Phase 4**: Environment configuration (.env files)

---

## Testing Checklist

- [ ] S3 client can upload file
- [ ] Presigned URL generation works
- [ ] File metadata saved to database
- [ ] File deletion removes from S3 and marks deleted in DB
- [ ] List files returns paginated results
- [ ] UI drag & drop upload works
- [ ] Upload progress shows correctly
- [ ] File deletion from UI works
- [ ] Routes accessible under `/platform/plugin-storage/*`
- [ ] Files page accessible under `/dashboard/files`

---

## Notes

- Following the exact pattern of `plugins/notification/`
- Uses Neon serverless DB (PostgreSQL via drizzle-orm)
- S3 client uses AWS SDK v3
- All routes require Bearer token auth (via platform compose)
- Multi-tenancy via `organizationId` in file metadata
- Soft delete pattern for files (keeps metadata for audit)
