import type {
  Entity,
  ID,
  Timestamp,
  Meta,
} from "../../../apps/server/src/core/entity";
import type { Money } from "../../../apps/server/src/core/primitives";

export type { ID, Timestamp, Meta, Money };

export type CourseStatus = "draft" | "under-review" | "published" | "archived";
export type CourseType = "self-paced" | "cohort" | "live-only" | "hybrid";
export type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all-levels";
export type CourseModuleType =
  | "video"
  | "article"
  | "quiz"
  | "assignment"
  | "live-session"
  | "download";
export type EnrollmentStatus =
  | "pending-payment"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "refunded";
export type ModuleProgressStatus = "not-started" | "in-progress" | "completed";
export type AssignmentType =
  | "quiz"
  | "file-upload"
  | "text-response"
  | "peer-review"
  | "project";
export type SubmissionStatus =
  | "submitted"
  | "grading"
  | "graded"
  | "returned"
  | "late";
export type CohortStatus = "scheduled" | "active" | "completed" | "cancelled";
export type LiveSessionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled"
  | "recorded";

export interface CertificateTemplate {
  title: string;
  body: string;
  expiresAfterDays?: number;
  logoDocId?: ID;
}

export interface Course extends Entity {
  title: string;
  slug: string;
  description: string;
  instructorId: ID;
  categoryId: ID;
  status: CourseStatus;
  type: CourseType;
  level: CourseLevel;
  language: string;
  prerequisites: string[];
  durationHours: number;
  moduleCount: number;
  price: Money;
  compareAtPrice?: Money;
  currency: string;
  enrolledCount: number;
  completedCount: number;
  rating: number;
  reviewCount: number;
  completionThreshold: number;
  tags: string[];
  thumbnailDocId?: ID;
  previewVideoUrl?: string;
  syllabusDocId?: ID;
  certificateTemplate: CertificateTemplate;
  publishedAt?: Timestamp;
  archivedAt?: Timestamp;
}

export interface CourseModule extends Entity {
  courseId: ID;
  title: string;
  description?: string;
  order: number;
  type: CourseModuleType;
  contentRef?: string;
  contentDocId?: ID;
  estimatedMinutes: number;
  isFree: boolean;
  isPublished: boolean;
  requiredPrevious: boolean;
}

export interface Enrollment extends Entity {
  learnerId: ID;
  courseId: ID;
  cohortId?: ID;
  status: EnrollmentStatus;
  paymentId?: ID;
  couponCode?: string;
  pricePaid: Money;
  completionPct: number;
  completedAt?: Timestamp;
  certificateId?: ID;
  expiresAt?: Timestamp;
  lastAccessedAt?: Timestamp;
}

export interface ModuleProgress extends Entity {
  enrollmentId: ID;
  moduleId: ID;
  learnerId: ID;
  courseId: ID;
  status: ModuleProgressStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  progressPct: number;
  quizScore?: number;
  quizAttempts: number;
  timeSpentSec: number;
}

export interface Assignment extends Entity {
  courseId: ID;
  moduleId: ID;
  title: string;
  description: string;
  type: AssignmentType;
  dueHoursAfterEnrollment?: number;
  absoluteDueDate?: Timestamp;
  maxScore: number;
  passingScore: number;
  allowLateSubmission: boolean;
  maxAttempts: number;
}

export interface Submission extends Entity {
  assignmentId: ID;
  learnerId: ID;
  enrollmentId: ID;
  attemptNumber: number;
  status: SubmissionStatus;
  content?: string;
  attachmentIds: ID[];
  score?: number;
  maxScore: number;
  feedback?: string;
  gradedBy?: ID;
  gradedAt?: Timestamp;
  submittedAt: Timestamp;
}

export interface Certificate extends Entity {
  enrollmentId: ID;
  learnerId: ID;
  courseId: ID;
  verificationCode: string;
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  documentId: ID;
  revoked: boolean;
  revokedReason?: string;
  revokedAt?: Timestamp;
}

export interface Cohort extends Entity {
  courseId: ID;
  name: string;
  instructorId: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  capacity: number;
  enrolledCount: number;
  status: CohortStatus;
  timezone: string;
  sessionIds: ID[];
}

export interface LiveSession extends Entity {
  cohortId: ID;
  courseId: ID;
  instructorId: ID;
  title: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  meetingUrl: string;
  recordingUrl?: string;
  status: LiveSessionStatus;
  attendeeCount: number;
}

export interface ComposeDefinition {
  id: string;
  name: string;
  version?: string;
  modules: string[];
  moduleConfig?: Record<string, unknown>;
}
