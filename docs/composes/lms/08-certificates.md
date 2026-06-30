# Phase 8 — Certificates

---

## 8.1 Certificate Routes

```
POST   /lms/certificates/issue/:transactionId  internal (triggered on completion)
GET    /lms/certificates/:id                   learner (own) | enrollment:manage
GET    /lms/verify/:certificateNo              public (no auth)
POST   /lms/admin/certificates/:id/revoke      enrollment:manage
GET    /lms/learner/certificates               learner (own)
```

Certificates are stored in `lms_certificates` detail table. They reference `transactionId` (the enrollment order in `transactions`) and `personId` (the student in `persons`).

---

## 8.2 Certificate Issuance

Triggered from enrollment completion flow (see Phase 10 — `lms.enrollment.completed` hook):

```typescript
async function issueCertificate(transactionId: string, personId: string, itemId: string): Promise<void> {
  const detail = await db.query.lmsCourseDetail.findFirst({ where: eq(lmsCourseDetail.itemId, itemId) });

  // No certificate template = no cert issued
  if (!detail?.certificateTemplateId) return;

  // Guard: don't double-issue
  const existing = await db.query.lmsCertificates.findFirst({
    where: eq(lmsCertificates.transactionId, transactionId),
  });
  if (existing) return;

  // Generate unique certificate number
  const certificateNo = `LMS-${ulid().slice(-8).toUpperCase()}`;

  // Expiry (from org config)
  const orgConfig = await db.query.lmsOrgConfig.findFirst({ where: eq(lmsOrgConfig.orgId, detail.organizationId) });
  const expiresAt = orgConfig?.certificateExpiresAfterDays
    ? new Date(Date.now() + orgConfig.certificateExpiresAfterDays * 86400000)
    : null;

  const cert = await db.insert(lmsCertificates).values({
    id: generateId(),
    organizationId: detail.organizationId,
    transactionId,
    personId,
    certificateNo,
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
  // No lmsEnrollments table — enrollment lives in transactions master table; no back-reference needed.

  // Notify learner
  bus.emit("lms.certificate.issued", { certId: cert[0].id, personId, itemId, certificateNo });
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
  where: eq(lmsCertificates.certificateNo, code.toUpperCase()),
});

if (!cert) return { valid: false, error: "Certificate not found" };
if (cert.expiresAt && cert.expiresAt < new Date()) {
  return { valid: false, error: "Certificate has expired" };
}

// Resolve person name from persons master table
const person = await db.query.persons.findFirst({ where: eq(persons.id, cert.personId) });
// Resolve course name from cat_items master table via transactionId → transaction_lines → itemId
const courseName = await getCourseNameFromTransaction(cert.transactionId);

return {
  valid: true,
  certificate: {
    certificateNo: cert.certificateNo,
    learnerName: `${person?.firstName} ${person?.lastName}`,
    courseTitle: courseName,
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
bus.emit("lms.certificate.revoked", { certId, personId: cert.personId, reason });
```

Revocation does NOT change enrollment status — learner remains `completed`.

---

## 8.5 Certificate PDF Template

Template referenced via `lms_course_detail.certificateTemplateId`. The template itself is stored in the document module and fetched via `mediator.dispatch({ type: "document.getTemplate", templateId })`. Template structure:
```typescript
{
  title: string;          // "Certificate of Completion"
  body: string;           // "This certifies that {{learnerName}} has successfully completed {{courseName}}"
  logoDocId?: string;     // org logo
}
```

Expiry is read from `lmsOrgConfig.certificateExpiresAfterDays` (not stored on the template).

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
