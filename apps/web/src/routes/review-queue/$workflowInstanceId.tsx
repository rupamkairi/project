import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { mockWorkflowInstances } from "@/lib/mock-data";
import {
  WorkflowStageBadge,
  TaskStatusBadge,
  RoleBadge,
} from "@/components/lms/status-badge";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/review-queue/$workflowInstanceId",
  component: ReviewDetail,
});

function ReviewDetail() {
  const { workflowInstanceId } = Route.useParams();
  const workflow = mockWorkflowInstances.find(
    (w) => w.id === workflowInstanceId,
  );
  const [rejectReason, setRejectReason] = useState("");

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Workflow not found</p>
        <Link to="/dashboard/review-queue">
          <Button variant="link">Back to review queue</Button>
        </Link>
      </div>
    );
  }

  const allTasksComplete = workflow.tasks.every(
    (t) => t.status === "completed",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={workflow.course.title}
        description={`Review workflow - ${workflow.course.instructor.name}`}
      >
        <Link to="/dashboard/review-queue">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Review Checklist</span>
                <WorkflowStageBadge stage={workflow.stage} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflow.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{task.label}</p>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        Required role:
                      </span>
                      <RoleBadge role={task.requiredRole} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reject Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || !allTasksComplete}
              >
                Reject Course
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Submitted
                </p>
                <p className="mt-1">
                  {format(
                    new Date(workflow.submittedAt),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Current Stage
                </p>
                <div className="mt-1">
                  <WorkflowStageBadge stage={workflow.stage} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Progress
                </p>
                <p className="mt-1">
                  {
                    workflow.tasks.filter((t) => t.status === "completed")
                      .length
                  }{" "}
                  of {workflow.tasks.length} tasks complete
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" disabled={!allTasksComplete}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve & Publish
              </Button>
              {!allTasksComplete && (
                <p className="text-sm text-muted-foreground text-center">
                  Complete all review tasks to enable approval
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
