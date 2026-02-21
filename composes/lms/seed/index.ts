import { ulid } from "ulid";
import type { DB } from "../../../apps/server/src/infra/db/client";
import { roles } from "../../../apps/server/src/infra/db/schema/identity";
import { lmsCategories } from "../db/schema";
import { wfProcessTemplates } from "../../../apps/server/src/infra/db/schema/workflow";
import { ntfTemplates } from "../../../apps/server/src/infra/db/schema/notification";
import { ldgAccounts } from "../../../apps/server/src/infra/db/schema/ledger";

function generateId(): string {
  return ulid();
}

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
  organizationId: string;
}

export async function seedLMSRoles(ctx: SeedContext): Promise<void> {
  console.log("Seeding LMS roles...");

  for (const role of lmsRolesSeed) {
    await ctx.db
      .insert(roles)
      .values({
        id: generateId(),
        organizationId: ctx.organizationId,
        name: role.name,
        permissions: role.permissions,
        isSystem: true,
      })
      .onConflictDoNothing();
  }

  console.log(`✓ LMS roles seeded: ${lmsRolesSeed.length} roles`);
}

export async function seedLMSCategories(ctx: SeedContext): Promise<void> {
  console.log("Seeding LMS categories...");

  for (let i = 0; i < lmsCategoriesSeed.length; i++) {
    const name = lmsCategoriesSeed[i];
    const slug = name.toLowerCase().replace(/\s+/g, "-");

    await ctx.db
      .insert(lmsCategories)
      .values({
        id: generateId(),
        organizationId: ctx.organizationId,
        name,
        slug,
        sortOrder: i,
        status: "active",
      })
      .onConflictDoNothing();
  }

  console.log(
    `✓ LMS categories seeded: ${lmsCategoriesSeed.length} categories`,
  );
}

export async function seedLMSWorkflowTemplate(ctx: SeedContext): Promise<void> {
  console.log("Seeding LMS workflow template...");

  await ctx.db
    .insert(wfProcessTemplates)
    .values({
      id: lmsCourseReviewWorkflowSeed.id,
      organizationId: ctx.organizationId,
      name: lmsCourseReviewWorkflowSeed.name,
      description: lmsCourseReviewWorkflowSeed.description,
      entityType: lmsCourseReviewWorkflowSeed.entityType,
      stages: lmsCourseReviewWorkflowSeed.stages,
      isActive: true,
    })
    .onConflictDoNothing();

  console.log("✓ LMS workflow template seeded: COURSE_REVIEW");
}

export async function seedLMSNotificationTemplates(
  ctx: SeedContext,
): Promise<void> {
  console.log("Seeding LMS notification templates...");

  for (const template of lmsNotificationTemplatesSeed) {
    await ctx.db
      .insert(ntfTemplates)
      .values({
        id: generateId(),
        organizationId: ctx.organizationId,
        key: template.key,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        locale: "en",
        isSystem: true,
      })
      .onConflictDoNothing();
  }

  console.log(
    `✓ LMS notification templates seeded: ${lmsNotificationTemplatesSeed.length} templates`,
  );
}

export async function seedLMSLedgerAccounts(ctx: SeedContext): Promise<void> {
  console.log("Seeding LMS ledger accounts...");

  const accounts = Object.values(lmsDefaultLedgerAccountsSeed);

  for (const account of accounts) {
    await ctx.db
      .insert(ldgAccounts)
      .values({
        id: generateId(),
        organizationId: ctx.organizationId,
        code: account.code,
        name: account.name,
        type: account.type,
        currency: account.currency,
        isSystem: true,
        description: account.description,
      })
      .onConflictDoNothing();
  }

  console.log(`✓ LMS ledger accounts seeded: ${accounts.length} accounts`);
}

export async function seedLMSConfigDefaults(_ctx: SeedContext): Promise<void> {
  console.log("LMS config defaults:");
  console.log(JSON.stringify(lmsConfigDefaultsSeed, null, 2));
  console.log("✓ LMS config defaults defined (apply via settings/admin API)");
}

export async function seedLMSData(ctx: SeedContext): Promise<void> {
  console.log("Starting LMS seed...");

  await seedLMSRoles(ctx);
  await seedLMSCategories(ctx);
  await seedLMSWorkflowTemplate(ctx);
  await seedLMSNotificationTemplates(ctx);
  await seedLMSLedgerAccounts(ctx);
  await seedLMSConfigDefaults(ctx);

  console.log("✓ LMS seed complete");
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
