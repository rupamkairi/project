import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";

import { Card, CardContent } from "@/components/ui/card";
import {
  mockWorkflowInstances,
  type MockWorkflowInstance,
} from "@/lib/mock-data";
import { Package, User } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/workflow/",
  component: WorkflowBoard,
});

const stageColumns = [
  {
    id: "pick_pack",
    label: "Pick & Pack",
    color: "bg-blue-100 border-blue-300",
  },
  {
    id: "quality_check",
    label: "Quality Check",
    color: "bg-yellow-100 border-yellow-300",
  },
  {
    id: "dispatch",
    label: "Dispatch",
    color: "bg-purple-100 border-purple-300",
  },
  {
    id: "delivered",
    label: "Delivered",
    color: "bg-green-100 border-green-300",
  },
];

function WorkflowBoard() {
  const [instances] = useState(mockWorkflowInstances);

  const getInstancesByStage = (stage: string) =>
    instances.filter((i) => i.currentStage === stage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fulfillment Board"
        description="Track order fulfillment workflow"
      />

      <div className="grid grid-cols-4 gap-4 overflow-x-auto">
        {stageColumns.map((stage) => (
          <div key={stage.id} className="space-y-4">
            <div className={`p-3 rounded-lg ${stage.color}`}>
              <h3 className="font-semibold">{stage.label}</h3>
              <p className="text-sm text-muted-foreground">
                {getInstancesByStage(stage.id).length} orders
              </p>
            </div>

            <div className="space-y-3">
              {getInstancesByStage(stage.id).map((instance) => (
                <WorkflowCard key={instance.id} instance={instance} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowCard({ instance }: { instance: MockWorkflowInstance }) {
  const completedTasks = instance.tasks.filter((t) => t.completed).length;
  const totalTasks = instance.tasks.length;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{instance.orderId}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {instance.itemCount} items
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{instance.customerName}</span>
          </div>

          {instance.assignee && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{instance.assignee}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tasks</span>
            <span className="font-medium">
              {completedTasks}/{totalTasks}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
