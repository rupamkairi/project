import type { Elysia } from "elysia";

export interface NotificationPluginConfig {
  email?: {
    fromAddress: string;
    fromName: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
  };
  queue?: {
    enabled: boolean;
  };
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface TemplateVariable {
  key: string;
  value: string;
}

export interface SendNotificationParams {
  to: string;
  templateKey: string;
  variables: TemplateVariable[];
  channel?: "email";
  scheduledAt?: number;
}

export interface CreateTemplateParams {
  key: string;
  channel: "email";
  subject?: string;
  body: string;
  locale?: string;
  isSystem?: boolean;
}

export interface ScheduledMessage {
  id: string;
  templateKey: string;
  recipient: string;
  variables: TemplateVariable[];
  scheduledAt: number;
  status: "pending" | "sent" | "cancelled";
}

export interface NotificationPlugin {
  plugin: unknown;
  config: NotificationPluginConfig;
  sendEmail: (
    payload: EmailPayload,
  ) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendFromTemplate: (
    params: SendNotificationParams,
  ) => Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export type NotificationPluginApp = unknown;
