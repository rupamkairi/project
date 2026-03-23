import { useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { NotificationTemplatesRoute } from "@projectx/plugin-notification-web/routes/templates";
import { templatesApi, sendApi } from "@projectx/plugin-notification-web/api";
import { SendEmailRoute } from "@projectx/plugin-notification-web/routes/send-email";
import { Mail, Send } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/notifications",
  component: NotificationsPage,
});

function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "send">("templates");

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Manage notification templates and send emails
        </p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab("send")}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "send"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="w-4 h-4" />
          Send Email
        </button>
      </div>
      
      {/* Content */}
      <div className="mt-6">
        {activeTab === "templates" ? (
          <NotificationTemplatesRoute templatesApi={templatesApi} />
        ) : (
          <SendEmailRoute sendApi={sendApi} />
        )}
      </div>
    </div>
  );
}
