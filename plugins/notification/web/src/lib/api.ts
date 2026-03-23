// Notification Plugin API - Client for web

// Use Vite environment variable for API URL (from apps/web/.env.example)
const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:10050";

// Platform compose has prefix "/platform", notification plugin has "/plugin-notifications"
// Full path: /platform/plugin-notifications/*
const BASE_PATH = "/platform/plugin-notifications";

interface Template {
  key: string;
  channel: string;
  subject?: string;
  body: string;
  locale: string;
  isSystem: boolean;
}

interface ScheduledMessage {
  id: string;
  templateKey: string;
  recipient: string;
  variables: Array<{ key: string; value: string }>;
  scheduledAt: number;
  status: "pending" | "sent" | "cancelled";
}

const notificationApi = {
  notifications: {
    templates: {
      get: async (options?: { query?: Record<string, string> }) => {
        const query = options?.query
          ? `?${new URLSearchParams(options.query)}`
          : "";
        const res = await fetch(`${API_URL}${BASE_PATH}/templates${query}`);
        return { data: await res.json() };
      },
      ":key": {
        get: async (options: { params: { key: string } }) => {
          const res = await fetch(
            `${API_URL}${BASE_PATH}/templates/${options.params.key}`,
          );
          return { data: await res.json() };
        },
        patch: async (
          data: { subject?: string; body?: string },
          options: { params: { key: string } },
        ) => {
          const res = await fetch(
            `${API_URL}${BASE_PATH}/templates/${options.params.key}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            },
          );
          return { data: await res.json() };
        },
        delete: async (options: { params: { key: string } }) => {
          const res = await fetch(
            `${API_URL}${BASE_PATH}/templates/${options.params.key}`,
            { method: "DELETE" },
          );
          return { data: await res.json() };
        },
      },
      post: async (data: Partial<Template>) => {
        const res = await fetch(`${API_URL}${BASE_PATH}/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { data: await res.json() };
      },
    },
    scheduled: {
      get: async (options?: { query?: { status?: string } }) => {
        const query = options?.query?.status
          ? `?status=${options.query.status}`
          : "";
        const res = await fetch(`${API_URL}${BASE_PATH}/scheduled${query}`);
        return { data: await res.json() };
      },
      ":id": {
        get: async (options: { params: { id: string } }) => {
          const res = await fetch(
            `${API_URL}${BASE_PATH}/scheduled/${options.params.id}`,
          );
          return { data: await res.json() };
        },
        patch: async (
          data: { scheduledAt?: number; status?: string },
          options: { params: { id: string } },
        ) => {
          const res = await fetch(
            `${API_URL}${BASE_PATH}/scheduled/${options.params.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            },
          );
          return { data: await res.json() };
        },
        delete: async (options: { params: { id: string } }) => {
          const res = await fetch(
            `${API_URL}${BASE_PATH}/scheduled/${options.params.id}`,
            { method: "DELETE" },
          );
          return { data: await res.json() };
        },
      },
      post: async (data: Partial<ScheduledMessage>) => {
        const res = await fetch(`${API_URL}${BASE_PATH}/scheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { data: await res.json() };
      },
    },
    send: {
      post: async (data: { to: string; subject: string; body: string }) => {
        const res = await fetch(`${API_URL}${BASE_PATH}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { data: await res.json() };
      },
    },
    "send-template": {
      post: async (data: {
        to: string;
        templateKey: string;
        variables: Array<{ key: string; value: string }>;
      }) => {
        const res = await fetch(`${API_URL}${BASE_PATH}/send-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { data: await res.json() };
      },
    },
  },
};

export const templatesApi = {
  list: async (params?: {
    channel?: string;
    locale?: string;
    isSystem?: boolean;
  }) => {
    const query: Record<string, string> = {};
    if (params?.channel) query.channel = params.channel;
    if (params?.locale) query.locale = params.locale;
    if (params?.isSystem !== undefined)
      query.isSystem = String(params.isSystem);
    return notificationApi.notifications.templates.get({ query });
  },
  get: async (key: string) =>
    notificationApi.notifications.templates[":key"].get({ params: { key } }),
  create: async (data: Partial<Template>) =>
    notificationApi.notifications.templates.post(data),
  update: async (key: string, data: { subject?: string; body?: string }) =>
    notificationApi.notifications.templates[":key"].patch(data, {
      params: { key },
    }),
  delete: async (key: string) =>
    notificationApi.notifications.templates[":key"].delete({ params: { key } }),
};

export const scheduledApi = {
  list: async (params?: { status?: string }) =>
    notificationApi.notifications.scheduled.get({
      query: params ? { status: params.status } : undefined,
    }),
  get: async (id: string) =>
    notificationApi.notifications.scheduled[":id"].get({ params: { id } }),
  create: async (data: Partial<ScheduledMessage>) =>
    notificationApi.notifications.scheduled.post(data),
  update: async (id: string, data: { scheduledAt?: number; status?: string }) =>
    notificationApi.notifications.scheduled[":id"].patch(data, {
      params: { id },
    }),
  delete: async (id: string) =>
    notificationApi.notifications.scheduled[":id"].delete({ params: { id } }),
};

export const sendApi = {
  send: async (data: { to: string; subject: string; body: string }) =>
    notificationApi.notifications.send.post(data),
  sendTemplate: async (data: {
    to: string;
    templateKey: string;
    variables: Array<{ key: string; value: string }>;
  }) => notificationApi.notifications["send-template"].post(data),
};
