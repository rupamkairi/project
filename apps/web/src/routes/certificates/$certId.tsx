import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { mockCertificates } from "@/lib/mock-data";
import { CertificateStatusBadge } from "@/components/lms/status-badge";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  Copy,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/certificates/$certId",
  component: CertificateDetail,
});

function CertificateDetail() {
  const { certId } = Route.useParams();
  const certificate = mockCertificates.find((c) => c.id === certId);
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  if (!certificate) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Certificate not found</p>
        <Link to="/dashboard/certificates">
          <Button variant="link">Back to certificates</Button>
        </Link>
      </div>
    );
  }

  const verificationUrl = `${window.location.origin}/verify/${certificate.verificationCode}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Details"
        description={certificate.verificationCode}
      >
        <Link to="/dashboard/certificates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[1.414/1] border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/50">
                <Award className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold text-center mb-2">
                  {certificate.templateTitle}
                </h2>
                <p className="text-lg text-center mb-4">This certifies that</p>
                <p className="text-xl font-semibold text-center mb-2">
                  {certificate.learner.name}
                </p>
                <p className="text-center text-muted-foreground mb-4">
                  has completed the course
                </p>
                <p className="text-lg font-medium text-center">
                  {certificate.course.title}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Issued:{" "}
                  {format(new Date(certificate.issuedAt), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <CertificateStatusBadge
                  revoked={certificate.revoked}
                  expiresAt={certificate.expiresAt}
                />
              </div>
              {certificate.revoked && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <p className="font-medium">Revoked</p>
                  {certificate.revokedReason && (
                    <p className="mt-1">Reason: {certificate.revokedReason}</p>
                  )}
                  {certificate.revokedAt && (
                    <p className="mt-1 text-xs">
                      on{" "}
                      {format(new Date(certificate.revokedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Verification Code
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm">
                    {certificate.verificationCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        certificate.verificationCode,
                      )
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Learner
                </p>
                <p className="mt-1">{certificate.learner.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Course
                </p>
                <p className="mt-1">{certificate.course.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Issued
                </p>
                <p className="mt-1">
                  {format(new Date(certificate.issuedAt), "MMMM d, yyyy")}
                </p>
              </div>
              {certificate.expiresAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Expires
                  </p>
                  <p className="mt-1">
                    {format(new Date(certificate.expiresAt), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground break-all">
                {verificationUrl}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(verificationUrl)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {!certificate.revoked && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog
                  open={showRevokeDialog}
                  onOpenChange={setShowRevokeDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Revoke Certificate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Revoke Certificate</DialogTitle>
                      <DialogDescription>
                        This action is permanent and cannot be undone. The
                        certificate will be marked as revoked and verification
                        will show it as invalid.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for revocation</Label>
                      <Textarea
                        id="reason"
                        placeholder="Enter the reason for revoking this certificate..."
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowRevokeDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!revokeReason.trim()}
                        onClick={() => {
                          console.log(
                            "Revoking certificate:",
                            certId,
                            revokeReason,
                          );
                          setShowRevokeDialog(false);
                        }}
                      >
                        Revoke
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
