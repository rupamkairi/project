import { createRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { Route as crmLayoutRoute } from "./layout"
import { crmApi } from "../lib/api"
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@projectx/ui"
import { Users, TrendingUp, DollarSign, UserPlus, Phone, Mail, Calendar, FileText, ArrowRight } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/",
  component: CrmDashboard,
})

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: FileText,
  log: FileText,
}

function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

function formatCurrency(val: any): string {
  const n = Number(val) || 0
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(n)
}

export function CrmDashboard() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [analyticsRes, activitiesRes, pipelinesRes] = await Promise.all([
        crmApi.getAnalyticsOverview(),
        crmApi.getActivities({ limit: "8" }),
        crmApi.getPipelines(),
      ])

      if (analyticsRes.data) setAnalytics(analyticsRes.data)
      if (activitiesRes.data) setActivities(activitiesRes.data.data ?? [])

      if (pipelinesRes.data) {
        const pipelineList = pipelinesRes.data.data ?? []
        setPipelines(pipelineList)
        const defaultPipeline = pipelineList.find((p: any) => p.isDefault) ?? pipelineList[0]
        if (defaultPipeline) {
          const [stagesRes, dealsRes] = await Promise.all([
            crmApi.getPipelineStages(defaultPipeline.id),
            crmApi.getDeals({ pipelineId: defaultPipeline.id }),
          ])
          if (stagesRes.data) setStages(Array.isArray(stagesRes.data) ? stagesRes.data : [])
          if (dealsRes.data) setDeals(dealsRes.data.data ?? [])
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const KPI_CARDS = [
    { label: "Total Contacts", value: analytics?.totalContacts, icon: Users, href: "/crm/contacts" },
    { label: "Active Deals", value: analytics?.openDeals, icon: TrendingUp, href: "/crm/deals" },
    { label: "Pipeline Value", value: null, icon: DollarSign, href: "/crm/deals", formatted: true },
    { label: "Open Leads", value: analytics?.totalLeads, icon: UserPlus, href: "/crm/leads" },
  ]

  const dealsByStage = stages.reduce<Record<string, any[]>>((acc, s) => {
    acc[s.id] = deals.filter((d) => d.stageId === s.id)
    return acc
  }, {})

  const totalPipelineValue = deals.reduce((sum, d) => {
    const amount = Number(d.value?.amount ?? d.value ?? 0)
    return sum + amount
  }, 0)

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="CRM" description="Customer relationship management overview" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} to={card.href as any}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {card.formatted
                        ? formatCurrency(totalPipelineValue)
                        : (card.value ?? 0)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Activities</CardTitle>
            <Link to="/crm/activities" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              : activities.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-4">No activities yet</p>
              : activities.map((a) => {
                  const Icon = TYPE_ICONS[a.type] ?? FileText
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.subject ?? a.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.createdAt ? timeAgo(a.createdAt) : ""}
                        </p>
                      </div>
                    </div>
                  )
                })}
          </CardContent>
        </Card>

        {/* Pipeline Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Pipeline Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              : stages.length === 0
              ? <p className="text-sm text-muted-foreground">No pipeline configured</p>
              : stages.map((stage) => {
                  const stageDeals = dealsByStage[stage.id] ?? []
                  const stageValue = stageDeals.reduce((sum, d) => sum + Number(d.value?.amount ?? d.value ?? 0), 0)
                  const pct = totalPipelineValue > 0 ? (stageValue / totalPipelineValue) * 100 : 0
                  return (
                    <div key={stage.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">{stage.name}</span>
                        <span className="text-muted-foreground">
                          {stageDeals.length} · {formatCurrency(stageValue)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
