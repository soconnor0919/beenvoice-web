import {
  Settings,
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  BarChart2,
  Shield,
  RefreshCw,
  Clock,
} from "lucide-react";

export interface NavLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavSection {
  title: string;
  links: NavLink[];
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/entities") {
    return (
      pathname === href ||
      pathname.startsWith("/dashboard/clients") ||
      pathname.startsWith("/dashboard/businesses")
    );
  }
  return pathname === href;
}

export const navigationConfig: NavSection[] = [
  {
    title: "Main",
    links: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Time clock", href: "/dashboard/time-clock", icon: Clock },
      { name: "Entities", href: "/dashboard/entities", icon: Users },
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
      { name: "Recurring", href: "/dashboard/invoices/recurring", icon: RefreshCw },
      { name: "Expenses", href: "/dashboard/expenses", icon: Receipt },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart2 },
    ],
  },
  {
    title: "Account",
    links: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      {
        name: "Administration",
        href: "/dashboard/administration",
        icon: Shield,
      },
    ],
  },
];
