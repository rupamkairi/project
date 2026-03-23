// Queue Job Processors - Background job handlers for notifications

import { sendEmail } from "./email";
import { renderTemplate } from "../routes/templates";
import type { TemplateVariable } from "../types";

interface SendEmailJob {
  type: "send-email";
  to: string;
  subject: string;
  body: string;
  from?: string;
}

interface SendTemplateJob {
  type: "send-template";
  to: string;
  templateKey: string;
  variables: TemplateVariable[];
  from?: string;
}

type NotificationJob = SendEmailJob | SendTemplateJob;

export function registerJobs() {
  console.log("[NotificationPlugin] Registering queue jobs...");

  return {
    "notification.send-email": async (job: SendEmailJob) => {
      console.log("[NotificationPlugin] Processing send-email job: " + job.to);
      return sendEmail({
        to: job.to,
        subject: job.subject,
        body: job.body,
        from: job.from,
      }, undefined);
    },
    "notification.send-template": async (job: SendTemplateJob) => {
      console.log("[NotificationPlugin] Processing send-template job: " + job.templateKey);

      const variablesObj: Record<string, unknown> = {};
      for (const v of job.variables) {
        variablesObj[v.key] = v.value;
      }

      const { body, subject } = await renderTemplate(job.templateKey, variablesObj);

      return sendEmail({
        to: job.to,
        subject,
        body,
        from: job.from,
      }, undefined);
    },
  };
}

export async function enqueueSendEmail(
  queue: { add: (name: string, data: unknown) => Promise<unknown> },
  job: SendEmailJob
) {
  return queue.add("notification.send-email", job);
}

export async function enqueueSendTemplate(
  queue: { add: (name: string, data: unknown) => Promise<unknown> },
  job: SendTemplateJob
) {
  return queue.add("notification.send-template", job);
}
