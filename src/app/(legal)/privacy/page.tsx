import type { Metadata } from "next";

import { PrivacyPolicyContent } from "~/components/legal/privacy-policy-content";
import { LegalPageShell } from "~/components/legal/legal-page-shell";
import { brand } from "~/lib/branding";

export const metadata: Metadata = {
  title: `Privacy Policy | ${brand.name}`,
  description: `How ${brand.name} collects, uses, and protects your data.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
