import { Elysia } from "elysia";
import { fileRoutes } from "./routes/files";
import { uploadRoutes } from "./routes/upload";
import type {
  StoragePluginConfig,
  StoragePlugin,
  GetUploadUrlRequest,
  GetUploadUrlResponse,
  CompleteUploadRequest,
  CompleteUploadResponse,
  ListFilesQuery,
  ListFilesResponse,
  StorageFile,
} from "./types";
import {
  getUploadUrl as getS3UploadUrl,
  getDownloadUrl as getS3DownloadUrl,
  deleteFile as deleteS3File,
  getUrl as getS3Url,
  getBucketName,
  generateKey,
} from "./lib/s3";
import { db } from "@db/client";
import { storageFiles } from "@db/schema/storage";
import { eq, desc, ilike, and, isNull } from "drizzle-orm";
import { generatePrefixedId } from "@core/entity";

const EXPIRES_IN = 3600;

export function createStoragePlugin(
  config: StoragePluginConfig,
): StoragePlugin {
  const plugin = new Elysia({ prefix: "/plugin-storage" })
    .use(fileRoutes)
    .use(uploadRoutes)
    .get("/health", () => ({ status: "ok", provider: "s3" }));

  const getUploadUrl = async (
    params: GetUploadUrlRequest & { organizationId: string; actorId: string },
  ): Promise<GetUploadUrlResponse> => {
    const { filename, contentType, folder, organizationId, actorId } = params;
    const fileId = generatePrefixedId("file");
    const key = generateKey(filename, folder);

    await db.insert(storageFiles).values({
      id: fileId,
      organizationId,
      bucket: getBucketName(),
      key,
      filename,
      contentType,
      size: 0,
      uploadedById: actorId,
    });

    const uploadUrl = await getS3UploadUrl(key, contentType, EXPIRES_IN);

    return {
      uploadUrl,
      fileId,
      key,
      expiresIn: EXPIRES_IN,
    };
  };

  const completeUpload = async (
    params: CompleteUploadRequest & { organizationId: string },
  ): Promise<CompleteUploadResponse> => {
    const { fileId, metadata, organizationId } = params;

    const [existingFile] = await db
      .select()
      .from(storageFiles)
      .where(
        and(
          eq(storageFiles.id, fileId),
          eq(storageFiles.organizationId, organizationId),
          isNull(storageFiles.deletedAt),
        ),
      );

    if (!existingFile) {
      throw new Error("Invalid fileId");
    }

    const [updatedFile] = await db
      .update(storageFiles)
      .set({
        status: "complete" as const,
        meta: metadata || {},
      })
      .where(eq(storageFiles.id, fileId))
      .returning();

    return { file: updatedFile as StorageFile };
  };

  const deleteFile = async (params: {
    fileId: string;
    organizationId: string;
  }): Promise<void> => {
    const { fileId, organizationId } = params;

    const [existing] = await db
      .select()
      .from(storageFiles)
      .where(
        and(
          eq(storageFiles.id, fileId),
          eq(storageFiles.organizationId, organizationId),
          isNull(storageFiles.deletedAt),
        ),
      );

    if (!existing) {
      throw new Error("File not found");
    }

    await db
      .update(storageFiles)
      .set({ deletedAt: new Date() })
      .where(eq(storageFiles.id, fileId));

    await deleteS3File(existing.key);
  };

  const listFiles = async (
    params: ListFilesQuery & { organizationId: string },
  ): Promise<ListFilesResponse> => {
    const {
      page = 1,
      limit = 20,
      folder,
      contentType,
      organizationId,
    } = params;

    const conditions = [
      eq(storageFiles.organizationId, organizationId),
      isNull(storageFiles.deletedAt),
    ];

    if (folder) {
      conditions.push(ilike(storageFiles.key, `${folder}%`));
    }

    if (contentType) {
      conditions.push(eq(storageFiles.contentType, contentType));
    }

    const offset = (page - 1) * limit;

    const files = await db
      .select()
      .from(storageFiles)
      .where(and(...conditions))
      .orderBy(desc(storageFiles.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      files: files as StorageFile[],
      total: files.length,
      page,
      limit,
    };
  };

  const getFile = async (params: {
    fileId: string;
    organizationId: string;
  }): Promise<StorageFile | null> => {
    const { fileId, organizationId } = params;

    const [file] = await db
      .select()
      .from(storageFiles)
      .where(
        and(
          eq(storageFiles.id, fileId),
          eq(storageFiles.organizationId, organizationId),
          isNull(storageFiles.deletedAt),
        ),
      );

    return (file as StorageFile) || null;
  };

  const getDownloadUrl = async (params: {
    fileId: string;
    organizationId: string;
  }): Promise<string> => {
    const { fileId, organizationId } = params;

    const [file] = await db
      .select()
      .from(storageFiles)
      .where(
        and(
          eq(storageFiles.id, fileId),
          eq(storageFiles.organizationId, organizationId),
          isNull(storageFiles.deletedAt),
        ),
      );

    if (!file) {
      throw new Error("File not found");
    }

    return getS3Url(file.key);
  };

  return {
    plugin,
    config,
    getUploadUrl,
    completeUpload,
    deleteFile,
    listFiles,
    getFile,
    getDownloadUrl,
  };
}

export type {
  StoragePluginConfig,
  StoragePlugin,
  GetUploadUrlRequest,
  GetUploadUrlResponse,
  CompleteUploadRequest,
  CompleteUploadResponse,
  ListFilesQuery,
  ListFilesResponse,
  StorageFile,
} from "./types";
