import type { ID, Timestamp, Money } from "../types";

export const LMS_EVENT_NAMESPACE = "lms";

export const CourseEventTypes = {
  CREATED: "course.created",
  UPDATED: "course.updated",
  SUBMITTED_FOR_REVIEW: "course.submitted-for-review",
  PUBLISHED: "course.published",
  REJECTED: "course.rejected",
  ARCHIVED: "course.archived",
  RESTORED: "course.restored",
} as const;

export const EnrollmentEventTypes = {
  CREATED: "enrollment.created",
  ACTIVATED: "enrollment.activated",
  COMPLETED: "enrollment.completed",
  EXPIRED: "enrollment.expired",
  CANCELLED: "enrollment.cancelled",
  REFUNDED: "enrollment.refunded",
} as const;

export const ModuleEventTypes = {
  STARTED: "module.started",
  COMPLETED: "module.completed",
  UNLOCKED: "module.unlocked",
} as const;

export const AssignmentEventTypes = {
  CREATED: "assignment.created",
  UPDATED: "assignment.updated",
  DELETED: "assignment.deleted",
} as const;

export const SubmissionEventTypes = {
  CREATED: "submission.created",
  RECEIVED: "submission.received",
  GRADED: "submission.graded",
  RETURNED: "submission.returned",
} as const;

export const CertificateEventTypes = {
  ISSUED: "certificate.issued",
  EXPIRING: "certificate.expiring",
  REVOKED: "certificate.revoked",
} as const;

export const CohortEventTypes = {
  CREATED: "cohort.created",
  ACTIVATED: "cohort.activated",
  COMPLETED: "cohort.completed",
  CANCELLED: "cohort.cancelled",
} as const;

export const SessionEventTypes = {
  CREATED: "session.created",
  REMINDER_TRIGGER: "session.reminder-trigger",
  STARTED: "session.started",
  ENDED: "session.ended",
  RECORDED: "session.recorded",
  CANCELLED: "session.cancelled",
} as const;

export interface CourseCreatedPayload {
  courseId: ID;
  title: string;
  slug: string;
  instructorId: ID;
  categoryId: ID;
  status: string;
  price: Money;
}

export interface CourseUpdatedPayload {
  courseId: ID;
  title?: string;
  description?: string;
  instructorId: ID;
  updatedFields: string[];
}

export interface CourseSubmittedForReviewPayload {
  courseId: ID;
  title: string;
  instructorId: ID;
  submittedAt: Timestamp;
}

export interface CoursePublishedPayload {
  courseId: ID;
  title: string;
  slug: string;
  instructorId: ID;
  publishedAt: Timestamp;
}

export interface CourseRejectedPayload {
  courseId: ID;
  title: string;
  instructorId: ID;
  rejectionReason: string;
  rejectedBy: ID;
  rejectedAt: Timestamp;
}

export interface CourseArchivedPayload {
  courseId: ID;
  title: string;
  instructorId: ID;
  archivedAt: Timestamp;
}

export interface CourseRestoredPayload {
  courseId: ID;
  title: string;
  instructorId: ID;
  restoredAt: Timestamp;
}

export interface EnrollmentCreatedPayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  cohortId?: ID;
  status: string;
  pricePaid: Money;
}

export interface EnrollmentActivatedPayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  cohortId?: ID;
  activatedAt: Timestamp;
}

export interface EnrollmentCompletedPayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  completionPct: number;
  completedAt: Timestamp;
  certificateId?: ID;
}

export interface EnrollmentExpiredPayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  expiredAt: Timestamp;
}

export interface EnrollmentCancelledPayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  cancelledAt: Timestamp;
  reason?: string;
}

export interface EnrollmentRefundedPayload {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  refundAmount: Money;
  refundedAt: Timestamp;
  paymentId?: ID;
}

export interface ModuleStartedPayload {
  moduleProgressId: ID;
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  courseId: ID;
  startedAt: Timestamp;
}

export interface ModuleCompletedPayload {
  moduleProgressId: ID;
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  courseId: ID;
  completedAt: Timestamp;
  quizScore?: number;
  timeSpentSec: number;
}

export interface ModuleUnlockedPayload {
  moduleProgressId: ID;
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  courseId: ID;
  unlockedAt: Timestamp;
}

export interface AssignmentCreatedPayload {
  assignmentId: ID;
  courseId: ID;
  moduleId: ID;
  title: string;
  type: string;
  maxScore: number;
  passingScore: number;
  dueHoursAfterEnrollment?: number;
  absoluteDueDate?: Timestamp;
}

export interface AssignmentUpdatedPayload {
  assignmentId: ID;
  courseId: ID;
  moduleId: ID;
  updatedFields: string[];
}

export interface AssignmentDeletedPayload {
  assignmentId: ID;
  courseId: ID;
  moduleId: ID;
  title: string;
  deletedAt: Timestamp;
}

export interface SubmissionCreatedPayload {
  submissionId: ID;
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  attemptNumber: number;
  submittedAt: Timestamp;
}

export interface SubmissionReceivedPayload {
  submissionId: ID;
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  moduleId: ID;
  courseId: ID;
  attemptNumber: number;
  receivedAt: Timestamp;
}

export interface SubmissionGradedPayload {
  submissionId: ID;
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  moduleId: ID;
  courseId: ID;
  score: number;
  maxScore: number;
  passed: boolean;
  feedback?: string;
  gradedBy: ID;
  gradedAt: Timestamp;
}

export interface SubmissionReturnedPayload {
  submissionId: ID;
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  moduleId: ID;
  courseId: ID;
  score: number;
  maxScore: number;
  feedback?: string;
  returnedAt: Timestamp;
}

export interface CertificateIssuedPayload {
  certificateId: ID;
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string;
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface CertificateExpiringPayload {
  certificateId: ID;
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string;
  expiresAt: Timestamp;
  daysUntilExpiry: number;
}

export interface CertificateRevokedPayload {
  certificateId: ID;
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string;
  revokedReason: string;
  revokedBy: ID;
  revokedAt: Timestamp;
}

export interface CohortCreatedPayload {
  cohortId: ID;
  courseId: ID;
  name: string;
  instructorId: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  capacity: number;
  timezone: string;
}

export interface CohortActivatedPayload {
  cohortId: ID;
  courseId: ID;
  name: string;
  instructorId: ID;
  activatedAt: Timestamp;
  enrolledCount: number;
}

export interface CohortCompletedPayload {
  cohortId: ID;
  courseId: ID;
  name: string;
  instructorId: ID;
  completedAt: Timestamp;
  totalEnrolled: number;
  totalCompleted: number;
}

export interface CohortCancelledPayload {
  cohortId: ID;
  courseId: ID;
  name: string;
  instructorId: ID;
  cancelledAt: Timestamp;
  reason?: string;
}

export interface SessionCreatedPayload {
  sessionId: ID;
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  meetingUrl: string;
}

export interface SessionReminderTriggerPayload {
  sessionId: ID;
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  minutesBefore: number;
}

export interface SessionStartedPayload {
  sessionId: ID;
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  startedAt: Timestamp;
  meetingUrl: string;
}

export interface SessionEndedPayload {
  sessionId: ID;
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  endedAt: Timestamp;
  durationMinutes: number;
  attendeeCount: number;
}

export interface SessionRecordedPayload {
  sessionId: ID;
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  recordingUrl: string;
  recordedAt: Timestamp;
}

export interface SessionCancelledPayload {
  sessionId: ID;
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  cancelledAt: Timestamp;
  reason?: string;
}

export interface LmsEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Timestamp;
  orgId: ID;
  correlationId?: string;
}

function createEvent<T>(
  type: string,
  payload: T,
  orgId: ID,
  correlationId?: string,
): LmsEvent<T> {
  return {
    type,
    payload,
    timestamp: Date.now() as Timestamp,
    orgId,
    correlationId,
  };
}

export const courseCreated = (
  payload: CourseCreatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CourseEventTypes.CREATED, payload, orgId, correlationId);

export const courseUpdated = (
  payload: CourseUpdatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CourseEventTypes.UPDATED, payload, orgId, correlationId);

export const courseSubmittedForReview = (
  payload: CourseSubmittedForReviewPayload,
  orgId: ID,
  correlationId?: string,
) =>
  createEvent(
    CourseEventTypes.SUBMITTED_FOR_REVIEW,
    payload,
    orgId,
    correlationId,
  );

export const coursePublished = (
  payload: CoursePublishedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CourseEventTypes.PUBLISHED, payload, orgId, correlationId);

export const courseRejected = (
  payload: CourseRejectedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CourseEventTypes.REJECTED, payload, orgId, correlationId);

export const courseArchived = (
  payload: CourseArchivedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CourseEventTypes.ARCHIVED, payload, orgId, correlationId);

export const courseRestored = (
  payload: CourseRestoredPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CourseEventTypes.RESTORED, payload, orgId, correlationId);

export const enrollmentCreated = (
  payload: EnrollmentCreatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(EnrollmentEventTypes.CREATED, payload, orgId, correlationId);

export const enrollmentActivated = (
  payload: EnrollmentActivatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(EnrollmentEventTypes.ACTIVATED, payload, orgId, correlationId);

export const enrollmentCompleted = (
  payload: EnrollmentCompletedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(EnrollmentEventTypes.COMPLETED, payload, orgId, correlationId);

export const enrollmentExpired = (
  payload: EnrollmentExpiredPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(EnrollmentEventTypes.EXPIRED, payload, orgId, correlationId);

export const enrollmentCancelled = (
  payload: EnrollmentCancelledPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(EnrollmentEventTypes.CANCELLED, payload, orgId, correlationId);

export const enrollmentRefunded = (
  payload: EnrollmentRefundedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(EnrollmentEventTypes.REFUNDED, payload, orgId, correlationId);

export const moduleStarted = (
  payload: ModuleStartedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(ModuleEventTypes.STARTED, payload, orgId, correlationId);

export const moduleCompleted = (
  payload: ModuleCompletedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(ModuleEventTypes.COMPLETED, payload, orgId, correlationId);

export const moduleUnlocked = (
  payload: ModuleUnlockedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(ModuleEventTypes.UNLOCKED, payload, orgId, correlationId);

export const assignmentCreated = (
  payload: AssignmentCreatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(AssignmentEventTypes.CREATED, payload, orgId, correlationId);

export const assignmentUpdated = (
  payload: AssignmentUpdatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(AssignmentEventTypes.UPDATED, payload, orgId, correlationId);

export const assignmentDeleted = (
  payload: AssignmentDeletedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(AssignmentEventTypes.DELETED, payload, orgId, correlationId);

export const submissionCreated = (
  payload: SubmissionCreatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SubmissionEventTypes.CREATED, payload, orgId, correlationId);

export const submissionReceived = (
  payload: SubmissionReceivedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SubmissionEventTypes.RECEIVED, payload, orgId, correlationId);

export const submissionGraded = (
  payload: SubmissionGradedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SubmissionEventTypes.GRADED, payload, orgId, correlationId);

export const submissionReturned = (
  payload: SubmissionReturnedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SubmissionEventTypes.RETURNED, payload, orgId, correlationId);

export const certificateIssued = (
  payload: CertificateIssuedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CertificateEventTypes.ISSUED, payload, orgId, correlationId);

export const certificateExpiring = (
  payload: CertificateExpiringPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CertificateEventTypes.EXPIRING, payload, orgId, correlationId);

export const certificateRevoked = (
  payload: CertificateRevokedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CertificateEventTypes.REVOKED, payload, orgId, correlationId);

export const cohortCreated = (
  payload: CohortCreatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CohortEventTypes.CREATED, payload, orgId, correlationId);

export const cohortActivated = (
  payload: CohortActivatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CohortEventTypes.ACTIVATED, payload, orgId, correlationId);

export const cohortCompleted = (
  payload: CohortCompletedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CohortEventTypes.COMPLETED, payload, orgId, correlationId);

export const cohortCancelled = (
  payload: CohortCancelledPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(CohortEventTypes.CANCELLED, payload, orgId, correlationId);

export const sessionCreated = (
  payload: SessionCreatedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SessionEventTypes.CREATED, payload, orgId, correlationId);

export const sessionReminderTrigger = (
  payload: SessionReminderTriggerPayload,
  orgId: ID,
  correlationId?: string,
) =>
  createEvent(
    SessionEventTypes.REMINDER_TRIGGER,
    payload,
    orgId,
    correlationId,
  );

export const sessionStarted = (
  payload: SessionStartedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SessionEventTypes.STARTED, payload, orgId, correlationId);

export const sessionEnded = (
  payload: SessionEndedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SessionEventTypes.ENDED, payload, orgId, correlationId);

export const sessionRecorded = (
  payload: SessionRecordedPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SessionEventTypes.RECORDED, payload, orgId, correlationId);

export const sessionCancelled = (
  payload: SessionCancelledPayload,
  orgId: ID,
  correlationId?: string,
) => createEvent(SessionEventTypes.CANCELLED, payload, orgId, correlationId);

export const lmsEventTypes = {
  ...CourseEventTypes,
  ...EnrollmentEventTypes,
  ...ModuleEventTypes,
  ...AssignmentEventTypes,
  ...SubmissionEventTypes,
  ...CertificateEventTypes,
  ...CohortEventTypes,
  ...SessionEventTypes,
} as const;

export const lmsEvents = {
  course: {
    created: courseCreated,
    updated: courseUpdated,
    submittedForReview: courseSubmittedForReview,
    published: coursePublished,
    rejected: courseRejected,
    archived: courseArchived,
    restored: courseRestored,
  },
  enrollment: {
    created: enrollmentCreated,
    activated: enrollmentActivated,
    completed: enrollmentCompleted,
    expired: enrollmentExpired,
    cancelled: enrollmentCancelled,
    refunded: enrollmentRefunded,
  },
  module: {
    started: moduleStarted,
    completed: moduleCompleted,
    unlocked: moduleUnlocked,
  },
  assignment: {
    created: assignmentCreated,
    updated: assignmentUpdated,
    deleted: assignmentDeleted,
  },
  submission: {
    created: submissionCreated,
    received: submissionReceived,
    graded: submissionGraded,
    returned: submissionReturned,
  },
  certificate: {
    issued: certificateIssued,
    expiring: certificateExpiring,
    revoked: certificateRevoked,
  },
  cohort: {
    created: cohortCreated,
    activated: cohortActivated,
    completed: cohortCompleted,
    cancelled: cohortCancelled,
  },
  session: {
    created: sessionCreated,
    reminderTrigger: sessionReminderTrigger,
    started: sessionStarted,
    ended: sessionEnded,
    recorded: sessionRecorded,
    cancelled: sessionCancelled,
  },
};
