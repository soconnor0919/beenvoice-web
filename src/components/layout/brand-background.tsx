/** Grid + animated blob backdrop shared by the app shell and marketing pages. */
export function BrandBackground() {
  return (
    <div className="brand-background pointer-events-none fixed inset-0 -z-10 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="animate-blob h-[800px] w-[800px] rounded-full bg-neutral-400/40 blur-3xl dark:bg-neutral-500/30" />
    </div>
  );
}
