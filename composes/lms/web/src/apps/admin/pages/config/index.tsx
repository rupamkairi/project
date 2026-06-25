import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { lmsApi } from "../../../../api/lms-client";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@projectx/ui";

export function LmsConfigPage() {
  const { data: config } = useQuery({
    queryKey: ["lms-config"],
    queryFn: () => lmsApi.get<any>("/admin/config"),
  });

  const [form, setForm] = useState({
    defaultCompletionThreshold: 80,
    refundWindowDays: 7,
    inactivityNudgeDays: 7,
    maxQuizAttempts: 3,
    certificateExpiresAfterDays: "",
    allowGuestAccess: false,
  });

  useEffect(() => {
    if (config) {
      setForm({
        defaultCompletionThreshold: config.defaultCompletionThreshold ?? 80,
        refundWindowDays: config.refundWindowDays ?? 7,
        inactivityNudgeDays: config.inactivityNudgeDays ?? 7,
        maxQuizAttempts: config.maxQuizAttempts ?? 3,
        certificateExpiresAfterDays: config.certificateExpiresAfterDays ?? "",
        allowGuestAccess: config.allowGuestAccess ?? false,
      });
    }
  }, [config]);

  const update = useMutation({
    mutationFn: (data: typeof form) => lmsApi.patch("/admin/config", data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(form);
  };

  return (
    <div className="max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">LMS Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Global settings for the learning management system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="completion">Completion Threshold %</Label>
              <Input
                id="completion"
                type="number"
                value={form.defaultCompletionThreshold}
                onChange={(e) =>
                  setForm({ ...form, defaultCompletionThreshold: parseInt(e.target.value) || 80 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refund">Refund Window (days)</Label>
              <Input
                id="refund"
                type="number"
                value={form.refundWindowDays}
                onChange={(e) =>
                  setForm({ ...form, refundWindowDays: parseInt(e.target.value) || 7 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nudge">Inactivity Nudge (days)</Label>
              <Input
                id="nudge"
                type="number"
                value={form.inactivityNudgeDays}
                onChange={(e) =>
                  setForm({ ...form, inactivityNudgeDays: parseInt(e.target.value) || 7 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-attempts">Max Quiz Attempts</Label>
              <Input
                id="quiz-attempts"
                type="number"
                value={form.maxQuizAttempts}
                onChange={(e) =>
                  setForm({ ...form, maxQuizAttempts: parseInt(e.target.value) || 3 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-expiry">
                Certificate Expiry (days, blank = never)
              </Label>
              <Input
                id="cert-expiry"
                type="number"
                value={form.certificateExpiresAfterDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    certificateExpiresAfterDays: e.target.value,
                  })
                }
              />
            </div>

            {update.isSuccess && (
              <p className="text-sm text-green-600">Configuration saved</p>
            )}
            {update.isError && (
              <p className="text-sm text-red-500">
                Failed to save: {(update.error as any)?.message ?? "Unknown error"}
              </p>
            )}

            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save Config"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
