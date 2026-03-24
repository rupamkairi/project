import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

export interface S3Config {
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  bucket: string;
  publicUrl?: string;
}

function getS3Config(): S3Config {
  return {
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET || "",
    publicUrl: env.S3_PUBLIC_URL,
  };
}

function isS3Configured(): boolean {
  const config = getS3Config();
  return !!(config.bucket && config.accessKeyId && config.secretAccessKey);
}

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error(
      "S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.",
    );
  }

  if (!s3Client) {
    const config = getS3Config();
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
      },
      forcePathStyle: !!config.endpoint,
    });
  }

  return s3Client;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error(
      "S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.",
    );
  }

  const config = getS3Config();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error(
      "S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.",
    );
  }

  const config = getS3Config();
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  if (!isS3Configured()) {
    throw new Error(
      "S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.",
    );
  }

  const config = getS3Config();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
}

export async function deleteFile(key: string): Promise<void> {
  if (!isS3Configured()) {
    throw new Error(
      "S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.",
    );
  }

  const config = getS3Config();
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
}

export function getPublicUrl(key: string): string {
  const config = getS3Config();

  if (!config.bucket) {
    throw new Error(
      "S3 is not configured. Please set S3_BUCKET environment variable.",
    );
  }

  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }

  if (config.endpoint) {
    return `${config.endpoint}/${config.bucket}/${key}`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

export function getBucket(): string {
  const config = getS3Config();
  return config.bucket;
}

export function getRegion(): string {
  const config = getS3Config();
  return config.region;
}
