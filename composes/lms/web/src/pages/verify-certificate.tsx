import { useParams, createRoute } from "@tanstack/react-router"
import { sharedRootRoute } from "@projectx/shared-router"
import { useQuery } from "@tanstack/react-query"
import { Button, Spinner } from "@projectx/ui"
import { CheckCircle, XCircle, Linkedin } from "lucide-react"
import { formatDate } from "../components/shared/PriceDisplay"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:10050"

function LinkedInShareButton({ verifyUrl, courseName }: { verifyUrl: string; courseName: string }) {
  const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(courseName)}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(verifyUrl.split("/").pop() ?? "")}`

  return (
    <Button asChild variant="outline" size="sm">
      <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
        <Linkedin className="h-4 w-4 mr-1.5" />
        Add to LinkedIn
      </a>
    </Button>
  )
}

function VerifyCertificateContent() {
  const { code } = useParams({ from: "/lms/verify/$code" })

  const { data, isLoading } = useQuery({
    queryKey: ["verify-cert", code],
    queryFn: () => fetch(`${API_BASE}/lms/verify/${code}`).then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const cert = data?.certificate
  const verifyUrl = `${window.location.origin}/lms/verify/${code}`

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border shadow-sm p-8 space-y-6">
        {data?.valid ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600 w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold text-green-700">
                Certificate Valid
              </h1>
            </div>

            <div className="space-y-3 border-t pt-4">
              <InfoRow label="Learner" value={cert.learnerName} />
              <InfoRow label="Course" value={cert.courseTitle} />
              <InfoRow label="Issued" value={formatDate(cert.issuedAt)} />
              {cert.expiresAt && (
                <InfoRow label="Expires" value={formatDate(cert.expiresAt)} />
              )}
              <InfoRow
                label="Verification Code"
                value={
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {cert.verificationCode}
                  </code>
                }
              />
            </div>

            <div className="flex justify-center pt-2">
              <LinkedInShareButton
                verifyUrl={verifyUrl}
                courseName={cert.courseTitle}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600 w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold text-red-700">
                Certificate Invalid
              </h1>
              <p className="text-sm text-muted-foreground text-center">
                {data?.error ?? "This certificate could not be verified."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export const verifyCertificateRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/lms/verify/$code",
  component: VerifyCertificateContent,
})
