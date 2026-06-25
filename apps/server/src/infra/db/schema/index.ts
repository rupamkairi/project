export * from "./helpers";
export * from "./events";
export * from "./outbox";
export * from "./identity";
export * from "./catalog";
export * from "./inventory";
// Foundation master tables (unprefixed, cross-compose — see docs/master-tables.md)
export * from "./party";
export * from "./location";
export * from "./pipeline";
export * from "./commerce";
export * from "./activity";
export * from "./ledger";
export * from "./workflow";
export * from "./scheduling";
export * from "./document";
export * from "./notification";
export * from "./geo";
export * from "./analytics";
export * from "./storage";
export * from "./search";

// Platform schema - re-exported from compose
import {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
} from "@projectx/platform-server/db/schema/platform";

export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
};

// LMS schema
export {
  lmsCourseDetail,
  lmsModule,
  lmsLesson,
  lmsAssignment,
  lmsSubmission,
  lmsQuiz,
  lmsQuizQuestion,
  lmsCertificate,
  lmsCohort,
  lmsCohortMember,
  lmsProgress,
  lmsDiscussion,
  lmsDiscussionReply,
  lmsCourseReview,
  lmsCoupon,
  lmsWaitlist,
  lmsQuizSubmission,
  lmsPaymentEvent,
  lmsOrgConfig,
  contentTypeEnum,
  questionTypeEnum,
  courseLevelEnum,
  submissionStatusEnum,
  cohortStatusEnum,
  sessionStatusEnum,
  courseReviewStatusEnum,
  waitlistStatusEnum,
  couponDiscountTypeEnum,
} from "@projectx/lms-server/db/schema/lms";


