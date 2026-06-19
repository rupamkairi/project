import { useState } from "react"
import { createRoute } from "@tanstack/react-router"
import { Route as dashboardLayoutRoute } from "./dashboard.layout"
import { NotificationTemplatesRoute } from "@projectx/plugin-notification-web/routes/templates"
import { templatesApi, sendApi } from "@projectx/plugin-notification-web/api"
import { SendEmailRoute } from "@projectx/plugin-notification-web/routes/send-email"
import { PageHeader, Tabs, TabsList, TabsTrigger, TabsContent } from "@projectx/ui"
import { Mail, Send } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/notifications",
  component: NotificationsPage,
})

function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "send">("templates")

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Notifications"
        description="Manage notification templates and send emails"
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "templates" | "send")}
      >
        <TabsList variant="line">
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4" strokeWidth={1.75} />
            Templates
          </TabsTrigger>
          <TabsTrigger value="send">
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Send Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <NotificationTemplatesRoute templatesApi={templatesApi} />
        </TabsContent>
        <TabsContent value="send" className="mt-4">
          <SendEmailRoute sendApi={sendApi} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
