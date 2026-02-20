import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, DateDisplay } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { mockNotificationTemplates } from "@/lib/mock-data";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/notifications/$templateKey",
  component: TemplateEditor,
});

function TemplateEditor() {
  const { templateKey } = Route.useParams();
  const navigate = useNavigate();
  const template = mockNotificationTemplates.find((t) => t.key === templateKey);

  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");

  if (!template) {
    return <div>Template not found</div>;
  }

  const availableVariables: Record<string, string[]> = {
    "order.confirmation": ["order.id", "order.total", "customer.name", "items"],
    "order.shipped": [
      "order.id",
      "tracking.number",
      "carrier",
      "estimated.delivery",
    ],
    "order.delivered": ["order.id", "customer.name", "delivery.date"],
    "payment.success": ["order.id", "amount", "payment.method"],
    "payment.failed": ["order.id", "amount", "error.reason"],
    "account.welcome": ["customer.name", "store.name"],
    "password.reset": ["reset.link", "expiry.hours"],
  };

  const variables = availableVariables[templateKey] || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.name}
        description={
          <Badge variant="outline" className="ml-2">
            {template.channel}
          </Badge>
        }
        breadcrumbs={[
          { label: "Notifications", href: "/dashboard/notifications" },
          { label: template.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/notifications" })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.channel === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="body">Body Content</Label>
                <textarea
                  id="body"
                  className="mt-1 w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter template body with {{variables}}"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Click to insert at cursor position
              </p>
              <div className="space-y-2">
                {variables.map((v) => (
                  <button
                    key={v}
                    className="w-full text-left px-3 py-2 text-sm font-mono bg-muted rounded hover:bg-muted/80"
                    onClick={() => {
                      const textarea = document.getElementById(
                        "body",
                      ) as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text =
                          body.substring(0, start) +
                          `{{${v}}}` +
                          body.substring(end);
                        setBody(text);
                      }
                    }}
                  >
                    {"{{" + v + "}}"}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Channel</span>
                <Badge variant="outline">{template.channel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Last Updated
                </span>
                <DateDisplay date={template.updatedAt} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
