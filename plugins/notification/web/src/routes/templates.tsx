import React, { useState } from "react";
import { Plus, Trash2, Edit2, Mail, Loader2 } from "lucide-react";
import { Button, Input, Textarea, Label, Badge } from "@projectx/ui";

interface Template {
  key: string;
  channel: string;
  subject?: string;
  body: string;
  locale: string;
  isSystem: boolean;
}

interface NotificationTemplatesRouteProps {
  templatesApi?: {
    list: () => Promise<{ data?: { templates?: Template[] } }>;
    create: (data: Partial<Template>) => Promise<unknown>;
    update: (key: string, data: Partial<Template>) => Promise<unknown>;
    delete: (key: string) => Promise<unknown>;
  };
}

export function NotificationTemplatesRoute({
  templatesApi,
}: NotificationTemplatesRouteProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({ key: "", subject: "", body: "" });

  const loadTemplates = async () => {
    if (!templatesApi) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await templatesApi.list();
      if (response.data?.templates) setTemplates(response.data.templates);
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templatesApi) return;
    try {
      if (editingTemplate) {
        await templatesApi.update(editingTemplate.key, {
          subject: formData.subject,
          body: formData.body,
        });
      } else {
        await templatesApi.create({
          key: formData.key,
          channel: "email",
          subject: formData.subject,
          body: formData.body,
        });
      }
      setShowForm(false);
      setEditingTemplate(null);
      setFormData({ key: "", subject: "", body: "" });
      loadTemplates();
    } catch (e) {
      console.error("Failed to save template:", e);
    }
  };

  const handleDelete = async (key: string) => {
    if (!templatesApi) return;
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await templatesApi.delete(key);
      loadTemplates();
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ key: template.key, subject: template.subject || "", body: template.body });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => {
            setShowForm(true);
            setEditingTemplate(null);
            setFormData({ key: "", subject: "", body: "" });
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Template
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-md p-4 space-y-4">
          <p className="text-sm font-medium">
            {editingTemplate ? "Edit Template" : "New Template"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editingTemplate && (
              <div className="space-y-1.5">
                <Label htmlFor="template-key">Template Key</Label>
                <Input
                  id="template-key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., user.invite"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="template-subject">Subject</Label>
              <Input
                id="template-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-body">Body</Label>
              <Textarea
                id="template-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="min-h-[120px]"
                placeholder="Use {{variable}} for dynamic content"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {editingTemplate ? "Update" : "Create"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => { setShowForm(false); setEditingTemplate(null); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            No templates yet. Create one to get started.
          </p>
        ) : (
          templates.map((template) => (
            <div key={template.key} className="border rounded-md p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{template.key}</span>
                      {template.isSystem && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                    {template.subject && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.subject}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(template)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  {!template.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded-md">
                {template.body.substring(0, 100)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
