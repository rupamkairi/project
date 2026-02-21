export type LMSRole = "lms-admin" | "content-reviewer";

export type CourseStatus = "draft" | "under-review" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced";

export type EnrollmentStatus = "active" | "completed" | "expired" | "cancelled";
export type LearnerStatus = "active" | "suspended";

export type NotificationChannel = "email" | "in_app" | "push";

export type WorkflowStage = "content-check" | "policy-check";
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: LMSRole;
  avatar?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  instructorId: string;
  instructor: Instructor;
  category: string;
  status: CourseStatus;
  level: CourseLevel;
  price: number;
  compareAtPrice?: number;
  currency: string;
  enrolledCount: number;
  moduleCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  description?: string;
  thumbnail?: string;
}

export interface Instructor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  activeCourses: number;
  totalEnrolled: number;
  avgCompletionRate: number;
  totalRevenue: number;
}

export interface Learner {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolledCourseCount: number;
  completedCourses: number;
  certificatesEarned: number;
  lastActive: string;
  status: LearnerStatus;
  joinedAt: string;
}

export interface Enrollment {
  id: string;
  learnerId: string;
  learner: Learner;
  courseId: string;
  course: Course;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
  completionPct: number;
  pricePaid: number;
  currency: string;
  expiresAt?: string;
}

export interface Certificate {
  id: string;
  verificationCode: string;
  learnerId: string;
  learner: Learner;
  courseId: string;
  course: Course;
  issuedAt: string;
  expiresAt?: string;
  revoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
  templateTitle: string;
}

export interface NotificationTemplate {
  key: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  triggerDescription: string;
  variables: string[];
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: LMSRole;
  avatar?: string;
  invitedAt: string;
  lastActive?: string;
}

export interface WorkflowTask {
  id: string;
  label: string;
  status: TaskStatus;
  requiredRole: LMSRole;
}

export interface WorkflowInstance {
  id: string;
  courseId: string;
  course: Course;
  stage: WorkflowStage;
  tasks: WorkflowTask[];
  submittedAt: string;
  currentAssignee?: string;
}

export interface PlatformSettings {
  platformName: string;
  logo?: string;
  supportEmail: string;
  defaultTimezone: string;
  completionThreshold: number;
}

export interface PaymentSettings {
  activeGateway: "stripe" | "razorpay";
  stripeApiKey?: string;
  stripeWebhookSecret?: string;
  razorpayKeyId?: string;
  razorpayWebhookSecret?: string;
  supportedCurrencies: string[];
}

export interface DashboardKPIs {
  totalActiveLearners: number;
  totalCourses: number;
  enrollmentsThisMonth: number;
  revenueThisMonth: number;
  completionRate: number;
  certificatesIssued: number;
}

export interface RevenueData {
  date: string;
  realized: number;
  deferred: number;
}

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  completionRate: number;
  avgScore: number;
  rating: number;
  revenue: number;
}

export interface InstructorAnalytics {
  instructorId: string;
  instructorName: string;
  activeCourses: number;
  totalEnrolled: number;
  avgCompletionRate: number;
  totalRevenue: number;
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    key: "enrollment.confirmed",
    channel: "email",
    subject: "Welcome to {{courseTitle}}!",
    body: "Hi {{learnerName}},\n\nYou've been enrolled in {{courseTitle}}. Start learning now: {{courseUrl}}",
    triggerDescription: "Sent when a learner enrolls in a course",
    variables: ["learnerName", "courseTitle", "courseUrl"],
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    key: "enrollment.reminder",
    channel: "email",
    subject: "Don't forget about {{courseTitle}}",
    body: "Hi {{learnerName}},\n\nYou haven't accessed {{courseTitle}} in a while. Continue your learning journey!",
    triggerDescription: "Sent when learner hasn't accessed course in 7 days",
    variables: ["learnerName", "courseTitle", "courseUrl"],
    updatedAt: "2024-01-14T09:00:00Z",
  },
  {
    key: "course.completed",
    channel: "email",
    subject: "Congratulations on completing {{courseTitle}}!",
    body: "Hi {{learnerName}},\n\nYou've completed {{courseTitle}}! Your certificate is ready.",
    triggerDescription: "Sent when learner completes a course",
    variables: ["learnerName", "courseTitle", "certificateUrl"],
    updatedAt: "2024-01-13T08:00:00Z",
  },
  {
    key: "certificate.issued",
    channel: "email",
    subject: "Your certificate for {{courseTitle}} is ready",
    body: "Hi {{learnerName}},\n\nYour certificate has been issued. View it here: {{certificateUrl}}\n\nVerification code: {{verificationCode}}",
    triggerDescription: "Sent when a certificate is issued",
    variables: [
      "learnerName",
      "courseTitle",
      "certificateUrl",
      "verificationCode",
    ],
    updatedAt: "2024-01-12T07:00:00Z",
  },
  {
    key: "assignment.assigned",
    channel: "in_app",
    body: "New assignment: {{assignmentTitle}} in {{courseTitle}}",
    triggerDescription: "Shown when assignment becomes available",
    variables: ["assignmentTitle", "courseTitle", "dueDate"],
    updatedAt: "2024-01-11T06:00:00Z",
  },
  {
    key: "assignment.due-soon",
    channel: "email",
    subject: "Assignment due soon: {{assignmentTitle}}",
    body: "Hi {{learnerName}},\n\nYour assignment {{assignmentTitle}} is due in {{timeRemaining}}.",
    triggerDescription: "Sent 24 hours before assignment due date",
    variables: [
      "learnerName",
      "assignmentTitle",
      "courseTitle",
      "timeRemaining",
    ],
    updatedAt: "2024-01-10T05:00:00Z",
  },
  {
    key: "submission.received",
    channel: "in_app",
    body: "{{learnerName}} submitted {{assignmentTitle}}",
    triggerDescription: "Shown to instructor when submission received",
    variables: ["learnerName", "assignmentTitle", "courseTitle"],
    updatedAt: "2024-01-09T04:00:00Z",
  },
  {
    key: "submission.returned",
    channel: "email",
    subject: "Your submission has been graded",
    body: "Hi {{learnerName}},\n\nYour submission for {{assignmentTitle}} has been graded. Score: {{score}}/{{maxScore}}",
    triggerDescription: "Sent when instructor returns graded submission",
    variables: [
      "learnerName",
      "assignmentTitle",
      "courseTitle",
      "score",
      "maxScore",
      "feedback",
    ],
    updatedAt: "2024-01-08T03:00:00Z",
  },
  {
    key: "course.submitted-for-review",
    channel: "in_app",
    body: "New course submitted for review: {{courseTitle}}",
    triggerDescription: "Shown to admins when course submitted",
    variables: ["courseTitle", "instructorName"],
    updatedAt: "2024-01-07T02:00:00Z",
  },
  {
    key: "course.approved",
    channel: "email",
    subject: "Your course has been approved!",
    body: "Hi {{instructorName}},\n\nGreat news! Your course {{courseTitle}} has been approved and is now live.",
    triggerDescription: "Sent to instructor when course approved",
    variables: ["instructorName", "courseTitle", "courseUrl"],
    updatedAt: "2024-01-06T01:00:00Z",
  },
  {
    key: "course.rejected",
    channel: "email",
    subject: "Your course needs revisions",
    body: "Hi {{instructorName}},\n\nYour course {{courseTitle}} was not approved. Reason: {{reason}}",
    triggerDescription: "Sent to instructor when course rejected",
    variables: ["instructorName", "courseTitle", "reason"],
    updatedAt: "2024-01-05T00:00:00Z",
  },
  {
    key: "session.starting",
    channel: "in_app",
    body: "Live session starting: {{sessionTitle}}",
    triggerDescription: "Shown 15 minutes before session starts",
    variables: ["sessionTitle", "courseTitle", "joinUrl"],
    updatedAt: "2024-01-04T23:00:00Z",
  },
  {
    key: "session.recording-available",
    channel: "email",
    subject: "Recording available: {{sessionTitle}}",
    body: "Hi {{learnerName}},\n\nThe recording for {{sessionTitle}} is now available.",
    triggerDescription: "Sent when session recording is uploaded",
    variables: ["learnerName", "sessionTitle", "courseTitle", "recordingUrl"],
    updatedAt: "2024-01-03T22:00:00Z",
  },
  {
    key: "module.unlocked",
    channel: "in_app",
    body: "New module unlocked: {{moduleTitle}}",
    triggerDescription: "Shown when module becomes available",
    variables: ["moduleTitle", "courseTitle"],
    updatedAt: "2024-01-02T21:00:00Z",
  },
  {
    key: "cohort.enrolled",
    channel: "email",
    subject: "You've been added to {{cohortName}}",
    body: "Hi {{learnerName}},\n\nYou've been enrolled in the cohort {{cohortName}} for {{courseTitle}}.",
    triggerDescription: "Sent when learner added to cohort",
    variables: ["learnerName", "cohortName", "courseTitle", "startDate"],
    updatedAt: "2024-01-01T20:00:00Z",
  },
  {
    key: "payment.success",
    channel: "email",
    subject: "Payment confirmed for {{courseTitle}}",
    body: "Hi {{learnerName}},\n\nYour payment of {{amount}} for {{courseTitle}} has been confirmed.",
    triggerDescription: "Sent when payment is successful",
    variables: ["learnerName", "courseTitle", "amount", "transactionId"],
    updatedAt: "2023-12-31T19:00:00Z",
  },
  {
    key: "payment.refunded",
    channel: "email",
    subject: "Refund processed for {{courseTitle}}",
    body: "Hi {{learnerName}},\n\nYour refund of {{amount}} for {{courseTitle}} has been processed.",
    triggerDescription: "Sent when refund is processed",
    variables: ["learnerName", "courseTitle", "amount", "reason"],
    updatedAt: "2023-12-30T18:00:00Z",
  },
];
