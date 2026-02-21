import type {
  AppModule,
  ModuleManifest,
  BootRegistry,
} from "../../apps/server/src/core/module";
import type { FSMEngine, StateMachine } from "../../apps/server/src/core/state";
import type { Command, Query } from "../../apps/server/src/core/cqrs";
import type { EventBus, DomainEvent } from "../../apps/server/src/core/event";
import type { RuleEngine } from "../../apps/server/src/core/rule";
import type { Scheduler } from "../../apps/server/src/core/queue";
import type { ID } from "../../apps/server/src/core/entity";

import type { ComposeDefinition } from "./types";
export type {
  ID,
  Timestamp,
  Meta,
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
  DomainEvent as LmsDomainEvent,
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
  explainRule,
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
  PaymentOrder,
  PaymentSession,
  PaymentCapture,
  RefundResult,
  WebhookResult,
  PaymentAdapterConfig,
  PaymentAdapter,
  MeetingSession,
  MeetingSettings,
  MeetingDetails,
  RecordingDetails,
  VideoMeetingAdapterConfig,
  VideoMeetingAdapter,
  MediaUploadResult,
  CertificateData,
  StorageAdapterConfig,
  StorageAdapter,
  NotificationPayload,
  NotificationResult,
  NotificationAdapterConfig,
  NotificationAdapter,
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

export interface LMSConfig {
  adapters?: {
    payment?: {
      provider: "stripe" | "razorpay";
      apiKey: string;
      webhookSecret: string;
    };
    videoMeeting?: {
      provider: "zoom" | "google-meet";
      apiKey: string;
      apiSecret: string;
      webhookSecret?: string;
    };
    storage?: {
      bucket?: string;
      region?: string;
    };
  };
  features?: {
    enableCertificates: boolean;
    enableCohorts: boolean;
    enableLiveSessions: boolean;
    enableQuizzes: boolean;
    enablePeerReview: boolean;
  };
  defaults?: {
    completionThreshold: number;
    refundWindowDays: number;
    inactivityNudgeDays: number;
    sessionReminderMinutes: number[];
    maxQuizAttempts: number;
    certificateExpiresAfterDays: number | null;
  };
}

export interface LMSComposeContext {
  fsmEngine: FSMEngine;
  eventBus: EventBus;
  ruleEngine: RuleEngine;
  scheduler: Scheduler;
  realtime?: {
    broadcast: (
      channel: string,
      event: string,
      payload: unknown,
    ) => Promise<void>;
  };
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
    debug: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

export class LMSComposeModule implements AppModule {
  readonly manifest: ModuleManifest;
  private config: LMSConfig;
  private context?: LMSComposeContext;
  private unsubscribes: (() => void)[] = [];
  private registeredJobIds: string[] = [];

  constructor(config: LMSConfig = {}) {
    this.config = {
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
      ...config,
    };

    this.manifest = {
      id: LMSCompose.id,
      version: LMSCompose.version ?? "1.0.0",
      dependsOn: LMSCompose.modules,
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
    };
  }

  setContext(context: LMSComposeContext): void {
    this.context = context;
  }

  async boot(registry: BootRegistry): Promise<void> {
    if (!this.context) {
      throw new Error(
        "LMSComposeModule requires context to be set before boot",
      );
    }

    const { fsmEngine, eventBus, ruleEngine, scheduler, realtime, logger } =
      this.context;

    logger.info("LMSComposeModule booting...", {
      version: this.manifest.version,
    });

    await this.registerFSMs(fsmEngine, logger);
    await this.registerCommands(registry, logger);
    await this.registerQueries(registry, logger);
    await this.registerHooks(eventBus, logger);
    await this.registerRules(ruleEngine, logger);
    await this.registerScheduledJobs(scheduler, logger);
    await this.registerRealtimeBridge(realtime, logger);

    logger.info("LMSComposeModule booted successfully", {
      entities: this.manifest.entities.length,
      events: this.manifest.events.length,
      commands: this.manifest.commands.length,
      queries: this.manifest.queries.length,
      fsms: this.manifest.fsms.length,
    });
  }

  private async registerFSMs(
    engine: FSMEngine,
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    logger.debug("Registering LMS FSMs...");

    const { registerLMSFSMs } = await import("./fsm");
    registerLMSFSMs(engine);

    logger.debug("LMS FSMs registered", { count: LMS_FSMS.length });
  }

  private async registerCommands(
    registry: BootRegistry,
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    logger.debug("Registering LMS commands...");

    const {
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
    } = await import("./commands");

    const commandHandlers: Record<string, unknown> = {
      "lms.course.create": courseCreateHandler,
      "lms.course.update": courseUpdateHandler,
      "lms.course.submitReview": courseSubmitReviewHandler,
      "lms.course.approve": courseApproveHandler,
      "lms.course.reject": courseRejectHandler,
      "lms.course.archive": courseArchiveHandler,
      "lms.course.restore": courseRestoreHandler,
      "lms.module.create": moduleCreateHandler,
      "lms.module.update": moduleUpdateHandler,
      "lms.module.delete": moduleDeleteHandler,
      "lms.module.reorder": moduleReorderHandler,
      "lms.enrollment.create": enrollmentCreateHandler,
      "lms.enrollment.cancel": enrollmentCancelHandler,
      "lms.enrollment.complete": enrollmentCompleteHandler,
      "lms.enrollment.paymentConfirm": enrollmentPaymentConfirmHandler,
      "lms.progress.update": progressUpdateHandler,
      "lms.progress.complete": progressCompleteHandler,
      "lms.assignment.create": assignmentCreateHandler,
      "lms.assignment.update": assignmentUpdateHandler,
      "lms.assignment.delete": assignmentDeleteHandler,
      "lms.submission.create": submissionCreateHandler,
      "lms.submission.grade": submissionGradeHandler,
      "lms.certificate.create": certificateCreateHandler,
      "lms.certificate.revoke": certificateRevokeHandler,
      "lms.cohort.create": cohortCreateHandler,
      "lms.cohort.update": cohortUpdateHandler,
    };

    for (const [type, handler] of Object.entries(commandHandlers)) {
      registry.registerCommand(
        type,
        handler as Parameters<BootRegistry["registerCommand"]>[1],
      );
    }

    logger.debug("LMS commands registered", {
      count: Object.keys(commandHandlers).length,
    });
  }

  private async registerQueries(
    registry: BootRegistry,
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    logger.debug("Registering LMS queries...");

    const { lmsQueryHandlers } = await import("./queries");

    for (const [type, handler] of lmsQueryHandlers) {
      registry.registerQuery(
        type,
        handler as Parameters<BootRegistry["registerQuery"]>[1],
      );
    }

    logger.debug("LMS queries registered", { count: lmsQueryHandlers.size });
  }

  private async registerHooks(
    eventBus: EventBus,
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    logger.debug("Registering LMS hooks...");

    const { registerLMSHooks } = await import("./hooks");

    const hookCount = 10;

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
      eventBus,
      createContext as unknown as Parameters<typeof registerLMSHooks>[1],
    );

    logger.debug("LMS hooks registered", { count: hookCount });
  }

  private async registerRules(
    engine: RuleEngine,
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    logger.debug("Registering LMS rules...");

    const { registerLMSRules, lmsRules } = await import("./rules");
    registerLMSRules(engine);

    logger.debug("LMS rules registered", { count: lmsRules.length });
  }

  private async registerScheduledJobs(
    scheduler: Scheduler,
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    logger.debug("Registering LMS scheduled jobs...");

    const { lmsJobs } = await import("./jobs");

    for (const job of lmsJobs) {
      try {
        await scheduler.schedule(
          job.cron,
          job.id,
          {},
          { repeat: { cron: job.cron } },
        );
        this.registeredJobIds.push(job.id);
      } catch (error) {
        logger.error("Failed to register scheduled job", {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.debug("LMS scheduled jobs registered", {
      count: this.registeredJobIds.length,
    });
  }

  private async registerRealtimeBridge(
    realtime: LMSComposeContext["realtime"],
    logger: LMSComposeContext["logger"],
  ): Promise<void> {
    if (!realtime) {
      logger.debug("Realtime bridge not available, skipping");
      return;
    }

    logger.debug("Registering LMS realtime bridge...");

    const { eventBus } = this.context!;

    const realtimeEvents = [
      "session.started",
      "session.ended",
      "session.recorded",
      "cohort.activated",
      "cohort.completed",
    ];

    for (const eventType of realtimeEvents) {
      const unsubscribe = eventBus.subscribe(eventType, async (event) => {
        const orgId = event.orgId;
        const payload = event.payload as Record<string, unknown>;

        if (eventType.startsWith("session.")) {
          const sessionId = payload.sessionId as string;
          await realtime.broadcast(
            `org:${orgId}:lms:session:${sessionId}`,
            eventType,
            payload,
          );
        } else if (eventType.startsWith("cohort.")) {
          const cohortId = payload.cohortId as string;
          await realtime.broadcast(
            `org:${orgId}:lms:cohort:${cohortId}`,
            eventType,
            payload,
          );
        }
      });

      this.unsubscribes.push(unsubscribe);
    }

    logger.debug("LMS realtime bridge registered", {
      events: realtimeEvents.length,
    });
  }

  async shutdown(): Promise<void> {
    if (!this.context) return;

    const { logger } = this.context;
    logger.info("LMSComposeModule shutting down...");

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

    this.registeredJobIds = [];

    logger.info("LMSComposeModule shutdown complete");
  }

  getConfig(): LMSConfig {
    return { ...this.config };
  }

  getComposeDefinition(): ComposeDefinition {
    return LMSCompose;
  }
}

export function createLMSCompose(config?: LMSConfig): LMSComposeModule {
  return new LMSComposeModule(config);
}

export default {
  LMSCompose,
  LMSComposeModule,
  createLMSCompose,
};
