"use client";

import Link from "next/link";
import { useMemo } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/layout/page-layout";
import { Clock, Play } from "lucide-react";
import { groupEntriesByDate } from "~/lib/time-entry-display";
import { TimeEntryRow } from "~/components/time-clock/time-entry-list";

export function TimeEntriesHistory() {
  const { data: entries, isLoading } = api.timeEntries.getAll.useQuery();

  const completedEntries = useMemo(
    () => (entries ?? []).filter((e) => e.endedAt),
    [entries],
  );

  const grouped = useMemo(
    () => groupEntriesByDate(completedEntries),
    [completedEntries],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          Loading entries…
        </CardContent>
      </Card>
    );
  }

  if (completedEntries.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Clock className="h-6 w-6" />}
            title="No time entries yet"
            description="Start the timer to track billable hours. Completed entries will show up here."
            action={
              <Button asChild>
                <Link href="/dashboard/time-clock">
                  <Play className="mr-2 h-4 w-4" />
                  Start timer
                </Link>
              </Button>
            }
            className="py-16"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <Card key={group.dateKey}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {group.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {group.entries.map((entry, index) => (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                isLast={index === group.entries.length - 1}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
