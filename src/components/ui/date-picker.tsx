"use client";

import * as React from "react";
import { parseDate } from "chrono-node";
import { CalendarIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
}

// Longest month name in en-US long format (September 30, 2026).
const LONGEST_FORMATTED_DATE = formatDate(new Date(2026, 8, 30));

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "md" | "lg";
  inputClassName?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Tomorrow or next week",
  className,
  inputClassName,
  disabled = false,
  id,
  size = "md",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(formatDate(date));
  const [month, setMonth] = React.useState<Date | undefined>(date);

  const sizeClasses = {
    sm: "h-9 text-xs",
    md: "h-9 text-sm",
    lg: "h-10 text-sm",
  };

  const wantsFullWidth = className?.includes("w-full");

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep text input and calendar month synchronized with the controlled date prop.
    setValue(formatDate(date));
    setMonth(date);
  }, [date]);

  return (
    <div
      className={cn(
        "relative min-w-max",
        wantsFullWidth ? "w-full" : "w-auto shrink-0",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "invisible block whitespace-nowrap px-3 pr-10",
          sizeClasses[size],
          inputClassName,
        )}
      >
        {LONGEST_FORMATTED_DATE}
      </span>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "bg-background absolute inset-0 w-full pr-10 tabular-nums",
          sizeClasses[size],
          inputClassName,
        )}
        onChange={(e) => {
          setValue(e.target.value);
          const parsedDate = parseDate(e.target.value);
          if (parsedDate) {
            onDateChange(parsedDate);
            setMonth(parsedDate);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            disabled={disabled}
            className="text-primary/80 hover:text-primary absolute top-1/2 right-2 z-20 size-6 -translate-y-1/2 p-0 transition-colors"
          >
            <CalendarIcon className="size-4" />
            <span className="sr-only">Select date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden rounded-xl p-0"
          align="end"
        >
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate);
              setValue(formatDate(selectedDate));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
