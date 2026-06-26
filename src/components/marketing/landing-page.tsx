import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FileText,
  Mail,
  Receipt,
  Repeat,
  Timer,
  Users,
} from "lucide-react";
import {
  DashboardScreenshot,
  InvoicesScreenshot,
  TimeClockScreenshot,
} from "~/components/marketing/app-screenshots";
import {
  MarketingFooter,
  MarketingHeader,
  MarketingPageShell,
  marketingSurfaceClass,
} from "~/components/marketing/marketing-chrome";
import { Button } from "~/components/ui/button";
import { brand } from "~/lib/branding";
import { cn } from "~/lib/utils";

const features = [
  {
    icon: FileText,
    title: "Invoices that stay organized",
    description:
      "Draft line items, apply taxes, send a link, and export a polished PDF when you need a file.",
  },
  {
    icon: Users,
    title: "Clients and businesses",
    description:
      "Keep the people and companies you bill in one place, with the details you reuse on every invoice.",
  },
  {
    icon: Timer,
    title: "Built-in time clock",
    description:
      "Track billable hours as you work, then pull them straight into an invoice without retyping.",
  },
  {
    icon: Repeat,
    title: "Recurring invoices",
    description:
      "Set up retainers and subscriptions once, then let beenvoice generate the next invoice on schedule.",
  },
  {
    icon: Receipt,
    title: "Expenses",
    description:
      "Log costs alongside your work so nothing gets lost before you bill it out.",
  },
  {
    icon: Mail,
    title: "Send and follow up",
    description:
      "Email invoices from the app and keep status visible from draft through paid.",
  },
];

function FeatureRow({
  title,
  description,
  children,
  reverse = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <div className="space-y-4">
        <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h3>
        <p className="text-muted-foreground max-w-lg text-base leading-7">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function LandingPage({ allowRegistration }: { allowRegistration: boolean }) {
  return (
    <MarketingPageShell>
      <MarketingHeader allowRegistration={allowRegistration} />

      <section className="pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary mb-4 text-sm font-medium tracking-wide uppercase">
            Personal invoicing workspace
          </p>
          <h1 className="font-heading text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Run your freelance admin from one place.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            {brand.name} helps you manage clients, track time, send invoices,
            and stay on top of getting paid — without the weight of a full
            accounting suite.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/signin">
              <Button size="lg" className="h-11 px-6">
                Open workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {allowRegistration && (
              <Link href="/auth/register">
                <Button variant="outline" size="lg" className="h-11 px-6">
                  Create account
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl lg:mt-16">
          <InvoicesScreenshot className="w-full" />
        </div>
      </section>

      <section className="border-border/50 border-t py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything around getting paid, in one flow
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-7">
            {brand.tagline}. Built for one person doing real client work — not
            enterprise dashboards you&apos;ll never open.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-card/70 hover:bg-card/90 border-border/60 rounded-2xl border p-5 backdrop-blur-sm transition-colors"
              >
                <div className="bg-primary/10 text-primary mb-4 inline-flex rounded-xl p-2.5">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold sm:text-base">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-border/50 space-y-20 border-t py-16 sm:space-y-24 sm:py-20">
        <FeatureRow
          title="See your week at a glance"
          description="Open the dashboard to check what's waiting on payment, whether a timer is still running, and what changed recently — without wading through reports."
        >
          <DashboardScreenshot />
        </FeatureRow>

        <FeatureRow
          title="Track time where you already work"
          description="Start a timer for the client and project you're on. When the work is done, turn those hours into invoice line items in a few clicks."
          reverse
        >
          <TimeClockScreenshot />
        </FeatureRow>

        <FeatureRow
          title="Invoices that look professional"
          description="Clean layouts, PDF export, and a shareable link for clients. Mark invoices sent or paid as your pipeline moves."
        >
          <InvoicesScreenshot />
        </FeatureRow>
      </section>

      <section>
        <div
          className={cn(
            marketingSurfaceClass,
            "bg-card/80 relative overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-12",
          )}
        >
          <div className="relative">
            <div className="bg-primary/10 text-primary mx-auto mb-4 inline-flex rounded-full p-3">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to simplify your invoicing?
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-6 sm:text-base">
              Sign in to your workspace or create an account to start with
              clients, invoices, and time tracking in minutes.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/auth/signin">
                <Button size="lg" className="h-11 px-6">
                  Open workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {allowRegistration && (
                <Link href="/auth/register">
                  <Button variant="outline" size="lg" className="h-11 px-6">
                    Create account
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
