import {
  Settings,
  LayoutDashboard,
  Users,
  FileText,
  Building,
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

export const navigationConfig: NavSection[] = [
  {
    title: "Main",
    links: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Clients", href: "/dashboard/clients", icon: Users },
      { name: "Businesses", href: "/dashboard/businesses", icon: Building },
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
      { name: "Recurring", href: "/dashboard/invoices/recurring", icon: RefreshCw },
      { name: "Expenses", href: "/dashboard/expenses", icon: Receipt },
      { name: "Time Clock", href: "/dashboard/time-clock", icon: Clock },
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
