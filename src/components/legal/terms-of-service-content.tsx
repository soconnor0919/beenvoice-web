import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  LEGAL_PRIVACY_EMAIL,
  LEGAL_TERMS_EMAIL,
  LEGAL_WEBSITE,
} from "~/lib/legal";
import { brand } from "~/lib/branding";

export function TermsOfServiceContent() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Agreement to Terms</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of the{" "}
            {brand.name} platform and services (the &quot;Service&quot;) operated
            by {brand.name} (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
          </p>
          <p>
            By accessing or using our Service, you agree to be bound by these
            Terms. If you disagree with any part of these terms, then you may not
            access the Service.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            {brand.name} is a web-based invoicing platform that allows users to:
          </p>
          <ul>
            <li>Create and manage professional invoices</li>
            <li>Track client information and billing details</li>
            <li>Clock time and convert entries into billable work</li>
            <li>Monitor payment status and financial metrics</li>
            <li>Generate reports and analytics</li>
            <li>Manage business profiles and settings</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            When you create an account with us, you must provide information that
            is accurate, complete, and current at all times. You are responsible
            for safeguarding the password and for all activities that occur
            under your account.
          </p>
          <p>
            You agree not to disclose your password to any third party. You must
            notify us immediately upon becoming aware of any breach of security
            or unauthorized use of your account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acceptable Use</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>You agree not to use the Service:</p>
          <ul>
            <li>
              For any unlawful purpose or to solicit others to perform unlawful
              acts
            </li>
            <li>
              To violate any international, federal, provincial, or state
              regulations, rules, laws, or local ordinances
            </li>
            <li>
              To infringe upon or violate our intellectual property rights or
              the intellectual property rights of others
            </li>
            <li>
              To harass, abuse, insult, harm, defame, slander, disparage,
              intimidate, or discriminate
            </li>
            <li>To submit false or misleading information</li>
            <li>
              To upload or transmit viruses or any other type of malicious code
            </li>
            <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
            <li>For any obscene or immoral purpose</li>
            <li>
              To interfere with or circumvent the security features of the
              Service
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data and Privacy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Your privacy is important to us. Please review our{" "}
            <Link href="/privacy">Privacy Policy</Link>, which also governs your
            use of the Service, to understand our practices.
          </p>
          <p>
            You retain ownership of your data. We will not sell, rent, or share
            your personal information with third parties without your explicit
            consent, except as described in our Privacy Policy.
          </p>
          <p>
            You are responsible for backing up your data. While we implement
            regular backups, we recommend you maintain your own copies of
            important information.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Terms</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Some aspects of the Service may require payment. You will be charged
            according to your subscription plan. All fees are non-refundable
            unless otherwise stated.
          </p>
          <p>
            We may change our fees at any time. We will provide you with
            reasonable notice of any fee changes by posting the new fees on the
            Service or sending you email notification.
          </p>
          <p>
            If you fail to pay any fees when due, we may suspend or terminate
            your access to the Service until payment is made.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intellectual Property Rights</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            The Service and its original content, features, and functionality
            are and will remain the exclusive property of {brand.name} and its
            licensors. The Service is protected by copyright, trademark, and
            other laws.
          </p>
          <p>
            Our trademarks and trade dress may not be used in connection with
            any product or service without our prior written consent.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Termination</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            We may terminate or suspend your account and bar access to the
            Service immediately, without prior notice or liability, under our
            sole discretion, for any reason whatsoever and without limitation,
            including but not limited to a breach of the Terms.
          </p>
          <p>
            If you wish to terminate your account, you may discontinue using the
            Service and contact us to request account deletion.
          </p>
          <p>
            Upon termination, your right to use the Service will cease
            immediately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disclaimer of Warranties</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            The information on this Service is provided on an &quot;as is&quot;
            basis. To the fullest extent permitted by law, we exclude all
            representations, warranties, and conditions relating to our Service
            and the use of this Service.
          </p>
          <p>
            Nothing in this disclaimer will limit or exclude our or your
            liability for death or personal injury resulting from negligence,
            fraud, or fraudulent misrepresentation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            In no event shall {brand.name}, nor its directors, employees,
            partners, agents, suppliers, or affiliates, be liable for any
            indirect, incidental, special, consequential, or punitive damages,
            including without limitation, loss of profits, data, use, goodwill, or
            other intangible losses, resulting from your use of the Service.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Governing Law</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            These Terms shall be interpreted and governed by the laws of the
            jurisdiction in which {brand.name} operates, without regard to its
            conflict of law provisions.
          </p>
          <p>
            Our failure to enforce any right or provision of these Terms will
            not be considered a waiver of those rights.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes to Terms</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            We reserve the right, at our sole discretion, to modify or replace
            these Terms at any time. If a revision is material, we will provide
            at least 30 days notice prior to any new terms taking effect.
          </p>
          <p>
            What constitutes a material change will be determined at our sole
            discretion. By continuing to access or use our Service after any
            revisions become effective, you agree to be bound by the revised
            terms.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            If you have any questions about these Terms of Service, please
            contact us at:
          </p>
          <ul>
            <li>
              Email:{" "}
              <a href={`mailto:${LEGAL_TERMS_EMAIL}`}>{LEGAL_TERMS_EMAIL}</a>
            </li>
            <li>
              Privacy inquiries:{" "}
              <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
            </li>
            <li>
              Website:{" "}
              <a href={LEGAL_WEBSITE} target="_blank" rel="noopener noreferrer">
                {LEGAL_WEBSITE}
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
