# CRM — Phase 3: Backend API

## Goal

Define every REST endpoint in the CRM compose. Each route file lives in
`composes/crm/server/src/routes/`. All routes are prefixed `/crm` by the compose.
Auth is enforced per-route using `ctx.actor` + `CRM_PERMISSIONS` checks.

---

## Route Files

```
routes/
  accounts.ts
  contacts.ts
  leads.ts
  deals.ts
  activities.ts
  pipelines.ts
  campaigns.ts
  segments.ts
  analytics.ts
  import-export.ts
  search.ts
  webhooks.ts
```

---

## 3.1 Accounts — `routes/accounts.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/accounts` | read | List accounts. Filters: `status`, `industry`, `ownerId`. Pagination. |
| `POST` | `/crm/accounts` | create | Create account |
| `GET` | `/crm/accounts/:id` | read | Get account with contacts count + deal value |
| `PATCH` | `/crm/accounts/:id` | update | Update account fields |
| `DELETE` | `/crm/accounts/:id` | delete (admin+manager) | Soft delete |
| `GET` | `/crm/accounts/:id/contacts` | read | Contacts belonging to account |
| `GET` | `/crm/accounts/:id/deals` | read | Deals for this account |
| `GET` | `/crm/accounts/:id/activities` | read | Activity timeline for account |

---

## 3.2 Contacts — `routes/contacts.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/contacts` | read | List. Filters: `status`, `accountId`, `ownerId`, `leadScore[min/max]`, `tags`. |
| `POST` | `/crm/contacts` | create | Create contact. Auto-creates account if `accountName` supplied. |
| `GET` | `/crm/contacts/:id` | read | Get contact with activities, deals, emails (P1) |
| `PATCH` | `/crm/contacts/:id` | update | Update fields |
| `DELETE` | `/crm/contacts/:id` | delete (admin+manager) | Soft delete |
| `GET` | `/crm/contacts/:id/activities` | read | Activity timeline |
| `GET` | `/crm/contacts/:id/deals` | read | Associated deals |
| `POST` | `/crm/contacts/:id/tags` | update | Add tags |
| `DELETE` | `/crm/contacts/:id/tags/:tag` | update | Remove tag |
| `GET` | `/crm/contacts/:id/email-threads` | read (P1) | Email threads linked to contact |

---

## 3.3 Leads — `routes/leads.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/leads` | read | List. Filters: `status`, `ownerId`, `source`, `score[min/max]`. |
| `POST` | `/crm/leads` | create | Create lead. Optionally creates contact + account. |
| `GET` | `/crm/leads/:id` | read | Lead detail with contact, activities |
| `PATCH` | `/crm/leads/:id` | update | Update lead fields |
| `DELETE` | `/crm/leads/:id` | delete (admin+manager) | Soft delete |
| `POST` | `/crm/leads/:id/qualify` | update | Transition FSM: `contacted → qualified`. Returns lead. |
| `POST` | `/crm/leads/:id/disqualify` | update | FSM: any → `disqualified`. Requires `reason`. |
| `POST` | `/crm/leads/:id/convert` | update | FSM: `qualified → converted`. Creates Deal. Returns `{ lead, deal }`. |
| `GET` | `/crm/leads/:id/activities` | read | Activity timeline |

---

## 3.4 Deals — `routes/deals.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/deals` | read | List. Filters: `status`, `pipelineId`, `stageId`, `ownerId`, `value[min/max]`. |
| `POST` | `/crm/deals` | create | Create deal in pipeline stage |
| `GET` | `/crm/deals/:id` | read | Deal detail with contact, activities, documents |
| `PATCH` | `/crm/deals/:id` | update | Update deal fields |
| `DELETE` | `/crm/deals/:id` | delete (admin+manager) | Soft delete |
| `POST` | `/crm/deals/:id/move` | update | Move deal to different stage. Body: `{ stageId }`. |
| `POST` | `/crm/deals/:id/win` | update | FSM: `open → won`. Body: `{ actualCloseDate }`. |
| `POST` | `/crm/deals/:id/lose` | update | FSM: `open → lost`. Body: `{ lostReason }`. |
| `POST` | `/crm/deals/:id/approve` | deal:approve | Approve high-value deal. Sets `approvalStatus: approved`. |
| `POST` | `/crm/deals/:id/reject` | deal:approve | Reject deal approval. |
| `GET` | `/crm/deals/:id/activities` | read | Timeline |
| `GET` | `/crm/deals/rotting` | read | Deals past rotPeriodDays without stage movement |

---

## 3.5 Activities — `routes/activities.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/activities` | read | Global activity feed. Filters: `type`, `actorId`, `contactId`, `dealId`, `status`, `dueFrom/dueTo`. |
| `POST` | `/crm/activities` | create | Log activity. At least one of `contactId`, `dealId`, `leadId`, `accountId` required. |
| `GET` | `/crm/activities/:id` | read | Activity detail |
| `PATCH` | `/crm/activities/:id` | update | Update activity (own only for sales-rep) |
| `DELETE` | `/crm/activities/:id` | delete (admin+manager) | Soft delete |
| `POST` | `/crm/activities/:id/complete` | update | Mark task/meeting as done |
| `GET` | `/crm/activities/upcoming` | read | Future-dated activities (tasks/meetings) for current actor |

---

## 3.6 Pipelines — `routes/pipelines.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/pipelines` | read | List pipelines |
| `POST` | `/crm/pipelines` | admin+manager | Create pipeline |
| `GET` | `/crm/pipelines/:id` | read | Pipeline with stages and deal counts per stage |
| `PATCH` | `/crm/pipelines/:id` | admin+manager | Update pipeline name/currency |
| `DELETE` | `/crm/pipelines/:id` | admin | Soft delete (must not have open deals) |
| `POST` | `/crm/pipelines/:id/stages` | admin+manager | Add stage |
| `PATCH` | `/crm/pipelines/:id/stages/:stageId` | admin+manager | Update stage |
| `DELETE` | `/crm/pipelines/:id/stages/:stageId` | admin+manager | Remove stage (must be empty) |
| `POST` | `/crm/pipelines/:id/stages/reorder` | admin+manager | Reorder stages. Body: `{ stageIds: string[] }`. |

---

## 3.7 Campaigns — `routes/campaigns.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/campaigns` | read | List campaigns. Filters: `type`, `status`, `segmentId`. |
| `POST` | `/crm/campaigns` | admin+manager | Create campaign (status=draft) |
| `GET` | `/crm/campaigns/:id` | read | Campaign with stats |
| `PATCH` | `/crm/campaigns/:id` | admin+manager | Update while in draft |
| `DELETE` | `/crm/campaigns/:id` | admin | Delete draft campaign |
| `POST` | `/crm/campaigns/:id/schedule` | admin+manager | Set `scheduledAt`, transitions to `scheduled` |
| `POST` | `/crm/campaigns/:id/send` | admin+manager | Immediate send (resolves segment, queues dispatch) |
| `POST` | `/crm/campaigns/:id/pause` | admin | Pause in-progress campaign |
| `POST` | `/crm/campaigns/:id/cancel` | admin | Cancel |
| `GET` | `/crm/campaigns/:id/contacts` | read | Per-contact delivery status |

---

## 3.8 Segments — `routes/segments.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/segments` | read | List segments |
| `POST` | `/crm/segments` | admin+manager | Create segment with filter RuleExpr |
| `GET` | `/crm/segments/:id` | read | Segment with cached contact count |
| `PATCH` | `/crm/segments/:id` | admin+manager | Update filters |
| `DELETE` | `/crm/segments/:id` | admin | Delete (fails if referenced by active campaign) |
| `POST` | `/crm/segments/:id/preview` | read | Evaluate filters → return matching contacts (paginated) |
| `POST` | `/crm/segments/:id/refresh` | admin+manager | Force recount of contactCount |

---

## 3.9 Analytics — `routes/analytics.ts`

All require `crm:admin` or `crm:sales-manager`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/crm/analytics/pipeline` | Pipeline value by stage, per pipeline |
| `GET` | `/crm/analytics/deals/velocity` | Avg deal cycle time, win rate, lost rate |
| `GET` | `/crm/analytics/rep-performance` | Per-rep: deals won, total value, activities logged |
| `GET` | `/crm/analytics/lead-sources` | Leads by source with conversion rate |
| `GET` | `/crm/analytics/activities/summary` | Activity count by type over time |
| `GET` | `/crm/analytics/campaigns/:id` | Campaign stats: delivery rate, open rate, CTR |

---

## 3.10 Import / Export — `routes/import-export.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/crm/import/contacts` | admin+manager | CSV upload (multipart). Returns `{ jobId }`. |
| `GET` | `/crm/import/jobs/:jobId` | admin+manager | Import job status and error report |
| `GET` | `/crm/export/contacts` | admin+manager | Stream CSV of all contacts for org |
| `GET` | `/crm/export/deals` | admin+manager | Stream CSV of all deals |

Import CSV columns: `firstName,lastName,email,phone,title,accountName,tags,source`.
Validation: skip rows with no email; deduplicate by email.

---

## 3.11 Search — `routes/search.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/search` | read | Full-text search across contacts + deals + accounts. Query: `q`, `collection` (optional filter), `orgId`. Uses PgSearchAdapter. |

---

## 3.12 Webhooks (Outbound Registration) — P2 — `routes/webhooks.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/webhooks` | admin | List registered outbound webhooks |
| `POST` | `/crm/webhooks` | admin | Register webhook URL for events |
| `DELETE` | `/crm/webhooks/:id` | admin | Remove webhook |

---

## Request/Response Patterns

All list endpoints return:

```typescript
{
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

All single-entity endpoints return the full entity object.
Mutation endpoints return the updated/created entity.
Errors use the Core error hierarchy → `getHttpStatus()`.

---

## Route File Structure (example: contacts.ts)

```typescript
// composes/crm/server/src/routes/contacts.ts
import { Elysia, t } from "elysia";
import { db } from "@db/client";
import { crmContacts } from "../db/schema";
import { requirePermission } from "../permissions";

export const contactsRoutes = new Elysia()
  .get("/contacts", async ({ query, actor }) => {
    requirePermission(actor, "contact:read");
    // db query with filters
  }, { query: t.Object({ ... }) })
  .post("/contacts", async ({ body, actor }) => {
    requirePermission(actor, "contact:create");
    // insert
  }, { body: t.Object({ ... }) })
  // ...
```
