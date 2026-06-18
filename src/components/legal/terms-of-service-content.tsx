import Link from "next/link";

import {
  LEGAL_PRIVACY_EMAIL,
  LEGAL_TERMS_EMAIL,
  LEGAL_WEBSITE,
} from "~/lib/legal";
import { brand } from "~/lib/branding";
import {
  LegalDocument,
  LegalParagraph,
  type LegalSection,
} from "~/components/legal/legal-document";

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    children: (
      <>
        <LegalParagraph>
          These Terms of Service (“Terms”) govern your use of the {brand.name}{" "}
          platform, including the web app and mobile app (the “Service”).
        </LegalParagraph>
        <LegalParagraph>
          By accessing or using the Service, you agree to these Terms. If you do
          not agree, do not use the Service.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "service",
    title: "The Service",
    children: (
      <>
        <LegalParagraph>
          {brand.name} helps you create and manage invoices, track clients and
          businesses, record billable time, and review basic financial summaries.
          You may use the official hosted Service or connect the mobile app to a
          self-hosted {brand.name} server you control.
        </LegalParagraph>
        <LegalParagraph>
          The Service is a tool for your business records. We do not provide
          legal, tax, or accounting advice, and you are responsible for the
          accuracy of invoices and compliance with laws that apply to you.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and security",
    children: (
      <>
        <LegalParagraph>
          When you create an account, you agree to provide accurate information
          and keep it up to date. You are responsible for activity under your
          account and for keeping your credentials secure.
        </LegalParagraph>
        <LegalParagraph>
          Notify us promptly if you suspect unauthorized access to your account.
          We may suspend or restrict access if we believe your account is
          compromised or used in violation of these Terms.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    children: (
      <>
        <LegalParagraph>
          You agree to use the Service lawfully and only for its intended
          purpose. You may not use the Service to break the law, infringe
          others’ rights, transmit malware, attempt to gain unauthorized access,
          interfere with the Service’s operation, or harass or harm others.
        </LegalParagraph>
        <LegalParagraph>
          You may not use the Service to send spam, publish false or misleading
          information, or scrape or overload our systems without permission.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "data-privacy",
    title: "Your data and privacy",
    children: (
      <>
        <LegalParagraph>
          Your privacy matters to us. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains how we collect
          and use information and is incorporated into these Terms.
        </LegalParagraph>
        <LegalParagraph>
          You retain ownership of the content you enter into the Service, such as
          clients, invoices, and time entries. We do not sell your personal
          information. We may process your data as described in the Privacy
          Policy to provide and secure the Service.
        </LegalParagraph>
        <LegalParagraph>
          You are responsible for maintaining your own backups of important
          business records. While we take reasonable steps to protect data, you
          should not rely on the Service as your only copy of critical
          information.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees",
    children: (
      <>
        <LegalParagraph>
          Access to the Service may be offered without charge today, but we
          reserve the right to introduce fees for certain features or hosted
          plans in the future. If we do, we will provide reasonable notice
          before any new fees apply to you.
        </LegalParagraph>
        <LegalParagraph>
          The mobile app does not offer in-app purchases. If you run a
          self-hosted instance, you are responsible for the costs and
          administration of that environment.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    children: (
      <>
        <LegalParagraph>
          The Service, including its software, design, and branding, is owned by{" "}
          {brand.name} and its licensors and is protected by applicable
          intellectual property laws.
        </LegalParagraph>
        <LegalParagraph>
          You may not copy, modify, or reverse engineer the Service except where
          the law expressly allows. Our name and marks may not be used without
          our prior written permission.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    children: (
      <>
        <LegalParagraph>
          You may stop using the Service at any time. You may also contact us to
          request account deletion.
        </LegalParagraph>
        <LegalParagraph>
          We may suspend or terminate your access if you violate these Terms, if
          required by law, or if we discontinue the Service. Upon termination,
          your right to use the Service ends immediately, subject to any legal
          obligations that require us to retain certain data.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and limitation of liability",
    children: (
      <>
        <LegalParagraph>
          The Service is provided “as is” and “as available.” To the fullest
          extent permitted by law, we disclaim warranties of merchantability,
          fitness for a particular purpose, and non-infringement. We do not
          guarantee that the Service will be uninterrupted or error-free.
        </LegalParagraph>
        <LegalParagraph>
          To the fullest extent permitted by law, {brand.name} and its
          affiliates will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or for loss of profits, data, or
          goodwill, arising from your use of the Service.
        </LegalParagraph>
        <LegalParagraph>
          Nothing in these Terms limits liability that cannot be limited under
          applicable law, including liability for fraud or for death or personal
          injury caused by negligence.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    children: (
      <>
        <LegalParagraph>
          These Terms are governed by the laws applicable where {brand.name}{" "}
          operates, without regard to conflict-of-law rules. If we do not
          enforce a provision, that does not waive our right to enforce it
          later.
        </LegalParagraph>
        <LegalParagraph>
          We may update these Terms from time to time. If we make material
          changes, we will post the updated Terms on the Service and may notify
          you by email. Continued use after changes take effect means you accept
          the revised Terms.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    children: (
      <>
        <LegalParagraph>
          Questions about these Terms:{" "}
          <a href={`mailto:${LEGAL_TERMS_EMAIL}`}>{LEGAL_TERMS_EMAIL}</a>.
          Privacy questions:{" "}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>.
          Website:{" "}
          <a href={LEGAL_WEBSITE} target="_blank" rel="noopener noreferrer">
            {LEGAL_WEBSITE.replace(/^https?:\/\//, "")}
          </a>
          .
        </LegalParagraph>
      </>
    ),
  },
];

export function TermsOfServiceContent() {
  return <LegalDocument sections={sections} />;
}
