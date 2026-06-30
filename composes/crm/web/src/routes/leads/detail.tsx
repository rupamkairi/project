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
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  ConfirmDialog,
} from "@projectx/ui"
import { ArrowLeft, Mail, Phone, Building2, User } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/leads/$leadId",
  component: LeadDetailPage,
})

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "secondary",
  contacted: "outline",
  qualified: "default",
  disqualified: "destructive",
  converted: "default",
}

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", company: "", title: "", source: "" }

function LeadDetailPage() {
  const { leadId } = Route.useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [disqualifyOpen, setDisqualifyOpen] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState("")

  async function load() {
    setLoading(true)
    const { data } = await crmApi.getLead(leadId)
    if (data) setLead(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [leadId])

  function openEdit() {
    if (!lead) return
    setFormData({
      firstName: lead.firstName ?? "",
      lastName: lead.lastName ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      title: lead.title ?? "",
      source: lead.source ?? "",
    })
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.updateLead(leadId, formData)
    if (!error) { setShowEdit(false); load() }
    setSubmitting(false)
  }

  async function handleConvert() {
    await crmApi.convertLead(leadId)
    setConvertOpen(false)
    load()
  }

  async function handleDisqualify() {
    await crmApi.disqualifyLead(leadId, disqualifyReason)
    setDisqualifyOpen(false)
    setDisqualifyReason("")
    load()
  }

  async function handleQualify() {
    await crmApi.qualifyLead(leadId)
    load()
  }

  const isActionable = lead && lead.status !== "converted" && lead.status !== "disqualified"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/leads" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Leads
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !lead ? (
        <p className="text-muted-foreground">Lead not found.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{lead.firstName} {lead.lastName}</h1>
                {lead.company && <p className="text-sm text-muted-foreground">{lead.title ? `${lead.title} at ` : ""}{lead.company}</p>}
                <div className="mt-1.5">
                  <Badge variant={STATUS_VARIANTS[lead.status] ?? "outline"}>{lead.status ?? "new"}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isActionable && lead.status !== "qualified" && (
                <Button size="sm" variant="outline" onClick={handleQualify}>Qualify</Button>
              )}
              {isActionable && (
                <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setDisqualifyOpen(true)}>Disqualify</Button>
              )}
              {isActionable && (
                <Button size="sm" onClick={() => setConvertOpen(true)}>Convert Lead</Button>
              )}
              <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {lead.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${lead.email}`} className="hover:text-foreground">{lead.email}</a>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.company && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{lead.company}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Lead Info</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {lead.source && <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{lead.source}</span></div>}
                    {lead.score != null && <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span>{lead.score}</span></div>}
                    {lead.disqualifyReason && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">Disqualify reason</p>
                        <p className="text-sm mt-0.5">{lead.disqualifyReason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {lead.notes
                    ? <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                    : <p className="text-sm text-muted-foreground text-center py-6">No notes</p>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={convertOpen} onOpenChange={setConvertOpen}
        title="Convert Lead" description="Convert this lead into a contact and deal. This cannot be undone."
        confirmLabel="Convert" onConfirm={handleConvert}
      />

      <Dialog open={disqualifyOpen} onOpenChange={setDisqualifyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Disqualify Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={disqualifyReason} onChange={(e) => setDisqualifyReason(e.target.value)} placeholder="Why is this lead being disqualified?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisqualifyOpen(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleDisqualify}>Disqualify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
