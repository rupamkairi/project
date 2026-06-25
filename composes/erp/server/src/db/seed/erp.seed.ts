import { db } from "@db/client";
import { erpFiscalYear, erpGlAccount, erpGstTemplate, erpLeaveType, erpDepartment, erpDesignation } from "../schema/erp";
import { locations } from "@db/schema/location";

const ORG_ID = process.env.SEED_ORG_ID ?? "org_default";

async function seedFiscalYear() {
  await db.insert(erpFiscalYear).values({
    organizationId: ORG_ID,
    name: "FY 2024-25",
    startDate: new Date("2024-04-01"),
    endDate: new Date("2025-03-31"),
    isClosed: false,
  }).onConflictDoNothing();
}

async function seedChartOfAccounts() {
  const accounts = [
    // Assets
    { code: "1000", name: "Cash & Bank", type: "asset" as const, isGroup: true },
    { code: "1010", name: "Cash in Hand", type: "asset" as const, parentCode: "1000" },
    { code: "1020", name: "Bank Accounts", type: "asset" as const, parentCode: "1000" },
    { code: "1100", name: "Accounts Receivable", type: "asset" as const },
    { code: "1200", name: "Inventory", type: "asset" as const },
    { code: "1300", name: "Fixed Assets", type: "asset" as const, isGroup: true },
    { code: "1310", name: "Plant & Machinery", type: "asset" as const, parentCode: "1300" },
    { code: "1320", name: "Furniture & Fixtures", type: "asset" as const, parentCode: "1300" },
    { code: "1390", name: "Accumulated Depreciation", type: "asset" as const, parentCode: "1300" },
    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "liability" as const },
    { code: "2100", name: "GST Payable", type: "liability" as const, isGroup: true },
    { code: "2110", name: "CGST Payable", type: "liability" as const, parentCode: "2100" },
    { code: "2120", name: "SGST Payable", type: "liability" as const, parentCode: "2100" },
    { code: "2130", name: "IGST Payable", type: "liability" as const, parentCode: "2100" },
    { code: "2200", name: "TDS Payable", type: "liability" as const },
    { code: "2300", name: "Salary Payable", type: "liability" as const },
    { code: "2400", name: "PF Payable", type: "liability" as const },
    // Equity
    { code: "3000", name: "Share Capital", type: "equity" as const },
    { code: "3100", name: "Retained Earnings", type: "equity" as const },
    // Revenue
    { code: "4000", name: "Sales Revenue", type: "revenue" as const },
    { code: "4100", name: "Service Revenue", type: "revenue" as const },
    { code: "4200", name: "Other Income", type: "revenue" as const },
    // Expenses
    { code: "5000", name: "Cost of Goods Sold", type: "expense" as const },
    { code: "5100", name: "Salaries & Wages", type: "expense" as const },
    { code: "5200", name: "Rent", type: "expense" as const },
    { code: "5300", name: "Utilities", type: "expense" as const },
    { code: "5400", name: "Depreciation", type: "expense" as const },
    { code: "5500", name: "Office Expenses", type: "expense" as const },
    { code: "5600", name: "Travel & Conveyance", type: "expense" as const },
    { code: "5700", name: "Professional Fees", type: "expense" as const },
  ];

  for (const acc of accounts) {
    await db.insert(erpGlAccount).values({
      organizationId: ORG_ID,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      isGroup: acc.isGroup ?? false,
      balance: "0",
    }).onConflictDoNothing();
  }
}

async function seedGstTemplates() {
  const templates = [
    { name: "GST 5%", type: "goods", cgstRate: "2.5", sgstRate: "2.5", igstRate: "5", cessRate: "0" },
    { name: "GST 12%", type: "goods", cgstRate: "6", sgstRate: "6", igstRate: "12", cessRate: "0" },
    { name: "GST 18%", type: "goods", cgstRate: "9", sgstRate: "9", igstRate: "18", cessRate: "0" },
    { name: "GST 28%", type: "goods", cgstRate: "14", sgstRate: "14", igstRate: "28", cessRate: "0" },
    { name: "GST 18% Services", type: "services", cgstRate: "9", sgstRate: "9", igstRate: "18", cessRate: "0" },
    { name: "Exempt", type: "goods", cgstRate: "0", sgstRate: "0", igstRate: "0", cessRate: "0" },
  ];

  for (const t of templates) {
    await db.insert(erpGstTemplate).values({
      organizationId: ORG_ID,
      ...t,
    }).onConflictDoNothing();
  }
}

async function seedLeaveTypes() {
  const types = [
    { name: "Annual Leave", daysAllowed: 21, carryForward: true, encashable: true },
    { name: "Sick Leave", daysAllowed: 12, carryForward: false, encashable: false },
    { name: "Casual Leave", daysAllowed: 7, carryForward: false, encashable: false },
    { name: "Maternity Leave", daysAllowed: 180, carryForward: false, encashable: false },
    { name: "Paternity Leave", daysAllowed: 15, carryForward: false, encashable: false },
    { name: "Unpaid Leave", daysAllowed: 0, carryForward: false, encashable: false },
  ];

  for (const t of types) {
    await db.insert(erpLeaveType).values({
      organizationId: ORG_ID,
      name: t.name,
      daysAllowed: t.daysAllowed,
      carryForward: t.carryForward,
      encashable: t.encashable,
    }).onConflictDoNothing();
  }
}

async function seedDepartments() {
  const depts = [
    { name: "Management" },
    { name: "Finance & Accounts" },
    { name: "Human Resources" },
    { name: "Sales & Marketing" },
    { name: "Operations" },
    { name: "Procurement" },
    { name: "Information Technology" },
    { name: "Manufacturing" },
  ];

  const deptIds: Record<string, string> = {};
  for (const d of depts) {
    const [dept] = await db.insert(erpDepartment).values({
      organizationId: ORG_ID,
      name: d.name,
    }).onConflictDoNothing().returning();
    if (dept) deptIds[d.name] = dept.id;
  }

  const designations = [
    { name: "CEO", dept: "Management" },
    { name: "CFO", dept: "Finance & Accounts" },
    { name: "HR Manager", dept: "Human Resources" },
    { name: "HR Executive", dept: "Human Resources" },
    { name: "Sales Manager", dept: "Sales & Marketing" },
    { name: "Sales Executive", dept: "Sales & Marketing" },
    { name: "Accounts Manager", dept: "Finance & Accounts" },
    { name: "Accounts Executive", dept: "Finance & Accounts" },
    { name: "Operations Manager", dept: "Operations" },
    { name: "Procurement Officer", dept: "Procurement" },
    { name: "IT Manager", dept: "Information Technology" },
    { name: "Software Engineer", dept: "Information Technology" },
    { name: "Production Manager", dept: "Manufacturing" },
    { name: "Production Supervisor", dept: "Manufacturing" },
  ];

  for (const d of designations) {
    await db.insert(erpDesignation).values({
      organizationId: ORG_ID,
      name: d.name,
      departmentId: deptIds[d.dept] ?? null,
    }).onConflictDoNothing();
  }
}

async function seedWarehouses() {
  const warehouses = [
    { name: "Main Warehouse", code: "WH-MAIN", city: "Mumbai" },
    { name: "Raw Material Store", code: "WH-RM", city: "Mumbai" },
    { name: "Finished Goods", code: "WH-FG", city: "Mumbai" },
    { name: "Scrap Yard", code: "WH-SCRAP", city: "Mumbai" },
  ];

  for (const w of warehouses) {
    await db.insert(locations).values({
      organizationId: ORG_ID,
      type: "warehouse",
      name: w.name,
      meta: { code: w.code, city: w.city },
    }).onConflictDoNothing();
  }
}

export async function seedErp() {
  console.log("Seeding ERP data...");
  await seedFiscalYear();
  await seedChartOfAccounts();
  await seedGstTemplates();
  await seedLeaveTypes();
  await seedDepartments();
  await seedWarehouses();
  console.log("ERP seed complete.");
}

if (import.meta.main) {
  await seedErp();
  process.exit(0);
}
