import Link from "next/link";
import { ArrowRight, FileText, UserRound } from "lucide-react";
import { AuthRedirect } from "~/components/AuthRedirect";
import { Logo } from "~/components/branding/logo";
import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { brand } from "~/lib/branding";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const allowRegistration = env.DISABLE_SIGNUPS !== true;

  return (
    <main className="bg-background text-foreground min-h-screen">
      <AuthRedirect />

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b py-4">
          <Logo animated={false} />
          <nav className="flex items-center gap-2">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            {allowRegistration && (
              <Link href="/auth/register">
                <Button size="sm">Create account</Button>
              </Link>
            )}
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 md:grid-cols-[1fr_320px] md:py-20">
          <div className="max-w-2xl space-y-7">
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm font-medium">
                Personal invoicing
              </p>
              <h1 className="font-heading text-4xl leading-tight font-bold tracking-normal sm:text-5xl">
                {brand.name} is a place to make and track invoices.
              </h1>
              <p className="text-muted-foreground max-w-xl text-base leading-7 sm:text-lg">
                Built for one person managing real clients, real work, and the
                small admin loop around getting paid.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signin">
                <Button size="lg" className="h-11 px-5">
                  Open workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {allowRegistration && (
                <Link href="/auth/register">
                  <Button variant="outline" size="lg" className="h-11 px-5">
                    Create account
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary rounded-md p-2">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Clients</h2>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Keep the people and businesses you invoice in one place.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t pt-5">
                <div className="bg-primary/10 text-primary rounded-md p-2">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Invoices</h2>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Draft, send, mark paid, and export the PDF when you need it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-muted-foreground flex flex-col gap-3 border-t py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 {brand.name}</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
