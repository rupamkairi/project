import { ulid } from "ulid";
import type { ID, Logger, DatabaseClient } from "../interfaces";
import { lmsCategories } from "../db/schema";

type DB = DatabaseClient;

function generateId(): ID {
  return ulid();
}

const lmsRoles = {
  id: "text",
  organizationId: "text",
  name: "text",
  permissions: "text[]",
  isSystem: "boolean",
} as const;

const lmsWfProcessTemplates = {
  id: "text",
  organizationId: "text",
  name: "text",
  description: "text",
  entityType: "text",
  stages: "jsonb",
  isActive: "boolean",
} as const;

const lmsNtfTemplates = {
  id: "text",
  organizationId: "text",
  key: "text",
  channel: "text",
  subject: "text",
  body: "text",
  locale: "text",
  isSystem: "boolean",
} as const;

const lmsLdgAccounts = {
  id: "text",
  organizationId: "text",
  code: "text",
  name: "text",
  type: "text",
  currency: "text",
  isSystem: "boolean",
  description: "text",
} as const;

export const lmsRolesSeed = [
  {
    name: "lms-admin",
    permissions: ["*:*"],
    description: "Platform admin — full access, billing, instructor management",
  },
  {
    name: "content-reviewer",
    permissions: [
      "course:read",
      "course:publish",
      "module:read",
      "assignment:read",
      "analytics:read",
    ],
    description: "Reviews and approves courses before publishing",
  },
  {
    name: "instructor",
    permissions: [
      "course:create",
      "course:read",
      "course:update",
      "module:create",
      "module:read",
      "module:update",
      "cohort:create",
      "cohort:read",
      "cohort:manage",
      "session:create",
      "session:read",
      "session:start",
      "assignment:create",
      "assignment:read",
      "submission:grade",
      "enrollment:read",
      "analytics:read",
    ],
    description: "Creates courses, grades assignments, manages cohorts",
  },
  {
    name: "learner",
    permissions: [
      "course:read",
      "module:read",
      "enrollment:create",
      "enrollment:read",
      "enrollment:cancel",
      "submission:create",
      "certificate:read",
    ],
    description: "Enrolls in courses, submits assignments, earns certificates",
  },
  {
    name: "org-admin",
    permissions: [
      "course:read",
      "enrollment:manage",
      "enrollment:create",
      "analytics:read",
      "billing:manage",
      "certificate:read",
    ],
    description:
      "B2B tenant admin — manages seats, learner roster for their org",
  },
];

export const lmsCategoriesSeed = [
  "Technology",
  "Design",
  "Business",
  "Science",
  "Personal Development",
  "Language",
];

export const lmsCourseReviewWorkflowSeed = {
  id: "COURSE_REVIEW",
  name: "Course Review",
  description: "Standard course review and approval workflow",
  entityType: "Course",
  stages: [
    {
      id: "content-check",
      title: "Content Review",
      description: "Review course content for quality and compliance",
      order: 1,
      tasks: [
        {
          id: "review-modules",
          title: "Review all modules for quality and accuracy",
          assigneeRole: "content-reviewer",
        },
        {
          id: "check-media",
          title: "Check media assets load correctly",
          assigneeRole: "content-reviewer",
        },
      ],
    },
    {
      id: "policy-check",
      title: "Policy & Pricing Check",
      description: "Verify pricing and compliance",
      order: 2,
      tasks: [
        {
          id: "verify-pricing",
          title: "Verify pricing and terms are compliant",
          assigneeRole: "lms-admin",
        },
        {
          id: "confirm-agreement",
          title: "Confirm instructor agreement signed",
          assigneeRole: "lms-admin",
        },
      ],
    },
  ],
};

export const lmsNotificationTemplatesSeed = [
  {
    key: "enrollment.confirmed",
    channel: "email" as const,
    subject: "You're enrolled in {{courseTitle}}",
    body: `Hi {{learnerName}},

Welcome to {{courseTitle}}! Your enrollment has been confirmed.

{{#if cohortStart}}
Your cohort starts on {{cohortStart}}.
{{/if}}

Access your course: {{courseUrl}}

Happy learning!`,
  },
  {
    key: "enrollment.nudge",
    channel: "email" as const,
    subject: "Continue your learning: {{courseTitle}}",
    body: `Hi {{learnerName}},

We noticed you haven't made progress in {{courseTitle}} recently.

Don't miss out on your learning journey! Jump back in:

{{courseUrl}}

Keep learning, keep growing!`,
  },
  {
    key: "enrollment.expiring-soon",
    channel: "email" as const,
    subject: "Your access to {{courseTitle}} expires soon",
    body: `Hi {{learnerName}},

Your access to {{courseTitle}} will expire in {{daysRemaining}} day(s).

Complete your course before you lose access:

{{courseUrl}}`,
  },
  {
    key: "enrollment.expired",
    channel: "email" as const,
    subject: "Your access to {{courseTitle}} has expired",
    body: `Hi {{learnerName}},

Your access to {{courseTitle}} has expired.

{{#if canRenew}}
Renew your access: {{renewUrl}}
{{/if}}

Thank you for learning with us!`,
  },
  {
    key: "module.unlocked",
    channel: "in_app" as const,
    subject: "",
    body: `New module unlocked: {{moduleTitle}}

You can now start learning the next module in {{courseTitle}}.`,
  },
  {
    key: "assignment.due-soon",
    channel: "in_app" as const,
    subject: "",
    body: `Assignment due tomorrow: {{assignmentTitle}}

Don't forget to submit your work for {{courseTitle}}.`,
  },
  {
    key: "assignment.overdue",
    channel: "email" as const,
    subject: "Assignment overdue: {{assignmentTitle}}",
    body: `Hi {{learnerName}},

Your assignment "{{assignmentTitle}}" in {{courseTitle}} is now overdue.

{{#if allowLateSubmission}}
You can still submit late: {{assignmentUrl}}
{{else}}
Late submissions are not accepted for this assignment.
{{/if}}`,
  },
  {
    key: "submission.received",
    channel: "in_app" as const,
    subject: "",
    body: `New submission received for {{assignmentTitle}}

Learner: {{learnerName}}
Course: {{courseTitle}}`,
  },
  {
    key: "submission.returned",
    channel: "email" as const,
    subject: "Your assignment has been graded",
    body: `Hi {{learnerName}},

Your submission for {{assignmentTitle}} has been graded.

Score: {{score}}/{{maxScore}}
{{#if feedback}}

Feedback:
{{feedback}}
{{/if}}

View details: {{submissionUrl}}`,
  },
  {
    key: "certificate.issued",
    channel: "email" as const,
    subject: "Your certificate is ready!",
    body: `Hi {{learnerName}},

Congratulations on completing {{courseTitle}}!

Your certificate of completion is ready for download.

Verification Code: {{verificationCode}}
Verify at: {{verifyUrl}}

Download your certificate: {{downloadUrl}}`,
  },
  {
    key: "certificate.expiring",
    channel: "email" as const,
    subject: "Your certificate expires soon",
    body: `Hi {{learnerName}},

Your certificate for {{courseTitle}} will expire in {{daysRemaining}} day(s).

Verification Code: {{verificationCode}}
Verify at: {{verifyUrl}}`,
  },
  {
    key: "session.reminder",
    channel: "email" as const,
    subject: "Live session starts in {{minutesBefore}} min",
    body: `Hi {{learnerName}},

Your live session "{{sessionTitle}}" starts in {{minutesBefore}} minutes.

Join now: {{meetingUrl}}

Session details:
- Scheduled: {{scheduledAt}}
- Duration: {{durationMinutes}} minutes`,
  },
  {
    key: "session.recording-ready",
    channel: "email" as const,
    subject: "Recording available: {{sessionTitle}}",
    body: `Hi {{learnerName}},

The recording for "{{sessionTitle}}" is now available.

Watch the recording: {{recordingUrl}}`,
  },
  {
    key: "session.cancelled",
    channel: "email" as const,
    subject: "Session cancelled: {{sessionTitle}}",
    body: `Hi {{learnerName}},

The live session "{{sessionTitle}}" has been cancelled.

{{#if rescheduledDate}}
Rescheduled to: {{rescheduledDate}}
{{/if}}

We apologize for any inconvenience.`,
  },
  {
    key: "cohort.starting",
    channel: "email" as const,
    subject: "Your cohort starts soon: {{cohortName}}",
    body: `Hi {{learnerName}},

Your cohort "{{cohortName}}" for {{courseTitle}} starts in 7 days!

Start date: {{startDate}}
End date: {{endDate}}

Prepare for your learning journey: {{courseUrl}}`,
  },
  {
    key: "course.approved",
    channel: "email" as const,
    subject: "Your course {{courseTitle}} is live!",
    body: `Hi {{instructorName}},

Great news! Your course "{{courseTitle}}" has been approved and is now live.

Learners can now enroll in your course.

View your course: {{courseUrl}}
View analytics: {{analyticsUrl}}`,
  },
  {
    key: "course.rejected",
    channel: "email" as const,
    subject: "Review needed: {{courseTitle}}",
    body: `Hi {{instructorName}},

Your course "{{courseTitle}}" requires revisions before it can be published.

Feedback from the review team:
{{feedback}}

Make the necessary changes and resubmit for review: {{courseUrl}}`,
  },
  {
    key: "waitlist.spot-available",
    channel: "email" as const,
    subject: "A spot is available in {{cohortName}}!",
    body: `Hi {{learnerName}},

Good news! A spot has opened up in "{{cohortName}}" for {{courseTitle}}.

Secure your spot now: {{enrollmentUrl}}

This offer expires in 48 hours.`,
  },
];

export const lmsConfigDefaultsSeed = {
  compose: "lms",
  config: {
    defaultCompletionThreshold: 80,
    refundWindowDays: 14,
    inactivityNudgeDays: 7,
    sessionReminderMinutes: [1440, 30],
    maxQuizAttempts: 3,
    certificateExpiresAfterDays: null,
  },
};

export const lmsDefaultLedgerAccountsSeed = {
  revenue: {
    code: "ACC-COURSE-REVENUE",
    name: "Course Revenue",
    type: "revenue" as const,
    currency: "USD",
    description: "Revenue from course enrollments",
  },
  refunds: {
    code: "ACC-REFUNDS",
    name: "Refunds",
    type: "expense" as const,
    currency: "USD",
    description: "Course enrollment refunds",
  },
  tax: {
    code: "ACC-TAX-COLLECTED",
    name: "Tax Collected",
    type: "liability" as const,
    currency: "USD",
    description: "Sales tax collected on course sales",
  },
  receivable: {
    code: "ACC-PAYMENT-RECEIVABLE",
    name: "Payment Receivable",
    type: "asset" as const,
    currency: "USD",
    description: "Payments pending for course enrollments",
  },
  deferred: {
    code: "ACC-DEFERRED-REVENUE",
    name: "Deferred Revenue",
    type: "liability" as const,
    currency: "USD",
    description: "Revenue deferred for subscriptions and installment plans",
  },
};

export interface SeedContext {
  db: DB;
  organizationId: ID;
  logger?: Logger;
}

export async function seedLMSRoles(ctx: SeedContext): Promise<void> {
  ctx.logger?.info("Seeding LMS roles...");

  for (const role of lmsRolesSeed) {
    await ctx.db.execute(
      `INSERT INTO lms_roles (id, organization_id, name, permissions, is_system)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (organization_id, name) DO NOTHING`,
      [generateId(), ctx.organizationId, role.name, role.permissions],
    );
  }

  ctx.logger?.info(`LMS roles seeded: ${lmsRolesSeed.length} roles`);
}

export async function seedLMSCategories(ctx: SeedContext): Promise<void> {
  ctx.logger?.info("Seeding LMS categories...");

  for (let i = 0; i < lmsCategoriesSeed.length; i++) {
    const name = lmsCategoriesSeed[i];
    const slug = name!.toLowerCase().replace(/\s+/g, "-");

    await ctx.db.execute(
      `INSERT INTO lms_categories (id, organization_id, name, slug, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (organization_id, slug) DO NOTHING`,
      [generateId(), ctx.organizationId, name, slug, i],
    );
  }

  ctx.logger?.info(
    `LMS categories seeded: ${lmsCategoriesSeed.length} categories`,
  );
}

export async function seedLMSWorkflowTemplate(ctx: SeedContext): Promise<void> {
  ctx.logger?.info("Seeding LMS workflow template...");

  await ctx.db.execute(
    `INSERT INTO lms_wf_process_templates (id, organization_id, name, description, entity_type, stages, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (id) DO NOTHING`,
    [
      lmsCourseReviewWorkflowSeed.id,
      ctx.organizationId,
      lmsCourseReviewWorkflowSeed.name,
      lmsCourseReviewWorkflowSeed.description,
      lmsCourseReviewWorkflowSeed.entityType,
      JSON.stringify(lmsCourseReviewWorkflowSeed.stages),
    ],
  );

  ctx.logger?.info("LMS workflow template seeded: COURSE_REVIEW");
}

export async function seedLMSNotificationTemplates(
  ctx: SeedContext,
): Promise<void> {
  ctx.logger?.info("Seeding LMS notification templates...");

  for (const template of lmsNotificationTemplatesSeed) {
    await ctx.db.execute(
      `INSERT INTO lms_ntf_templates (id, organization_id, key, channel, subject, body, locale, is_system)
       VALUES ($1, $2, $3, $4, $5, $6, 'en', true)
       ON CONFLICT (organization_id, key) DO NOTHING`,
      [
        generateId(),
        ctx.organizationId,
        template.key,
        template.channel,
        template.subject,
        template.body,
      ],
    );
  }

  ctx.logger?.info(
    `LMS notification templates seeded: ${lmsNotificationTemplatesSeed.length} templates`,
  );
}

export async function seedLMSLedgerAccounts(ctx: SeedContext): Promise<void> {
  ctx.logger?.info("Seeding LMS ledger accounts...");

  const accounts = Object.values(lmsDefaultLedgerAccountsSeed);

  for (const account of accounts) {
    await ctx.db.execute(
      `INSERT INTO lms_ldg_accounts (id, organization_id, code, name, type, currency, is_system, description)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        generateId(),
        ctx.organizationId,
        account.code,
        account.name,
        account.type,
        account.currency,
        account.description,
      ],
    );
  }

  ctx.logger?.info(`LMS ledger accounts seeded: ${accounts.length} accounts`);
}

export async function seedLMSConfigDefaults(_ctx: SeedContext): Promise<void> {
  _ctx.logger?.info("LMS config defaults:");
  _ctx.logger?.info(JSON.stringify(lmsConfigDefaultsSeed, null, 2));
  _ctx.logger?.info(
    "LMS config defaults defined (apply via settings/admin API)",
  );
}

export async function seedLMSData(ctx: SeedContext): Promise<void> {
  ctx.logger?.info("Starting LMS seed...");

  await seedLMSRoles(ctx);
  await seedLMSCategories(ctx);
  await seedLMSWorkflowTemplate(ctx);
  await seedLMSNotificationTemplates(ctx);
  await seedLMSLedgerAccounts(ctx);
  await seedLMSConfigDefaults(ctx);

  ctx.logger?.info("LMS seed complete");
}

export default {
  seedLMSData,
  seedLMSRoles,
  seedLMSCategories,
  seedLMSWorkflowTemplate,
  seedLMSNotificationTemplates,
  seedLMSLedgerAccounts,
  seedLMSConfigDefaults,
  lmsRolesSeed,
  lmsCategoriesSeed,
  lmsCourseReviewWorkflowSeed,
  lmsNotificationTemplatesSeed,
  lmsConfigDefaultsSeed,
  lmsDefaultLedgerAccountsSeed,
};
