import type { ID, Timestamp } from "../../../apps/server/src/core/entity";
import type {
  Scheduler,
  JobOptions,
} from "../../../apps/server/src/core/queue";

interface JobContext {
  dispatch<R = unknown>(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<R>;
  query<R = unknown>(type: string, params: Record<string, unknown>): Promise<R>;
  logger: {
    error: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    debug: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

interface ScheduledJob {
  id: string;
  cron: string;
  description: string;
  handler: (ctx: JobContext) => Promise<void>;
}

interface LiveSession {
  id: ID;
  cohortId: ID;
  title: string;
  scheduledAt: Timestamp;
}

interface Enrollment {
  id: ID;
  learnerId: ID;
  courseId: ID;
  status: string;
  expiresAt?: Timestamp;
}

interface Cohort {
  id: ID;
  courseId: ID;
  name: string;
  status: string;
}

interface Assignment {
  id: ID;
  courseId: ID;
  title: string;
  absoluteDueDate?: Timestamp;
}

interface Certificate {
  id: ID;
  learnerId: ID;
  courseId: ID;
  expiresAt?: Timestamp;
}

interface Actor {
  id: ID;
  name: string;
  email: string;
}

interface Course {
  id: ID;
  title: string;
}

async function sessionReminders1Day(ctx: JobContext): Promise<void> {
  ctx.logger.info("sessionReminders1Day: Starting");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const sessions = await ctx.query<LiveSession[]>(
    "lms.session.findByDateRange",
    {
      start: tomorrow.getTime(),
      end: tomorrowEnd.getTime(),
      status: "scheduled",
    },
  );

  ctx.logger.info("sessionReminders1Day: Found sessions", {
    count: sessions.length,
    date: tomorrow.toISOString().split("T")[0],
  });

  for (const session of sessions) {
    await ctx.dispatch("eventBus.publish", {
      type: "session.reminder-trigger",
      payload: {
        sessionId: session.id,
        minutesBefore: 1440,
      },
    });
  }

  ctx.logger.info("sessionReminders1Day: Completed", {
    processedCount: sessions.length,
  });
}

async function sessionReminders30Min(ctx: JobContext): Promise<void> {
  ctx.logger.info("sessionReminders30Min: Starting");

  const now = Date.now();
  const windowStart = now + 30 * 60 * 1000;
  const windowEnd = now + 45 * 60 * 1000;

  const sessions = await ctx.query<LiveSession[]>(
    "lms.session.findByDateRange",
    {
      start: windowStart,
      end: windowEnd,
      status: "scheduled",
    },
  );

  ctx.logger.info("sessionReminders30Min: Found sessions", {
    count: sessions.length,
  });

  for (const session of sessions) {
    await ctx.dispatch("eventBus.publish", {
      type: "session.reminder-trigger",
      payload: {
        sessionId: session.id,
        minutesBefore: 30,
      },
    });
  }

  ctx.logger.info("sessionReminders30Min: Completed", {
    processedCount: sessions.length,
  });
}

async function enrollmentExpiryCheck(ctx: JobContext): Promise<void> {
  ctx.logger.info("enrollmentExpiryCheck: Starting");

  const now = Date.now();

  const enrollments = await ctx.query<Enrollment[]>(
    "lms.enrollment.findExpired",
    {
      now,
      status: "active",
    },
  );

  ctx.logger.info("enrollmentExpiryCheck: Found expired enrollments", {
    count: enrollments.length,
  });

  for (const enrollment of enrollments) {
    await ctx.dispatch("lms.enrollment.expire", {
      enrollmentId: enrollment.id,
    });

    await ctx.dispatch("notification.send", {
      templateKey: "enrollment.expired",
      to: enrollment.learnerId,
      channels: ["email"],
      variables: {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
      },
    });
  }

  ctx.logger.info("enrollmentExpiryCheck: Completed", {
    processedCount: enrollments.length,
  });
}

async function enrollmentExpiryWarning(ctx: JobContext): Promise<void> {
  ctx.logger.info("enrollmentExpiryWarning: Starting");

  const now = Date.now();
  const warningDays = [30, 7, 1];

  let totalNotified = 0;

  for (const days of warningDays) {
    const windowStart = now + (days - 0.5) * 24 * 60 * 60 * 1000;
    const windowEnd = now + (days + 0.5) * 24 * 60 * 60 * 1000;

    const enrollments = await ctx.query<Enrollment[]>(
      "lms.enrollment.findByExpiryWindow",
      {
        start: windowStart,
        end: windowEnd,
        status: "active",
      },
    );

    ctx.logger.info("enrollmentExpiryWarning: Found enrollments for warning", {
      days,
      count: enrollments.length,
    });

    for (const enrollment of enrollments) {
      const [course, learner] = await Promise.all([
        ctx.query<Course>("lms.course.get", { id: enrollment.courseId }),
        ctx.query<Actor>("identity.getActor", { id: enrollment.learnerId }),
      ]);

      await ctx.dispatch("notification.send", {
        templateKey: "enrollment.expiring-soon",
        to: enrollment.learnerId,
        channels: ["email"],
        variables: {
          learnerName: learner?.name ?? "Learner",
          courseTitle: course?.title ?? "Course",
          daysRemaining: days,
          expiresAt: enrollment.expiresAt,
        },
      });

      totalNotified++;
    }
  }

  ctx.logger.info("enrollmentExpiryWarning: Completed", {
    totalNotified,
  });
}

async function assignmentDueReminders(ctx: JobContext): Promise<void> {
  ctx.logger.info("assignmentDueReminders: Starting");

  const now = Date.now();
  const dueWindowStart = now;
  const dueWindowEnd = now + 24 * 60 * 60 * 1000;

  const assignments = await ctx.query<Assignment[]>(
    "lms.assignment.findByDueWindow",
    {
      start: dueWindowStart,
      end: dueWindowEnd,
    },
  );

  ctx.logger.info("assignmentDueReminders: Found assignments due soon", {
    count: assignments.length,
  });

  let totalReminders = 0;

  for (const assignment of assignments) {
    const learnersWithoutSubmission = await ctx.query<
      { learnerId: ID; enrollmentId: ID }[]
    >("lms.assignment.learnersWithoutSubmission", {
      assignmentId: assignment.id,
    });

    for (const { learnerId } of learnersWithoutSubmission) {
      const learner = await ctx.query<Actor>("identity.getActor", {
        id: learnerId,
      });

      await ctx.dispatch("notification.send", {
        templateKey: "assignment.due-soon",
        to: learnerId,
        channels: ["in_app", "email"],
        variables: {
          learnerName: learner?.name ?? "Learner",
          assignmentTitle: assignment.title,
          dueDate: assignment.absoluteDueDate,
        },
      });

      totalReminders++;
    }
  }

  ctx.logger.info("assignmentDueReminders: Completed", {
    totalReminders,
  });
}

async function learnerInactivityNudge(ctx: JobContext): Promise<void> {
  ctx.logger.info("learnerInactivityNudge: Starting");

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const inactiveEnrollments = await ctx.query<Enrollment[]>(
    "lms.enrollment.findInactive",
    {
      lastAccessedBefore: sevenDaysAgo,
      status: "active",
    },
  );

  ctx.logger.info("learnerInactivityNudge: Found inactive enrollments", {
    count: inactiveEnrollments.length,
  });

  for (const enrollment of inactiveEnrollments) {
    const [course, learner] = await Promise.all([
      ctx.query<Course>("lms.course.get", { id: enrollment.courseId }),
      ctx.query<Actor>("identity.getActor", { id: enrollment.learnerId }),
    ]);

    await ctx.dispatch("notification.send", {
      templateKey: "enrollment.nudge",
      to: enrollment.learnerId,
      channels: ["email"],
      variables: {
        learnerName: learner?.name ?? "Learner",
        courseTitle: course?.title ?? "Course",
        enrollmentId: enrollment.id,
      },
    });
  }

  ctx.logger.info("learnerInactivityNudge: Completed", {
    processedCount: inactiveEnrollments.length,
  });
}

async function cohortActivation(ctx: JobContext): Promise<void> {
  ctx.logger.info("cohortActivation: Starting");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const cohorts = await ctx.query<Cohort[]>("lms.cohort.findByStartDate", {
    start: today.getTime(),
    end: todayEnd.getTime(),
    status: "scheduled",
  });

  ctx.logger.info("cohortActivation: Found cohorts to activate", {
    count: cohorts.length,
  });

  for (const cohort of cohorts) {
    await ctx.dispatch("lms.cohort.activate", {
      cohortId: cohort.id,
    });

    const enrollments = await ctx.query<Enrollment[]>(
      "lms.cohort.enrollments",
      {
        cohortId: cohort.id,
      },
    );

    const activeEnrollments = enrollments.filter((e) => e.status === "active");

    for (const enrollment of activeEnrollments) {
      const learner = await ctx.query<Actor>("identity.getActor", {
        id: enrollment.learnerId,
      });

      await ctx.dispatch("notification.send", {
        templateKey: "cohort.starting",
        to: enrollment.learnerId,
        channels: ["email"],
        variables: {
          learnerName: learner?.name ?? "Learner",
          cohortName: cohort.name,
          cohortId: cohort.id,
        },
      });
    }
  }

  ctx.logger.info("cohortActivation: Completed", {
    activatedCount: cohorts.length,
  });
}

async function certificateExpiryReminder(ctx: JobContext): Promise<void> {
  ctx.logger.info("certificateExpiryReminder: Starting");

  const now = Date.now();
  const warningDays = [30, 7, 1];

  let totalNotified = 0;

  for (const days of warningDays) {
    const windowStart = now + (days - 0.5) * 24 * 60 * 60 * 1000;
    const windowEnd = now + (days + 0.5) * 24 * 60 * 60 * 1000;

    const certificates = await ctx.query<Certificate[]>(
      "lms.certificate.findByExpiryWindow",
      {
        start: windowStart,
        end: windowEnd,
        revoked: false,
      },
    );

    ctx.logger.info(
      "certificateExpiryReminder: Found certificates for warning",
      {
        days,
        count: certificates.length,
      },
    );

    for (const cert of certificates) {
      const [course, learner] = await Promise.all([
        ctx.query<Course>("lms.course.get", { id: cert.courseId }),
        ctx.query<Actor>("identity.getActor", { id: cert.learnerId }),
      ]);

      await ctx.dispatch("notification.send", {
        templateKey: "certificate.expiring",
        to: cert.learnerId,
        channels: ["email"],
        variables: {
          learnerName: learner?.name ?? "Learner",
          courseTitle: course?.title ?? "Course",
          daysRemaining: days,
          expiresAt: cert.expiresAt,
          certificateId: cert.id,
        },
      });

      totalNotified++;
    }
  }

  ctx.logger.info("certificateExpiryReminder: Completed", {
    totalNotified,
  });
}

async function analyticsSnapshot(ctx: JobContext): Promise<void> {
  ctx.logger.info("analyticsSnapshot: Starting");

  const courses = await ctx.query<Course[]>("lms.course.findAllPublished", {});

  ctx.logger.info("analyticsSnapshot: Processing courses", {
    count: courses.length,
  });

  const snapshotDate = new Date();
  snapshotDate.setHours(0, 0, 0, 0);

  for (const course of courses) {
    const stats = await ctx.query<{
      enrollmentCount: number;
      completionCount: number;
      completionRate: number;
      revenue: number;
    }>("lms.course.getAnalytics", { courseId: course.id });

    await ctx.dispatch("analytics.recordDataPoint", {
      key: "lms.course.enrollment_count",
      value: stats.enrollmentCount,
      dimensions: { courseId: course.id },
      timestamp: snapshotDate.getTime(),
    });

    await ctx.dispatch("analytics.recordDataPoint", {
      key: "lms.course.completion_count",
      value: stats.completionCount,
      dimensions: { courseId: course.id },
      timestamp: snapshotDate.getTime(),
    });

    await ctx.dispatch("analytics.recordDataPoint", {
      key: "lms.course.completion_rate",
      value: stats.completionRate,
      dimensions: { courseId: course.id },
      timestamp: snapshotDate.getTime(),
    });

    await ctx.dispatch("analytics.recordDataPoint", {
      key: "lms.course.revenue",
      value: stats.revenue,
      dimensions: { courseId: course.id },
      timestamp: snapshotDate.getTime(),
    });
  }

  ctx.logger.info("analyticsSnapshot: Completed", {
    processedCourses: courses.length,
    snapshotDate: snapshotDate.toISOString(),
  });
}

async function deferredRevenueRecognition(ctx: JobContext): Promise<void> {
  ctx.logger.info("deferredRevenueRecognition: Starting");

  const completedCohorts = await ctx.query<Cohort[]>(
    "lms.cohort.findCompleted",
    {},
  );

  ctx.logger.info("deferredRevenueRecognition: Found completed cohorts", {
    count: completedCohorts.length,
  });

  let totalReconciled = 0;

  for (const cohort of completedCohorts) {
    const revenue = await ctx.query<{
      deferredAmount: number;
      currency: string;
    }>("lms.cohort.getDeferredRevenue", { cohortId: cohort.id });

    if (revenue.deferredAmount > 0) {
      await ctx.dispatch("ledger.postTransaction", {
        debit: "ACC-DEFERRED-REVENUE",
        credit: "ACC-COURSE-REVENUE",
        amount: {
          amount: revenue.deferredAmount,
          currency: revenue.currency,
        },
        reference: `cohort-completion:${cohort.id}`,
        referenceType: "CohortCompletion",
        description: `Revenue recognition for completed cohort: ${cohort.name}`,
      });

      totalReconciled++;
    }
  }

  ctx.logger.info("deferredRevenueRecognition: Completed", {
    reconciledCount: totalReconciled,
  });
}

const lmsJobs: ScheduledJob[] = [
  {
    id: "lms.session-reminders-1day",
    cron: "0 9 * * *",
    description: "Send session reminders 1 day before scheduled sessions",
    handler: sessionReminders1Day,
  },
  {
    id: "lms.session-reminders-30min",
    cron: "*/15 * * * *",
    description: "Send session reminders 30 minutes before scheduled sessions",
    handler: sessionReminders30Min,
  },
  {
    id: "lms.enrollment-expiry-check",
    cron: "0 7 * * *",
    description: "Check and process expired enrollments",
    handler: enrollmentExpiryCheck,
  },
  {
    id: "lms.enrollment-expiry-warning",
    cron: "0 7 * * *",
    description:
      "Send expiry warnings for enrollments expiring in 30, 7, or 1 day",
    handler: enrollmentExpiryWarning,
  },
  {
    id: "lms.assignment-due-reminders",
    cron: "0 9 * * *",
    description: "Send reminders for assignments due in 24 hours",
    handler: assignmentDueReminders,
  },
  {
    id: "lms.learner-inactivity-nudge",
    cron: "0 10 * * 2",
    description: "Send re-engagement emails to inactive learners",
    handler: learnerInactivityNudge,
  },
  {
    id: "lms.cohort-activation",
    cron: "0 6 * * *",
    description: "Activate cohorts scheduled to start today",
    handler: cohortActivation,
  },
  {
    id: "lms.certificate-expiry-reminder",
    cron: "0 8 * * 1",
    description:
      "Send expiry warnings for certificates expiring in 30, 7, or 1 day",
    handler: certificateExpiryReminder,
  },
  {
    id: "lms.analytics-snapshot",
    cron: "0 2 * * *",
    description: "Generate nightly analytics snapshots",
    handler: analyticsSnapshot,
  },
  {
    id: "lms.deferred-revenue-recognition",
    cron: "0 3 1 * *",
    description: "Reconcile deferred revenue for completed cohorts",
    handler: deferredRevenueRecognition,
  },
];

async function registerLMSJobs(
  scheduler: Scheduler,
  createContext: () => JobContext,
): Promise<void> {
  for (const job of lmsJobs) {
    const opts: JobOptions = {
      repeat: {
        cron: job.cron,
      },
    };

    await scheduler.schedule(job.cron, job.id, {}, opts);
  }
}

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
};

export type { JobContext, ScheduledJob };
