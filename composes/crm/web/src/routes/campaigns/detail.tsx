import { createRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Route as crmLayoutRoute } from "../layout"
import { crmApi } from "../../lib/api"
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Avatar,
  AvatarFallback,
  Skeleton,
} from "@projectx/ui"
import { ArrowLeft, Send, Pause, X, Users, Mail, MousePointer, Eye } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/campaigns/$campaignId",
  component: CampaignDetailPage,
})

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "outline",
  cancelled: "destructive",
}

function CampaignDetailPage() {
  const { campaignId } = Route.useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [campaignRes] = await Promise.all([
      crmApi.getCampaign(campaignId),
    ])
    if (campaignRes.data) setCampaign(campaignRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [campaignId])

  async function handleSend() {
    await crmApi.sendCampaign(campaignId)
    load()
  }

  async function handlePause() {
    await crmApi.pauseCampaign(campaignId)
    load()
  }

  async function handleCancel() {
    await crmApi.cancelCampaign(campaignId)
    load()
  }

  const stats = campaign?.stats ?? {}

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/campaigns" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        </div>
      ) : !campaign ? (
        <p className="text-muted-foreground">Campaign not found.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{campaign.name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={STATUS_VARIANTS[campaign.status] ?? "outline"}>{campaign.status ?? "draft"}</Badge>
                <span className="text-sm text-muted-foreground">{campaign.type}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {campaign.status === "draft" && (
                <Button size="sm" onClick={handleSend}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                </Button>
              )}
              {campaign.status === "active" && (
                <Button size="sm" variant="outline" onClick={handlePause}>
                  <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
                </Button>
              )}
              {(campaign.status === "draft" || campaign.status === "paused") && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Recipients", value: stats.sent ?? 0, icon: Users },
              { label: "Opens", value: stats.opens ?? 0, icon: Eye },
              { label: "Clicks", value: stats.clicks ?? 0, icon: MousePointer },
              { label: "Unsubscribes", value: stats.unsubscribes ?? 0, icon: Mail },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {campaign.subject && <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span className="font-medium">{campaign.subject}</span></div>}
                    {campaign.startDate && <div className="flex justify-between"><span className="text-muted-foreground">Start</span><span>{new Date(campaign.startDate).toLocaleDateString()}</span></div>}
                    {campaign.endDate && <div className="flex justify-between"><span className="text-muted-foreground">End</span><span>{new Date(campaign.endDate).toLocaleDateString()}</span></div>}
                  </CardContent>
                </Card>
                {campaign.content && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Content Preview</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{campaign.content}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {contacts.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-6">No contacts in this campaign</p>
                    : contacts.map((c) => {
                        const initials = [c.firstName?.[0], c.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
                        return (
                          <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        )
                      })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
