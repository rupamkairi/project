import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@projectx/ui";
import { erpApi } from "../lib/api/erp";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/tax",
  component: TaxPage,
});

function TaxPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [gstr1Preview, setGstr1Preview] = useState<any>(null);
  const [gstr3bPreview, setGstr3bPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    erpApi.gst.templates().then((res: any) => {
      setTemplates(res.data?.gstTemplates ?? []);
      setLoading(false);
    });
  }, []);

  const loadGstr1 = async () => {
    const res = await erpApi.gst.gstr1Preview(currentPeriod) as any;
    setGstr1Preview(res.data);
  };

  const loadGstr3b = async () => {
    const res = await erpApi.gst.gstr3bPreview(currentPeriod) as any;
    setGstr3bPreview(res.data);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tax / GST</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">GSTR-1 ({currentPeriod})</CardTitle>
            <Button size="sm" variant="outline" onClick={loadGstr1}>Preview</Button>
          </CardHeader>
          <CardContent>
            {!gstr1Preview ? (
              <p className="text-sm text-muted-foreground">Click preview to load.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">B2B Invoices</span>
                  <span>{gstr1Preview.b2b?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">B2C Invoices</span>
                  <span>{gstr1Preview.b2c?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{gstr1Preview.invoiceCount ?? 0} invoices</span>
                </div>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => erpApi.gst.generateGstr1({ period: currentPeriod })}
                >
                  File GSTR-1
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">GSTR-3B ({currentPeriod})</CardTitle>
            <Button size="sm" variant="outline" onClick={loadGstr3b}>Preview</Button>
          </CardHeader>
          <CardContent>
            {!gstr3bPreview ? (
              <p className="text-sm text-muted-foreground">Click preview to load.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outward IGST</span>
                  <span>₹{Number(gstr3bPreview.outward_taxable_supplies?.igst ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outward CGST+SGST</span>
                  <span>₹{(Number(gstr3bPreview.outward_taxable_supplies?.cgst ?? 0) + Number(gstr3bPreview.outward_taxable_supplies?.sgst ?? 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Tax Payable</span>
                  <span className="font-medium text-destructive">
                    ₹{(Object.values(gstr3bPreview.tax_payable ?? {}) as number[]).reduce((s, v) => s + v, 0).toLocaleString()}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => erpApi.gst.generateGstr3b({ period: currentPeriod })}
                >
                  File GSTR-3B
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>GST Templates</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No GST templates. Run seed.</p>
          ) : (
            <div className="divide-y">
              {templates.map((t: any) => (
                <div key={t.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.type}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {Number(t.cgstRate) > 0 && <span>CGST {t.cgstRate}%</span>}
                    {Number(t.sgstRate) > 0 && <span>SGST {t.sgstRate}%</span>}
                    {Number(t.igstRate) > 0 && <span>IGST {t.igstRate}%</span>}
                    {Number(t.cgstRate) === 0 && Number(t.igstRate) === 0 && (
                      <Badge variant="outline">Exempt</Badge>
                    )}
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
