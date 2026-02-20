import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, DateDisplay } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  mockNotificationTemplates,
  type MockNotificationTemplate,
} from "@/lib/mock-data";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/notifications/",
  component: NotificationsList,
});

const channelIcons: Record<string, React.ElementType> = {
  email: Mail,
  sms: MessageSquare,
  in_app: Bell,
  push: Smartphone,
};

function NotificationsList() {
  const navigate = useNavigate();

  const columns: ColumnDef<MockNotificationTemplate>[] = [
    {
      accessorKey: "key",
      header: "Template Key",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
            {(() => {
              const Icon = channelIcons[row.original.channel];
              return <Icon className="h-4 w-4 text-gray-600" />;
            })()}
          </div>
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
            {row.original.key}
          </code>
        </div>
      ),
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.channel.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.subject || "-"}
        </span>
      ),
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: ({ row }) => <DateDisplay date={row.original.lastUpdated} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate({
              to: "/dashboard/notifications/$templateKey",
              params: { templateKey: row.original.key },
            })
          }
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        description="Manage notification templates for all channels"
        actions={<Button>Create Template</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    mockNotificationTemplates.filter(
                      (t) => t.channel === "email",
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Email Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    mockNotificationTemplates.filter(
                      (t) => t.channel === "in_app",
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  In-App Templates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    mockNotificationTemplates.filter((t) => t.channel === "sms")
                      .length
                  }
                </p>
                <p className="text-sm text-muted-foreground">SMS Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    mockNotificationTemplates.filter(
                      (t) => t.channel === "push",
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Push Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={mockNotificationTemplates}
        searchPlaceholder="Search templates..."
      />
    </div>
  );
}
