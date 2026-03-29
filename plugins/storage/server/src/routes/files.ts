import { Elysia, t } from "elysia";
import { db } from "@db/client";
import { storageFiles } from "@db/schema/storage";
import { actors } from "@db/schema/identity";
import { eq, desc, ilike, and, isNull, count } from "drizzle-orm";
import { getUrl } from "../lib/s3";

export const fileRoutes = new Elysia({ prefix: "/files" })
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const folder = query.folder as string | undefined;
        const contentType = query.contentType as string | undefined;

        const orgId = "org_platform_default";

        const conditions = [
          eq(storageFiles.organizationId, orgId),
          isNull(storageFiles.deletedAt),
        ];

        if (folder) {
          conditions.push(ilike(storageFiles.key, `${folder}%`));
        }

        if (contentType) {
          conditions.push(eq(storageFiles.contentType, contentType));
        }

        const offset = (page - 1) * limit;

        const [files, totalResult] = await Promise.all([
          db
            .select({
              id: storageFiles.id,
              organizationId: storageFiles.organizationId,
              bucket: storageFiles.bucket,
              key: storageFiles.key,
              filename: storageFiles.filename,
              contentType: storageFiles.contentType,
              size: storageFiles.size,
              meta: storageFiles.meta,
              uploadedById: storageFiles.uploadedById,
              status: storageFiles.status,
              createdAt: storageFiles.createdAt,
              updatedAt: storageFiles.updatedAt,
              deletedAt: storageFiles.deletedAt,
              version: storageFiles.version,
              uploadedBy: {
                id: actors.id,
                email: actors.email,
                firstName: actors.firstName,
                lastName: actors.lastName,
                avatarUrl: actors.avatarUrl,
                type: actors.type,
                status: actors.status,
              },
            })
            .from(storageFiles)
            .leftJoin(actors, eq(storageFiles.uploadedById, actors.id))
            .where(and(...conditions))
            .orderBy(desc(storageFiles.createdAt))
            .limit(limit)
            .offset(offset),
          db
            .select({ count: count() })
            .from(storageFiles)
            .where(and(...conditions)),
        ]);

        const total = totalResult[0]?.count || 0;

        return {
          files: files.map((f) => ({
            ...f,
            uploadedBy: f.uploadedBy?.id ? f.uploadedBy : undefined,
          })),
          total,
          page,
          limit,
        };
      } catch (error) {
        console.error("Error listing files:", error);
        set.status = 500;
        return { error: "Failed to list files" };
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        folder: t.Optional(t.String()),
        contentType: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, set }) => {
    try {
      const orgId = "org_platform_default";

      const [file] = await db
        .select({
          id: storageFiles.id,
          organizationId: storageFiles.organizationId,
          bucket: storageFiles.bucket,
          key: storageFiles.key,
          filename: storageFiles.filename,
          contentType: storageFiles.contentType,
          size: storageFiles.size,
          meta: storageFiles.meta,
          uploadedById: storageFiles.uploadedById,
          status: storageFiles.status,
          createdAt: storageFiles.createdAt,
          updatedAt: storageFiles.updatedAt,
          deletedAt: storageFiles.deletedAt,
          version: storageFiles.version,
          uploadedBy: {
            id: actors.id,
            email: actors.email,
            firstName: actors.firstName,
            lastName: actors.lastName,
            avatarUrl: actors.avatarUrl,
            type: actors.type,
            status: actors.status,
          },
        })
        .from(storageFiles)
        .leftJoin(actors, eq(storageFiles.uploadedById, actors.id))
        .where(
          and(
            eq(storageFiles.id, params.id),
            eq(storageFiles.organizationId, orgId),
            isNull(storageFiles.deletedAt),
          ),
        );

      if (!file) {
        set.status = 404;
        return { error: "File not found" };
      }

      return {
        ...file,
        uploadedBy: file.uploadedBy?.id ? file.uploadedBy : undefined,
      };
    } catch (error) {
      console.error("Error getting file:", error);
      set.status = 500;
      return { error: "Failed to get file" };
    }
  })
  .delete("/:id", async ({ params, set }) => {
    try {
      const orgId = "org_platform_default";

      const [existing] = await db
        .select()
        .from(storageFiles)
        .where(
          and(
            eq(storageFiles.id, params.id),
            eq(storageFiles.organizationId, orgId),
            isNull(storageFiles.deletedAt),
          ),
        );

      if (!existing) {
        set.status = 404;
        return { error: "File not found" };
      }

      await db
        .update(storageFiles)
        .set({ deletedAt: new Date() })
        .where(eq(storageFiles.id, params.id));

      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      set.status = 500;
      return { error: "Failed to delete file" };
    }
  })
  .get("/:id/download", async ({ params, set }) => {
    try {
      const orgId = "org_platform_default";

      const [file] = await db
        .select()
        .from(storageFiles)
        .where(
          and(
            eq(storageFiles.id, params.id),
            eq(storageFiles.organizationId, orgId),
            isNull(storageFiles.deletedAt),
          ),
        );

      if (!file) {
        set.status = 404;
        return { error: "File not found" };
      }

      const url = getUrl(file.key);

      return { url };
    } catch (error) {
      console.error("Error getting download URL:", error);
      set.status = 500;
      return { error: "Failed to get download URL" };
    }
  });
