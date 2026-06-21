# Phase 17 — Web: Public Certificate Verification

---

## 17.1 Verify Page

Route: `/lms/verify/:code` (served from web shell, no auth required)

```tsx
export function VerifyCertificatePage() {
  const { code } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["verify-cert", code],
    queryFn: () => fetch(`/lms/verify/${code}`).then(r => r.json()),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border shadow-sm p-8 space-y-6">
        {data?.valid ? (
          <>
            {/* Valid certificate */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600 w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold text-green-700">Certificate Valid</h1>
            </div>

            <div className="space-y-3 border-t pt-4">
              <InfoRow label="Learner" value={data.certificate.learnerName} />
              <InfoRow label="Course" value={data.certificate.courseTitle} />
              <InfoRow label="Issued" value={formatDate(data.certificate.issuedAt)} />
              {data.certificate.expiresAt && (
                <InfoRow label="Expires" value={formatDate(data.certificate.expiresAt)} />
              )}
              <InfoRow label="Verification Code" value={<code className="text-xs">{data.certificate.verificationCode}</code>} />
            </div>
          </>
        ) : (
          <>
            {/* Invalid/revoked/expired */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600 w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold text-red-700">Certificate Invalid</h1>
              <p className="text-sm text-muted-foreground text-center">{data?.error}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

This page is linked from certificates as `https://app.example.com/lms/verify/LMS-3B7KFMXQ`.
It has no nav, no sidebar — standalone display page.

---

## 17.2 PDF Certificate Design Notes

Rendered by `@react-pdf/renderer`. Template vars from `lmsCourses.certificateTemplate`.

```tsx
const CertificatePDF = ({ cert, learnerName, courseName, issuedAt, verificationCode, template }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Border decoration */}
      <View style={styles.border} />

      {/* Logo */}
      {template.logoDocId && <Image src={getDocUrl(template.logoDocId)} style={styles.logo} />}

      {/* Title */}
      <Text style={styles.title}>{template.title ?? "Certificate of Completion"}</Text>

      {/* Body */}
      <Text style={styles.body}>
        {interpolate(template.body ?? "This certifies that {{learnerName}} has successfully completed {{courseName}}", {
          learnerName,
          courseName,
          issuedAt: formatDate(issuedAt),
        })}
      </Text>

      {/* Verification code at bottom */}
      <Text style={styles.verificationCode}>Verify at: app.example.com/lms/verify/{verificationCode}</Text>
      <Text style={styles.code}>{verificationCode}</Text>
    </Page>
  </Document>
);
```

Generated server-side or client-side. Store as document in media module, serve signed URL.

---

## 17.3 LinkedIn Share Button

```tsx
function LinkedInShareButton({ verifyUrl, courseName }) {
  const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(courseName)}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(verifyUrl.split("/").pop())}`;

  return (
    <Button asChild variant="outline" size="sm">
      <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
        Add to LinkedIn
      </a>
    </Button>
  );
}
```
