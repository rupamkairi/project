import { createRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Route as crmLayoutRoute } from "../layout"
import { crmApi } from "../../lib/api"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Skeleton,
} from "@projectx/ui"
import { ArrowLeft, Users } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/segments/$segmentId",
  component: SegmentDetailPage,
})

function SegmentDetailPage() {
  const { segmentId } = Route.useParams()
  const navigate = useNavigate()
  const [segment, setSegment] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [segmentRes, contactsRes] = await Promise.all([
        crmApi.getSegment(segmentId),
        crmApi.getSegmentContacts(segmentId),
      ])
      if (segmentRes.data) setSegment(segmentRes.data)
      if (contactsRes.data) setContacts(contactsRes.data.data ?? [])
      setLoading(false)
    }
    load()
  }, [segmentId])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/segments" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Segments
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !segment ? (
        <p className="text-muted-foreground">Segment not found.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{segment.name}</h1>
              {segment.description && <p className="text-sm text-muted-foreground">{segment.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Contacts</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{contacts.length}</p></CardContent>
            </Card>
            {segment.lastComputedAt && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Last Computed</CardTitle></CardHeader>
                <CardContent><p className="text-sm font-medium">{new Date(segment.lastComputedAt).toLocaleString()}</p></CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Contacts in Segment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {contacts.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">No contacts match this segment</p>
                : contacts.map((c) => {
                    const initials = [c.firstName?.[0], c.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer hover:opacity-80"
                        onClick={() => navigate({ to: "/crm/contacts/$contactId", params: { contactId: c.id } })}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                          {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">{c.status ?? "active"}</Badge>
                      </div>
                    )
                  })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
