# Phase 9 — Tax & Compliance (India)

---

## 9.1 GST Template Routes

```
GET    /erp/gst-templates           erp:ledger:read
POST   /erp/gst-templates           erp:ledger:post
GET    /erp/gst-templates/:id       erp:ledger:read
PATCH  /erp/gst-templates/:id       erp:ledger:post
```

**Create template body:**
```typescript
{
  name: string;                 // "GST 18%", "GST 5% (FMCG)", "Exempt"
  type: "sales" | "purchase";
  cgstRate: number;             // 9 (for 18% total = 9+9)
  sgstRate: number;             // 9
  igstRate: number;             // 18 (for inter-state, full rate)
  cessRate?: number;            // 0 for most; special for tobacco/luxury
}
```

Default templates seeded (Phase 22):

| Name | CGST | SGST | IGST |
|------|------|------|------|
| GST 28% | 14 | 14 | 28 |
| GST 18% | 9 | 9 | 18 |
| GST 12% | 6 | 6 | 12 |
| GST 5% | 2.5 | 2.5 | 5 |
| GST 0% | 0 | 0 | 0 |
| Exempt | 0 | 0 | 0 |

---

## 9.2 GSTIN Validation

```typescript
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin: string): { valid: boolean; stateCode: string; pan: string } {
  if (!GSTIN_REGEX.test(gstin)) return { valid: false, stateCode: "", pan: "" };
  return {
    valid: true,
    stateCode: gstin.substring(0, 2),    // "27" = Maharashtra, "07" = Delhi
    pan: gstin.substring(2, 12),
  };
}

// Called on vendor/customer create + update
// Called when computing GST on invoices
```

**State code → state name map:** seed a static map of all 38 India state codes.

---

## 9.3 GST Computation Helper

```typescript
export function computeInvoiceGst(params: {
  orgGstin: string;
  partyGstin?: string;
  lineItems: Array<{ lineTotal: number; gstRate: number }>;
}): GstResult {
  const orgState = params.orgGstin.substring(0, 2);
  const partyState = params.partyGstin?.substring(0, 2);
  const isIntraState = partyState ? orgState === partyState : false;
  // No GSTIN = B2C or unregistered → treat as intra-state CGST+SGST

  let totalCgst = 0, totalSgst = 0, totalIgst = 0;

  for (const item of params.lineItems) {
    const gstAmt = item.lineTotal * item.gstRate / 100;
    if (isIntraState || !partyState) {
      totalCgst += gstAmt / 2;
      totalSgst += gstAmt / 2;
    } else {
      totalIgst += gstAmt;
    }
  }

  return {
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
  };
}
```

---

## 9.4 TDS (Tax Deducted at Source)

TDS applies to vendor payments above threshold for certain categories (Section 194C, 194J, etc.).

**TDS categories:**

| Section | Description | Rate | Threshold |
|---------|-------------|------|-----------|
| 194C | Contractor payment | 1% individual / 2% company | ₹30,000 per transaction or ₹1L annual |
| 194J | Professional services | 10% | ₹30,000 |
| 194I | Rent | 10% | ₹2,40,000 annual |
| 194H | Commission | 5% | ₹15,000 |

**TDS deduction on vendor invoice:**
```typescript
function computeTds(invoice: VendorInvoice, vendor: Vendor): number {
  if (!invoice.tdsSection) return 0;

  const section = TDS_SECTIONS[invoice.tdsSection];
  if (invoice.subtotal < section.threshold) return 0;

  const rate = vendor.type === "individual" ? section.rateIndividual : section.rateCompany;
  return Math.round(invoice.subtotal * rate / 100 * 100) / 100;
}
```

TDS is deducted at payment time: `netPayment = invoice.total - tdsAmount`. TDS is posted to `TDS Payable (2130)` account.

---

## 9.5 GSTR-1 Generation

**GSTR-1** = outward supply return (sales invoices for the month).

```
GET    /erp/gst-returns/gstr1/preview   erp:ledger:read
  query: ?period=2024-06   (YYYY-MM)
  returns: GSTR-1 data structure

POST   /erp/gst-returns/gstr1           erp:ledger:post
  body: { period: "2024-06" }
  creates: erpGstReturn record with type=GSTR1
```

**GSTR-1 data structure:**
```typescript
{
  period: "2024-06",
  gstin: string,                  // org's GSTIN
  b2b: Array<{                    // B2B invoices (registered buyers)
    ctin: string,                 // customer GSTIN
    inv: Array<{
      inum: string,               // invoice number
      idt: string,                // invoice date
      val: number,               // invoice value
      pos: string,               // place of supply (state code)
      rchrg: "N",
      itms: Array<{ num: number; itm_det: { txval: number; rt: number; camt: number; samt: number; iamt: number } }>
    }>
  }>,
  b2c: Array<{                    // B2C invoices (unregistered buyers, grouped by state)
    pos: string,
    typ: "OE",
    txval: number,
    rt: number,
    iamt?: number,
    camt?: number,
    samt?: number
  }>,
  hsn: Array<{                    // HSN summary
    num: number,
    hsn_sc: string,
    desc: string,
    uqc: string,
    qty: number,
    txval: number,
    rt: number
  }>
}
```

Source: all `erpSalesInvoice` records with `status = "submitted"` and `date` in the period.

---

## 9.6 GSTR-3B Generation

**GSTR-3B** = monthly summary return (sales + purchases summary).

```
GET    /erp/gst-returns/gstr3b/preview   erp:ledger:read
  query: ?period=2024-06
POST   /erp/gst-returns/gstr3b           erp:ledger:post
```

**GSTR-3B structure:**
```typescript
{
  period: "2024-06",
  outward_taxable_supplies: {
    taxable_value: number,
    igst: number, cgst: number, sgst: number, cess: number
  },
  inward_supplies_liable_to_reverse_charge: { ... },
  input_tax_credit: {
    igst: number, cgst: number, sgst: number, cess: number
  },
  tax_payable: {
    igst: number, cgst: number, sgst: number, cess: number
  }
}
```

`input_tax_credit` = sum of GST on `erpVendorInvoice` items for the period (purchase input credit).
`tax_payable` = `outward_tax - input_tax_credit`.

---

## 9.7 E-Invoice (IRN Generation)

For B2B sales invoices (when org turnover > ₹5 Cr threshold):

```
POST   /erp/sales-invoices/:id/generate-irn   erp:invoice:create
```

Flow:
1. Build IRN payload per GST IRP JSON schema
2. POST to `process.env.GST_IRP_URL` with GST API credentials
3. Receive: `{ Irn, AckNo, AckDt, SignedQRCode, Status }`
4. Store `irn` + `signedQrCode` on `erpSalesInvoice`
5. On failure: log error, return `{ error: "IRN generation failed", retry: true }`

```typescript
function buildIRNPayload(si: SalesInvoice, org: Org): IRNPayload {
  return {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: "N" },
    DocDtls: { Typ: "INV", No: si.siNumber, Dt: formatDate(si.date) },
    SellerDtls: { Gstin: org.gstin, LglNm: org.name, ... },
    BuyerDtls: { Gstin: customer.gstin, LglNm: customer.name, ... },
    ItemList: si.items.map(item => ({
      SlNo: String(item.seq),
      PrdDesc: item.itemName,
      HsnCd: item.hsn,
      Qty: item.qty,
      UnitPrice: item.unitPrice,
      TotAmt: item.lineTotal,
      CgstRt: item.cgstRate,
      SgstRt: item.sgstRate,
      IgstRt: item.igstRate,
      TotItemVal: item.lineTotal + item.cgst + item.sgst + item.igst,
    })),
    ValDtls: {
      AssVal: si.subtotal,
      CgstVal: si.cgst,
      SgstVal: si.sgst,
      IgstVal: si.igst,
      TotInvVal: si.total,
    },
  };
}
```
