import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, StatusBadge, DateDisplay } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockWorkflowInstances, mockOrders } from "@/lib/mock-data";
import { ArrowLeft, Package, CheckCircle, Clock, Truck } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/workflow/$instanceId",
  component: WorkflowInstanceDetail,
});

const stageIcons: Record<string, React.ElementType> = {
  pick_pack: Package,
  quality_check: CheckCircle,
  dispatch: Truck,
  delivered: CheckCircle,
};

function WorkflowInstanceDetail() {
  const { instanceId } = Route.useParams();
  const navigate = useNavigate();
  const instance = mockWorkflowInstances.find((i) => i.id === instanceId);

  if (!instance) {
    return <div>Workflow instance not found</div>;
  }

  const order = mockOrders.find((o) => o.id === instance.orderId);
  const currentStageIndex = [
    "pick_pack",
    "quality_check",
    "dispatch",
    "delivered",
  ].indexOf(instance.currentStage);

  const workflowStatus =
    instance.currentStage === "delivered" ? "completed" : "processing";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Workflow ${instance.id}`}
        description={<StatusBadge status={workflowStatus} />}
        breadcrumbs={[
          { label: "Workflow", href: "/dashboard/workflow" },
          { label: instance.id },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/workflow" })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {order && (
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/dashboard/orders/$orderId",
                    params: { orderId: order.id },
                  })
                }
              >
                View Order
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {["pick_pack", "quality_check", "dispatch", "delivered"].map(
              (stage, index) => {
                const Icon = stageIcons[stage] || Package;
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;

                return (
                  <div key={stage} className="flex items-center">
                    <div
                      className={`flex flex-col items-center ${
                        isCompleted
                          ? "text-green-600"
                          : isCurrent
                            ? "text-blue-600"
                            : "text-gray-400"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-green-100"
                            : isCurrent
                              ? "bg-blue-100"
                              : "bg-gray-100"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs mt-2 capitalize">
                        {stage.replace("_", " ")}
                      </span>
                    </div>
                    {index < 3 && (
                      <div
                        className={`w-20 h-1 mx-2 ${
                          index < currentStageIndex
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Stage Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {instance.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {task.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                    <span
                      className={
                        task.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {task.title}
                    </span>
                  </div>
                  {!task.completed && (
                    <Button size="sm" variant="outline">
                      Complete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <Badge variant="outline">{instance.orderId}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned To</span>
              <span>{instance.assignee || "Unassigned"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stage Entered</span>
              <DateDisplay date={instance.stageEnteredAt} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
