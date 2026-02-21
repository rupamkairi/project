import type { NavItem, NavGroup, NavigationItem } from "./types";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Users,
  GraduationCap,
  Award,
  Bell,
  Settings,
  BarChart3,
  DollarSign,
  CreditCard,
  UserCog,
} from "lucide-react";

export type { NavItem, NavGroup, NavigationItem };

export const lmsNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/lms/dashboard", icon: LayoutDashboard },
  {
    name: "Analytics",
    icon: BarChart3,
    children: [
      { name: "Overview", href: "/lms/analytics", icon: BarChart3 },
      { name: "Revenue", href: "/lms/analytics/revenue", icon: DollarSign },
      { name: "Courses", href: "/lms/analytics/courses", icon: BookOpen },
      { name: "Instructors", href: "/lms/analytics/instructors", icon: Users },
    ],
  },
  { name: "Courses", href: "/lms/courses", icon: BookOpen },
  { name: "Review Queue", href: "/lms/review-queue", icon: ClipboardCheck },
  { name: "Learners", href: "/lms/learners", icon: GraduationCap },
  { name: "Enrollments", href: "/lms/enrollments", icon: Users },
  { name: "Certificates", href: "/lms/certificates", icon: Award },
  { name: "Notifications", href: "/lms/notifications", icon: Bell },
  {
    name: "Settings",
    icon: Settings,
    children: [
      { name: "General", href: "/lms/settings", icon: Settings },
      { name: "Payments", href: "/lms/settings/payments", icon: CreditCard },
      { name: "Team", href: "/lms/settings/team", icon: UserCog },
    ],
  },
];

export const lmsMeta = {
  name: "LMS Admin",
  description: "Learning Management System Admin Panel",
  version: "1.0.0",
  routePrefix: "/lms",
};
