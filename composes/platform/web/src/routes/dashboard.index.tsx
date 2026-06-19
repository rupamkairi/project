import { createRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@projectx/ui";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import {
  Users,
  Shield,
  Bell,
  FileText,
  Mail,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/",
  component: DashboardIndex,
});

type Section = {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
};

const sections: Section[] = [
  {
    title: "Users",
    description: "Manage platform users and access control",
    href: "/dashboard/users",
    Icon: Users,
  },
  {
    title: "Roles",
    description: "Configure roles and permission sets",
    href: "/dashboard/roles",
    Icon: Shield,
  },
  {
    title: "Notifications",
    description: "Manage notification templates and delivery triggers",
    href: "/dashboard/notifications",
    Icon: Bell,
  },
  {
    title: "Files",
    description: "Browse and manage uploaded platform files",
    href: "/dashboard/files",
    Icon: FileText,
  },
  {
    title: "Invites",
    description: "Send and track user invitations",
    href: "/dashboard/invites",
    Icon: Mail,
  },
];

function DashboardIndex() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage platform settings and access.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ title, description, href, Icon }) => (
          <Link key={href} to={href} className="group block focus:outline-none">
            <Card className="h-full cursor-pointer group-hover:bg-accent/50 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                </div>
                <CardTitle className="mt-3 text-sm font-medium">{title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
