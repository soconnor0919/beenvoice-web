import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  LEGAL_PRIVACY_EMAIL,
  LEGAL_TERMS_EMAIL,
  LEGAL_WEBSITE,
} from "~/lib/legal";
import { brand } from "~/lib/branding";

export function PrivacyPolicyContent() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            {brand.name} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when
            you use our invoicing platform and services.
          </p>
          <p>
            Please read this Privacy Policy carefully. If you do not agree with
            the terms of this Privacy Policy, please do not access or use our
            Service.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h4>Personal Information</h4>
          <p>
            We may collect personal information that you voluntarily provide to
            us when you:
          </p>
          <ul>
            <li>Register for an account</li>
            <li>Create invoices or manage client information</li>
            <li>Track time entries and billing activity</li>
            <li>Contact us for support</li>
            <li>Subscribe to our newsletters or communications</li>
          </ul>

          <p>This personal information may include:</p>
          <ul>
            <li>Name and contact information (email, phone, address)</li>
            <li>Business information and tax details</li>
            <li>Client information you input into the system</li>
            <li>Financial information related to your invoices</li>
            <li>
              Payment information (processed securely by third-party providers)
            </li>
          </ul>

          <h4>Automatically Collected Information</h4>
          <p>
            We may automatically collect certain information when you visit our
            Service:
          </p>
          <ul>
            <li>
              Device information (IP address, browser type, operating system)
            </li>
            <li>Usage data (pages visited, time spent, features used)</li>
            <li>Log files and analytics data</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How We Use Your Information</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain our Service</li>
            <li>Process your transactions and manage your account</li>
            <li>Improve and personalize your experience</li>
            <li>Communicate with you about your account and our services</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor usage and analyze trends</li>
            <li>
              Detect, prevent, and address technical issues and security
              breaches
            </li>
            <li>Comply with legal obligations</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How We Share Your Information</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            We do not sell, trade, or rent your personal information to third
            parties. We may share your information in the following
            circumstances:
          </p>

          <h4>Service Providers</h4>
          <p>
            We may share your information with trusted third-party service
            providers who assist us in operating our Service, such as:
          </p>
          <ul>
            <li>Cloud hosting and storage providers</li>
            <li>Payment processors</li>
            <li>Email service providers</li>
            <li>Analytics and monitoring services</li>
          </ul>

          <h4>Legal Requirements</h4>
          <p>
            We may disclose your information if required to do so by law or in
            response to:
          </p>
          <ul>
            <li>Legal processes (subpoenas, court orders)</li>
            <li>Government requests</li>
            <li>Law enforcement investigations</li>
            <li>Protection of our rights, property, or safety</li>
          </ul>

          <h4>Business Transfers</h4>
          <p>
            In the event of a merger, acquisition, or sale of assets, your
            information may be transferred as part of that transaction.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Security</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            We implement appropriate technical and organizational security
            measures to protect your information:
          </p>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Secure access controls and authentication</li>
            <li>Regular security assessments and updates</li>
            <li>Employee training on data protection</li>
            <li>Incident response procedures</li>
          </ul>
          <p>
            However, no method of transmission over the internet or electronic
            storage is 100% secure. While we strive to protect your information,
            we cannot guarantee absolute security.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            We retain your personal information only for as long as necessary to
            fulfill the purposes outlined in this Privacy Policy, unless a
            longer retention period is required by law.
          </p>
          <p>
            Factors we consider when determining retention periods include:
          </p>
          <ul>
            <li>The nature and sensitivity of the information</li>
            <li>Legal and regulatory requirements</li>
            <li>Business and operational needs</li>
            <li>Your account status and activity</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Rights and Choices</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Depending on your location, you may have the following rights
            regarding your personal information:
          </p>

          <h4>Access and Portability</h4>
          <ul>
            <li>Request access to your personal information</li>
            <li>Receive a copy of your data in a portable format</li>
          </ul>

          <h4>Correction and Updates</h4>
          <ul>
            <li>Correct inaccurate or incomplete information</li>
            <li>Update your account information at any time</li>
          </ul>

          <h4>Deletion</h4>
          <ul>
            <li>Request deletion of your personal information</li>
            <li>Close your account and remove your data</li>
          </ul>

          <h4>Restriction and Objection</h4>
          <ul>
            <li>Restrict the processing of your information</li>
            <li>Object to certain uses of your data</li>
          </ul>

          <p>
            To exercise these rights, please contact us using the information
            provided in the &quot;Contact Us&quot; section below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cookies and Tracking Technologies</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>We use cookies and similar technologies to:</p>
          <ul>
            <li>Remember your preferences and settings</li>
            <li>Authenticate your account</li>
            <li>Analyze usage patterns and improve our Service</li>
            <li>Provide personalized content and features</li>
          </ul>

          <p>
            You can control cookies through your browser settings. However,
            disabling cookies may affect the functionality of our Service.
          </p>

          <h4>Types of Cookies We Use</h4>
          <ul>
            <li>
              <strong>Essential Cookies:</strong> Required for the Service to
              function properly
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us understand how you use
              our Service
            </li>
            <li>
              <strong>Preference Cookies:</strong> Remember your settings and
              preferences
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Third-Party Links and Services</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Our Service may contain links to third-party websites or integrate
            with third-party services. We are not responsible for the privacy
            practices of these third parties.
          </p>
          <p>
            We encourage you to read the privacy policies of any third-party
            services you use in connection with our Service.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Children&apos;s Privacy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Our Service is not intended for children under the age of 13. We do
            not knowingly collect personal information from children under 13.
          </p>
          <p>
            If you are a parent or guardian and believe your child has provided
            us with personal information, please contact us immediately so we
            can remove such information.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>International Data Transfers</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Your information may be transferred to and processed in countries
            other than your own. We ensure that such transfers comply with
            applicable data protection laws.
          </p>
          <p>
            When we transfer your information internationally, we implement
            appropriate safeguards to protect your data, including:
          </p>
          <ul>
            <li>Standard contractual clauses</li>
            <li>Adequacy decisions by relevant authorities</li>
            <li>Certified privacy frameworks</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes to This Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by:
          </p>
          <ul>
            <li>Posting the updated policy on our Service</li>
            <li>Sending you an email notification</li>
            <li>Displaying a prominent notice on our Service</li>
          </ul>
          <p>
            Your continued use of our Service after any changes indicates your
            acceptance of the updated Privacy Policy.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            If you have questions about this Privacy Policy or our privacy
            practices, please contact us at:
          </p>
          <ul>
            <li>
              Email:{" "}
              <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
            </li>
            <li>
              Website:{" "}
              <a href={LEGAL_WEBSITE} target="_blank" rel="noopener noreferrer">
                {LEGAL_WEBSITE}
              </a>
            </li>
          </ul>
          <p>
            We will respond to your inquiries within a reasonable timeframe and
            in accordance with applicable law.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
