// Notification Plugin - Server

import { Elysia } from "elysia";
import { templateRoutes, renderTemplate } from "./routes/templates";
import { scheduledRoutes } from "./routes/scheduled";
import { sendEmail } from "./lib/email";
import type {
  NotificationPluginConfig,
  NotificationPlugin,
  EmailPayload,
  SendNotificationParams,
  TemplateVariable,
} from "./types";

export function createNotificationPlugin(
  config: NotificationPluginConfig
): NotificationPlugin {
  const defaultFrom = config.email
    ? config.email.fromName + " <" + config.email.fromAddress + ">"
    : "Notifications <noreply@projectx.dev>";

  const sendEmailFn = async (
    payload: EmailPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    return sendEmail({
      ...payload,
      from: payload.from || defaultFrom,
    }, config.email?.smtp);
  };

  const sendFromTemplateFn = async (
    params: SendNotificationParams
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      const { body, subject } = await renderTemplate(params.templateKey, variablesToObject(params.variables));

      return sendEmailFn({
        to: params.to,
        subject,
        body,
        from: defaultFrom,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to render template",
      };
    }
  };

  function variablesToObject(variables: TemplateVariable[]): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const v of variables) {
      obj[v.key] = v.value;
    }
    return obj;
  }

  const plugin = new Elysia({ prefix: "/plugin-notifications" })
    .use(templateRoutes)
    .use(scheduledRoutes)
    .post("/send", async ({ body }) => {
      const data = body as EmailPayload;
      if (!data.to || !data.subject || !data.body) {
        return { error: "Missing required fields: to, subject, body" };
      }
      return sendEmailFn(data);
    })
    .post("/send-template", async ({ body }) => {
      const data = body as SendNotificationParams;
      if (!data.to || !data.templateKey || !data.variables) {
        return { error: "Missing required fields: to, templateKey, variables" };
      }

      const { scheduledAt, ...sendParams } = data;

      if (scheduledAt && scheduledAt > Date.now()) {
        return {
          success: true,
          messageId: "scheduled_" + Date.now(),
          scheduledAt,
        };
      }

      return sendFromTemplateFn(sendParams);
    })
    .get("/health", () => ({ status: "ok", plugin: "notification" }));

  return {
    plugin,
    config,
    sendEmail: sendEmailFn,
    sendFromTemplate: sendFromTemplateFn,
  };
}

export type {
  NotificationPluginConfig,
  EmailPayload,
  SendNotificationParams,
  TemplateVariable,
  ScheduledMessage,
} from "./types";
