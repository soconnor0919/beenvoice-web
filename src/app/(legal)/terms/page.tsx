import type { Metadata } from "next";

import { LegalPageShell } from "~/components/legal/legal-page-shell";
import { TermsOfServiceContent } from "~/components/legal/terms-of-service-content";
import { brand } from "~/lib/branding";

export const metadata: Metadata = {
  title: `Terms of Service | ${brand.name}`,
  description: `Terms governing your use of the ${brand.name} platform.`,
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service">
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
