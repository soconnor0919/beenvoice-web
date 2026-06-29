import Link from "next/link";
import { cn } from "~/lib/utils";
import { formatRunningTimerLabel } from "~/lib/time-clock";
import { entryHref, invoiceLabel, type TimeEntryListItem } from "~/lib/time-entry-display";

export function TimeEntryRow({
  entry,
  isLast,
  onEdit,
}: {
  entry: TimeEntryListItem;
  isLast?: boolean;
  onEdit?: (entry: TimeEntryListItem) => void;
}) {
  const href = onEdit ? null : entryHref(entry);
  const rowClassName = cn(
    "flex items-start justify-between gap-4 py-3",
    !isLast && "border-border border-b",
  );

  const content = (
    <>
      <div className="min-w-0">
        <p className="font-medium">{formatRunningTimerLabel(entry.description)}</p>
        <p className="text-muted-foreground text-sm">
          {entry.client?.name ?? "No client"}
          {entry.invoice
            ? ` · ${invoiceLabel(entry.invoice)}`
            : entry.hours
              ? " · not on invoice"
              : ""}
        </p>
      </div>
      <div className="text-right text-sm">
        <p className="font-mono font-semibold">{entry.hours ?? "—"}h</p>
        {entry.rate ? <p className="text-muted-foreground">${entry.rate}/hr</p> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          rowClassName,
          "-mx-2 flex w-full cursor-pointer px-2 transition-colors hover:rounded-md hover:bg-muted/60",
        )}
      >
        {content}
      </Link>
    );
  }

  if (onEdit) {
    return (
      <button
        type="button"
        onClick={() => onEdit(entry)}
        className={cn(
          rowClassName,
          "-mx-2 flex w-full cursor-pointer px-2 text-left transition-colors hover:rounded-md hover:bg-muted/60",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      {content}
    </div>
  );
}

export function TimeEntryList({
  entries,
  onEdit,
}: {
  entries: TimeEntryListItem[];
  onEdit?: (entry: TimeEntryListItem) => void;
}) {
  const completed = entries.filter((e) => e.endedAt);

  if (completed.length === 0) return null;

  return (
    <>
      {completed.map((entry, index) => (
        <TimeEntryRow
          key={entry.id}
          entry={entry}
          isLast={index === completed.length - 1}
          onEdit={onEdit}
        />
      ))}
    </>
  );
}
