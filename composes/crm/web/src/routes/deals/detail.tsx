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
  Skeleton,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  ConfirmDialog,
} from "@projectx/ui"
import { ArrowLeft, Phone, Mail, Calendar, FileText, Trophy, X } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/deals/$dealId",
  component: DealDetailPage,
})

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "secondary",
  won: "default",
  lost: "destructive",
}

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: FileText,
  log: FileText,
}

function timeAgo(date: string): string {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

function formatCurrency(val: any): string {
  const n = Number(val) || 0
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

const EMPTY_FORM = { name: "", value: "", currency: "USD", closeDate: "" }

function DealDetailPage() {
  const { dealId } = Route.useParams()
  const navigate = useNavigate()
  const [deal, setDeal] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [winOpen, setWinOpen] = useState(false)
  const [loseOpen, setLoseOpen] = useState(false)
  const [lostReason, setLostReason] = useState("")

  async function load() {
    setLoading(true)
    const [dealRes, activitiesRes] = await Promise.all([
      crmApi.getDeal(dealId),
      crmApi.getActivities({ dealId, limit: "20" }),
    ])
    if (dealRes.data) {
      setDeal(dealRes.data)
      if (dealRes.data.pipelineId) {
        const stagesRes = await crmApi.getPipelineStages(dealRes.data.pipelineId)
        if (stagesRes.data) setStages(Array.isArray(stagesRes.data) ? stagesRes.data : [])
      }
    }
    if (activitiesRes.data) setActivities(activitiesRes.data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [dealId])

  function openEdit() {
    if (!deal) return
    setFormData({
      name: deal.name ?? deal.title ?? "",
      value: deal.value ? String(deal.value.amount ?? deal.value) : "",
      currency: deal.value?.currency ?? "USD",
      closeDate: deal.closeDate ? deal.closeDate.slice(0, 10) : "",
    })
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = { ...formData, value: formData.value ? { amount: Number(formData.value), currency: formData.currency } : undefined }
    const { error } = await crmApi.updateDeal(dealId, payload)
    if (!error) { setShowEdit(false); load() }
    setSubmitting(false)
  }

  async function handleWin() {
    await crmApi.winDeal(dealId)
    setWinOpen(false)
    load()
  }

  async function handleLose() {
    await crmApi.loseDeal(dealId, lostReason)
    setLoseOpen(false)
    setLostReason("")
    load()
  }

  const currentStageIdx = deal ? stages.findIndex((s) => s.id === deal.stageId) : -1
  const value = Number(deal?.value?.amount ?? deal?.value ?? 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/deals" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Deals
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !deal ? (
        <p className="text-muted-foreground">Deal not found.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{deal.name ?? deal.title}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                {value > 0 && <span className="text-lg font-bold">{formatCurrency(value)}</span>}
                <Badge variant={STATUS_VARIANTS[deal.status] ?? "outline"}>{deal.status ?? "open"}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {deal.status === "open" && (
                <>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => setWinOpen(true)}>
                    <Trophy className="h-3.5 w-3.5 mr-1" /> Won
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => setLoseOpen(true)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Lost
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
            </div>
          </div>

          {stages.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-0.5">
                {stages.map((s, i) => (
                  <div key={s.id}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStageIdx ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentStageIdx >= 0 ? stages[currentStageIdx]?.name : "No stage"} · Stage {currentStageIdx + 1} of {stages.length}
              </p>
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Deal Info</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-medium">{value > 0 ? formatCurrency(value) : "—"}</span>
                    </div>
                    {deal.currency && <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{deal.value?.currency ?? deal.currency}</span></div>}
                    {deal.closeDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Close Date</span>
                        <span>{new Date(deal.closeDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {deal.lostReason && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">Lost reason</p>
                        <p className="mt-0.5">{deal.lostReason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {stages.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Pipeline Stages</CardTitle></CardHeader>
                    <CardContent className="space-y-1.5">
                      {stages.map((s, i) => (
                        <div key={s.id} className={`text-sm flex items-center gap-2 ${i === currentStageIdx ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          <div className={`h-2 w-2 rounded-full ${i < currentStageIdx ? "bg-primary" : i === currentStageIdx ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          {s.name}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {activities.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-6">No activities</p>
                    : activities.map((a) => {
                        const Icon = TYPE_ICONS[a.type] ?? FileText
                        return (
                          <div key={a.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{a.subject ?? a.type}</p>
                              {a.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.notes}</p>}
                              <p className="text-xs text-muted-foreground mt-1">{a.createdAt ? timeAgo(a.createdAt) : ""}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">{a.type}</Badge>
                          </div>
                        )
                      })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Deal</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Deal Name *</Label>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Close Date</Label>
              <Input type="date" value={formData.closeDate} onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={winOpen} onOpenChange={setWinOpen}
        title="Mark as Won" description="Mark this deal as won. This updates the deal status."
        confirmLabel="Mark Won" onConfirm={handleWin}
      />

      <Dialog open={loseOpen} onOpenChange={setLoseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Mark as Lost</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Lost Reason</Label>
              <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why was this deal lost?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLoseOpen(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleLose}>Mark Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
