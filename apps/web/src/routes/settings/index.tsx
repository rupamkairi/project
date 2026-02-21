import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockPlatformSettings, timezones } from "@/lib/mock-data";
import { useState } from "react";
import { Save } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/settings",
  component: GeneralSettings,
});

function GeneralSettings() {
  const [settings, setSettings] = useState(mockPlatformSettings);

  const handleSave = () => {
    console.log("Saving settings:", settings);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="General Settings" description="Platform configuration">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) =>
                    setSettings({ ...settings, platformName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Select
                  value={settings.defaultTimezone}
                  onValueChange={(value) =>
                    setSettings({ ...settings, defaultTimezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="completionThreshold">
                  Completion Threshold (%)
                </Label>
                <Input
                  id="completionThreshold"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.completionThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      completionThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Minimum percentage required to mark a course as completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/dashboard/settings/payments">
                <Button variant="outline" className="w-full justify-start">
                  Payment Settings
                </Button>
              </Link>
              <Link to="/dashboard/settings/team">
                <Button variant="outline" className="w-full justify-start">
                  Team Management
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
