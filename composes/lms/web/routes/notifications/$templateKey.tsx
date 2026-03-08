import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { NOTIFICATION_TEMPLATES } from "../../types";
import { ChannelBadge } from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/notifications/$templateKey",
  component: TemplateEditor,
});

function TemplateEditor() {
  const { templateKey } = Route.useParams();
  const template = NOTIFICATION_TEMPLATES.find((t) => t.key === templateKey);

  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Template not found</p>
        <Link to="/lms/notifications">
          <Button variant="link">Back to templates</Button>
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    console.log("Saving template:", { key: templateKey, subject, body });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.key}
        description={template.triggerDescription}
      >
        <div className="flex items-center gap-2">
          <Link to="/lms/notifications">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.channel === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Template body..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted">
                {template.channel === "email" && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Subject:
                    </p>
                    <p className="mb-4">
                      {subject.replace(
                        /\{\{(\w+)\}\}/g,
                        (_, key) => `[${key}]`,
                      )}
                    </p>
                    <Separator className="my-4" />
                  </>
                )}
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Body:
                </p>
                <pre className="whitespace-pre-wrap text-sm">
                  {body.replace(/\{\{(\w+)\}\}/g, (_, key) => `[${key}]`)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Channel
                </p>
                <div className="mt-1">
                  <ChannelBadge channel={template.channel} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Trigger
                </p>
                <p className="mt-1 text-sm">{template.triggerDescription}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {template.variables.map((variable) => (
                  <div
                    key={variable}
                    className="flex items-center justify-between p-2 rounded bg-muted"
                  >
                    <code className="text-sm">{"{{" + variable + "}}"}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6"
                      onClick={() =>
                        navigator.clipboard.writeText(`{{${variable}}}`)
                      }
                    >
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
