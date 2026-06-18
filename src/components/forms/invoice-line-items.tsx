"use client";

import { Plus, Timer, Trash2, Zap } from "lucide-react";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import { cn } from "~/lib/utils";
import { parseLineItem, type ParsedLineItem } from "~/lib/parse-line-item";
import {
  useLineItemSuggestions,
  type LineItemSuggestion,
} from "~/hooks/use-line-item-suggestions";

interface InvoiceItem {
  id: string;
  date: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface InvoiceLineItemsProps {
  items: InvoiceItem[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (
    index: number,
    field: string,
    value: string | number | Date,
  ) => void;
  onAddItemWithValues?: (parsed: ParsedLineItem) => void;
  invoiceId?: string;
  clientId?: string;
  defaultRate?: number;
  className?: string;
}

interface LineItemRowProps {
  item: InvoiceItem;
  index: number;
  canRemove: boolean;
  onRemove: (index: number) => void;
  onUpdate: (
    index: number,
    field: string,
    value: string | number | Date,
  ) => void;
  suggestions: LineItemSuggestion[];
  onSelectSuggestion: (index: number, suggestion: LineItemSuggestion) => void;
  onDescriptionChange: (index: number, value: string) => void;
}

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LineItemSuggestion) => void;
  suggestions: LineItemSuggestion[];
  placeholder?: string;
  className?: string;
}

function DescriptionAutocomplete({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className,
}: DescriptionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const showDropdown = open && suggestions.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s) { onSelect(s); setOpen(false); }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div className="bg-popover text-popover-foreground border-border absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
          {suggestions.map((s, i) => (
            <button
              key={s.description}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(s);
                setOpen(false);
              }}
              className={cn(
                "hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                i === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate font-medium">{s.description}</span>
              <span className="text-muted-foreground ml-3 shrink-0 font-mono text-xs">
                {s.hours}h · ${s.rate}/hr
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LineItemCard = React.forwardRef<HTMLDivElement, LineItemRowProps>(
  ({ item, index, canRemove, onRemove, onUpdate, suggestions, onSelectSuggestion, onDescriptionChange }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group hover:bg-muted/40 hidden min-h-16 grid-cols-[140px_minmax(200px,1fr)_124px_136px_104px_32px] items-center gap-2 border-b px-3 py-2 transition-colors md:grid",
        )}
      >
        <DatePicker
          date={item.date}
          onDateChange={(date) => onUpdate(index, "date", date ?? new Date())}
          size="sm"
          className="w-full"
          inputClassName="h-9"
        />

        <DescriptionAutocomplete
          value={item.description}
          onChange={(v) => onDescriptionChange(index, v)}
          onSelect={(s) => onSelectSuggestion(index, s)}
          suggestions={suggestions}
          placeholder="Describe the work performed..."
          className="h-9 w-full text-sm font-medium"
        />

        <NumberInput
          value={item.hours}
          onChange={(value) => onUpdate(index, "hours", value)}
          min={0}
          step={0.25}
          width="full"
          className="h-9 font-mono [&_button]:w-6 [&_input]:min-w-12"
          suffix="h"
        />

        <NumberInput
          value={item.rate}
          onChange={(value) => onUpdate(index, "rate", value)}
          min={0}
          step={1}
          prefix="$"
          width="full"
          className="h-9 font-mono [&_button]:w-6 [&_input]:min-w-14"
        />

        <div className="text-primary text-right font-mono font-semibold">
          ${(item.hours * item.rate).toFixed(2)}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
          disabled={!canRemove}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);
LineItemCard.displayName = "LineItemCard";

function MobileLineItem({
  item,
  index,
  canRemove,
  onRemove,
  onUpdate,
  suggestions,
  onSelectSuggestion,
  onDescriptionChange,
}: LineItemRowProps) {
  return (
    <motion.div
      layout
      id={`invoice-item-${index}-mobile`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="border-border bg-card overflow-hidden rounded-lg border md:hidden"
    >
      <div className="space-y-3 p-4">
        {/* Description */}
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Description</Label>
          <DescriptionAutocomplete
            value={item.description}
            onChange={(v) => onDescriptionChange(index, v)}
            onSelect={(s) => onSelectSuggestion(index, s)}
            suggestions={suggestions}
            placeholder="Describe the work performed..."
            className="pl-3 text-sm"
          />
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Date</Label>
          <DatePicker
            date={item.date}
            onDateChange={(date) => onUpdate(index, "date", date ?? new Date())}
            size="sm"
            inputClassName="h-9"
          />
        </div>

        {/* Hours and Rate in a row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Hours</Label>
            <NumberInput
              value={item.hours}
              onChange={(value) => onUpdate(index, "hours", value)}
              min={0}
              step={0.25}
              width="full"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Rate</Label>
            <NumberInput
              value={item.rate}
              onChange={(value) => onUpdate(index, "rate", value)}
              min={0}
              step={1}
              prefix="$"
              width="full"
              className="font-mono"
            />
          </div>
        </div>
      </div>

      {/* Bottom section with controls, item name, and total */}
      <div className="border-border bg-muted/50 flex items-center justify-between border-t px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
            disabled={!canRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 px-3 text-center">
          <span className="text-muted-foreground block text-sm font-medium">
            <span className="hidden sm:inline">Item </span>
            <span className="sm:hidden">#</span>
            {index + 1}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground text-xs">Total</span>
          <span className="text-primary text-lg font-bold">
            ${(item.hours * item.rate).toFixed(2)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function NLQuickAdd({ onAdd }: { onAdd: (parsed: ParsedLineItem) => void }) {
  const [value, setValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onAdd(parseLineItem(value));
      setValue("");
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Zap className="text-muted-foreground h-4 w-4 shrink-0" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Quick add: "3hrs web design @120" — press Enter'
        className="h-8 border-dashed text-sm"
      />
    </div>
  );
}

export function InvoiceLineItems({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onAddItemWithValues,
  invoiceId,
  clientId,
  defaultRate: _defaultRate,
  className,
}: InvoiceLineItemsProps) {
  const canRemoveItems = items.length > 1;
  const { search } = useLineItemSuggestions();
  const [queriedIndex, setQueriedIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<LineItemSuggestion[]>([]);

  function handleDescriptionChange(index: number, value: string) {
    onUpdateItem(index, "description", value);
    setQueriedIndex(index);
    setSuggestions(search(value));
  }

  function handleSelectSuggestion(index: number, s: LineItemSuggestion) {
    onUpdateItem(index, "description", s.description);
    onUpdateItem(index, "hours", s.hours);
    onUpdateItem(index, "rate", s.rate);
    setSuggestions([]);
    setQueriedIndex(null);
  }

  function getSuggestionsForIndex(index: number): LineItemSuggestion[] {
    return queriedIndex === index ? suggestions : [];
  }

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence>
        <div className="space-y-2 md:space-y-0 md:overflow-hidden md:rounded-lg md:border">
          <div className="bg-muted/60 text-muted-foreground hidden grid-cols-[140px_minmax(200px,1fr)_124px_136px_104px_32px] gap-2 border-b px-3 py-2 text-xs font-medium md:grid">
            <span>Date</span>
            <span>Description</span>
            <span className="text-right">Hours</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {/* Desktop/Tablet Card */}
              <motion.div
                layout
                id={`invoice-item-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <LineItemCard
                  item={item}
                  index={index}
                  canRemove={canRemoveItems}
                  onRemove={onRemoveItem}
                  onUpdate={onUpdateItem}
                  suggestions={getSuggestionsForIndex(index)}
                  onSelectSuggestion={handleSelectSuggestion}
                  onDescriptionChange={handleDescriptionChange}
                />
              </motion.div>

              {/* Mobile Card */}
              <MobileLineItem
                item={item}
                index={index}
                canRemove={canRemoveItems}
                onRemove={onRemoveItem}
                onUpdate={onUpdateItem}
                suggestions={getSuggestionsForIndex(index)}
                onSelectSuggestion={handleSelectSuggestion}
                onDescriptionChange={handleDescriptionChange}
              />
            </React.Fragment>
          ))}
          {invoiceId && (
            <div className="border-t p-3 space-y-2">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Timer className="h-3.5 w-3.5" /> Time clock
              </p>
              <p className="text-muted-foreground text-xs">
                Track time on the dedicated time clock — entries sync across devices and
                bill directly to an invoice.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  href={`/dashboard/time-clock?invoiceId=${invoiceId}${
                    clientId ? `&clientId=${clientId}` : ""
                  }`}
                >
                  Open time clock
                </Link>
              </Button>
            </div>
          )}
          {onAddItemWithValues && (
            <NLQuickAdd onAdd={onAddItemWithValues} />
          )}
        </div>
      </AnimatePresence>

      {/* Add Item Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onAddItem}
        className="border-border text-muted-foreground hover:text-primary hover:bg-accent/50 hover:border-primary/50 mt-3 w-full border-dashed py-6 transition-all"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Line Item
      </Button>
    </div>
  );
}
