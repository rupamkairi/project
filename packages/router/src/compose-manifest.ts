import type { ComponentType } from "react";

export type ComposeIcon = ComponentType<{ className?: string }>;

export interface ComposeNavItem {
  label: string;
  path: string;
  icon: ComposeIcon;
  children?: ComposeNavItem[];
}

export interface ComposeManifest {
  id: string;
  label: string;
  icon: ComposeIcon;
  prefix: string;
  navItems: ComposeNavItem[];
  version?: string;
  description?: string;
}
