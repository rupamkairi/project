import {
  getPresignedUploadUrl as getInfraUploadUrl,
  getPresignedDownloadUrl as getInfraDownloadUrl,
  uploadFile,
  deleteFile as deleteInfraFile,
  getPublicUrl,
  getBucket,
} from "@infra/storage/s3";

export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn?: number,
): Promise<string> {
  return getInfraUploadUrl(key, contentType, expiresIn);
}

export async function getDownloadUrl(
  key: string,
  expiresIn?: number,
): Promise<string> {
  return getInfraDownloadUrl(key, expiresIn);
}

export async function upload(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  return uploadFile(key, body, contentType);
}

export async function deleteFile(key: string): Promise<void> {
  return deleteInfraFile(key);
}

export function getUrl(key: string): string {
  return getPublicUrl(key);
}

export function getBucketName(): string {
  return getBucket();
}

export function generateKey(filename: string, folder?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const prefix = folder ? `${folder}/` : "";
  return `${prefix}${timestamp}_${random}_${safeName}`;
}
