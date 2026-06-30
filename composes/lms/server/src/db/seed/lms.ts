import { db } from "@db/client"
import { eq } from "drizzle-orm"
import { lmsOrgConfig } from "../schema/lms"
import { roles } from "@db/schema/identity"
import { ntfTemplates } from "@db/schema/notification"

// ── LMS Roles ──────────────────────────────────────────

const lmsRoles = [
  {
    name: "lms-admin",
    description: "LMS Administrator - Full LMS access across all courses and learners",
    permissions: [
      "course:create", "course:read", "course:update", "course:publish", "course:archive",
      "module:create", "module:read", "module:update",
      "enrollment:create", "enrollment:read", "enrollment:manage",
      "cohort:create", "cohort:manage",
      "session:create", "session:start",
      "assignment:create",
      "submission:create", "submission:grade",
      "certificate:read", "certificate:revoke",
      "analytics:read",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "content-reviewer",
    description: "Content Reviewer - Reviews and approves course content before publish",
    permissions: [
      "course:read", "course:publish",
      "module:read",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "instructor",
    description: "Instructor - Creates and manages own courses, grades submissions",
    permissions: [
      "course:create", "course:read", "course:update", "course:archive",
      "module:create", "module:read", "module:update",
      "enrollment:read",
      "cohort:create", "cohort:manage",
      "session:create", "session:start",
      "assignment:create",
      "submission:grade",
      "analytics:read",
    ],
    isSystem: true,
    isDefault: false,
  },
  {
    name: "learner",
    description: "Learner - Enrolled student with access to purchased courses",
    permissions: [
      "course:read",
      "enrollment:create", "enrollment:read",
      "session:create",
      "submission:create",
      "certificate:read",
    ],
    isSystem: true,
    isDefault: true,
  },
  {
    name: "org-admin",
    description: "Organization Admin - Oversees all LMS activity within their org",
    permissions: [
      "course:create", "course:read", "course:update", "course:publish", "course:archive",
      "module:create", "module:read", "module:update",
      "enrollment:create", "enrollment:read", "enrollment:manage",
      "cohort:create", "cohort:manage",
      "session:create", "session:start",
      "assignment:create",
      "submission:grade",
      "certificate:read",
      "analytics:read",
    ],
    isSystem: true,
    isDefault: false,
  },
]

// ── LMS Notification Templates ─────────────────────────

const lmsNotificationTemplates = [
  {
    key: "lms.enrollment.confirmed",
    channel: "email" as const,
    subject: "Enrolled in {{courseName}}",
    body: "Hi {{firstName}}, you have been enrolled in {{courseName}}. Start learning: {{courseUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.course.completed",
    channel: "email" as const,
    subject: "Congratulations! You completed {{courseName}}",
    body: "Hi {{firstName}}, you have successfully completed {{courseName}}. Your certificate is ready: {{certificateUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.assignment.graded",
    channel: "email" as const,
    subject: "Assignment graded: {{assignmentTitle}}",
    body: "Hi {{firstName}}, your assignment '{{assignmentTitle}}' has been graded. Score: {{score}}/{{maxScore}}. Feedback: {{feedback}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.course.review.submitted",
    channel: "email" as const,
    subject: "Course submitted for review: {{courseName}}",
    body: "Course '{{courseName}}' has been submitted for review by {{instructorName}}. Review it: {{reviewUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.course.review.approved",
    channel: "email" as const,
    subject: "Course approved: {{courseName}}",
    body: "Hi {{firstName}}, your course '{{courseName}}' has been approved and is now published.",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.course.review.rejected",
    channel: "email" as const,
    subject: "Course review: {{courseName}} needs changes",
    body: "Hi {{firstName}}, your course '{{courseName}}' needs changes before publishing. Notes: {{reviewNotes}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.live.session.reminder",
    channel: "email" as const,
    subject: "Upcoming live session: {{sessionTitle}}",
    body: "Reminder: Live session '{{sessionTitle}}' starts at {{sessionStart}}. Join: {{sessionUrl}}",
    locale: "en",
    isSystem: true,
  },
  {
    key: "lms.certificate.issued",
    channel: "email" as const,
    subject: "Your certificate for {{courseName}} is ready",
    body: "Hi {{firstName}}, your certificate for completing {{courseName}} is available. Download: {{certificateUrl}}",
    locale: "en",
    isSystem: true,
  },
]

export async function seedLms(organizationId: string) {
  console.log("Seeding LMS data...")

  const now = new Date()

  // Check if already seeded for this org
  const existingConfig = await db.select().from(lmsOrgConfig).where(
    eq(lmsOrgConfig.organizationId, organizationId),
  ).limit(1)

  if (existingConfig.length > 0) {
    console.log(`LMS data already seeded for org ${organizationId}, skipping...`)
    return
  }

  // Seed org config
  await db.insert(lmsOrgConfig).values({
    id: `lms_cfg_${organizationId}`,
    organizationId,
    defaultCompletionThreshold: 80,
    maxQuizAttempts: 3,
    allowGuestAccess: false,
    paymentProvider: "stripe",
    videoProvider: "vimeo",
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
  })
  console.log("Created LMS org config")

  // Seed LMS roles
  const seededRoles = await db.insert(roles).values(
    lmsRoles.map((r) => ({
      ...r,
      id: `lms_role_${r.name}`,
      organizationId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })),
  ).returning()
  console.log("Seeded LMS roles:", seededRoles.map((r: { name: string }) => r.name).join(", "))

  // Seed notification templates
  await db.insert(ntfTemplates).values(
    lmsNotificationTemplates.map((t) => ({
      ...t,
      id: `lms_ntf_${t.key.replace(/\./g, "_")}`,
      organizationId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })),
  )
  console.log("Seeded LMS notification templates")

  console.log("LMS seed completed!")
}
