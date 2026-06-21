# Phase 20 — Web: Payroll

---

## 20.1 SalaryStructuresPage

Columns: Name | Components Count | Applicable From | Status | Actions

**CreateSalaryStructureDialog:**
- Name (e.g. "Software Engineer - Band 2")
- Applicable from date
- Earnings section:
  - Dynamic component rows
  - Each row: Name | Type (fixed/formula/percentage) | Value/Formula/Rate | Is Taxable
  - `+Add Earning` button
- Deductions section:
  - Same structure
  - `+Add Deduction` button
- Preview panel: shows computed amounts for a sample CTC (₹ 10,00,000 example)

**Component type behavior:**
- `fixed`: shows number input
- `formula`: shows formula input with helper text (variables: `ctc`, `basic`, `hra`, etc.)
- `percentage`: shows "% of [basis component]" inputs

Formula preview: shows evaluated amount for the sample CTC in gray text beside input.

---

## 20.2 SalaryStructureDetailPage

Shows computed structure breakdown for a sample CTC:

```
Salary Structure: Software Engineer - Band 2

EARNINGS                              ₹ 10,00,000 CTC Example
─────────────────────────────────────────────────────
Basic              50% of CTC          ₹ 5,00,000
HRA                40% of Basic        ₹ 2,00,000
Special Allowance  CTC - Basic - HRA   ₹ 1,65,000
                                       ─────────────
Gross                                  ₹ 8,65,000

DEDUCTIONS
─────────────────────────────────────────────────────
Employee PF        12% of Basic        ₹   60,000
Professional Tax   Fixed               ₹    2,400
TDS                Annual tax / 12     ₹   18,000
                                       ─────────────
Total Deductions                       ₹   80,400

NET SALARY                             ₹ 7,84,600
```

---

## 20.3 PayrollEntriesPage

Columns: Month/Year | Department | Employee Count | Gross | Net | Status | Actions

**CreatePayrollEntryDialog:**
- Month (month picker)
- Year
- Department (optional — empty = all employees)
- Salary structure (optional override)

On create: entry created in `draft` with employee count = 0.

---

## 20.4 PayrollEntryDetailPage

Header:
```
Payroll: June 2024 — All Employees                [Generate Slips] [Submit]
Status: draft    Employees: 45    Gross: ₹ 42,50,000    Net: ₹ 38,70,000
```

**Generate Slips button:** calls `/generate-slips` endpoint. Shows progress spinner (may take a few seconds for large headcount). After done: shows slips table.

**Slips table:**
```
Employee    | Dept         | Gross      | Deductions | Net        | Status | Action
Rahul S.    | Engineering  | ₹ 85,000   | ₹ 12,400   | ₹ 72,600   | draft  | [View]
Priya S.    | Design       | ₹ 72,000   | ₹ 10,200   | ₹ 61,800   | draft  | [View]
```

**Submit button:** only enabled when all slips are in `submitted` status.
Before submit: ConfirmDialog "Submit payroll for June 2024? This will post salary journals."

After submit: status → submitted. Journal entry ID shown as link.

---

## 20.5 SalarySlipDetailPage

Accessible from employee detail → Salary Slips tab, or from payroll entry detail.

```
SALARY SLIP                                        [Print]
Employee: Rahul Sharma (EMP-042)
Month: June 2024    Department: Engineering
PAN: ABCDE1234F     Bank: HDFC xxxx-5678

EARNINGS                          DEDUCTIONS
────────────────────────         ─────────────────────────
Basic         ₹ 50,000           Employee PF    ₹  6,000
HRA           ₹ 20,000           Professional Tax ₹  200
Special All.  ₹ 16,500           TDS            ₹  1,500
              ─────────                          ─────────
Gross         ₹ 86,500           Total          ₹  7,700

Net Pay: ₹ 78,800
```

Print button: triggers `window.print()` with print-optimized CSS.
