"use client";

import { Plus, Timer, Trash2, Zap } from "lucide-react";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { NumberInput } from "~/components/ui/number-input";
import { cn } from "~/lib/utils";
import {
  calculateLineItemAmount,
  getLineItemBillingType,
  type LineItemBillingType,
} from "~/lib/invoice-line-item";
import { parseLineItem, type ParsedLineItem } from "~/lib/parse-line-item";
import {
  useLineItemSuggestions,
  type LineItemSuggestion,
} from "~/hooks/use-line-item-suggestions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface InvoiceItem {
  id: string;
  date: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  billingType?: LineItemBillingType;
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
  readOnly?: boolean;
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
  readOnly?: boolean;
}

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LineItemSuggestion) => void;
  suggestions: LineItemSuggestion[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function DescriptionAutocomplete({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className,
  disabled,
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
        disabled={disabled}
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

const LINE_ITEM_GRID =
  "grid-cols-[minmax(11.5rem,auto)_minmax(160px,1fr)_76px_96px_108px_88px_28px]";

const LineItemCard = React.forwardRef<HTMLDivElement, LineItemRowProps>(
  ({ item, index, canRemove, onRemove, onUpdate, suggestions, onSelectSuggestion, onDescriptionChange, readOnly }, ref) => {
    const billingType = item.billingType ?? getLineItemBillingType(item.hours);
    const isFixed = billingType === "fixed";
    const lineTotal = calculateLineItemAmount(item.hours, item.rate);

    return (
      <div
        ref={ref}
        className={cn(
          "group hover:bg-muted/30 hidden min-h-11 items-center gap-1.5 border-b px-2 py-1.5 transition-colors md:grid",
          LINE_ITEM_GRID,
        )}
      >
        <DatePicker
          date={item.date}
          onDateChange={(date) => onUpdate(index, "date", date ?? new Date())}
          size="sm"
          className="w-full"
          inputClassName="h-8 text-xs"
          disabled={readOnly}
        />

        <DescriptionAutocomplete
          value={item.description}
          onChange={(v) => onDescriptionChange(index, v)}
          onSelect={(s) => onSelectSuggestion(index, s)}
          suggestions={suggestions}
          placeholder="Description"
          className="h-8 w-full text-sm"
          disabled={readOnly}
        />

        <Select
          value={billingType}
          onValueChange={(value: LineItemBillingType) =>
            onUpdate(index, "billingType", value)
          }
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 w-full px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>

        {isFixed ? (
          <span className="text-muted-foreground text-center text-xs">—</span>
        ) : (
          <NumberInput
            value={item.hours}
            onChange={(value) => onUpdate(index, "hours", value)}
            min={0}
            step={0.25}
            width="full"
            className="h-8 font-mono [&_button]:h-7 [&_button]:w-5 [&_input]:min-w-10 [&_input]:text-xs"
            suffix="h"
            disabled={readOnly}
          />
        )}

        <NumberInput
          value={item.rate}
          onChange={(value) => onUpdate(index, "rate", value)}
          min={0}
          step={1}
          prefix="$"
          width="full"
          className="h-8 font-mono [&_button]:h-7 [&_button]:w-5 [&_input]:min-w-12 [&_input]:text-xs"
          disabled={readOnly}
        />

        <div className="text-primary text-right font-mono text-sm font-semibold tabular-nums">
          ${lineTotal.toFixed(2)}
        </div>

        {!readOnly ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
            disabled={!canRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span />
        )}
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
  readOnly,
}: LineItemRowProps) {
  const billingType = item.billingType ?? getLineItemBillingType(item.hours);
  const isFixed = billingType === "fixed";
  const lineTotal = calculateLineItemAmount(item.hours, item.rate);

  return (
    <div
      id={`invoice-item-${index}-mobile`}
      className="border-border space-y-1.5 border-b px-3 py-2 md:hidden"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-5 shrink-0 text-center text-xs font-semibold">
          {index + 1}
        </span>
        <DescriptionAutocomplete
          value={item.description}
          onChange={(v) => onDescriptionChange(index, v)}
          onSelect={(s) => onSelectSuggestion(index, s)}
          suggestions={suggestions}
          placeholder="Description"
          className="h-8 flex-1 text-sm"
          disabled={readOnly}
        />
      </div>

      <div className="flex items-center gap-1.5 pl-7">
        <DatePicker
          date={item.date}
          onDateChange={(date) => onUpdate(index, "date", date ?? new Date())}
          size="sm"
          className="w-auto shrink-0"
          inputClassName="h-8 px-2 text-xs"
          disabled={readOnly}
        />
        <Select
          value={billingType}
          onValueChange={(value: LineItemBillingType) =>
            onUpdate(index, "billingType", value)
          }
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 w-[76px] shrink-0 px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
        {!isFixed ? (
          <NumberInput
            value={item.hours}
            onChange={(value) => onUpdate(index, "hours", value)}
            min={0}
            step={0.25}
            width="full"
            className="h-8 w-[88px] shrink-0 font-mono [&_button]:h-7 [&_button]:w-5 [&_input]:min-w-8 [&_input]:text-xs"
            suffix="h"
            disabled={readOnly}
          />
        ) : null}
        <NumberInput
          value={item.rate}
          onChange={(value) => onUpdate(index, "rate", value)}
          min={0}
          step={1}
          prefix="$"
          width="full"
          className="h-8 w-[84px] shrink-0 font-mono [&_button]:h-7 [&_button]:w-5 [&_input]:min-w-10 [&_input]:text-xs"
          disabled={readOnly}
        />
        <span className="text-primary ml-auto font-mono text-sm font-semibold tabular-nums">
          ${lineTotal.toFixed(2)}
        </span>
        {!readOnly ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0 p-0"
            disabled={!canRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
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
  readOnly = false,
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
    onUpdateItem(index, "billingType", "hourly");
    setSuggestions([]);
    setQueriedIndex(null);
  }

  function getSuggestionsForIndex(index: number): LineItemSuggestion[] {
    return queriedIndex === index ? suggestions : [];
  }

  return (
    <div className={cn("space-y-2", className)}>
      {readOnly ? (
        <p className="text-muted-foreground text-sm">
          Line items are locked after an invoice is sent. Revert to draft to edit entries.
        </p>
      ) : null}
      <AnimatePresence>
        <div className="space-y-0 md:overflow-hidden md:rounded-lg md:border">
          <div className={cn("bg-muted/60 text-muted-foreground hidden gap-1.5 border-b px-2 py-1.5 text-[11px] font-semibold tracking-wide uppercase md:grid", LINE_ITEM_GRID)}>
            <span>Date</span>
            <span>Description</span>
            <span className="text-center">Type</span>
            <span className="text-center">Hours</span>
            <span className="text-center">Rate</span>
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
                  readOnly={readOnly}
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
                readOnly={readOnly}
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
          {onAddItemWithValues && !readOnly ? (
            <NLQuickAdd onAdd={onAddItemWithValues} />
          ) : null}
        </div>
      </AnimatePresence>

      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          onClick={onAddItem}
          className="border-border text-muted-foreground hover:text-primary hover:bg-accent/50 hover:border-primary/50 mt-2 w-full border-dashed py-3 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Line Item
        </Button>
      ) : null}
    </div>
  );
}
