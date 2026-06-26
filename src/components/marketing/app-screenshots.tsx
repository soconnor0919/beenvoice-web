import {
  BarChart3,
  Clock,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Timer,
  Users,
} from "lucide-react";
import { BrowserFrame } from "~/components/marketing/browser-frame";
import { getAppHost } from "~/lib/app-url";
import { cn } from "~/lib/utils";

const appHost = getAppHost();

function MockSidebar({ active }: { active: "dashboard" | "invoices" | "time" }) {
  const items = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "invoices" as const, label: "Invoices", icon: FileText },
    { id: "time" as const, label: "Time clock", icon: Timer },
    { id: "clients" as const, label: "Clients", icon: Users },
    { id: "expenses" as const, label: "Expenses", icon: Receipt },
    { id: "reports" as const, label: "Reports", icon: BarChart3 },
  ];

  return (
    <aside className="bg-card/90 hidden w-36 shrink-0 border-r p-3 sm:block">
      <div className="text-primary mb-4 font-mono text-xs font-bold">$ beenvoice</div>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </nav>
      <div className="text-muted-foreground mt-6 flex items-center gap-2 px-2 text-[10px]">
        <Settings className="h-3 w-3" />
        Settings
      </div>
    </aside>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "draft" | "sent" | "paid" | "overdue";
}) {
  const tones = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    overdue: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function InvoicesScreenshot({ className }: { className?: string }) {
  const rows = [
    { client: "Northwind Studio", id: "INV-1042", amount: "$1,850.00", status: "sent" as const },
    { client: "Harbor & Co.", id: "INV-1041", amount: "$640.00", status: "paid" as const },
    { client: "Lumen Creative", id: "INV-1040", amount: "$2,100.00", status: "draft" as const },
    { client: "Field Notes Ltd", id: "INV-1039", amount: "$420.00", status: "overdue" as const },
  ];

  return (
    <BrowserFrame className={className} url={`${appHost}/dashboard/invoices`}>
      <div className="flex min-h-[280px] sm:min-h-[320px]">
        <MockSidebar active="invoices" />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm font-semibold sm:text-base">
                Invoices
              </h3>
              <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-xs">
                Draft, send, and track what you&apos;re owed.
              </p>
            </div>
            <div className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-[10px] font-medium">
              New invoice
            </div>
          </div>

          <div className="bg-card overflow-hidden rounded-xl border">
            <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-2 border-b px-3 py-2 text-[9px] font-medium uppercase tracking-wide sm:grid-cols-[1.2fr_0.8fr_auto_auto] sm:px-4">
              <span>Client</span>
              <span className="hidden sm:block">Invoice</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-3 py-2.5 text-[10px] last:border-0 sm:grid-cols-[1.2fr_0.8fr_auto_auto] sm:px-4 sm:text-xs"
              >
                <span className="truncate font-medium">{row.client}</span>
                <span className="text-muted-foreground hidden sm:block">{row.id}</span>
                <span className="tabular-nums">{row.amount}</span>
                <StatusBadge tone={row.status}>
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function TimeClockScreenshot({ className }: { className?: string }) {
  return (
    <BrowserFrame className={className} url={`${appHost}/dashboard/time-clock`}>
      <div className="flex min-h-[260px] sm:min-h-[300px]">
        <MockSidebar active="time" />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="font-heading text-sm font-semibold sm:text-base">
              Time clock
            </h3>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-xs">
              Track billable hours and roll them into invoices.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-card rounded-xl border p-4">
              <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-medium">
                <Timer className="h-3 w-3" />
                Active session
              </div>
              <div className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
                02:14:38
              </div>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Brand refresh — Northwind Studio
              </p>
              <div className="mt-4 flex gap-2">
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-[10px] font-medium">
                  Stop
                </div>
                <div className="border-border rounded-lg border px-3 py-1.5 text-[10px] font-medium">
                  Pause
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[10px] font-medium">
                <Clock className="h-3 w-3" />
                Recent entries
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Wireframes", time: "1h 20m", client: "Harbor & Co." },
                  { label: "Copy edits", time: "45m", client: "Lumen Creative" },
                  { label: "Kickoff call", time: "30m", client: "Field Notes Ltd" },
                ].map((entry) => (
                  <div
                    key={entry.label}
                    className="flex items-center justify-between gap-2 text-[10px] sm:text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.label}</p>
                      <p className="text-muted-foreground truncate">{entry.client}</p>
                    </div>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {entry.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function DashboardScreenshot({ className }: { className?: string }) {
  return (
    <BrowserFrame className={className} url={`${appHost}/dashboard`}>
      <div className="flex min-h-[260px] sm:min-h-[300px]">
        <MockSidebar active="dashboard" />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="font-heading text-sm font-semibold sm:text-base">
              Good afternoon
            </h3>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-xs">
              Here&apos;s what needs your attention.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-card rounded-xl border p-4">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Awaiting payment
              </p>
              <p className="font-heading mt-2 text-lg font-semibold">3 invoices</p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Follow up on sent invoices when you&apos;re ready.
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Timer running
              </p>
              <p className="font-heading mt-2 text-lg font-semibold tabular-nums">
                02:14:38
              </p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Northwind Studio · Brand refresh
              </p>
            </div>
          </div>

          <div className="bg-card mt-3 rounded-xl border p-4">
            <p className="mb-3 text-[10px] font-medium">Recent activity</p>
            <div className="space-y-2">
              {[
                "Invoice INV-1042 sent to Northwind Studio",
                "Timer started for Brand refresh",
                "Client Harbor & Co. updated",
              ].map((line) => (
                <div
                  key={line}
                  className="text-muted-foreground flex items-center gap-2 text-[10px] sm:text-xs"
                >
                  <span className="bg-primary/60 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span className="truncate">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
