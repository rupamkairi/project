import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { useErpStore } from "../stores/erp";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@projectx/ui";
import { erpApi } from "../lib/api/erp";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/payroll",
  component: PayrollPage,
});

function PayrollPage() {
  const { payrollEntries, loading, fetchPayrollEntries } = useErpStore();

  useEffect(() => {
    fetchPayrollEntries();
  }, []);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const handleCreateRun = async () => {
    await erpApi.payrollEntries.create({ year: now.getFullYear(), month: now.getMonth() + 1 });
    fetchPayrollEntries();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <Button size="sm" onClick={handleCreateRun}>New Payroll Run</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Total Runs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{payrollEntries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Current Period</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{currentPeriod}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {payrollEntries.find((e: any) => e.period === currentPeriod) ? "Run created" : "Not started"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Last Net Pay</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {payrollEntries[0]?.totalNet ? `₹${Number(payrollEntries[0].totalNet).toLocaleString()}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payroll Runs</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : payrollEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll runs.</p>
          ) : (
            <div className="divide-y">
              {payrollEntries.map((entry: any) => (
                <div key={entry.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{entry.period}</p>
                    <p className="text-xs text-muted-foreground">{entry.employeeCount ?? 0} employees</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">₹{Number(entry.totalNet ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Net pay</p>
                    </div>
                    <Badge variant={entry.status === "submitted" ? "default" : "secondary"}>{entry.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
