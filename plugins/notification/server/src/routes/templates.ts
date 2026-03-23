// Template Routes - CRUD for file-based notification templates

import { Elysia } from "elysia";
import { listTemplates, saveTemplate, deleteTemplate, renderTemplate } from "../lib/template";

interface TemplateInfo {
  key: string;
  hasSubject: boolean;
}

export const templateRoutes = new Elysia({ prefix: "/templates" })
  .get("/", async () => {
    const templates = await listTemplates();
    return { 
      templates: templates.map((key) => ({
        key,
        channel: "email",
      }))
    };
  })
  .get("/:key", async ({ params: { key }, set }) => {
    try {
      const result = await renderTemplate(key, {});
      return {
        template: {
          key,
          channel: "email",
          subject: result.subject,
          body: result.body,
        }
      };
    } catch {
      set.status = 404;
      return { error: "Template not found" };
    }
  })
  .post("/", async ({ body, set }) => {
    const data = body as {
      key: string;
      subject?: string;
      body: string;
    };

    if (!data.key || !data.body) {
      set.status = 400;
      return { error: "Missing required fields: key, body" };
    }

    await saveTemplate(data.key, data.body, data.subject);
    
    return {
      template: {
        key: data.key,
        channel: "email",
        subject: data.subject || "",
        body: data.body,
      },
      created: true
    };
  })
  .patch("/:key", async ({ params: { key }, body, set }) => {
    const data = body as {
      subject?: string;
      body?: string;
    };

    try {
      // Get existing template to preserve subject if not provided
      const existing = await renderTemplate(key, {});
      
      await saveTemplate(
        key, 
        data.body || existing.body, 
        data.subject !== undefined ? data.subject : existing.subject
      );

      return { updated: true };
    } catch {
      set.status = 404;
      return { error: "Template not found" };
    }
  })
  .delete("/:key", async ({ params: { key }, set }) => {
    // Prevent deletion of system templates
    const systemTemplates = ["user-invite", "welcome", "password-reset", "plain"];
    if (systemTemplates.includes(key)) {
      set.status = 403;
      return { error: "Cannot delete system templates" };
    }

    await deleteTemplate(key);
    return { deleted: true };
  });

// Export for use in other parts of the plugin
export { renderTemplate } from "../lib/template";
