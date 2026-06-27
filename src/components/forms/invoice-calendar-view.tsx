"use client";

import * as React from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
} from "date-fns";
import { Calendar } from "~/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import {
  Plus,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { calculateLineItemAmount } from "~/lib/invoice-line-item";

interface InvoiceItem {
  id: string;
  date: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface InvoiceCalendarViewProps {
  items: InvoiceItem[];
  onUpdateItem: (
    index: number,
    field: string,
    value: string | number | Date,
  ) => void;
  onAddItem: (date?: Date) => void;
  onRemoveItem: (index: number) => void;
  className?: string;
  defaultHourlyRate: number | null;
  readOnly?: boolean;
}

export function InvoiceCalendarView({
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  className,
  defaultHourlyRate: _defaultHourlyRate,
  readOnly = false,
}: InvoiceCalendarViewProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined); // Start unselected
  const [viewDate, setViewDate] = React.useState<Date>(new Date()); // Controls the view (month/week)
  const [view, setView] = React.useState<"month" | "week">("month");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  // Derived state for selected date items - solves cursor jumping
  const selectedDateItems = React.useMemo(() => {
    if (!date) return [];
    return items
      .map((item, index) => ({ item, index }))
      .filter((wrapper) => {
        const itemDate = new Date(wrapper.item.date);
        return isSameDay(itemDate, date);
      });
  }, [items, date]);

  // Helper to get items for any date (for calendar view)
  const getItemsForDate = React.useCallback(
    (targetDate: Date) => {
      return items
        .map((item, index) => ({ item, index }))
        .filter((wrapper) => {
          const itemDate = new Date(wrapper.item.date);
          return isSameDay(itemDate, targetDate);
        });
    },
    [items],
  );

  const handleSelectDate = (newDate: Date | undefined) => {
    if (!newDate) return;
    setDate(newDate);
    setSheetOpen(true);
  };

  const handleAddNewItem = () => {
    if (date) {
      onAddItem(date);
    }
  };

  // Week View Logic - Uses viewDate
  const currentWeekStart = startOfWeek(viewDate);
  const currentWeekEnd = endOfWeek(viewDate);
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: currentWeekEnd,
  });

  const handleCloseSheet = (isOpen: boolean) => {
    setSheetOpen(isOpen);
    if (!isOpen) {
      setDate(undefined);
    }
  };

  return (
    <div className={cn("flex h-full w-full flex-col gap-4", className)}>
      <div className="flex w-full items-center justify-between gap-4 px-4 pt-4">
        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          {view === "week" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewDate((d) => subWeeks(d, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-36 text-center text-sm font-medium">
                {`${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d")}`}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewDate((d) => addWeeks(d, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewDate((d) => subMonths(d, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-36 text-center text-sm font-medium">
                {format(viewDate, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewDate((d) => addMonths(d, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center space-x-2">
          {/* View Switcher */}
          <div className="bg-muted flex rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "rounded-md px-3 py-1.5 text-center font-medium transition-all",
                view === "month"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "rounded-md px-3 py-1.5 text-center font-medium transition-all",
                view === "week"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 overflow-hidden">
        {view === "month" ? (
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelectDate}
            month={viewDate}
            onMonthChange={setViewDate}
            className="w-full rounded-md border-0 p-0"
            classNames={{
              root: "w-full p-0",
              months: "flex flex-col w-full",
              month: "flex flex-col w-full space-y-4",

              // Grid - Revert to Flex but Enforce 1/7th Width
              // table: "w-full border-collapse", // No table-fixed
              head_row: "flex w-full",
              row: "flex w-full mt-2",

              // Cells & Headers: Explicit width 14.28%
              // Use calc(100%/7) via tailwind arbitrary or just flex bases.
              // Better: w-[14.28%] flex-none (approx 1/7)
              weekdays: "flex w-full border-b",
              weekday:
                "w-[14.285%] flex-none text-muted-foreground font-normal text-[0.8rem] text-center pb-4",

              week: "flex w-full mt-2",
              cell: "w-[14.285%] flex-none h-20 sm:h-28 md:h-32 border-b p-0 relative focus-within:relative focus-within:z-20 text-center text-sm",

              // Hide internal navigation & caption entirely
              nav: "hidden",
              caption: "hidden",

              day: cn(
                "w-full h-full p-2 font-normal aria-selected:opacity-100 flex flex-col items-start justify-start gap-1 hover:bg-accent/50 hover:text-accent-foreground align-top transition-colors rounded-xl",
              ),
              day_selected: "bg-primary/5 text-primary",
              day_today: "bg-accent/20",
              day_outside: "text-muted-foreground opacity-30",
            }}
            formatters={{
              formatMonthCaption: () => "", // Clear default caption text to prevent duplication
            }}
            components={{
              DayButton: (props) => {
                const { day, modifiers, className, ...buttonProps } = props;
                const DayDate = day.date;
                const dayItems = getItemsForDate(DayDate);
                // const totalHours = dayItems.reduce((acc, curr) => acc + curr.item.hours, 0); // Unused now

                return (
                  <button
                    {...buttonProps}
                    type="button"
                    className={cn(
                      "hover:border-border/50 hover:bg-secondary/30 relative flex h-full w-full flex-col items-start justify-between overflow-hidden rounded-xl border border-transparent p-2 text-left transition-all",
                      // Selected State: Filled Box, No Outline
                      modifiers.selected &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 scale-[0.98] transform shadow-md",
                      modifiers.today &&
                        !modifiers.selected &&
                        "bg-accent/40 rounded-xl",
                      className,
                    )}
                  >
                    <span className="z-10 text-sm font-medium">
                      {DayDate.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <div className="mt-1 flex h-full w-full flex-col justify-end gap-1 overflow-hidden pb-1">
                        <div className="mt-1 flex w-full flex-col gap-1">
                          {dayItems.slice(0, 4).map((item, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "h-1 w-full rounded-full",
                                modifiers.selected
                                  ? "bg-primary-foreground/50"
                                  : "bg-primary/50",
                              )}
                            />
                          ))}
                          {dayItems.length > 4 && (
                            <div
                              className={cn(
                                "h-1 w-1/3 rounded-full",
                                modifiers.selected
                                  ? "bg-primary-foreground/30"
                                  : "bg-muted-foreground/30",
                              )}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              },
            }}
          />
        ) : (
          <div className="flex w-full gap-3 overflow-x-auto p-4 pb-6">
            {weekDays.map((day) => {
              const isSelected = date && isSameDay(day, date);
              const isToday = isSameDay(day, new Date());
              const dayItems = getItemsForDate(day);
              const totalHours = dayItems.reduce(
                (acc, curr) => acc + curr.item.hours,
                0,
              );

              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={cn(
                    "hover:bg-accent/30 flex min-h-[260px] w-[120px] flex-shrink-0 flex-col rounded-3xl border p-3 text-left transition-all sm:w-auto sm:flex-1",
                    isSelected
                      ? "ring-primary bg-primary/5 ring-2 ring-offset-2"
                      : "bg-background/40",
                    isToday && !isSelected ? "bg-accent/40" : "",
                  )}
                >
                  <div className="mb-4 flex w-full flex-col items-center border-b pb-4">
                    <span className="text-muted-foreground text-xs font-bold uppercase">
                      {format(day, "EEE")}
                    </span>
                    <span className="text-2xl font-light">
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="w-full flex-1 space-y-2 overflow-hidden">
                    {dayItems.length > 0 ? (
                      dayItems.map(({ item }, i) => (
                        <div
                          key={i}
                          className="bg-background rounded-xl border p-2 text-xs shadow-sm"
                        >
                          <div className="line-clamp-2 font-medium text-wrap break-words">
                            {item.description || "No description"}
                          </div>
                          <div className="text-muted-foreground whitespace-nowrap">
                            {item.hours}h
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground/20 flex h-full items-center justify-center">
                        <Plus className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {dayItems.length > 0 && (
                    <div className="mt-auto w-full pt-2 text-center">
                      <span className="text-sm font-semibold">
                        {totalHours}h Total
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet for Day Details */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent
          side="right"
          className="flex w-full max-w-full flex-col gap-0 p-0 sm:w-[400px] sm:max-w-[540px]"
        >
          <SheetHeader className="border-b p-6">
            <SheetTitle className="flex flex-wrap items-center gap-3 text-2xl">
              <div className="bg-primary/10 flex-shrink-0 rounded-full p-2.5">
                <CalendarIcon className="text-primary h-6 w-6" />
              </div>
              <span className="text-left break-words">
                {date ? format(date, "EEEE, MMMM do") : "Details"}
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {date && selectedDateItems.length === 0 ? (
                <div className="bg-secondary/20 border-border/60 flex flex-col items-center justify-center space-y-4 rounded-3xl border border-dashed py-16 text-center">
                  <div className="bg-background rounded-full p-4 shadow-sm">
                    <Clock className="text-muted-foreground/50 h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground text-lg font-semibold">
                      No hours logged
                    </p>
                    <p className="text-muted-foreground/80 max-w-[200px] text-sm">
                      There are no time entries recorded for this day yet.
                    </p>
                  </div>
                  {!readOnly ? (
                    <Button onClick={handleAddNewItem} className="mt-2" size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Log Time
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateItems.map(({ item, index }) => (
                    <div
                      key={item.id}
                      className="border-border bg-card group hover:border-primary/50 overflow-hidden rounded-lg border transition-colors"
                    >
                      <div className="space-y-3 p-4">
                        {/* Description */}
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            Description
                          </Label>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              onUpdateItem(index, "description", e.target.value)
                            }
                            placeholder="Describe the work performed..."
                            className="pl-3 text-sm"
                            disabled={readOnly}
                          />
                        </div>

                        {/* Hours and Rate in a row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              Hours
                            </Label>
                            <NumberInput
                              value={item.hours}
                              onChange={(v) => onUpdateItem(index, "hours", v)}
                              step={0.25}
                              min={0}
                              width="full"
                              disabled={readOnly}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              Rate
                            </Label>
                            <NumberInput
                              value={item.rate}
                              onChange={(v) => onUpdateItem(index, "rate", v)}
                              prefix="$"
                              min={0}
                              step={1}
                              width="full"
                              disabled={readOnly}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom section with controls, item name, and total */}
                      <div className="border-border bg-muted/50 flex items-center justify-between border-t px-4 py-2">
                        <div className="flex items-center gap-2">
                          {!readOnly ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(index)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="flex-1 px-3 text-center">
                          <span className="text-muted-foreground block text-sm font-medium">
                            Item #{index + 1}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground text-xs">
                            Total
                          </span>
                          <span className="text-primary text-lg font-bold">
                            ${calculateLineItemAmount(item.hours, item.rate).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!readOnly ? (
                    <Button
                      variant="outline"
                      onClick={handleAddNewItem}
                      className="hover:bg-accent/50 hover:border-primary/50 text-muted-foreground hover:text-primary group w-full gap-2 rounded-xl border-dashed py-8 transition-all"
                    >
                      <div className="bg-muted group-hover:bg-primary/10 rounded-md p-1 transition-colors">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span>Add Another Entry</span>
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <SheetFooter className="bg-muted/10 mt-auto border-t p-6">
            <Button
              className="h-12 w-full rounded-xl text-base shadow-md sm:w-full"
              size="lg"
              onClick={() => handleCloseSheet(false)}
            >
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
