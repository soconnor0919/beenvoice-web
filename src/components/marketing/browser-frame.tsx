import { getAppHost } from "~/lib/app-url";
import { cn } from "~/lib/utils";

export function BrowserFrame({
  children,
  className,
  url = `${getAppHost()}/dashboard`,
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/80 bg-card overflow-hidden rounded-2xl border shadow-2xl shadow-black/8 ring-1 ring-black/5",
        className,
      )}
    >
      <div className="bg-muted/50 flex items-center gap-3 border-b px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="bg-background/70 text-muted-foreground mx-auto flex h-7 w-full max-w-sm items-center justify-center rounded-lg px-3 text-[11px] tracking-wide">
          {url}
        </div>
      </div>
      <div className="bg-dashboard overflow-hidden">{children}</div>
    </div>
  );
}
