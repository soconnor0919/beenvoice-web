import {
  LEGAL_PRIVACY_EMAIL,
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
    id: "introduction",
    title: "Introduction",
    children: (
      <>
        <LegalParagraph>
          This Privacy Policy explains how {brand.name} collects, uses, and protects
          information when you use our invoicing platform, including the web app and mobile
          app (the “Service”).
        </LegalParagraph>
        <LegalParagraph>
          If you have questions about this policy, email us at{" "}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    children: (
      <>
        <LegalParagraph>
          When you create an account and use the Service, you provide information such as
          your name, email address, business details, client records, invoice content, and
          time entries. This is the data you enter to run your invoicing workflow.
        </LegalParagraph>
        <LegalParagraph>
          You may also add payment instructions that appear on invoices, such as bank
          transfer details. We do not process card payments on your behalf.
        </LegalParagraph>
        <LegalParagraph>
          We also collect some technical information automatically so the Service stays
          secure and reliable. This can include your IP address, device and browser or app
          details, log and diagnostic data, and session cookies that keep you signed in.
          Some deployments may use optional, privacy-focused analytics.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    children: (
      <>
        <LegalParagraph>
          We use your information to provide and operate the Service, authenticate your
          account, send transactional messages such as password resets, respond to support
          requests, monitor security and performance, and meet legal obligations.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "how-we-share",
    title: "How we share information",
    children: (
      <>
        <LegalParagraph>
          We do not sell your personal information. We share it only when needed to run the
          Service or when the law requires it.
        </LegalParagraph>
        <LegalParagraph>
          We work with service providers that host our infrastructure, deliver transactional
          email, support single sign-on when enabled on your instance, and optionally provide
          privacy-focused analytics. These vendors may process your information only to
          perform services for us.
        </LegalParagraph>
        <LegalParagraph>
          We may disclose information if we believe it is reasonably necessary to comply with
          law, respond to a valid legal request, or protect the security and integrity of the
          Service.
        </LegalParagraph>
        <LegalParagraph>
          If we are involved in a merger, acquisition, or sale of assets, your information
          may be transferred as part of that transaction, subject to continued protection
          consistent with this policy.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "security-retention",
    title: "Security and retention",
    children: (
      <>
        <LegalParagraph>
          We use reasonable safeguards to protect information, including encryption in
          transit, access controls, and secure authentication. No method of transmission or
          storage is completely secure.
        </LegalParagraph>
        <LegalParagraph>
          We retain information for as long as you have an account or as needed to provide
          the Service. We may keep certain records longer when required by law or for
          legitimate purposes such as fraud prevention or dispute resolution.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    children: (
      <>
        <LegalParagraph>
          Depending on where you live, you may have the right to access, correct, delete, or
          export your personal information, or to object to or restrict certain processing.
        </LegalParagraph>
        <LegalParagraph>
          To exercise these rights, contact us at{" "}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>. We will
          respond within a reasonable timeframe and as required by applicable law.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    children: (
      <>
        <LegalParagraph>
          We use cookies and similar technologies to keep you signed in, remember
          preferences such as theme, and, when enabled on a deployment, measure usage with
          privacy-focused analytics.
        </LegalParagraph>
        <LegalParagraph>
          You can control cookies through your browser settings. If you disable essential
          cookies, some parts of the Service may not work correctly.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "other",
    title: "Other disclosures",
    children: (
      <>
        <LegalParagraph>
          The Service may link to third-party websites or integrate with services you
          configure, such as single sign-on. Those services have their own privacy policies,
          and we are not responsible for their practices.
        </LegalParagraph>
        <LegalParagraph>
          The Service is not intended for children under 13. If you believe a child has
          provided us personal information, contact us and we will delete it.
        </LegalParagraph>
        <LegalParagraph>
          Your information may be processed in countries other than your own. Where required,
          we use appropriate safeguards for international transfers.
        </LegalParagraph>
        <LegalParagraph>
          We may update this policy from time to time. If we make material changes, we will
          post the updated policy on the Service and may notify you by email. Continued use
          after changes take effect means you accept the updated policy.
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
          For privacy questions or requests, email{" "}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a> or visit{" "}
          <a href={LEGAL_WEBSITE} target="_blank" rel="noopener noreferrer">
            {LEGAL_WEBSITE.replace(/^https?:\/\//, "")}
          </a>
          .
        </LegalParagraph>
      </>
    ),
  },
];

export function PrivacyPolicyContent() {
  return <LegalDocument sections={sections} />;
}
