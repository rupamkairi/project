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
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@projectx/ui"
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Phone as PhoneIcon, Mail as MailIcon, Calendar, FileText, Activity } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/contacts/$contactId",
  component: ContactDetailPage,
})

const TYPE_ICONS: Record<string, any> = {
  call: PhoneIcon,
  email: MailIcon,
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

function scoreVariant(score: number): "secondary" | "outline" | "default" {
  if (score >= 60) return "default"
  if (score >= 30) return "outline"
  return "secondary"
}

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", title: "", department: "" }

function ContactDetailPage() {
  const { contactId } = Route.useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    const [contactRes, activitiesRes, dealsRes] = await Promise.all([
      crmApi.getContact(contactId),
      crmApi.getActivities({ contactId, limit: "20" }),
      crmApi.getDeals({ contactId }),
    ])
    if (contactRes.data) setContact(contactRes.data)
    if (activitiesRes.data) setActivities(activitiesRes.data.data ?? [])
    if (dealsRes.data) setDeals(dealsRes.data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [contactId])

  function openEdit() {
    if (!contact) return
    setFormData({
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      department: contact.department ?? "",
    })
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.updateContact(contactId, formData)
    if (!error) { setShowEdit(false); load() }
    setSubmitting(false)
  }

  const initials = contact
    ? [contact.firstName?.[0], contact.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
    : "?"
  const score = Number(contact?.meta?.leadScore ?? 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/contacts" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Contacts
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !contact ? (
        <p className="text-muted-foreground">Contact not found.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">{contact.firstName} {contact.lastName}</h1>
                {contact.title && <p className="text-sm text-muted-foreground">{contact.title}{contact.department ? ` · ${contact.department}` : ""}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={scoreVariant(score)}>Score {score}</Badge>
                  <Badge variant="outline">{contact.status ?? "active"}</Badge>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={openEdit}>Edit Contact</Button>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${contact.email}`} className="hover:text-foreground">{contact.email}</a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.accountId && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>Account linked</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Work Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {contact.title && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span>{contact.title}</span>
                      </div>
                    )}
                    {contact.department && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="h-4 w-4 shrink-0" />
                        <span>{contact.department}</span>
                      </div>
                    )}
                    {contact.lastContactedAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Last contacted {timeAgo(contact.lastContactedAt)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                            <div className="flex-1 min-w-0">
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

            <TabsContent value="deals" className="mt-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {deals.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-6">No deals</p>
                    : deals.map((d) => (
                        <div key={d.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{d.name ?? d.title}</p>
                            <p className="text-xs text-muted-foreground">{d.stageName ?? "Unknown stage"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{d.value ? `$${Number(d.value.amount ?? d.value).toLocaleString()}` : "—"}</p>
                            <Badge variant="outline" className="text-xs">{d.status ?? "open"}</Badge>
                          </div>
                        </div>
                      ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
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
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
