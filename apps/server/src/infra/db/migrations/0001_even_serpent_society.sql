CREATE TABLE "pjm_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"requested_by_id" text,
	"approved_by_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"comment" text,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_billing_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"client_id" text,
	"schedule_id" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp,
	"exported_to_erp_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_billing_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"draft_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"worklog_id" text,
	"type" text DEFAULT 'time' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_billing_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'time_and_materials' NOT NULL,
	"frequency" text,
	"next_run_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'scrum' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_board_columns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"board_id" text NOT NULL,
	"name" text NOT NULL,
	"reporting_category" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"color" text,
	"wip_limit" integer,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'fixed_fee' NOT NULL,
	"total_amount" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"approved_by_id" text
);
--> statement-breakpoint
CREATE TABLE "pjm_budget_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"budget_id" text NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"text" text NOT NULL,
	"completed" jsonb DEFAULT 'false'::jsonb,
	"completed_by_id" text,
	"completed_at" timestamp,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"parent_id" text,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"is_internal" jsonb DEFAULT 'false'::jsonb
);
--> statement-breakpoint
CREATE TABLE "pjm_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "pjm_member_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rate_card_id" text NOT NULL,
	"role" text,
	"actor_id" text,
	"hourly_rate" integer NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"approval_required" jsonb DEFAULT 'false'::jsonb,
	"approved_by_id" text,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_milestone_dependencies" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"milestone_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	CONSTRAINT "pjm_milestone_dependencies_milestone_id_depends_on_id_pk" PRIMARY KEY("milestone_id","depends_on_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_portfolios" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_id" text,
	"start_date" timestamp,
	"end_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_portfolio_members" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"portfolio_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	CONSTRAINT "pjm_portfolio_members_portfolio_id_actor_id_pk" PRIMARY KEY("portfolio_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"portfolio_id" text,
	"type" text DEFAULT 'kanban' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_id" text,
	"client_id" text,
	"start_date" timestamp,
	"target_end_date" timestamp,
	"actual_end_date" timestamp,
	"default_board_id" text,
	"sequence" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pjm_project_guests" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"actor_id" text NOT NULL,
	CONSTRAINT "pjm_project_guests_project_id_actor_id_pk" PRIMARY KEY("project_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_project_members" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"hourly_rate" integer,
	CONSTRAINT "pjm_project_members_project_id_actor_id_pk" PRIMARY KEY("project_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_pull_request_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"source" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_rate_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"default_hourly_rate" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_retainers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"client_id" text,
	"name" text NOT NULL,
	"total_units" integer NOT NULL,
	"used_units" integer DEFAULT 0 NOT NULL,
	"unit_price" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_retainer_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retainer_id" text NOT NULL,
	"worklog_id" text,
	"units" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_sprints" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"capacity" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"completed_at" timestamp,
	"sequence" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_work_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"ref" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"acceptance_criteria" text,
	"parent_id" text,
	"epic_id" text,
	"sprint_id" text,
	"milestone_id" text,
	"board_column_id" text,
	"reporting_category" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"resolution" text,
	"reporter_id" text,
	"creator_id" text,
	"story_points" integer,
	"original_estimate" integer,
	"remaining_estimate" integer,
	"logged_time" integer DEFAULT 0 NOT NULL,
	"planned_start_date" timestamp,
	"start_date" timestamp,
	"due_date" timestamp,
	"actual_start_date" timestamp,
	"completed_at" timestamp,
	"recurrence_rule" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pjm_work_item_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"unassigned_at" timestamp,
	"assigned_by_id" text
);
--> statement-breakpoint
CREATE TABLE "pjm_work_item_dependencies" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	"type" text DEFAULT 'blocks' NOT NULL,
	CONSTRAINT "pjm_work_item_dependencies_work_item_id_depends_on_id_pk" PRIMARY KEY("work_item_id","depends_on_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_work_item_labels" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "pjm_work_item_labels_work_item_id_label_id_pk" PRIMARY KEY("work_item_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_work_item_watchers" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"actor_id" text NOT NULL,
	CONSTRAINT "pjm_work_item_watchers_work_item_id_actor_id_pk" PRIMARY KEY("work_item_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "pjm_worklogs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"time_spent" integer NOT NULL,
	"description" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"billable" jsonb DEFAULT 'true'::jsonb,
	"approved" jsonb DEFAULT 'false'::jsonb,
	"approved_by_id" text,
	"approved_at" timestamp,
	"exported_to_workplace" jsonb DEFAULT 'false'::jsonb
);
--> statement-breakpoint
CREATE INDEX "pjm_approvals_org_entity_idx" ON "pjm_approvals" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "pjm_billing_drafts_org_project_idx" ON "pjm_billing_drafts" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_billing_drafts_org_status_idx" ON "pjm_billing_drafts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "pjm_billing_lines_org_draft_idx" ON "pjm_billing_lines" USING btree ("organization_id","draft_id");--> statement-breakpoint
CREATE INDEX "pjm_billing_schedules_org_project_idx" ON "pjm_billing_schedules" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_boards_org_project_idx" ON "pjm_boards" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_board_cols_org_board_idx" ON "pjm_board_columns" USING btree ("organization_id","board_id");--> statement-breakpoint
CREATE INDEX "pjm_budgets_org_project_idx" ON "pjm_budgets" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_budget_periods_org_budget_idx" ON "pjm_budget_periods" USING btree ("organization_id","budget_id");--> statement-breakpoint
CREATE INDEX "pjm_checklist_org_wi_idx" ON "pjm_checklist_items" USING btree ("organization_id","work_item_id");--> statement-breakpoint
CREATE INDEX "pjm_comments_org_wi_idx" ON "pjm_comments" USING btree ("organization_id","work_item_id");--> statement-breakpoint
CREATE INDEX "pjm_labels_org_idx" ON "pjm_labels" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pjm_member_rates_org_card_idx" ON "pjm_member_rates" USING btree ("organization_id","rate_card_id");--> statement-breakpoint
CREATE INDEX "pjm_milestones_org_project_idx" ON "pjm_milestones" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_portfolios_org_idx" ON "pjm_portfolios" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pjm_portfolios_org_status_idx" ON "pjm_portfolios" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "pjm_portfolio_members_org_idx" ON "pjm_portfolio_members" USING btree ("organization_id","portfolio_id");--> statement-breakpoint
CREATE INDEX "pjm_projects_org_idx" ON "pjm_projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pjm_projects_org_key_idx" ON "pjm_projects" USING btree ("organization_id","key");--> statement-breakpoint
CREATE INDEX "pjm_projects_org_portfolio_idx" ON "pjm_projects" USING btree ("organization_id","portfolio_id");--> statement-breakpoint
CREATE INDEX "pjm_project_members_org_idx" ON "pjm_project_members" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_pr_links_org_wi_idx" ON "pjm_pull_request_links" USING btree ("organization_id","work_item_id");--> statement-breakpoint
CREATE INDEX "pjm_rate_cards_org_idx" ON "pjm_rate_cards" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pjm_retainers_org_project_idx" ON "pjm_retainers" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_retainer_usage_org_retainer_idx" ON "pjm_retainer_usage" USING btree ("organization_id","retainer_id");--> statement-breakpoint
CREATE INDEX "pjm_sprints_org_project_idx" ON "pjm_sprints" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_sprints_org_status_idx" ON "pjm_sprints" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_project_idx" ON "pjm_work_items" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_ref_idx" ON "pjm_work_items" USING btree ("organization_id","ref");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_type_idx" ON "pjm_work_items" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_sprint_idx" ON "pjm_work_items" USING btree ("organization_id","sprint_id");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_column_idx" ON "pjm_work_items" USING btree ("organization_id","board_column_id");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_epic_idx" ON "pjm_work_items" USING btree ("organization_id","epic_id");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_parent_idx" ON "pjm_work_items" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "pjm_work_items_org_assignee_idx" ON "pjm_work_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pjm_wi_assignments_org_wi_idx" ON "pjm_work_item_assignments" USING btree ("organization_id","work_item_id");--> statement-breakpoint
CREATE INDEX "pjm_wi_assignments_org_actor_idx" ON "pjm_work_item_assignments" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "pjm_wi_deps_org_wi_idx" ON "pjm_work_item_dependencies" USING btree ("organization_id","work_item_id");--> statement-breakpoint
CREATE INDEX "pjm_worklogs_org_wi_idx" ON "pjm_worklogs" USING btree ("organization_id","work_item_id");--> statement-breakpoint
CREATE INDEX "pjm_worklogs_org_actor_idx" ON "pjm_worklogs" USING btree ("organization_id","actor_id");