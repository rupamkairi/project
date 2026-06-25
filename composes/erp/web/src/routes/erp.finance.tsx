import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { useErpStore } from "../stores/erp";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@projectx/ui";
import { erpApi } from "../lib/api/erp";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/finance",
  component: FinancePage,
});

function FinancePage() {
  const { accounts, fiscalYears, loading, fetchAccounts, fetchFiscalYears } = useErpStore();
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchFiscalYears();
  }, []);

  const loadTrialBalance = async () => {
    const fy = fiscalYears[0];
    if (!fy) return;
    setLoadingReport(true);
    const res = await erpApi.reports.trialBalance(fy.id) as any;
    setReport(res.data);
    setLoadingReport(false);
  };

  const activeFy = fiscalYears.find((f: any) => !f.isClosed);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Finance</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">GL Accounts</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{accounts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Chart of accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Fiscal Year</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{activeFy?.name ?? "None active"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeFy ? `${activeFy.startDate?.slice(0, 10)} to ${activeFy.endDate?.slice(0, 10)}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={activeFy?.isClosed ? "destructive" : "default"}>
              {activeFy?.isClosed ? "Closed" : "Open"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trial Balance</CardTitle>
          <Button size="sm" onClick={loadTrialBalance} disabled={loadingReport || !fiscalYears.length}>
            {loadingReport ? "Loading..." : "Generate"}
          </Button>
        </CardHeader>
        <CardContent>
          {!report ? (
            <p className="text-sm text-muted-foreground">Select fiscal year and generate.</p>
          ) : (
            <div className="divide-y">
              {(report.accounts ?? []).map((a: any) => (
                <div key={a.code} className="py-1.5 flex items-center justify-between text-sm">
                  <span>{a.code} — {a.name}</span>
                  <div className="flex gap-8">
                    <span className="text-green-600">Dr: {Number(a.debit ?? 0).toLocaleString()}</span>
                    <span className="text-red-600">Cr: {Number(a.credit ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Chart of Accounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts. Run seed.</p>
          ) : (
            <div className="divide-y">
              {accounts.map((a: any) => (
                <div key={a.id} className="py-1.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground mr-2">{a.code}</span>
                    <span className="text-sm">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.type}</Badge>
                    <span className="text-sm">₹{Number(a.balance ?? 0).toLocaleString()}</span>
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
