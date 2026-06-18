import Link from "next/link";

import { cn } from "~/lib/utils";

type LegalLinksProps = {
  className?: string;
  linkClassName?: string;
};

export function LegalLinks({ className, linkClassName }: LegalLinksProps) {
  const linkStyles = cn(
    "text-foreground font-medium hover:underline",
    linkClassName,
  );

  return (
    <span className={className}>
      <Link href="/terms" className={linkStyles}>
        Terms of Service
      </Link>
      {" and "}
      <Link href="/privacy" className={linkStyles}>
        Privacy Policy
      </Link>
    </span>
  );
}

type LegalAgreementNoticeProps = {
  action: string;
  className?: string;
};

export function LegalAgreementNotice({
  action,
  className,
}: LegalAgreementNoticeProps) {
  return (
    <p className={cn("text-muted-foreground text-center text-xs", className)}>
      By {action}, you agree to our <LegalLinks />.
    </p>
  );
}
