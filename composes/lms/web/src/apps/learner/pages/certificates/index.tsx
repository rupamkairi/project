import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { formatDate } from "../../../../components/shared/PriceDisplay"
import { AArrowDown, ExternalLink, Linkedin } from "lucide-react"
import { Button } from "@projectx/ui"

export function CertificatesPage() {
  const { data } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: () => lmsApi.get<any>("/enrollments?completed=true"),
  })

  const enrollments = data?.enrollments?.filter((e: any) => e.certificateUrl) ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Certificates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and share your certificates
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Complete a course to earn a certificate
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Course</th>
                <th className="text-left p-3 font-medium">Completed</th>
                <th className="text-left p-3 font-medium">Certificate</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e: any) => {
                const verifyUrl = e.certificateUrl
                const linkedInUrl = verifyUrl
                  ? `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(e.courseTitle)}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(verifyUrl.split("/").pop() ?? "")}`
                  : null

                return (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.courseTitle}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(e.completedAt)}
                    </td>
                    <td className="p-3">
                      {e.certificateUrl ? (
                        <a
                          href={e.certificateUrl}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {linkedInUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="h-3.5 w-3.5 mr-1" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
