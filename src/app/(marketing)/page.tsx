import { LandingPage } from "~/components/marketing/landing-page";
import { env } from "~/env";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const allowRegistration = env.DISABLE_SIGNUPS !== true;

  return (
    <main className="min-h-screen">
      <LandingPage allowRegistration={allowRegistration} />
    </main>
  );
}
