// Scheduled Messages Routes - CRUD for scheduled notifications

import { Elysia } from "elysia";
import type { ScheduledMessage, TemplateVariable } from "../types";

const scheduledMessages = new Map<string, ScheduledMessage>();

let messageIdCounter = 0;

export const scheduledRoutes = new Elysia({ prefix: "/scheduled" })
  .get("/", ({ query }) => {
    const status = query.status as string | undefined;
    let result = Array.from(scheduledMessages.values());

    if (status) {
      result = result.filter((m) => m.status === status);
    }

    result.sort((a, b) => a.scheduledAt - b.scheduledAt);

    return { scheduled: result };
  })
  .get("/:id", ({ params: { id }, set }) => {
    const message = scheduledMessages.get(id);
    if (!message) {
      set.status = 404;
      return { error: "Scheduled message not found" };
    }
    return { scheduled: message };
  })
  .post("/", ({ body, set }) => {
    const data = body as {
      templateKey: string;
      recipient: string;
      variables: TemplateVariable[];
      scheduledAt: number;
    };

    if (
      !data.templateKey ||
      !data.recipient ||
      !data.variables ||
      !data.scheduledAt
    ) {
      set.status = 400;
      return { error: "Missing required fields" };
    }

    if (data.scheduledAt < Date.now()) {
      set.status = 400;
      return { error: "scheduledAt must be in the future" };
    }

    const id = `scheduled_${++messageIdCounter}_${Date.now()}`;

    const message: ScheduledMessage = {
      id,
      templateKey: data.templateKey,
      recipient: data.recipient,
      variables: data.variables,
      scheduledAt: data.scheduledAt,
      status: "pending",
    };

    scheduledMessages.set(id, message);

    scheduleMessage(message);

    return { scheduled: message, created: true };
  })
  .patch("/:id", ({ params: { id }, body, set }) => {
    const existing = scheduledMessages.get(id);
    if (!existing) {
      set.status = 404;
      return { error: "Scheduled message not found" };
    }

    if (existing.status !== "pending") {
      set.status = 400;
      return { error: "Can only modify pending messages" };
    }

    const data = body as Partial<{
      scheduledAt: number;
      status: "pending" | "cancelled";
    }>;
    const updated = { ...existing, ...data };
    scheduledMessages.set(id, updated);

    return { scheduled: updated, updated: true };
  })
  .delete("/:id", ({ params: { id }, set }) => {
    const existing = scheduledMessages.get(id);
    if (!existing) {
      set.status = 404;
      return { error: "Scheduled message not found" };
    }

    if (existing.status === "sent") {
      set.status = 400;
      return { error: "Cannot delete already sent messages" };
    }

    existing.status = "cancelled";
    scheduledMessages.set(id, existing);

    return { deleted: true };
  });

function scheduleMessage(message: ScheduledMessage) {
  const delay = message.scheduledAt - Date.now();

  if (delay <= 0) {
    processScheduledMessage(message.id);
    return;
  }

  setTimeout(() => {
    processScheduledMessage(message.id);
  }, delay);
}

async function processScheduledMessage(id: string) {
  const message = scheduledMessages.get(id);
  if (!message || message.status !== "pending") {
    return;
  }

  console.log(`[SCHEDULED] Processing message ${id} to ${message.recipient}`);

  message.status = "sent";
  scheduledMessages.set(id, message);
}

export function getScheduledMessages() {
  return Array.from(scheduledMessages.values());
}

export function getPendingScheduledMessages() {
  return Array.from(scheduledMessages.values()).filter(
    (m) => m.status === "pending",
  );
}

export function processMessage(id: string) {
  return processScheduledMessage(id);
}
