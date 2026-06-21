# Phase 8 — Certificates

---

## 8.1 Certificate Routes

```
POST   /lms/certificates/issue/:enrollmentId  internal (triggered on completion)
GET    /lms/certificates/:id                  learner (own) | enrollment:manage
GET    /lms/verify/:code                      public (no auth)
POST   /lms/admin/certificates/:id/revoke     enrollment:manage
GET    /lms/learner/certificates              learner (own)
```

---

## 8.2 Certificate Issuance

Triggered from enrollment completion flow (see Phase 5 — `completeEnrollment`):

```typescript
async function issueCertificate(enrollmentId: string, learnerId: string, courseId: string): Promise<void> {
  const course = await db.query.lmsCourses.findFirst({ where: eq(lmsCourses.id, courseId) });

  // No certificate template = no cert issued
  if (!course.certificateTemplate) return;

  // Guard: don't double-issue
  const existing = await db.query.lmsCertificates.findFirst({
    where: and(
      eq(lmsCertificates.enrollmentId, enrollmentId),
      eq(lmsCertificates.revoked, false)
    ),
  });
  if (existing) return;

  // Generate unique verification code
  const verificationCode = `LMS-${ulid().slice(-8).toUpperCase()}`;

  // Expiry (if configured on template)
  const expiresAt = course.certificateTemplate.expiresAfterDays
    ? new Date(Date.now() + course.certificateTemplate.expiresAfterDays * 86400000)
    : null;

  const cert = await db.insert(lmsCertificates).values({
    enrollmentId,
    learnerId,
    courseId,
    verificationCode,
    expiresAt,
  }).returning();

  // Trigger PDF generation
  const documentId = await mediator.dispatch({
    type: "document.generatePdf",
    template: "certificate",
    data: {
      certId: cert[0].id,
      verificationCode,
      learnerName: await getLearnerName(learnerId),
      courseName: course.title,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString(),
      templateConfig: course.certificateTemplate,
    },
  });

  await db.update(lmsCertificates).set({ documentId }).where(eq(lmsCertificates.id, cert[0].id));
  await db.update(lmsEnrollments).set({ certificateId: cert[0].id }).where(eq(lmsEnrollments.id, enrollmentId));

  // Notify learner
  bus.emit("lms.certificate.issued", { certId: cert[0].id, learnerId, courseId, verificationCode });
}
```

**Verification code format:** `LMS-{8 chars from ULID uppercased}` — e.g. `LMS-3B7KFMXQ`.

The `.unique()` constraint on `verificationCode` DB column guarantees global uniqueness.

---

## 8.3 Public Verification Endpoint

`GET /lms/verify/:code`

No authentication required. Used by employers, LinkedIn, etc.

```typescript
const cert = await db.query.lmsCertificates.findFirst({
  where: eq(lmsCertificates.verificationCode, code.toUpperCase()),
  with: {
    enrollment: { with: { course: true } },
  },
});

if (!cert) return { valid: false, error: "Certificate not found" };
if (cert.revoked) return { valid: false, error: "Certificate has been revoked" };
if (cert.expiresAt && cert.expiresAt < new Date()) {
  return { valid: false, error: "Certificate has expired" };
}

return {
  valid: true,
  certificate: {
    verificationCode: cert.verificationCode,
    learnerName: await getLearnerName(cert.learnerId),
    courseTitle: cert.enrollment.course.title,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
  },
};
```

Response is designed to be embeddable in LinkedIn certification section (issuer URL: `https://app.example.com/lms/verify/:code`).

---

## 8.4 Revoke Certificate

`POST /lms/admin/certificates/:id/revoke`

Body: `{ reason: string }` — required.

Guards:
1. Role = `lms-admin`
2. Certificate not already revoked

```typescript
await db.update(lmsCertificates).set({
  revoked: true,
  revokedReason: reason,
  revokedAt: new Date(),
}).where(eq(lmsCertificates.id, certId));

// Notify learner of revocation
bus.emit("lms.certificate.revoked", { certId, learnerId: cert.learnerId, reason });
```

Revocation does NOT change enrollment status — learner remains `completed`.

---

## 8.5 Certificate PDF Template

Template defined in `lmsCourses.certificateTemplate`:
```typescript
{
  title: string;          // "Certificate of Completion"
  body: string;           // "This certifies that {{learnerName}} has successfully completed {{courseName}}"
  expiresAfterDays?: number;
  logoDocId?: string;     // org logo
}
```

PDF rendered by media module using `@react-pdf/renderer`. Template variables: `{{learnerName}}`, `{{courseName}}`, `{{issuedAt}}`, `{{expiresAt}}`, `{{verificationCode}}`.

PDF stored as document in media module. `lmsCertificates.documentId` references it.

---

## 8.6 Learner Certificate List

`GET /lms/learner/certificates`

Returns all non-revoked certificates for the authenticated learner:
```typescript
{
  certificates: {
    id: string;
    courseTitle: string;
    verificationCode: string;
    issuedAt: string;
    expiresAt?: string;
    isExpired: boolean;
    documentUrl?: string;    // signed URL to PDF
    verifyUrl: string;       // public verify URL
  }[];
}
```

---

## 8.7 Batch Re-Issue

`POST /lms/admin/courses/:id/reissue-certificates`

Body: `{ enrollmentIds?: string[] }` — empty = all completed enrollments.

Reissues certificates for enrollments where `certificateId` is null but `completionPct >= completionThreshold`.

Use case: instructor adds certificate template to existing course after learners already completed it.
