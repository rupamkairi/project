import type {
  EventBus,
  DomainEvent,
  Unsubscribe,
} from "../../../apps/server/src/core/event";
import type { ID, Timestamp } from "../../../apps/server/src/core/entity";
import type { Money } from "../../../apps/server/src/core/primitives";

type HookHandler = (event: DomainEvent, ctx: HookContext) => Promise<void>;

interface HookContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };
  org: {
    id: ID;
    slug: string;
    settings: Record<string, unknown>;
  };
  correlationId: ID;
  requestId: ID;
  startedAt: Timestamp;
  dispatch<R = unknown>(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<R>;
  query<R = unknown>(type: string, params: Record<string, unknown>): Promise<R>;
  publish(event: {
    type: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  logger: {
    error: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    debug: (msg: string, meta?: Record<string, unknown>) => void;
  };
  scheduler: {
    runOnce(
      jobId: string,
      runAt: Date,
      data: Record<string, unknown>,
      handler: (job: { data: Record<string, unknown> }) => Promise<void>,
    ): Promise<void>;
  };
}

interface HookRegistration {
  pattern: string;
  handler: HookHandler;
}

interface Enrollment {
  id: ID;
  learnerId: ID;
  courseId: ID;
  cohortId?: ID;
  status: string;
  pricePaid: Money;
  completionPct: number;
  completedAt?: Timestamp;
  certificateId?: ID;
}

interface Course {
  id: ID;
  title: string;
  slug: string;
  instructorId: ID;
  type: "self-paced" | "cohort" | "live-only" | "hybrid";
  completionThreshold: number;
  certificateTemplate: {
    title: string;
    body: string;
    expiresAfterDays?: number;
  };
}

interface CourseModule {
  id: ID;
  courseId: ID;
  title: string;
  order: number;
  requiredPrevious: boolean;
}

interface Actor {
  id: ID;
  name: string;
  email: string;
}

interface Assignment {
  id: ID;
  moduleId: ID;
  passingScore: number;
}

interface Cohort {
  id: ID;
  startDate: Timestamp;
}

interface LiveSession {
  id: ID;
  cohortId: ID;
  title: string;
  scheduledAt: Timestamp;
  meetingUrl: string;
}

interface ModuleProgress {
  id: ID;
  status: string;
  progressPct: number;
}

interface Certificate {
  id: ID;
  verificationCode: string;
}

function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LMS-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const enrollmentActivatedHook: HookRegistration = {
  pattern: "enrollment.activated",
  handler: async (event, ctx) => {
    const { enrollmentId, learnerId, courseId, cohortId } = event.payload as {
      enrollmentId: ID;
      learnerId: ID;
      courseId: ID;
      cohortId?: ID;
    };

    try {
      const [enrollment, course, learner] = await Promise.all([
        ctx.query<Enrollment>("lms.enrollment.get", { id: enrollmentId }),
        ctx.query<Course>("lms.course.get", { id: courseId }),
        ctx.query<Actor>("identity.getActor", { id: learnerId }),
      ]);

      if (!enrollment || !course || !learner) {
        ctx.logger.error("enrollmentActivatedHook: Missing required data", {
          enrollmentId,
          courseId,
          learnerId,
        });
        return;
      }

      await ctx.dispatch("notification.send", {
        templateKey: "enrollment.confirmed",
        to: learnerId,
        channels: ["email"],
        variables: {
          learnerName: learner.name,
          courseTitle: course.title,
          courseUrl: `${ctx.org.settings.appUrl}/learn/${course.slug}`,
          cohortStart: cohortId
            ? (await ctx.query<Cohort>("lms.cohort.get", { id: cohortId }))
                ?.startDate
            : null,
        },
      });

      const modules = await ctx.query<CourseModule[]>("lms.course.modules", {
        courseId,
      });

      for (const mod of modules) {
        await ctx.dispatch("lms.moduleProgress.create", {
          enrollmentId,
          moduleId: mod.id,
          learnerId,
          courseId,
        });
      }

      await ctx.dispatch("ledger.postTransaction", {
        debit: "ACC-PAYMENT-RECEIVABLE",
        credit:
          course.type === "self-paced"
            ? "ACC-COURSE-REVENUE"
            : "ACC-DEFERRED-REVENUE",
        amount: enrollment.pricePaid,
        reference: enrollmentId,
        referenceType: "Enrollment",
        description: `Enrollment: ${course.title} — ${learner.email}`,
      });

      await ctx.dispatch("lms.course.incrementEnrolledCount", { courseId });

      await ctx.scheduler.runOnce(
        `enrollment-nudge:${enrollmentId}`,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        { enrollmentId, learnerId, courseId },
        async (job) => {
          const progress = await ctx.query<ModuleProgress>(
            "lms.enrollment.progress",
            { id: job.data.enrollmentId as ID },
          );
          if (progress && progress.progressPct === 0) {
            await ctx.dispatch("notification.send", {
              templateKey: "enrollment.nudge",
              to: job.data.learnerId as ID,
              channels: ["email"],
              variables: {
                courseTitle: course.title,
                courseUrl: `${ctx.org.settings.appUrl}/learn/${course.slug}`,
              },
            });
          }
        },
      );
    } catch (error) {
      ctx.logger.error("enrollmentActivatedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        enrollmentId,
      });
    }
  },
};

const moduleCompletedHook: HookRegistration = {
  pattern: "module.completed",
  handler: async (event, ctx) => {
    const { moduleId, enrollmentId, learnerId, courseId } = event.payload as {
      moduleId: ID;
      enrollmentId: ID;
      learnerId: ID;
      courseId: ID;
    };

    try {
      const [allModules, completedModules, enrollment, course] =
        await Promise.all([
          ctx.query<CourseModule[]>("lms.course.modules", { courseId }),
          ctx.query<ModuleProgress[]>("lms.moduleProgress.getCompleted", {
            enrollmentId,
          }),
          ctx.query<Enrollment>("lms.enrollment.get", { id: enrollmentId }),
          ctx.query<Course>("lms.course.get", { id: courseId }),
        ]);

      if (!allModules || !enrollment || !course) {
        ctx.logger.error("moduleCompletedHook: Missing required data", {
          moduleId,
          enrollmentId,
        });
        return;
      }

      const completionPct = Math.round(
        (completedModules.length / allModules.length) * 100,
      );

      await ctx.dispatch("lms.enrollment.updateProgress", {
        enrollmentId,
        completionPct,
      });

      if (enrollment.pricePaid.amount > 0) {
        const portion = enrollment.pricePaid.amount / allModules.length;
        await ctx.dispatch("ledger.postTransaction", {
          debit: "ACC-DEFERRED-REVENUE",
          credit: "ACC-COURSE-REVENUE",
          amount: {
            amount: portion,
            currency: enrollment.pricePaid.currency,
          },
          reference: `${enrollmentId}:${moduleId}`,
          referenceType: "ModuleCompletion",
          description: "Revenue recognition: module completed",
        });
      }

      const currentModule = allModules.find((m) => m.id === moduleId);
      if (currentModule) {
        const nextModule = allModules.find(
          (m) => m.order === currentModule.order + 1,
        );
        if (nextModule?.requiredPrevious) {
          await ctx.dispatch("lms.moduleProgress.unlock", {
            enrollmentId,
            moduleId: nextModule.id,
          });
          await ctx.dispatch("notification.send", {
            templateKey: "module.unlocked",
            to: learnerId,
            channels: ["in_app"],
            variables: {
              moduleTitle: nextModule.title,
              courseTitle: course.title,
            },
          });
        }
      }

      if (completionPct >= course.completionThreshold) {
        await ctx.dispatch("lms.enrollment.complete", { enrollmentId });
      }
    } catch (error) {
      ctx.logger.error("moduleCompletedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        moduleId,
        enrollmentId,
      });
    }
  },
};

const enrollmentCompletedHook: HookRegistration = {
  pattern: "enrollment.completed",
  handler: async (event, ctx) => {
    const { enrollmentId, learnerId, courseId } = event.payload as {
      enrollmentId: ID;
      learnerId: ID;
      courseId: ID;
    };

    try {
      const [enrollment, course, learner] = await Promise.all([
        ctx.query<Enrollment>("lms.enrollment.get", { id: enrollmentId }),
        ctx.query<Course>("lms.course.get", { id: courseId }),
        ctx.query<Actor>("identity.getActor", { id: learnerId }),
      ]);

      if (!enrollment || !course || !learner) {
        ctx.logger.error("enrollmentCompletedHook: Missing required data", {
          enrollmentId,
          courseId,
          learnerId,
        });
        return;
      }

      const verificationCode = generateVerificationCode();
      const expiresAt = course.certificateTemplate.expiresAfterDays
        ? new Date(
            Date.now() + course.certificateTemplate.expiresAfterDays * 86400000,
          )
        : undefined;

      const instructor = await ctx.query<Actor>("identity.getActor", {
        id: course.instructorId,
      });

      const pdfDocId = await ctx.dispatch<ID>("document.generatePDF", {
        templateKey: "certificate",
        variables: {
          learnerName: learner.name,
          courseTitle: course.title,
          completionDate: new Date().toLocaleDateString(),
          verificationCode,
          verifyUrl: `${ctx.org.settings.appUrl}/verify/${verificationCode}`,
          instructorName: instructor?.name ?? "Unknown Instructor",
        },
      });

      const cert = await ctx.dispatch<Certificate>("lms.certificate.create", {
        enrollmentId,
        learnerId,
        courseId,
        verificationCode,
        documentId: pdfDocId,
        issuedAt: new Date(),
        expiresAt,
      });

      await ctx.dispatch("lms.enrollment.update", {
        enrollmentId,
        certificateId: cert.id,
      });

      await ctx.dispatch("notification.send", {
        templateKey: "certificate.issued",
        to: learnerId,
        channels: ["email"],
        variables: {
          learnerName: learner.name,
          courseTitle: course.title,
          verificationCode,
          verifyUrl: `${ctx.org.settings.appUrl}/verify/${verificationCode}`,
          downloadUrl: `${ctx.org.settings.appUrl}/certificates/${cert.id}/download`,
        },
      });

      await ctx.dispatch("analytics.captureMetric", {
        key: "lms.course.completion",
        value: 1,
        dimensions: { courseId, instructorId: course.instructorId },
      });
    } catch (error) {
      ctx.logger.error("enrollmentCompletedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        enrollmentId,
      });
    }
  },
};

const submissionGradedHook: HookRegistration = {
  pattern: "submission.graded",
  handler: async (event, ctx) => {
    const { submissionId, score, learnerId, moduleId } = event.payload as {
      submissionId: ID;
      score: number;
      learnerId: ID;
      moduleId: ID;
    };

    try {
      await ctx.dispatch("lms.submission.return", { submissionId });

      const assignment = await ctx.query<Assignment>(
        "lms.assignment.getByModule",
        { moduleId },
      );

      if (assignment && score >= assignment.passingScore) {
        await ctx.dispatch("lms.moduleProgress.complete", {
          moduleId,
          learnerId,
          quizScore: score,
        });
      }
    } catch (error) {
      ctx.logger.error("submissionGradedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        submissionId,
      });
    }
  },
};

const sessionReminderHook: HookRegistration = {
  pattern: "session.reminder-trigger",
  handler: async (event, ctx) => {
    const { sessionId, minutesBefore } = event.payload as {
      sessionId: ID;
      minutesBefore: number;
    };

    try {
      const session = await ctx.query<LiveSession>("lms.session.get", {
        id: sessionId,
      });
      if (!session) {
        ctx.logger.error("sessionReminderHook: Session not found", {
          sessionId,
        });
        return;
      }

      const cohort = await ctx.query<Cohort>("lms.cohort.get", {
        id: session.cohortId,
      });
      if (!cohort) {
        ctx.logger.error("sessionReminderHook: Cohort not found", {
          cohortId: session.cohortId,
        });
        return;
      }

      const enrollments = await ctx.query<Enrollment[]>(
        "lms.cohort.enrollments",
        { cohortId: cohort.id },
      );

      const activeEnrollments = enrollments.filter(
        (e) => e.status === "active",
      );

      for (const enrollment of activeEnrollments) {
        await ctx.dispatch("notification.send", {
          templateKey: "session.reminder",
          to: enrollment.learnerId,
          channels: ["in_app", ...(minutesBefore <= 30 ? ["email"] : [])],
          variables: {
            sessionTitle: session.title,
            startsAt: session.scheduledAt,
            meetingUrl: session.meetingUrl,
            minutesBefore,
          },
        });
      }
    } catch (error) {
      ctx.logger.error("sessionReminderHook failed", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  },
};

const coursePublishedHook: HookRegistration = {
  pattern: "course.published",
  handler: async (event, ctx) => {
    const { courseId, instructorId } = event.payload as {
      courseId: ID;
      instructorId: ID;
    };

    try {
      await ctx.dispatch("catalog.publishItem", {
        itemId: courseId,
        itemType: "Course",
      });

      const [course, instructor] = await Promise.all([
        ctx.query<Course>("lms.course.get", { id: courseId }),
        ctx.query<Actor>("identity.getActor", { id: instructorId }),
      ]);

      if (course && instructor) {
        await ctx.dispatch("notification.send", {
          templateKey: "course.approved",
          to: instructorId,
          channels: ["email"],
          variables: {
            courseTitle: course.title,
            courseUrl: `${ctx.org.settings.appUrl}/courses/${course.slug}`,
          },
        });
      }
    } catch (error) {
      ctx.logger.error("coursePublishedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        courseId,
      });
    }
  },
};

const courseRejectedHook: HookRegistration = {
  pattern: "course.rejected",
  handler: async (event, ctx) => {
    const { courseId, instructorId, reason } = event.payload as {
      courseId: ID;
      instructorId: ID;
      reason?: string;
    };

    try {
      const course = await ctx.query<Course>("lms.course.get", {
        id: courseId,
      });

      if (course) {
        await ctx.dispatch("notification.send", {
          templateKey: "course.rejected",
          to: instructorId,
          channels: ["email"],
          variables: {
            courseTitle: course.title,
            feedback: reason ?? "No feedback provided",
          },
        });
      }
    } catch (error) {
      ctx.logger.error("courseRejectedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        courseId,
      });
    }
  },
};

const sessionStartedHook: HookRegistration = {
  pattern: "session.started",
  handler: async (event, ctx) => {
    const { sessionId, cohortId } = event.payload as {
      sessionId: ID;
      cohortId: ID;
    };

    try {
      await ctx.dispatch("realtime.broadcast", {
        channel: `org:${ctx.org.id}:lms:session:${sessionId}`,
        event: "session.started",
        payload: { sessionId },
      });

      const enrollments = await ctx.query<Enrollment[]>(
        "lms.cohort.enrollments",
        { cohortId },
      );

      const activeEnrollments = enrollments.filter(
        (e) => e.status === "active",
      );

      for (const enrollment of activeEnrollments) {
        await ctx.dispatch("notification.send", {
          templateKey: "session.started",
          to: enrollment.learnerId,
          channels: ["in_app"],
          variables: { sessionId },
        });
      }
    } catch (error) {
      ctx.logger.error("sessionStartedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  },
};

const sessionEndedHook: HookRegistration = {
  pattern: "session.ended",
  handler: async (event, ctx) => {
    const { cohortId, sessionId } = event.payload as {
      cohortId: ID;
      sessionId: ID;
    };

    try {
      const enrollments = await ctx.query<Enrollment[]>(
        "lms.cohort.enrollments",
        { cohortId },
      );

      const activeEnrollments = enrollments.filter(
        (e) => e.status === "active",
      );

      for (const enrollment of activeEnrollments) {
        await ctx.dispatch("notification.send", {
          templateKey: "session.ended",
          to: enrollment.learnerId,
          channels: ["in_app"],
          variables: { sessionId },
        });
      }
    } catch (error) {
      ctx.logger.error("sessionEndedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  },
};

const sessionRecordedHook: HookRegistration = {
  pattern: "session.recorded",
  handler: async (event, ctx) => {
    const { cohortId, sessionId, recordingUrl } = event.payload as {
      cohortId: ID;
      sessionId: ID;
      recordingUrl?: string;
    };

    try {
      const enrollments = await ctx.query<Enrollment[]>(
        "lms.cohort.enrollments",
        { cohortId },
      );

      const activeEnrollments = enrollments.filter(
        (e) => e.status === "active",
      );

      for (const enrollment of activeEnrollments) {
        await ctx.dispatch("notification.send", {
          templateKey: "session.recording-ready",
          to: enrollment.learnerId,
          channels: ["in_app", "email"],
          variables: { sessionId, recordingUrl },
        });
      }
    } catch (error) {
      ctx.logger.error("sessionRecordedHook failed", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  },
};

const hookRegistrations: HookRegistration[] = [
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
];

export function registerLMSHooks(
  eventBus: EventBus,
  createContext: (event: DomainEvent) => HookContext,
): Unsubscribe[] {
  const unsubscribes: Unsubscribe[] = [];

  for (const registration of hookRegistrations) {
    const unsubscribe = eventBus.subscribe(
      registration.pattern,
      async (event) => {
        const ctx = createContext(event);
        await registration.handler(event, ctx);
      },
    );
    unsubscribes.push(unsubscribe);
  }

  return unsubscribes;
}

export {
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
};

export type { HookHandler, HookContext, HookRegistration };
