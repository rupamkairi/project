export * from './helpers'
export * from './events'
export * from './outbox'
export * from './identity'
export * from './catalog'
export * from './inventory'
// Foundation master tables (unprefixed, cross-compose — see docs/master-tables.md)
export * from './party'
export * from './location'
export * from './pipeline'
export * from './commerce'
export * from './activity'
export * from './ledger'
export * from './workflow'
export * from './scheduling'
export * from './document'
export * from './notification'
export * from './geo'
export * from './analytics'
export * from './storage'
// Compose detail tables
export * from './search'

// Ecommerce schema - re-exported from compose
export {
  ecoRegions,
  ecoTaxProfiles,
  ecoTaxRates,
  ecoShippingOptions,
  ecoCustomerGroups,
  ecoCustomerGroupMembers,
  ecoReturns,
  ecoReturnItems,
  ecoClaims,
  ecoSwaps,
  ecoSwapItems,
  ecoSwapNewItems,
  ecoDraftOrders,
  ecoDraftOrderItems,
  ecoOrderEdits,
  ecoOrderEditItems,
  ecoGiftCards,
  ecoFulfillments,
  ecoFulfillmentItems,
  ecoCart,
  type EcoRegion,
  type EcoTaxProfile,
  type EcoTaxRate,
  type EcoShippingOption,
  type EcoCustomerGroup,
  type EcoCustomerGroupMember,
  type EcoReturn,
  type EcoReturnItem,
  type EcoClaim,
  type EcoSwap,
  type EcoSwapItem,
  type EcoSwapNewItem,
  type EcoDraftOrder,
  type EcoDraftOrderItem,
  type EcoOrderEdit,
  type EcoOrderEditItem,
  type EcoGiftCard,
  type EcoFulfillment,
  type EcoFulfillmentItem,
  type EcoCart,
} from '@projectx/ecommerce-server/db/schema/index'
// ERP schema - re-exported from compose
export * from '@projectx/erp-server/db/schema/erp'

// Workplace schema - re-exported from compose
export * from '@projectx/workplace-server/db/schema/workplace'

// Platform schema - re-exported from compose
import {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
} from '@projectx/platform-server/db/schema/platform'

export {
  pltSettings,
  pltComposeConfig,
  pltOrganizationSettings,
  type PltSetting,
  type PltComposeConfig,
  type PltOrganizationSetting,
}

// CRM schema - re-exported from compose
import {
  crmLead,
  crmDeal,
  crmSegment,
  crmCampaign,
  crmCampaignContact,
  crmEmailThread,
  crmEmailMessage,
  type CrmLead,
  type CrmDeal,
  type CrmSegment,
  type CrmCampaign,
  type CrmCampaignContact,
  type CrmEmailThread,
  type CrmEmailMessage,
} from '@projectx/crm-server/db/schema/crm'

export {
  crmLead,
  crmDeal,
  crmSegment,
  crmCampaign,
  crmCampaignContact,
  crmEmailThread,
  crmEmailMessage,
  type CrmLead,
  type CrmDeal,
  type CrmSegment,
  type CrmCampaign,
  type CrmCampaignContact,
  type CrmEmailThread,
  type CrmEmailMessage,
}
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
} from '@projectx/lms-server/db/schema/lms'

// Restaurant schema - re-exported from compose
import {
  rstModifiers,
  rstModifierGroups,
  rstKot,
  rstKotItems,
  rstShifts,
  rstShiftAssignments,
  rstRecipes,
  rstRecipeIngredients,
  rstReservations,
  rstAggregatorMappings,
  rstMenuPeriods,
  rstStockMovements,
  rstEquipmentLogs,
  rstPartners,
  rstStaff,
  rstBillPayments,
  rstBillSplits,
  rstDiscounts,
  rstWaitlist,
} from '@projectx/restaurant-server/db/schema/restaurant'

export {
  rstModifiers,
  rstModifierGroups,
  rstKot,
  rstKotItems,
  rstShifts,
  rstShiftAssignments,
  rstRecipes,
  rstRecipeIngredients,
  rstReservations,
  rstAggregatorMappings,
  rstMenuPeriods,
  rstStockMovements,
  rstEquipmentLogs,
  rstPartners,
  rstStaff,
  rstBillPayments,
  rstBillSplits,
  rstDiscounts,
  rstWaitlist,
}
