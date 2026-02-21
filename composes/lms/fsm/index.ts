import type {
  Action,
  FSMEngine,
  StateMachine,
  StateNode,
} from "../../../apps/server/src/core/state";

type CourseState = "draft" | "under-review" | "published" | "archived";
type CourseEvent =
  | "submit-review"
  | "approve"
  | "reject"
  | "archive"
  | "restore";

type EnrollmentState =
  | "pending-payment"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "refunded";
type EnrollmentEvent =
  | "payment-confirmed"
  | "complete"
  | "expire"
  | "cancel"
  | "refund";

type SubmissionState = "submitted" | "grading" | "graded" | "returned" | "late";
type SubmissionEvent = "auto" | "grade" | "return";

type LiveSessionState =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled"
  | "recorded";
type LiveSessionEvent = "start" | "end" | "record-uploaded" | "cancel";

type CohortState = "scheduled" | "active" | "completed" | "cancelled";
type CohortEvent = "activate" | "complete" | "cancel";

const courseFSM: StateMachine<CourseState, CourseEvent> = {
  id: "course",
  entityType: "Course",
  initial: "draft",
  states: {
    draft: {
      label: "Draft",
      on: {
        "submit-review": {
          target: "under-review",
          guard: {
            and: [
              { field: "course.moduleCount", op: "gt", value: 0 },
              { field: "course.price", op: "exists" },
            ],
          },
          actions: [
            { type: "emit", event: "course.submitted-for-review" },
            {
              type: "dispatch",
              command: "workflow.startProcess",
              payload: { processType: "COURSE_REVIEW" },
            },
          ],
        },
      },
    },
    "under-review": {
      label: "Under Review",
      on: {
        approve: {
          target: "published",
          guard: {
            field: "actor.role",
            op: "in",
            value: ["content-reviewer", "lms-admin"],
          },
          actions: [
            { type: "emit", event: "course.published" },
            { type: "assign", field: "course.publishedAt", value: "now()" },
            { type: "dispatch", command: "catalog.publishItem" },
          ],
        },
        reject: {
          target: "draft",
          guard: {
            and: [
              {
                field: "actor.role",
                op: "in",
                value: ["content-reviewer", "lms-admin"],
              },
              { field: "rejectionReason", op: "exists" },
            ],
          },
          actions: [
            {
              type: "dispatch",
              command: "notification.send",
              payload: { templateKey: "course.rejected" },
            },
          ],
        },
      },
    },
    published: {
      label: "Published",
      on: {
        archive: {
          target: "archived",
          guard: {
            or: [
              { field: "activeEnrollments", op: "eq", value: 0 },
              { field: "actor.role", op: "eq", value: "lms-admin" },
            ],
          },
          actions: [
            { type: "emit", event: "course.archived" },
            { type: "dispatch", command: "catalog.archiveItem" },
          ],
        },
      },
    },
    archived: {
      label: "Archived",
      on: {
        restore: {
          target: "draft",
          guard: { field: "actor.role", op: "eq", value: "lms-admin" },
        },
      },
    },
  },
};

const enrollmentFSM: StateMachine<EnrollmentState, EnrollmentEvent> = {
  id: "enrollment",
  entityType: "Enrollment",
  initial: "pending-payment",
  states: {
    "pending-payment": {
      label: "Pending Payment",
      on: {
        "payment-confirmed": {
          target: "active",
        },
      },
      entry: [
        { type: "emit", event: "enrollment.activated" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "enrollment.confirmed" },
        },
        {
          type: "dispatch",
          command: "lms.addToCohort",
          payload: { condition: "cohortId" },
        },
        { type: "dispatch", command: "ledger.recognizeRevenue" },
      ],
    },
    active: {
      label: "Active",
      on: {
        complete: {
          target: "completed",
          guard: {
            field: "enrollment.completionPct",
            op: "gte",
            value: { ref: "course.completionThreshold" },
          },
        },
        expire: {
          target: "expired",
        },
        cancel: {
          target: "cancelled",
          guard: {
            field: "enrollment.completedAt",
            op: "exists",
            value: false,
          },
        },
      },
      entry: [
        { type: "emit", event: "enrollment.completed" },
        { type: "assign", field: "enrollment.completedAt", value: "now()" },
        { type: "dispatch", command: "lms.issueCertificate" },
      ],
    },
    completed: {
      label: "Completed",
      terminal: true,
    },
    expired: {
      label: "Expired",
      terminal: true,
      entry: [
        { type: "emit", event: "enrollment.expired" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "enrollment.expired" },
        },
      ],
    },
    cancelled: {
      label: "Cancelled",
      on: {
        refund: {
          target: "refunded",
        },
      },
      entry: [
        { type: "emit", event: "enrollment.cancelled" },
        {
          type: "dispatch",
          command: "lms.processRefund",
          payload: { condition: "withinRefundWindow" },
        },
      ],
    },
    refunded: {
      label: "Refunded",
      terminal: true,
      entry: [{ type: "dispatch", command: "ledger.processRefund" }],
    },
  },
};

const submissionFSM: StateMachine<SubmissionState, SubmissionEvent> = {
  id: "submission",
  entityType: "Submission",
  initial: "submitted",
  states: {
    submitted: {
      label: "Submitted",
      on: {
        auto: {
          target: "grading",
        },
      },
      entry: [
        { type: "emit", event: "submission.received" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "submission.received", to: "instructor" },
        },
      ],
    },
    grading: {
      label: "Grading",
      on: {
        grade: {
          target: "graded",
          guard: {
            and: [
              { field: "score", op: "exists" },
              {
                field: "actor.role",
                op: "in",
                value: ["instructor", "lms-admin"],
              },
            ],
          },
        },
      },
    },
    graded: {
      label: "Graded",
      on: {
        return: {
          target: "returned",
        },
      },
      entry: [
        { type: "emit", event: "submission.graded" },
        { type: "assign", field: "submission.gradedAt", value: "now()" },
        {
          type: "dispatch",
          command: "lms.updateModuleProgress",
          payload: { condition: "passingScoreMet" },
        },
      ],
    },
    returned: {
      label: "Returned",
      terminal: true,
      entry: [
        { type: "emit", event: "submission.returned" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "submission.returned", to: "learner" },
        },
      ],
    },
    late: {
      label: "Late Submission",
      on: {
        auto: {
          target: "grading",
        },
      },
    },
  },
};

const liveSessionFSM: StateMachine<LiveSessionState, LiveSessionEvent> = {
  id: "liveSession",
  entityType: "LiveSession",
  initial: "scheduled",
  states: {
    scheduled: {
      label: "Scheduled",
      on: {
        start: {
          target: "live",
          guard: {
            and: [
              { field: "actor.role", op: "eq", value: "instructor" },
              {
                or: [
                  { field: "minutesUntilScheduled", op: "lte", value: 15 },
                  { field: "minutesSinceScheduled", op: "lte", value: 15 },
                ],
              },
            ],
          },
        },
        cancel: {
          target: "cancelled",
        },
      },
    },
    live: {
      label: "Live",
      on: {
        end: {
          target: "ended",
        },
      },
      entry: [
        { type: "emit", event: "session.started" },
        {
          type: "dispatch",
          command: "realtime.broadcast",
          payload: { channel: "cohort" },
        },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "session.started", to: "cohort-learners" },
        },
      ],
    },
    ended: {
      label: "Ended",
      on: {
        "record-uploaded": {
          target: "recorded",
        },
      },
      entry: [
        { type: "emit", event: "session.ended" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "session.ended", to: "cohort" },
        },
      ],
    },
    cancelled: {
      label: "Cancelled",
      terminal: true,
      entry: [
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "session.cancelled", to: "cohort" },
        },
      ],
    },
    recorded: {
      label: "Recorded",
      terminal: true,
      entry: [
        { type: "emit", event: "session.recorded" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "session.recording-ready", to: "cohort" },
        },
      ],
    },
  },
};

const cohortFSM: StateMachine<CohortState, CohortEvent> = {
  id: "cohort",
  entityType: "Cohort",
  initial: "scheduled",
  states: {
    scheduled: {
      label: "Scheduled",
      on: {
        activate: {
          target: "active",
        },
        cancel: {
          target: "cancelled",
        },
      },
    },
    active: {
      label: "Active",
      on: {
        complete: {
          target: "completed",
        },
        cancel: {
          target: "cancelled",
        },
      },
      entry: [
        { type: "emit", event: "cohort.activated" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "cohort.starting", to: "enrolled-learners" },
        },
      ],
    },
    completed: {
      label: "Completed",
      terminal: true,
      entry: [
        { type: "emit", event: "cohort.completed" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "cohort.completed", to: "enrolled-learners" },
        },
      ],
    },
    cancelled: {
      label: "Cancelled",
      terminal: true,
      entry: [
        { type: "emit", event: "cohort.cancelled" },
        {
          type: "dispatch",
          command: "notification.send",
          payload: { templateKey: "cohort.cancelled", to: "enrolled-learners" },
        },
      ],
    },
  },
};

function registerLMSFSMs(engine: FSMEngine): void {
  engine.register(courseFSM);
  engine.register(enrollmentFSM);
  engine.register(submissionFSM);
  engine.register(liveSessionFSM);
  engine.register(cohortFSM);
}

export {
  courseFSM,
  enrollmentFSM,
  submissionFSM,
  liveSessionFSM,
  cohortFSM,
  registerLMSFSMs,
};

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
};
