import type {
  LMSPluginContext,
  EventBus,
  FSMEngine,
  RuleEngine,
  Scheduler,
  RealtimeGateway,
  Logger,
  Command,
  Query,
  DomainEvent,
  ID,
  LMSPluginConfig,
} from "./interfaces";

import type {
  Course,
  CourseModule,
  Enrollment,
  ModuleProgress,
  Assignment,
  Submission,
  Certificate,
  Cohort,
  LiveSession,
  ComposeDefinition,
} from "./types";

export * from "./interfaces";

export type {
  ID,
  Timestamp,
  Money,
  CourseStatus,
  CourseType,
  CourseLevel,
  CourseModuleType,
  EnrollmentStatus,
  ModuleProgressStatus,
  AssignmentType,
  SubmissionStatus,
  CohortStatus,
  LiveSessionStatus,
  CertificateTemplate,
  Course,
  CourseModule,
  Enrollment,
  ModuleProgress,
  Assignment,
  Submission,
  Certificate,
  Cohort,
  LiveSession,
  ComposeDefinition,
  Entity,
} from "./types";

export * from "./db/schema/index";

export {
  courseFSM,
  enrollmentFSM,
  submissionFSM,
  liveSessionFSM,
  cohortFSM,
  registerLMSFSMs,
} from "./fsm";

export type {
  CourseState,
  CourseEvent,
  EnrollmentState,
  EnrollmentEvent,
  SubmissionState,
  SubmissionEvent,
  LiveSessionState,
  LiveSessionEvent,
  CohortState,
  CohortEvent,
} from "./fsm";

export { lmsQueryHandlers, registerLmsQueryHandlers } from "./queries";

export type {
  LmsCommand,
  LmsCommandHandler,
  CommandContext,
  CourseCreatePayload,
  CourseUpdatePayload,
  CourseSubmitReviewPayload,
  CourseApprovePayload,
  CourseRejectPayload,
  CourseArchivePayload,
  CourseRestorePayload,
  ModuleCreatePayload,
  ModuleUpdatePayload,
  ModuleDeletePayload,
  ModuleReorderPayload,
  EnrollmentCreatePayload,
  EnrollmentCancelPayload,
  EnrollmentCompletePayload,
  EnrollmentPaymentConfirmPayload,
  ProgressUpdatePayload,
  ProgressCompletePayload,
  AssignmentCreatePayload,
  AssignmentUpdatePayload,
  AssignmentDeletePayload,
  SubmissionCreatePayload,
  SubmissionGradePayload,
  CertificateCreatePayload,
  CertificateRevokePayload,
  CohortCreatePayload,
  CohortUpdatePayload,
  CohortCancelPayload,
  SessionCreatePayload,
  SessionStartPayload,
  SessionEndPayload,
  SessionCancelPayload,
  SessionUploadRecordingPayload,
} from "./commands";

export {
  courseCreateHandler,
  courseUpdateHandler,
  courseSubmitReviewHandler,
  courseApproveHandler,
  courseRejectHandler,
  courseArchiveHandler,
  courseRestoreHandler,
  moduleCreateHandler,
  moduleUpdateHandler,
  moduleDeleteHandler,
  moduleReorderHandler,
  enrollmentCreateHandler,
  enrollmentCancelHandler,
  enrollmentCompleteHandler,
  enrollmentPaymentConfirmHandler,
  progressUpdateHandler,
  progressCompleteHandler,
  assignmentCreateHandler,
  assignmentUpdateHandler,
  assignmentDeleteHandler,
  submissionCreateHandler,
  submissionGradeHandler,
  certificateCreateHandler,
  certificateRevokeHandler,
  cohortCreateHandler,
  cohortUpdateHandler,
} from "./commands";

export {
  registerLMSHooks,
  enrollmentActivatedHook,
  moduleCompletedHook,
  enrollmentCompletedHook,
  submissionGradedHook,
  sessionReminderHook,
  coursePublishedHook,
  courseRejectedHook,
  sessionStartedHook,
  sessionEndedHook,
  sessionRecordedHook,
} from "./hooks";

export type { HookHandler, HookContext, HookRegistration } from "./hooks";

export {
  lmsRules,
  registerLMSRules,
  getRulesForScope,
  evaluateGuard,
  evaluateCondition,
  evaluateRule,
} from "./rules";

export type { RuleScope, LMSRule } from "./rules";

export { lmsRoutes, createLMSRoutes } from "./routes";

export type {
  RouteContext,
  RouteResult,
  RouteHandler,
  RouteDefinition,
  MiddlewareFunction,
} from "./routes";

export {
  lmsJobs,
  registerLMSJobs,
  sessionReminders1Day,
  sessionReminders30Min,
  enrollmentExpiryCheck,
  enrollmentExpiryWarning,
  assignmentDueReminders,
  learnerInactivityNudge,
  cohortActivation,
  certificateExpiryReminder,
  analyticsSnapshot,
  deferredRevenueRecognition,
} from "./jobs";

export type { JobContext, ScheduledJob } from "./jobs";

export {
  StripeAdapter,
  RazorpayAdapter,
  ZoomAdapter,
  GoogleMeetAdapter,
  LMSStorageAdapter,
  EmailAdapter,
  PushAdapter,
  createLMSAdapters,
} from "./adapters";

export type {
  PaymentAdapterConfig,
  VideoMeetingAdapterConfig,
  StorageAdapterConfig,
  NotificationAdapterConfig,
  LMSAdaptersConfig,
  LMSAdapters,
} from "./adapters";

export {
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
} from "./seed";

export type { SeedContext } from "./seed";

export {
  LMS_EVENT_NAMESPACE,
  CourseEventTypes,
  EnrollmentEventTypes,
  ModuleEventTypes,
  AssignmentEventTypes,
  SubmissionEventTypes,
  CertificateEventTypes,
  CohortEventTypes,
  SessionEventTypes,
  lmsEventTypes,
  lmsEvents,
  courseCreated,
  courseUpdated,
  courseSubmittedForReview,
  coursePublished,
  courseRejected,
  courseArchived,
  courseRestored,
  enrollmentCreated,
  enrollmentActivated,
  enrollmentCompleted,
  enrollmentExpired,
  enrollmentCancelled,
  enrollmentRefunded,
  moduleStarted,
  moduleCompleted,
  moduleUnlocked,
  assignmentCreated,
  assignmentUpdated,
  assignmentDeleted,
  submissionCreated,
  submissionReceived,
  submissionGraded,
  submissionReturned,
  certificateIssued,
  certificateExpiring,
  certificateRevoked,
  cohortCreated,
  cohortActivated,
  cohortCompleted,
  cohortCancelled,
  sessionCreated,
  sessionReminderTrigger,
  sessionStarted,
  sessionEnded,
  sessionRecorded,
  sessionCancelled,
} from "./events";

export type {
  LmsEvent,
  CourseCreatedPayload,
  CourseUpdatedPayload,
  CourseSubmittedForReviewPayload,
  CoursePublishedPayload,
  CourseRejectedPayload,
  CourseArchivedPayload,
  CourseRestoredPayload,
  EnrollmentCreatedPayload as EventEnrollmentCreatedPayload,
  EnrollmentActivatedPayload,
  EnrollmentCompletedPayload as EventEnrollmentCompletedPayload,
  EnrollmentExpiredPayload,
  EnrollmentCancelledPayload as EventEnrollmentCancelledPayload,
  EnrollmentRefundedPayload,
  ModuleStartedPayload,
  ModuleCompletedPayload as EventModuleCompletedPayload,
  ModuleUnlockedPayload,
  AssignmentCreatedPayload as EventAssignmentCreatedPayload,
  AssignmentUpdatedPayload as EventAssignmentUpdatedPayload,
  AssignmentDeletedPayload,
  SubmissionCreatedPayload as EventSubmissionCreatedPayload,
  SubmissionReceivedPayload,
  SubmissionGradedPayload as EventSubmissionGradedPayload,
  SubmissionReturnedPayload,
  CertificateIssuedPayload,
  CertificateExpiringPayload,
  CertificateRevokedPayload,
  CohortCreatedPayload as EventCohortCreatedPayload,
  CohortActivatedPayload,
  CohortCompletedPayload as EventCohortCompletedPayload,
  CohortCancelledPayload as EventCohortCancelledPayload,
  SessionCreatedPayload as EventSessionCreatedPayload,
  SessionReminderTriggerPayload,
  SessionStartedPayload,
  SessionEndedPayload,
  SessionRecordedPayload,
  SessionCancelledPayload as EventSessionCancelledPayload,
} from "./events";

export {
  LMSRealtimeBridge,
  createLMSRealtimeBridge,
  registerLMSRealtime,
  sessionChannel,
  instructorChannel,
  learnerChannel,
  adminChannel,
} from "./realtime";

export type {
  LmsWsMessageType,
  LmsWsMessage,
  LmsRealtimePayload,
  ChannelResolver,
  EventForwardRule,
} from "./realtime";

const LMS_EVENTS = [
  "course.created",
  "course.updated",
  "course.submitted-for-review",
  "course.published",
  "course.rejected",
  "course.archived",
  "course.restored",
  "module.created",
  "module.updated",
  "module.deleted",
  "module.reordered",
  "module.completed",
  "enrollment.created",
  "enrollment.activated",
  "enrollment.completed",
  "enrollment.cancelled",
  "enrollment.expired",
  "progress.updated",
  "submission.received",
  "submission.graded",
  "submission.returned",
  "certificate.issued",
  "certificate.revoked",
  "cohort.created",
  "cohort.updated",
  "cohort.activated",
  "cohort.completed",
  "cohort.cancelled",
  "session.scheduled",
  "session.started",
  "session.ended",
  "session.recorded",
  "session.cancelled",
  "session.reminder-trigger",
];

const LMS_COMMANDS = [
  "lms.course.create",
  "lms.course.update",
  "lms.course.submitReview",
  "lms.course.approve",
  "lms.course.reject",
  "lms.course.archive",
  "lms.course.restore",
  "lms.module.create",
  "lms.module.update",
  "lms.module.delete",
  "lms.module.reorder",
  "lms.moduleProgress.create",
  "lms.moduleProgress.complete",
  "lms.moduleProgress.unlock",
  "lms.enrollment.create",
  "lms.enrollment.cancel",
  "lms.enrollment.complete",
  "lms.enrollment.expire",
  "lms.enrollment.updateProgress",
  "lms.enrollment.update",
  "lms.progress.update",
  "lms.progress.complete",
  "lms.assignment.create",
  "lms.assignment.update",
  "lms.assignment.delete",
  "lms.submission.create",
  "lms.submission.grade",
  "lms.submission.return",
  "lms.certificate.create",
  "lms.certificate.revoke",
  "lms.cohort.create",
  "lms.cohort.update",
  "lms.cohort.activate",
  "lms.session.create",
  "lms.session.update",
  "lms.session.start",
  "lms.session.end",
  "lms.session.cancel",
  "lms.course.incrementEnrolledCount",
  "lms.learner.suspend",
  "lms.settings.update",
];

const LMS_QUERIES = [
  "lms.courses.list",
  "lms.courses.getBySlug",
  "lms.courses.search",
  "lms.categories.list",
  "lms.courses.modules",
  "lms.enrollments.list",
  "lms.enrollments.get",
  "lms.enrollments.progress",
  "lms.learn.course",
  "lms.learn.module",
  "lms.progress.get",
  "lms.assignments.get",
  "lms.submissions.get",
  "lms.submissions.list",
  "lms.certificates.list",
  "lms.certificates.get",
  "lms.certificates.verify",
  "lms.certificates.download",
  "lms.cohorts.get",
  "lms.cohorts.sessions",
  "lms.sessions.get",
  "lms.instructor.courses",
  "lms.instructor.enrollments",
  "lms.instructor.analytics",
  "lms.instructor.submissions",
  "lms.admin.courses",
  "lms.admin.enrollments",
  "lms.admin.learners",
  "lms.admin.analytics",
];

const LMS_FSMS = [
  "course",
  "enrollment",
  "submission",
  "liveSession",
  "cohort",
];

const LMS_ENTITIES = [
  "Course",
  "CourseModule",
  "Enrollment",
  "ModuleProgress",
  "Assignment",
  "Submission",
  "Certificate",
  "Cohort",
  "LiveSession",
  "CourseReview",
  "Category",
];

export const LMS_MANIFEST = {
  id: "lms",
  name: "Learning Management System",
  version: "1.0.0",
  description:
    "Full-featured LMS compose - courses, enrollments, certificates, cohorts",
  author: "ProjectX",
  license: "MIT",

  requiredCapabilities: [
    "eventBus",
    "fsmEngine",
    "ruleEngine",
    "scheduler",
    "queue",
    "database",
  ],

  optionalCapabilities: ["realtime", "payment", "videoMeeting", "storage"],

  entities: LMS_ENTITIES,

  events: LMS_EVENTS,

  commands: LMS_COMMANDS,

  queries: LMS_QUERIES,

  fsms: LMS_FSMS,

  migrations: [
    "0001_lms_categories",
    "0002_lms_courses",
    "0003_lms_course_modules",
    "0004_lms_enrollments",
    "0005_lms_module_progress",
    "0006_lms_assignments",
    "0007_lms_submissions",
    "0008_lms_certificates",
    "0009_lms_cohorts",
    "0010_lms_live_sessions",
    "0011_lms_course_reviews",
  ],
} as const;

export const LMSCompose: ComposeDefinition = {
  id: "lms",
  name: "Learning Management System",
  version: "1.0.0",
  modules: [
    "identity",
    "catalog",
    "ledger",
    "workflow",
    "scheduling",
    "document",
    "notification",
    "analytics",
  ],
  moduleConfig: {
    catalog: {
      itemLabel: "Course",
      enableVariants: false,
      enablePriceLists: true,
      enableSearch: true,
    },
    scheduling: {
      resourceLabel: "Instructor",
      slotLabel: "Live Session",
      enableRecurring: true,
    },
    ledger: {
      baseCurrency: "USD",
      supportedCurrencies: ["USD", "EUR", "INR", "GBP"],
    },
    workflow: {
      processLabel: "Course Review",
    },
  },
};

const DEFAULT_CONFIG: LMSPluginConfig = {
  features: {
    enableCertificates: true,
    enableCohorts: true,
    enableLiveSessions: true,
    enableQuizzes: true,
    enablePeerReview: false,
  },
  defaults: {
    completionThreshold: 80,
    refundWindowDays: 14,
    inactivityNudgeDays: 7,
    sessionReminderMinutes: [1440, 30],
    maxQuizAttempts: 3,
    certificateExpiresAfterDays: null,
  },
  adapters: {},
};

export class LMSPlugin {
  private context: LMSPluginContext | null = null;
  private unsubscribes: (() => void)[] = [];
  private registeredJobIds: string[] = [];
  private realtimeBridge: unknown = null;

  constructor(private config: Partial<LMSPluginConfig> = {}) {}

  async init(context: LMSPluginContext): Promise<void> {
    this.context = context;

    const mergedConfig: LMSPluginConfig = {
      ...DEFAULT_CONFIG,
      ...this.config,
      features: {
        ...DEFAULT_CONFIG.features,
        ...this.config.features,
      },
      defaults: {
        ...DEFAULT_CONFIG.defaults,
        ...this.config.defaults,
      },
      adapters: {
        ...DEFAULT_CONFIG.adapters,
        ...this.config.adapters,
      },
    };

    (this.context as { config: LMSPluginConfig }).config = mergedConfig;

    this.context.logger.info("LMSPlugin initializing...", {
      version: LMS_MANIFEST.version,
    });

    await this.registerFSMs();
    await this.registerHooks();
    await this.registerRules();
    await this.registerScheduledJobs();
    await this.registerRealtimeBridge();

    this.context.logger.info("LMSPlugin initialized successfully", {
      entities: LMS_MANIFEST.entities.length,
      events: LMS_MANIFEST.events.length,
      commands: LMS_MANIFEST.commands.length,
      queries: LMS_MANIFEST.queries.length,
      fsms: LMS_MANIFEST.fsms.length,
    });
  }

  private async registerFSMs(): Promise<void> {
    if (!this.context) return;

    const { registerLMSFSMs } = await import("./fsm");
    registerLMSFSMs(this.context.fsmEngine);

    this.context.logger.debug("LMS FSMs registered", {
      count: LMS_FSMS.length,
    });
  }

  private async registerHooks(): Promise<void> {
    if (!this.context) return;

    const { registerLMSHooks } = await import("./hooks");

    const createContext = (event: DomainEvent) => {
      const evt = event as {
        actorId: string;
        orgId: string;
        correlationId: string;
        timestamp?: number;
      };
      return {
        actor: {
          id: evt.actorId,
          roles: [] as string[],
          orgId: evt.orgId,
          type: "system" as const,
        },
        org: {
          id: evt.orgId,
          slug: "",
          settings: {} as Record<string, unknown>,
        },
        correlationId: evt.correlationId,
        requestId: evt.correlationId,
        startedAt: evt.timestamp ?? Date.now(),
        dispatch: async <R = unknown>() => undefined as R,
        query: async <R = unknown>() => null as R,
        publish: async () => {},
        logger: this.context!.logger,
        scheduler: {
          runOnce: async () => {},
        },
      };
    };

    this.unsubscribes = registerLMSHooks(
      this.context.eventBus,
      createContext as unknown as Parameters<typeof registerLMSHooks>[1],
    );

    this.context.logger.debug("LMS hooks registered", { count: 10 });
  }

  private async registerRules(): Promise<void> {
    if (!this.context) return;

    const { registerLMSRules, lmsRules } = await import("./rules");
    registerLMSRules(this.context.ruleEngine);

    this.context.logger.debug("LMS rules registered", {
      count: lmsRules.length,
    });
  }

  private async registerScheduledJobs(): Promise<void> {
    if (!this.context) return;

    const { lmsJobs } = await import("./jobs");

    for (const job of lmsJobs) {
      try {
        await this.context.scheduler.schedule(
          job.cron,
          job.id,
          {},
          { repeat: { cron: job.cron } },
        );
        this.registeredJobIds.push(job.id);
      } catch (error) {
        this.context.logger.error("Failed to register scheduled job", {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.context.logger.debug("LMS scheduled jobs registered", {
      count: this.registeredJobIds.length,
    });
  }

  private async registerRealtimeBridge(): Promise<void> {
    if (!this.context) return;

    if (!this.context.realtime) {
      this.context.logger.debug("Realtime bridge not available, skipping");
      return;
    }

    const { createLMSRealtimeBridge, registerLMSRealtime } =
      await import("./realtime");

    const bridge = createLMSRealtimeBridge(this.context.realtime);
    this.realtimeBridge = bridge;
    registerLMSRealtime(bridge, this.context.eventBus);

    this.context.logger.debug("LMS realtime bridge registered");
  }

  getRoutes(): import("./routes").RouteDefinition[] {
    const { createLMSRoutes } = require("./routes");
    return createLMSRoutes();
  }

  getJobs(): import("./jobs").ScheduledJob[] {
    const { lmsJobs } = require("./jobs");
    return [...lmsJobs];
  }

  getManifest(): typeof LMS_MANIFEST {
    return LMS_MANIFEST;
  }

  getConfig(): LMSPluginConfig {
    return this.context?.config ?? DEFAULT_CONFIG;
  }

  getComposeDefinition(): ComposeDefinition {
    return LMSCompose;
  }

  async shutdown(): Promise<void> {
    if (!this.context) return;

    const { logger } = this.context;
    logger.info("LMSPlugin shutting down...");

    for (const unsubscribe of this.unsubscribes) {
      try {
        unsubscribe();
      } catch (error) {
        logger.error("Failed to unsubscribe during shutdown", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.unsubscribes = [];

    if (this.realtimeBridge && typeof this.realtimeBridge === "object") {
      const bridge = this.realtimeBridge as { unsubscribeAll?: () => void };
      if (bridge.unsubscribeAll) {
        bridge.unsubscribeAll();
      }
      this.realtimeBridge = null;
    }

    this.registeredJobIds = [];

    logger.info("LMSPlugin shutdown complete");
  }
}

export function createLMSPlugin(config?: Partial<LMSPluginConfig>): LMSPlugin {
  return new LMSPlugin(config);
}

export default {
  LMS_MANIFEST,
  LMSCompose,
  LMSPlugin,
  createLMSPlugin,
};
