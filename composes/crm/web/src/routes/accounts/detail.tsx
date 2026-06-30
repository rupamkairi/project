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
import { ArrowLeft, Globe, Phone, Mail, Building2, Users } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/accounts/$accountId",
  component: AccountDetailPage,
})

const EMPTY_FORM = { name: "", domain: "", industry: "", employees: "", website: "", phone: "", email: "" }

function AccountDetailPage() {
  const { accountId } = Route.useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    const [accountRes, contactsRes, dealsRes] = await Promise.all([
      crmApi.getAccount(accountId),
      crmApi.getContacts({ accountId, limit: "50" }),
      crmApi.getDeals({ accountId }),
    ])
    if (accountRes.data) setAccount(accountRes.data)
    if (contactsRes.data) setContacts(contactsRes.data.data ?? [])
    if (dealsRes.data) setDeals(dealsRes.data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  function openEdit() {
    if (!account) return
    setFormData({
      name: account.name ?? "",
      domain: account.domain ?? "",
      industry: account.industry ?? "",
      employees: account.employees ? String(account.employees) : "",
      website: account.website ?? "",
      phone: account.phone ?? "",
      email: account.email ?? "",
    })
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = { ...formData, employees: formData.employees ? Number(formData.employees) : undefined }
    const { error } = await crmApi.updateAccount(accountId, payload)
    if (!error) { setShowEdit(false); load() }
    setSubmitting(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/accounts" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Accounts
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !account ? (
        <p className="text-muted-foreground">Account not found.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{account.name}</h1>
                {account.industry && <p className="text-sm text-muted-foreground">{account.industry}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline">{account.status ?? "active"}</Badge>
                  {account.employees && <span className="text-xs text-muted-foreground">{account.employees.toLocaleString()} employees</span>}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={openEdit}>Edit Account</Button>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Account Info</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {account.domain && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span>{account.domain}</span>
                    </div>
                  )}
                  {account.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <a href={account.website} target="_blank" rel="noreferrer" className="hover:text-foreground">{account.website}</a>
                    </div>
                  )}
                  {account.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{account.phone}</span>
                    </div>
                  )}
                  {account.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <a href={`mailto:${account.email}`} className="hover:text-foreground">{account.email}</a>
                    </div>
                  )}
                  {account.employees && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{account.employees.toLocaleString()} employees</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {contacts.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-6">No contacts</p>
                    : contacts.map((c) => {
                        const initials = [c.firstName?.[0], c.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
                        return (
                          <div key={c.id} className="flex items-center gap-3 pb-3 border-b last:border-0 cursor-pointer hover:opacity-80"
                            onClick={() => navigate({ to: "/crm/contacts/$contactId", params: { contactId: c.id } })}>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                              {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground">{c.email}</span>
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
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Domain</Label>
                <Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employees</Label>
                <Input type="number" value={formData.employees} onChange={(e) => setFormData({ ...formData, employees: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
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
