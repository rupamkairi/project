// Notification Plugin - Web
// Provides routes for notification template management

import { Bell, Mail, Clock } from "lucide-react";

export interface NotificationTemplate {
  key: string;
  channel: string;
  subject?: string;
  body: string;
  locale: string;
  isSystem: boolean;
}

export interface ScheduledMessage {
  id: string;
  templateKey: string;
  recipient: string;
  variables: Array<{ key: string; value: string }>;
  scheduledAt: number;
  status: "pending" | "sent" | "cancelled";
}

export const notificationPluginRoutes: unknown[] = [];

export const notificationPluginManifest = {
  id: "notification",
  label: "Notifications",
  icon: Bell,
  prefix: "/notifications",
  navItems: [
    { label: "Templates", path: "/notifications/templates", icon: Mail },
    { label: "Scheduled", path: "/notifications/scheduled", icon: Clock },
  ],
};
