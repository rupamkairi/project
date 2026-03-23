// Templates Route - Template management UI

import { useState } from "react";
import { Plus, Trash2, Edit2, Mail } from "lucide-react";

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

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (
  props,
) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-md font-medium ${props.className || ""}`}
  />
);

export function NotificationTemplatesRoute({
  templatesApi,
}: NotificationTemplatesRouteProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    subject: "",
    body: "",
  });

  const loadTemplates = async () => {
    if (!templatesApi) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await templatesApi.list();
      if (response.data?.templates) {
        setTemplates(response.data.templates);
      }
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
    setFormData({
      key: template.key,
      subject: template.subject || "",
      body: template.body,
    });
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notification Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage email templates for notifications
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingTemplate(null);
            setFormData({ key: "", subject: "", body: "" });
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            {editingTemplate ? "Edit Template" : "Create Template"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingTemplate && (
              <div>
                <label htmlFor="template-key" className="text-sm font-medium">
                  Template Key
                </label>
                <input
                  id="template-key"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder="e.g., user.invite"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="template-subject" className="text-sm font-medium">
                Subject
              </label>
              <input
                id="template-subject"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Email subject"
              />
            </div>
            <div>
              <label htmlFor="template-body" className="text-sm font-medium">
                Body
              </label>
              <textarea
                id="template-body"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                placeholder="Use {{variable}} for dynamic content"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingTemplate ? "Update" : "Create"}
              </Button>
              <Button
                className="border border-input bg-background"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTemplate(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No templates found. Create one to get started.
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.key} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.key}</span>
                      {template.isSystem && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                          System
                        </span>
                      )}
                    </div>
                    {template.subject && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.subject}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="hover:bg-accent"
                    onClick={() => openEdit(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {!template.isSystem && (
                    <Button
                      className="hover:bg-accent"
                      onClick={() => handleDelete(template.key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                {template.body.substring(0, 100)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
