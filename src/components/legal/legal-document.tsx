import Link from "next/link";

import { cn } from "~/lib/utils";

export type LegalSection = {
  id: string;
  title: string;
  children: React.ReactNode;
};

/** Body copy for legal pages — explicit styles (no typography plugin). */
export function LegalParagraph({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-[15px] leading-7",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function LegalSectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 [&_a]:text-foreground [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4">
      {children}
    </div>
  );
}

export function LegalTableOfContents({ sections }: { sections: LegalSection[] }) {
  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="text-foreground mb-3 font-medium">On this page</p>
      <ol className="space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              href={`#${section.id}`}
              className="text-muted-foreground hover:text-foreground block leading-snug transition-colors"
            >
              {section.title}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function LegalSectionBlock({
  section,
  isLast,
}: {
  section: LegalSection;
  isLast: boolean;
}) {
  return (
    <section
      id={section.id}
      className={cn("scroll-mt-24", !isLast && "border-border border-b")}
    >
      <div className="px-6 pt-8 pb-4 sm:px-8">
        <h2 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
          {section.title}
        </h2>
      </div>
      <div className="px-6 pb-10 sm:px-8">
        <LegalSectionBody>{section.children}</LegalSectionBody>
      </div>
    </section>
  );
}

export function LegalDocument({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:items-start">
      <aside className="bg-card border-border rounded-lg border p-4 lg:sticky lg:top-8">
        <LegalTableOfContents sections={sections} />
      </aside>

      <article className="bg-card border-border overflow-hidden rounded-lg border shadow-sm">
        {sections.map((section, index) => (
          <LegalSectionBlock
            key={section.id}
            section={section}
            isLast={index === sections.length - 1}
          />
        ))}
      </article>
    </div>
  );
}
