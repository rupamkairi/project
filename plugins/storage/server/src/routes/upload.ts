import { Elysia, t } from "elysia";
import { db } from "@db/client";
import { storageFiles } from "@db/schema/storage";
import { actors } from "@db/schema/identity";
import { eq, isNull, and } from "drizzle-orm";
import { generatePrefixedId } from "@core/entity";
import { getUploadUrl, getBucketName, generateKey } from "../lib/s3";

const EXPIRES_IN = 3600;

export const uploadRoutes = new Elysia({ prefix: "/upload" })
  .post(
    "/url",
    async ({ body, headers, set }) => {
      try {
        const { filename, contentType, folder } = body;
        const actorId = (headers["x-actor-id"] as string) || "anonymous";
        const organizationId =
          (headers["x-organization-id"] as string) || "default";

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

        const uploadUrl = await getUploadUrl(key, contentType, EXPIRES_IN);

        return {
          uploadUrl,
          fileId,
          key,
          expiresIn: EXPIRES_IN,
        };
      } catch (error) {
        console.error("Error generating upload URL:", error);
        set.status = 500;
        return { error: "Failed to generate upload URL" };
      }
    },
    {
      body: t.Object({
        filename: t.String(),
        contentType: t.String(),
        folder: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/complete",
    async ({ body, headers, set }) => {
      try {
        const { fileId, metadata } = body;
        const organizationId =
          (headers["x-organization-id"] as string) || "default";

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
          set.status = 400;
          return { error: "Invalid fileId" };
        }

        const [updatedFile] = await db
          .update(storageFiles)
          .set({
            status: "complete",
            meta: metadata || {},
          })
          .where(eq(storageFiles.id, fileId))
          .returning();

        const [uploader] = await db
          .select({
            id: actors.id,
            email: actors.email,
            firstName: actors.firstName,
            lastName: actors.lastName,
            avatarUrl: actors.avatarUrl,
            type: actors.type,
            status: actors.status,
          })
          .from(actors)
          .where(eq(actors.id, updatedFile.uploadedById))
          .limit(1);

        return {
          file: {
            ...updatedFile,
            uploadedBy: uploader || undefined,
          },
        };
      } catch (error) {
        console.error("Error completing upload:", error);
        set.status = 500;
        return { error: "Failed to complete upload" };
      }
    },
    {
      body: t.Object({
        fileId: t.String(),
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    },
  );
