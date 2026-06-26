"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Search,
} from "lucide-react";

import { cn } from "~/lib/utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "data-[placeholder]:text-muted-foreground border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 relative flex h-10 w-full items-center justify-start gap-2 rounded-md border px-3 py-2 pr-8 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      <SelectPrimitive.Icon asChild>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <ChevronDownIcon className="size-4 opacity-50" />
        </span>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto border-0 shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-foreground-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

// Enhanced SelectContent with search functionality
function SelectContentWithSearch({
  className,
  children,
  position = "popper",
  searchPlaceholder = "Search...",
  onSearchChange,
  searchValue,
  isOpen,
  filteredOptions,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  isOpen?: boolean;
  filteredOptions?: { value: string; label: string }[];
}) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const wasOpen = React.useRef(false);

  React.useEffect(() => {
    // Only focus when dropdown transitions from closed to open
    if (isOpen && !wasOpen.current && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    wasOpen.current = !!isOpen;
  }, [isOpen]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-hidden border-0 shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        onEscapeKeyDown={(e) => {
          // Prevent escape from closing the dropdown when typing
          if (searchValue) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking inside the search input
          if (searchInputRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        {...props}
      >
        {onSearchChange && (
          <div className="border-border/20 flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              className="placeholder:text-muted-foreground text-foreground flex h-8 w-full border-0 bg-transparent py-2 text-sm outline-none focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                // Prevent the dropdown from closing when typing
                if (e.key === "Escape") {
                  e.stopPropagation();
                }
                // Prevent arrow keys from moving focus away from search
                if (
                  ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key,
                  )
                ) {
                  e.stopPropagation();
                }
              }}
              onFocus={(e) => {
                // Ensure the search input stays focused
                e.target.select();
              }}
              autoFocus
            />
          </div>
        )}
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="p-1">
          {filteredOptions?.length === 0 ? (
            <div className="text-muted-foreground px-3 py-2 text-sm select-none">
              No results found
            </div>
          ) : (
            children
          )}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

// Searchable Select component
interface SearchableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  renderOption?: (option: {
    value: string;
    label: string;
    disabled?: boolean;
  }) => React.ReactNode;
  isOptionDisabled?: (option: {
    value: string;
    label: string;
    disabled?: boolean;
  }) => boolean;
  id?: string;
}

function SearchableSelect({
  value,
  onValueChange,
  placeholder,
  options,
  searchPlaceholder = "Search...",
  className,
  disabled,
  renderOption,
  isOptionDisabled,
  id,
}: SearchableSelectProps) {
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    return options.filter((option) => {
      // Don't filter out dividers, disabled options, or placeholder
      if (option.value?.startsWith("divider-")) return true;
      if (option.value === "__placeholder__") return true;
      return option.label.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [options, searchValue]);

  // Convert empty string to placeholder value for display
  const displayValue = value === "" ? "__placeholder__" : value;

  // Convert placeholder value back to empty string when selected
  const handleValueChange = (newValue: string) => {
    const actualValue = newValue === "__placeholder__" ? "" : newValue;
    onValueChange?.(actualValue);
    // Clear search when an option is selected
    setSearchValue("");
    setIsOpen(false);
  };

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={cn("w-full", className)} id={id}>
        <SelectValue
          placeholder={placeholder}
          // Always show placeholder if nothing is selected
          data-placeholder={displayValue === "__placeholder__"}
        />
      </SelectTrigger>
      <SelectContentWithSearch
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isOpen={isOpen}
        filteredOptions={filteredOptions}
      >
        {filteredOptions.map((option) => {
          const isDisabled = isOptionDisabled
            ? isOptionDisabled(option)
            : option.disabled;

          if (renderOption && option.value?.startsWith("divider-")) {
            return (
              <div key={option.value} className="pointer-events-none">
                {renderOption(option)}
              </div>
            );
          }

          // Skip rendering items with empty string values
          if (option.value === "") {
            return null;
          }

          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={isDisabled}
            >
              {renderOption ? renderOption(option) : option.label}
            </SelectItem>
          );
        })}
      </SelectContentWithSearch>
    </Select>
  );
}

export {
  Select,
  SelectContent,
  SelectContentWithSearch,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SearchableSelect,
};
