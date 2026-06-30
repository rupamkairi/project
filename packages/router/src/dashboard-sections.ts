import {
  Activity,
  BookOpen,
  Building2,
  FileText,
  Bell,
  GraduationCap,
  LayoutDashboard,
  Mail,
  GitBranch,
  MapPin,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface DashboardCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count: number;
}

export interface DashboardSection {
  title: string;
  description?: string;
  cards: DashboardCard[];
}

export const platformNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Overview", href: "/dashboard/overview", icon: Activity },
  { label: "Persons", href: "/dashboard/persons", icon: Users },
  { label: "Parties", href: "/dashboard/parties", icon: Building2 },
  { label: "Locations", href: "/dashboard/locations", icon: MapPin },
  { label: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { label: "Pipelines", href: "/dashboard/pipelines", icon: GitBranch },
  { label: "Activities", href: "/dashboard/activities", icon: Activity },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Roles", href: "/dashboard/roles", icon: Shield },
  { label: "Invites", href: "/dashboard/invites", icon: Mail },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Files", href: "/dashboard/files", icon: FileText },
] as const;

export const dashboardSections: DashboardSection[] = [
  {
    title: "Platform",
    cards: [
      {
        title: "Platform",
        description: "Platform admin and shared utilities",
        href: "/dashboard",
        icon: LayoutDashboard,
        count: 6,
      },
    ],
  },
  {
    title: "CRM",
    cards: [
      {
        title: "CRM",
        description: "Contacts, deals, leads, campaigns, and support tickets",
        href: "/crm",
        icon: Users,
        count: 9,
      },
    ],
  },
  {
    title: "Ecommerce",
    cards: [
      {
        title: "Ecommerce Admin",
        description: "Store operations",
        href: "/ecommerce/admin",
        icon: ShoppingBag,
        count: 9,
      },
      {
        title: "Ecommerce Storefront",
        description: "Customer storefront",
        href: "/ecommerce/store",
        icon: Store,
        count: 6,
      },
    ],
  },
  {
    title: "ERP",
    cards: [
      {
        title: "ERP",
        description: "ERP operations",
        href: "/erp",
        icon: Package,
        count: 9,
      },
    ],
  },
  {
    title: "Learning Management",
    cards: [
      {
        title: "My Learning",
        description: "Browse courses, track progress, and view certificates",
        href: "/lms/learn/dashboard",
        icon: GraduationCap,
        count: 4,
      },
      {
        title: "Teaching",
        description: "Create and manage courses, view analytics",
        href: "/lms/teach/dashboard",
        icon: BookOpen,
        count: 6,
      },
      {
        title: "LMS Admin",
        description: "Manage courses, enrollments, instructors, and settings",
        href: "/lms/admin/dashboard",
        icon: Settings,
        count: 7,
      },
    ],
  },
  {
    title: "Restaurant",
    cards: [
      {
        title: "POS",
        description: "Order entry and table service",
        href: "/restaurants/pos/orders",
        icon: Receipt,
        count: 4,
      },
      {
        title: "KDS",
        description: "Kitchen display and ticket handling",
        href: "/restaurants/kds",
        icon: Activity,
        count: 1,
      },
      {
        title: "Delivery",
        description: "Dispatch and rider operations",
        href: "/restaurants/delivery/dispatch",
        icon: Users,
        count: 2,
      },
      {
        title: "Customer",
        description: "Customer menu, cart, and order tracking",
        href: "/restaurants/customer/menu",
        icon: Store,
        count: 3,
      },
      {
        title: "Admin",
        description: "Restaurant operations and analytics",
        href: "/restaurants/admin/dashboard",
        icon: UtensilsCrossed,
        count: 5,
      },
    ],
  },
];
