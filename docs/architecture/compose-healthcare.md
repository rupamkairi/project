# Compose — Medical & Healthcare Management

## Hospital, Clinic & Diagnostic Lab Operations

---

## 1. Compose Overview

```
Compose ID:   medical
Version:      1.0.0
Purpose:      Manage clinical and administrative operations across hospitals,
              clinics, and diagnostic labs — from patient registration through
              discharge, billing, and insurance claims.
Apps Served:  ReceptionApp   → registration, appointments, bed management
              ClinicalApp    → EMR, prescriptions, lab orders (doctor/nurse)
              PharmacyApp    → prescription fulfillment, drug inventory
              BillingApp     → invoicing, insurance claims, payments
              PatientApp     → appointments, reports, bills (self-service)
              AdminApp       → staff management, analytics, configuration
```

---

## 2. Module Selection & Configuration

```typescript
const MedicalCompose: ComposeDefinition = {
  id: "medical",
  name: "Medical & Healthcare Management",
  modules: [
    "identity",
    "catalog", // Procedures, tests, drug formulary, service packages
    "inventory", // Drug stock, medical supplies, consumables
    "ledger", // Patient billing, insurance payables, pharmacy revenue
    "workflow", // Clinical pathways, admission → discharge, lab order processing
    "scheduling", // OPD appointments, OT scheduling, doctor availability
    "document", // EMR documents, lab reports, discharge summaries, consent forms
    "notification", // Appointment reminders, lab results ready, bill generated
    "analytics", // OPD/IPD census, revenue cycle, bed occupancy, disease trends
  ],

  moduleConfig: {
    catalog: {
      itemLabel: "Service / Procedure / Drug",
      enableVariants: false,
      enablePriceLists: true, // different rates: cash / insurance / concession
    },
    inventory: {
      trackingMode: "variant",
      enableBatchTracking: true, // drug batch + expiry tracking
      enableExpiryAlerts: true,
    },
    scheduling: {
      resourceLabel: "Doctor / OT / Room",
      slotLabel: "Appointment Slot",
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role              | Who                                                  |
| ----------------- | ---------------------------------------------------- |
| `medical-admin`   | Hospital administrator — full access                 |
| `doctor`          | Clinician — EMR, prescriptions, lab orders           |
| `nurse`           | Nursing staff — vitals, ward notes, medication admin |
| `receptionist`    | Registration, appointments, billing queries          |
| `lab-technician`  | Process lab orders, upload results                   |
| `pharmacist`      | Dispense prescriptions, manage drug stock            |
| `billing-officer` | Generate bills, process insurance claims             |
| `patient`         | Self-service — own records, appointments, bills      |

```
                      medical-admin  doctor  nurse  receptionist  lab-tech  pharmacist  billing  patient
──────────────────────────────────────────────────────────────────────────────────────────────────────────
patient:register           ✓          —       —          ✓           —          —          —       —
patient:read               ✓          ✓       ✓          ✓           ◑          ◑          ✓       ◑(own)
patient:update             ✓          ✓       ✓          ✓           —          —          —       ◑(own)

appointment:create         ✓          ✓       ✓          ✓           —          —          —        ✓
appointment:read           ✓          ✓       ✓          ✓           —          —          ✓        ◑(own)
appointment:cancel         ✓          ✓       —          ✓           —          —          —        ◑(own)

emr:read                   ✓          ✓       ✓          —           —          ◑          —        ◑(own)
emr:create                 ✓          ✓       —          —           —          —          —        —
emr:update                 ✓          ✓       ✓(vitals)  —           —          —          —        —

prescription:create        ✓          ✓       —          —           —          —          —        —
prescription:dispense      ✓          —       —          —           —          ✓          —        —

lab-order:create           ✓          ✓       ✓          —           —          —          —        —
lab-order:process          ✓          —       —          —           ✓          —          —        —
lab-order:upload-result    ✓          —       —          —           ✓          —          —        —

bed:read                   ✓          ✓       ✓          ✓           —          —          —        —
bed:assign                 ✓          ✓       ✓          ✓           —          —          —        —
bed:discharge              ✓          ✓       ✓          —           —          —          —        —

billing:read               ✓          —       —          ✓           —          —          ✓        ◑(own)
billing:create             ✓          —       —          ✓           —          —          ✓        —
billing:collect            ✓          —       —          ✓           —          —          ✓        —
insurance:claim            ✓          —       —          —           —          —          ✓        —

inventory:read             ✓          ✓       ✓          —           ✓          ✓          —        —
inventory:dispense         ✓          —       ✓          —           —          ✓          —        —
analytics:read             ✓          ✓       —          —           —          —          ✓        —
```

---

## 4. Medical Entity Extensions

### Patient

```typescript
interface Patient extends Entity {
  uhid: string; // Unique Health ID: 'UHID-00001'
  actorId?: ID; // links to identity if patient has portal access
  firstName: string;
  lastName: string;
  dateOfBirth: Timestamp;
  gender: "male" | "female" | "other";
  bloodGroup?: string;
  email?: string;
  phone: string;
  emergencyContact: EmergencyContact;
  addressId?: ID;
  insuranceDetails?: InsuranceDetail[];
  status: "active" | "deceased" | "inactive";
  allergies: string[];
  chronicConditions: string[];
}

interface InsuranceDetail {
  provider: string;
  policyNumber: string;
  validFrom: Timestamp;
  validTo: Timestamp;
  coverageLimit: Money;
  tpaId?: string; // Third Party Administrator
}
```

### Visit (OPD / IPD)

```typescript
interface Visit extends Entity {
  visitNumber: string; // 'OPD-2024-00123'
  patientId: ID;
  type: "opd" | "ipd" | "emergency" | "daycare";
  status: VisitStatus;
  registeredAt: Timestamp;
  doctorId: ID;
  departmentId: string;
  chiefComplaint: string;
  appointmentId?: ID; // sch_bookings.id if pre-booked
  bedId?: ID; // for IPD
  admittedAt?: Timestamp;
  dischargedAt?: Timestamp;
  workflowInstanceId?: ID;
}

type VisitStatus =
  | "registered"
  | "waiting"
  | "in-consultation"
  | "under-observation"
  | "admitted"
  | "discharged"
  | "cancelled";
```

**Visit FSM:**

```
registered → waiting           [on: visit.triage-complete]
waiting    → in-consultation   [on: visit.doctor-called]
in-consultation → under-observation [on: visit.observe]
            → admitted         [on: visit.admit]  guard: bed available
            → discharged       [on: visit.discharge-opd]
            entry: [emit 'visit.consultation-started']
under-observation → discharged [on: visit.discharge]
                  → admitted   [on: visit.admit]
admitted → discharged          [on: visit.discharge]
           entry: [emit 'visit.discharged']
           → (starts billing workflow)
```

### EMR (Electronic Medical Record)

```typescript
interface EMRRecord extends Entity {
  visitId: ID;
  patientId: ID;
  doctorId: ID;
  recordedAt: Timestamp;
  type: EMRType;
  content: EMRContent;
  isLocked: boolean; // locked after discharge — no edits
  lockedAt?: Timestamp;
}

type EMRType =
  | "triage" // nurse: vitals, pain score
  | "consultation" // doctor: history, examination, assessment, plan
  | "progress-note" // daily IPD notes
  | "discharge-summary" // final summary on discharge
  | "procedure-note"; // surgical/procedure documentation

interface EMRContent {
  vitals?: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
    weight: number;
  };
  subjectiveHistory?: string;
  examination?: string;
  assessment?: string; // diagnosis ICD-10 codes
  plan?: string;
  icd10Codes?: string[];
  notes?: string;
}
```

### Prescription

```typescript
interface Prescription extends Entity {
  visitId: ID;
  patientId: ID;
  prescribedBy: ID; // doctor actor_id
  status: "issued" | "partially-dispensed" | "fully-dispensed" | "cancelled";
  items: PrescriptionItem[];
  instructions?: string;
  followUpDate?: Timestamp;
  dispensedAt?: Timestamp;
  dispensedBy?: ID; // pharmacist actor_id
}

interface PrescriptionItem {
  drugId: ID; // cat_items.id (drug from formulary)
  drugName: string;
  dosage: string; // '500mg'
  frequency: string; // 'TID' (three times daily)
  duration: string; // '5 days'
  route: string; // 'oral', 'IV', 'topical'
  qty: number; // total tablets/units to dispense
  dispensedQty?: number;
}
```

### Lab Order

```typescript
interface LabOrder extends Entity {
  visitId: ID;
  patientId: ID;
  orderedBy: ID; // doctor
  status: LabOrderStatus;
  tests: LabOrderTest[];
  priority: "routine" | "urgent" | "stat";
  collectedAt?: Timestamp;
  collectedBy?: ID;
  reportedAt?: Timestamp;
  reportDocumentId?: ID; // uploaded PDF result
}

interface LabOrderTest {
  testId: ID; // cat_items.id (test from catalog)
  testName: string;
  status: "pending" | "collected" | "processing" | "resulted" | "verified";
  result?: string;
  referenceRange?: string;
  isCritical?: boolean; // flags abnormal result
  technicianId?: ID;
}

type LabOrderStatus =
  | "ordered"
  | "sample-collected"
  | "processing"
  | "resulted"
  | "verified"
  | "delivered";
```

### Bed

```typescript
interface Bed extends Entity {
  bedNumber: string; // 'ICU-01', 'GW-B-23'
  ward: string;
  type: "general" | "semi-private" | "private" | "icu" | "nicu" | "ot";
  status: "available" | "occupied" | "under-maintenance" | "reserved";
  currentVisitId?: ID;
  ratePerDay: Money;
}
```

### Patient Bill

```typescript
interface PatientBill extends Entity {
  billNumber: string; // 'BILL-2024-001'
  visitId: ID;
  patientId: ID;
  status: BillStatus;
  items: BillItem[];
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
  paidAmount: Money;
  balance: Money; // total - paidAmount
  paymentMode?: string; // 'cash', 'card', 'insurance', 'mixed'
  insuranceClaim?: InsuranceClaim;
  ledgerTransactionId?: ID;
}

interface BillItem {
  referenceId: string; // visitId, labOrderId, prescriptionId
  referenceType: string; // 'Consultation', 'LabTest', 'Drug', 'Bed'
  description: string;
  qty: number;
  unitPrice: Money;
  discount: Money;
  total: Money;
}

type BillStatus =
  | "draft"
  | "generated"
  | "partially-paid"
  | "paid"
  | "written-off"
  | "insurance-pending";

interface InsuranceClaim {
  provider: string;
  policyNumber: string;
  claimNumber?: string;
  status: "submitted" | "under-review" | "approved" | "rejected" | "settled";
  approvedAmount?: Money;
  rejectionReason?: string;
}
```

---

## 5. Medical Hooks

### Hook: Patient Admitted (IPD)

```typescript
compose.hook({
  on: "visit.admitted",
  handler: async (event, ctx) => {
    const { visitId, patientId, bedId, doctorId } = event.payload;

    // 1. Mark bed as occupied
    await ctx.dispatch("medical.updateBedStatus", {
      bedId,
      status: "occupied",
      visitId,
    });

    // 2. Start IPD clinical workflow
    await ctx.dispatch("workflow.startProcess", {
      templateId: "IPD_CLINICAL_PATHWAY",
      entityId: visitId,
      entityType: "Visit",
      context: { visitId, patientId, doctorId, bedId },
    });

    // 3. Start billing accumulator (charges accumulate daily)
    await ctx.queue.add(
      "medical.start-daily-charging",
      { visitId, bedId },
      {
        delay: hours(24),
      },
    );

    // 4. Notify family (if contact on file)
    await ctx.dispatch("notification.send", {
      templateKey: "patient.admitted",
      to: patientId,
      variables: {
        visitId,
        bedNumber: event.payload.bedNumber,
        ward: event.payload.ward,
      },
      channels: ["sms"],
    });
  },
});
```

### Hook: Lab Result Critical

```typescript
compose.hook({
  on: "lab.result-critical",
  handler: async (event, ctx) => {
    const { labOrderId, testName, result, visitId } = event.payload;
    const visit = await ctx.query("medical.getVisit", { id: visitId });

    // Immediately notify the ordering doctor — critical values are time-sensitive
    await ctx.dispatch("notification.send", {
      templateKey: "lab.critical-result",
      to: visit.doctorId,
      variables: { patientId: visit.patientId, testName, result, labOrderId },
      channels: ["push", "sms"], // push first, SMS as fallback
    });

    // Escalate to ward nurse if IPD patient
    if (visit.type === "ipd") {
      await ctx.dispatch("workflow.task.create", {
        instanceId: visit.workflowInstanceId,
        title: `Critical lab result: ${testName} = ${result}`,
        assigneeRole: "nurse",
        priority: "urgent",
        dueIn: minutes(15),
      });
    }
  },
});
```

### Hook: Patient Discharged

```typescript
compose.hook({
  on: "visit.discharged",
  handler: async (event, ctx) => {
    const { visitId, patientId, bedId } = event.payload;

    // 1. Free the bed
    await ctx.dispatch("medical.updateBedStatus", {
      bedId,
      status: "available",
      currentVisitId: null,
    });

    // 2. Lock all EMR records for this visit
    await ctx.dispatch("medical.lockVisitEMR", { visitId });

    // 3. Generate final bill
    await ctx.dispatch("medical.generateFinalBill", { visitId });

    // 4. Notify patient
    await ctx.dispatch("notification.send", {
      templateKey: "patient.discharged",
      to: patientId,
      variables: { visitId },
      channels: ["sms"],
    });

    // 5. Schedule discharge summary generation
    await ctx.queue.add(
      "medical.generate-discharge-summary",
      { visitId },
      {
        priority: "standard",
      },
    );
  },
});
```

### Hook: Prescription Issued → Check Drug Stock

```typescript
compose.hook({
  on: "prescription.issued",
  handler: async (event, ctx) => {
    const { prescriptionId, items } = event.payload;

    for (const item of items) {
      const stock = await ctx.query("inventory.getStock", {
        variantId: item.drugId,
      });

      if (stock.available < item.qty) {
        // Notify pharmacist of stock shortfall
        await ctx.dispatch("notification.send", {
          templateKey: "pharmacy.stock-insufficient",
          to: { role: "pharmacist" },
          variables: {
            drugName: item.drugName,
            required: item.qty,
            available: stock.available,
          },
          channels: ["in_app"],
        });
      }
    }
  },
});
```

### Hook: Drug Dispensed

```typescript
compose.hook({
  on: "prescription.dispensed",
  handler: async (event, ctx) => {
    const { prescriptionId, items, visitId } = event.payload;

    // 1. Deduct from pharmacy inventory
    for (const item of items) {
      await ctx.dispatch("inventory.fulfill", {
        variantId: item.drugId,
        qty: item.dispensedQty,
        reference: prescriptionId,
        referenceType: "Prescription",
      });
    }

    // 2. Add drug charges to patient bill
    await ctx.dispatch("medical.addBillItems", {
      visitId,
      items: items.map((i) => ({
        referenceId: prescriptionId,
        referenceType: "Drug",
        description: `${i.drugName} x${i.dispensedQty}`,
        qty: i.dispensedQty,
        unitPrice: i.unitPrice,
      })),
    });
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // Bed assignment requires available bed — no double-assignment
  {
    id: "bed-must-be-available",
    scope: "bed:assign",
    guard: { field: "bed.status", op: "eq", value: "available" },
  },

  // EMR cannot be edited after discharge
  {
    id: "emr-locked-after-discharge",
    scope: "emr:update",
    guard: { field: "emr.isLocked", op: "eq", value: false },
  },

  // Prescriptions can only be created by licensed doctors
  {
    id: "prescription-doctor-only",
    scope: "prescription:create",
    guard: { field: "actor.roles", op: "contains", value: "doctor" },
  },

  // Lab results marked critical must notify doctor within 15 minutes
  {
    id: "critical-result-notification-sla",
    scope: "lab-order:upload-result",
    condition: { field: "result.isCritical", op: "eq", value: true },
    action: "enforce-sla",
    slaDurationMinutes: 15,
  },

  // Controlled substances require dual authorization
  {
    id: "controlled-substance-dual-auth",
    scope: "prescription:dispense",
    condition: { field: "drug.isControlled", op: "eq", value: true },
    action: "require-approval",
    approverRole: "medical-admin",
  },

  // Insurance claims must be submitted within claim window
  {
    id: "insurance-claim-window",
    scope: "insurance:claim",
    guard: {
      field: "visit.dischargedAt",
      op: "gte",
      value: { relative: `-${config.insuranceClaimWindowDays}d` },
    },
  },
]);
```

---

## 7. Key Workflow Templates

```
IPD_CLINICAL_PATHWAY
  1. admission-workup      → nurse: initial vitals, nursing assessment
  2. daily-rounds          → doctor: daily progress note (recurring task per day)
  3. treatment-plan        → doctor: update treatment plan, order tests/drugs
  4. discharge-planning    → doctor: discharge criteria met, summary drafted
  5. discharge-clearance   → billing: final bill ready + cleared
     → On complete: dispatch 'visit.discharged'

OPD_CONSULTATION
  1. triage                → nurse: vitals, chief complaint
  2. consultation          → doctor: EMR entry, orders
  3. followup-scheduling   → receptionist: book follow-up if needed

LAB_ORDER_PROCESSING
  1. sample-collection     → lab tech: collect sample, log time
  2. processing            → lab tech: run test on analyzer
  3. result-entry          → lab tech: enter result, flag critical values
  4. verification          → senior tech: verify result
  5. report-delivery       → notify doctor + patient

INSURANCE_CLAIM_PROCESSING
  1. document-preparation  → billing: compile bill + clinical notes + discharge summary
  2. tpa-submission        → billing: submit to TPA/insurer
  3. query-resolution      → billing: respond to insurer queries
  4. settlement            → billing: record settlement amount, post to ledger
```

---

## 8. API Surface

```
── Patients ──────────────────────────────────────────────────
GET    /medical/patients                   patient:read
POST   /medical/patients                   patient:register
GET    /medical/patients/:id               patient:read
PATCH  /medical/patients/:id               patient:update
GET    /medical/patients/:id/visits        patient:read
GET    /medical/patients/:id/bills         billing:read (own or billing-officer)
GET    /medical/patients/:id/emr           emr:read

── Visits ────────────────────────────────────────────────────
GET    /medical/visits                     patient:read (filter by status/date/doctor)
POST   /medical/visits                     patient:register  ← new walk-in registration
GET    /medical/visits/:id                 patient:read
POST   /medical/visits/:id/admit           bed:assign
POST   /medical/visits/:id/discharge       bed:discharge
GET    /medical/visits/:id/timeline        emr:read  ← merged clinical timeline

── EMR ───────────────────────────────────────────────────────
GET    /medical/visits/:visitId/emr        emr:read
POST   /medical/visits/:visitId/emr        emr:create
PATCH  /medical/emr/:id                    emr:update  (guard: not locked)

── Appointments ──────────────────────────────────────────────
GET    /medical/appointments               appointment:read
POST   /medical/appointments               appointment:create
GET    /medical/appointments/:id           appointment:read
POST   /medical/appointments/:id/cancel    appointment:cancel
GET    /medical/doctors/:id/slots          public  ← available booking slots

── Prescriptions ─────────────────────────────────────────────
GET    /medical/visits/:visitId/prescriptions  emr:read
POST   /medical/visits/:visitId/prescriptions  prescription:create
GET    /medical/prescriptions/:id              emr:read
POST   /medical/prescriptions/:id/dispense     prescription:dispense

── Lab Orders ────────────────────────────────────────────────
GET    /medical/visits/:visitId/lab-orders     lab-order:create (own) or emr:read
POST   /medical/visits/:visitId/lab-orders     lab-order:create
GET    /medical/lab-orders/:id                 lab-order:read
POST   /medical/lab-orders/:id/collect         lab-order:process
POST   /medical/lab-orders/:id/result          lab-order:upload-result

── Beds ──────────────────────────────────────────────────────
GET    /medical/beds                       bed:read
GET    /medical/beds/availability          bed:read
PATCH  /medical/beds/:id                   bed:assign (status change)

── Billing ───────────────────────────────────────────────────
GET    /medical/bills                      billing:read
GET    /medical/bills/:id                  billing:read
POST   /medical/bills/:id/collect          billing:collect
POST   /medical/bills/:id/insurance-claim  insurance:claim
GET    /medical/bills/:id/receipt          billing:read (own)

── Analytics ─────────────────────────────────────────────────
GET    /medical/analytics/census           analytics:read  ← OPD/IPD daily census
GET    /medical/analytics/bed-occupancy    analytics:read
GET    /medical/analytics/revenue-cycle    analytics:read
GET    /medical/analytics/doctor-workload  analytics:read
GET    /medical/analytics/lab-turnaround   analytics:read
```

**Patient Portal (`/medical/patient/*`):**

```
GET    /medical/patient/appointments       own
POST   /medical/patient/appointments       own
GET    /medical/patient/reports            own  ← lab reports, discharge summaries
GET    /medical/patient/bills              own
GET    /medical/patient/prescriptions      own
```

---

## 9. Real-Time Channels

| Channel                           | Subscribers          | Events                          |
| --------------------------------- | -------------------- | ------------------------------- |
| `org:{orgId}:medical:opd`         | Reception, nurses    | `visit.*` (OPD queue)           |
| `org:{orgId}:medical:lab`         | Lab technicians      | `lab-order.*`                   |
| `org:{orgId}:medical:ward:{ward}` | Nurses, ward doctors | `visit.*` (IPD), `emr.*`        |
| `org:{orgId}:medical:pharmacy`    | Pharmacists          | `prescription.*`                |
| `org:{orgId}:medical:beds`        | Reception, doctors   | `bed.*`                         |
| `org:{orgId}:actor:{id}:inbox`    | Doctor (personal)    | `lab.critical-result`, `task.*` |

---

## 10. Scheduled Jobs

```
medical.daily-bed-charges          every 24h (per admission)
  → Add bed charge to patient bill for each occupied bed

medical.appointment-reminders      daily (evening prior)
  → Notify patients of next-day appointments via SMS

medical.lab-overdue-check          every 30min
  → Lab orders past expected TAT with no result → notify lab supervisor

medical.drug-expiry-check          daily
  → Flag inventory batches expiring within 30 days → notify pharmacist

medical.insurance-claim-followup   weekly
  → Claims submitted but no settlement in 30 days → notify billing officer

medical.discharge-summary-check    daily
  → Visits discharged >24h ago with no discharge summary → notify doctor

medical.analytics-snapshot         nightly
  → Snapshot bed occupancy %, OPD count, revenue metrics
```

---

## 11. Integrations

```typescript
MedicalCompose.integrations = {
  payment:       [RazorpayAdapter, CashAdapter],
  storage:       [S3Adapter],              // lab reports, scans, consent forms
  notification:  { sms: MSG91Adapter, email: ResendAdapter, push: FCMAdapter },
  labEquipment:  HL7Adapter,              // HL7 v2 interface for analyzer integration
  insurance:     [TPAWebhookAdapter],     // TPA claim status webhooks
  dicom:         DICOMAdapter,            // radiology image storage (PACS)
  fhir:          FHIRAdapter,             // FHIR R4 for health data interoperability
}

// Inbound Webhooks
POST /webhooks/tpa-claims        → insurance claim status updates
POST /webhooks/lab-analyzer      → HL7 ORU messages from lab equipment
```
