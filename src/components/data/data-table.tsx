"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  RowData,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Search,
  SearchX,
  X,
} from "lucide-react";
import * as React from "react";

import { EmptyState } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Generic names must match TanStack's declaration for module augmentation.
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  showSearch?: boolean;
  pageSize?: number;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string }[];
  }[];
  onRowClick?: (row: TData) => void;
  /** Render bulk-action buttons when rows are selected. Receives selected rows and a clear function. */
  selectionActions?: (
    selectedRows: TData[],
    clearSelection: () => void,
  ) => React.ReactNode;
  initialSorting?: SortingState;
  /** Shown when the dataset is empty (no rows in DB). */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Shown when filters/search hide all rows but data exists. */
  filteredEmptyTitle?: string;
  filteredEmptyDescription?: string;
}

export interface DataTableEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Centered empty state for data tables (reuses page EmptyState). */
export function DataTableEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: DataTableEmptyStateProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={cn("py-16", className)}
    />
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey: _searchKey,
  searchPlaceholder = "Search...",
  showColumnVisibility = true,
  showPagination = true,
  showSearch = true,
  pageSize = 10,
  className,
  title,
  description,
  actions,
  filterableColumns = [],
  onRowClick,
  selectionActions,
  initialSorting = [],
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  filteredEmptyTitle = "No matches for your search",
  filteredEmptyDescription = "Try adjusting your search or filters.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");

  // Mobile detection hook
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Create responsive columns that properly hide on mobile
  const responsiveColumns = React.useMemo(() => {
    return columns.map((column) => ({
      ...column,
      // Add a meta property to control responsive visibility
      meta: {
        ...(column.meta ?? {}),
        headerClassName: column.meta?.headerClassName ?? "",
        cellClassName: column.meta?.cellClassName ?? "",
      },
    }));
  }, [columns]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: responsiveColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: isMobile ? 5 : pageSize,
      },
    },
  });

  // Update page size when mobile state changes
  React.useEffect(() => {
    table.setPageSize(isMobile ? 5 : pageSize);
  }, [isMobile, pageSize, table]);

  // Debounce search input updates to the table's global filter
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Keep search input in sync when globalFilter is changed externally (e.g., "Clear filters")
  React.useEffect(() => {
    setSearchInput(globalFilter ?? "");
  }, [globalFilter]);

  const pageSizeOptions = [5, 10, 20, 30, 50, 100];
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const isDatasetEmpty = data.length === 0;
  const isFilteredEmpty = !isDatasetEmpty && filteredRowCount === 0;

  // Handle row click
  const handleRowClick = (row: TData, event: React.MouseEvent) => {
    // Don't trigger row click if clicking on action buttons or their children
    const target = event.target as HTMLElement;
    const isActionButton =
      target.closest('[data-action-button="true"]') ??
      target.closest("button") ??
      target.closest("a") ??
      target.closest('[role="button"]');

    if (isActionButton) {
      return;
    }

    onRowClick?.(row);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Section */}
      {(title ?? description) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-foreground text-lg font-semibold">{title}</h3>
            )}
            {description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar Card */}
      {(showSearch || filterableColumns.length > 0 || showColumnVisibility) && (
        <Card className="bg-card border-border border">
          <div className="flex items-center gap-2 px-3 py-2">
            {showSearch && (
              <div className="relative min-w-0 flex-1">
                <Search className="text-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchInput ?? ""}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="h-9 w-full pr-3 pl-9"
                />
              </div>
            )}
            {filterableColumns.map((column) => (
              <Select
                key={column.id}
                value={
                  (table.getColumn(column.id)?.getFilterValue() as string) ??
                  "all"
                }
                onValueChange={(value) =>
                  table
                    .getColumn(column.id)
                    ?.setFilterValue(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="h-9 w-9 p-0 sm:w-[180px] sm:px-3 [&>svg]:hidden sm:[&>svg]:inline-flex">
                  <div className="flex w-full items-center justify-center">
                    <Filter className="text-foreground h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">
                      <SelectValue placeholder={column.title} />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="gap-0">
                    All {column.title}
                  </SelectItem>
                  {column.options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="gap-0"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {filterableColumns.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 sm:w-auto sm:px-4"
                onClick={() => {
                  table.resetColumnFilters();
                  setGlobalFilter("");
                }}
              >
                <X className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:flex sm:items-center">
                  <Filter className="text-foreground mr-2 h-3.5 w-3.5" />
                  Clear filters
                </span>
              </Button>
            )}
            {showColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden h-9 sm:flex"
                  >
                    Columns <ChevronDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </Card>
      )}

      {/* Selection Toolbar */}
      {selectionActions && table.getSelectedRowModel().rows.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 border">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-foreground text-sm font-medium">
              {table.getSelectedRowModel().rows.length} selected
            </span>
            <div className="flex items-center gap-2">
              {selectionActions(
                table.getSelectedRowModel().rows.map((r) => r.original),
                () => table.resetRowSelection(),
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Table Content Card */}
      <Card className="bg-card border-border overflow-hidden border p-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "text-muted-foreground h-9 px-3 text-left align-middle text-xs font-medium sm:h-10 sm:px-4 sm:text-sm [&:has([role=checkbox])]:pr-3",
                          meta?.headerClassName,
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "hover:bg-muted/20 data-[state=selected]:bg-muted/50 border-border/40 table-row border-b transition-colors",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={(event) =>
                      onRowClick && handleRowClick(row.original, event)
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "px-3 py-1.5 align-middle text-xs sm:px-4 sm:py-2 sm:text-sm [&:has([role=checkbox])]:pr-3",
                            meta?.cellClassName,
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0">
                    {isDatasetEmpty && emptyTitle ? (
                      <DataTableEmptyState
                        icon={emptyIcon}
                        title={emptyTitle}
                        description={emptyDescription}
                        action={emptyAction}
                      />
                    ) : isFilteredEmpty ? (
                      <DataTableEmptyState
                        icon={<SearchX className="h-6 w-6" />}
                        title={filteredEmptyTitle}
                        description={filteredEmptyDescription}
                      />
                    ) : (
                      <div className="text-muted-foreground py-16 text-center text-sm">
                        No results found
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination Bar Card */}
      {showPagination && (
        <Card className="bg-card border-border border">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground hidden text-xs sm:inline sm:text-sm">
                  {table.getFilteredRowModel().rows.length === 0
                    ? "No entries"
                    : `Showing ${
                        table.getState().pagination.pageIndex *
                          table.getState().pagination.pageSize +
                        1
                      } to ${Math.min(
                        (table.getState().pagination.pageIndex + 1) *
                          table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length,
                      )} of ${table.getFilteredRowModel().rows.length} entries`}
                </p>
                <p className="text-muted-foreground text-xs sm:hidden">
                  {table.getFilteredRowModel().rows.length === 0
                    ? "0"
                    : `${
                        table.getState().pagination.pageIndex *
                          table.getState().pagination.pageSize +
                        1
                      }-${Math.min(
                        (table.getState().pagination.pageIndex + 1) *
                          table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length,
                      )} of ${table.getFilteredRowModel().rows.length}`}
                </p>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    <span className="hidden sm:inline">Page </span>
                    <span className="text-foreground font-medium">
                      {table.getState().pagination.pageIndex + 1}
                    </span>
                    <span className="sm:inline"> of </span>
                    <span className="text-foreground font-medium">
                      {table.getPageCount() || 1}
                    </span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="h-4 w-4" />
                  <span className="sr-only">Last page</span>
                </Button>
              </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Helper component for sortable column headers
export function DataTableColumnHeader({
  column,
  title,
  className,
}: {
  column: {
    getCanSort: () => boolean;
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (isDesc: boolean) => void;
  };
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs sm:text-sm", className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "data-[state=open]:bg-accent -ml-2 h-8 px-2 text-xs font-medium hover:bg-transparent sm:text-sm",
        className,
      )}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span className="mr-2">{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowUpDown className="h-3 w-3 rotate-180 sm:h-3.5 sm:w-3.5" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      ) : (
        <ArrowUpDown className="text-muted-foreground/50 h-3 w-3 sm:h-3.5 sm:w-3.5" />
      )}
    </Button>
  );
}

// Export skeleton component for loading states
export function DataTableSkeleton({
  columns: _columns = 5,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <Card className="bg-card border-border border">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="bg-muted/30 h-9 w-full flex-1 animate-pulse sm:max-w-sm"></div>
          <div className="bg-muted/30 h-9 w-24 animate-pulse"></div>
        </div>
      </Card>

      {/* Table skeleton */}
      <Card className="bg-card border-border overflow-hidden border p-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {/* Mobile: 3 columns, sm: 5 columns, lg: 6 columns */}
                <TableHead className="h-12 px-3 text-left align-middle sm:h-14 sm:px-4">
                  <div className="bg-muted/30 h-4 w-16 animate-pulse rounded sm:w-24 lg:w-32"></div>
                </TableHead>
                <TableHead className="h-12 px-3 text-left align-middle sm:h-14 sm:px-4">
                  <div className="bg-muted/30 h-4 w-14 animate-pulse rounded sm:w-20 lg:w-24"></div>
                </TableHead>
                <TableHead className="hidden h-12 px-3 text-left align-middle sm:table-cell sm:h-14 sm:px-4">
                  <div className="bg-muted/30 h-4 w-14 animate-pulse rounded sm:w-20 lg:w-24"></div>
                </TableHead>
                <TableHead className="hidden h-12 px-3 text-left align-middle sm:table-cell sm:h-14 sm:px-4">
                  <div className="bg-muted/30 h-4 w-16 animate-pulse rounded sm:w-20 lg:w-24"></div>
                </TableHead>
                <TableHead className="h-12 px-3 text-left align-middle sm:h-14 sm:px-4">
                  <div className="bg-muted/30 h-4 w-10 animate-pulse rounded sm:w-12 lg:w-16"></div>
                </TableHead>
                <TableHead className="hidden h-12 px-3 text-left align-middle sm:h-14 sm:px-4 lg:table-cell">
                  <div className="bg-muted/30 h-4 w-20 animate-pulse rounded"></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i} className="border-b">
                  {/* Client */}
                  <TableCell className="px-3 py-3 align-middle sm:px-4 sm:py-4">
                    <div className="bg-muted/30 h-4 w-16 animate-pulse rounded sm:w-24 lg:w-32"></div>
                  </TableCell>
                  {/* Date */}
                  <TableCell className="px-3 py-3 align-middle sm:px-4 sm:py-4">
                    <div className="bg-muted/30 h-4 w-14 animate-pulse rounded sm:w-20 lg:w-24"></div>
                  </TableCell>
                  {/* Status (sm+) */}
                  <TableCell className="hidden px-3 py-3 align-middle sm:table-cell sm:px-4 sm:py-4">
                    <div className="bg-muted/30 h-4 w-14 animate-pulse rounded sm:w-20 lg:w-24"></div>
                  </TableCell>
                  {/* Amount (sm+) */}
                  <TableCell className="hidden px-3 py-3 align-middle sm:table-cell sm:px-4 sm:py-4">
                    <div className="bg-muted/30 h-4 w-16 animate-pulse rounded sm:w-20 lg:w-24"></div>
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="px-3 py-3 align-middle sm:px-4 sm:py-4">
                    <div className="bg-muted/30 h-4 w-10 animate-pulse rounded sm:w-12 lg:w-16"></div>
                  </TableCell>
                  {/* Extra (lg+) */}
                  <TableCell className="hidden px-3 py-3 align-middle sm:px-4 sm:py-4 lg:table-cell">
                    <div className="bg-muted/30 h-4 w-20 animate-pulse rounded"></div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination skeleton */}
      <Card className="bg-card border-border border">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="bg-muted/30 h-4 w-20 animate-pulse rounded text-xs sm:w-32 sm:text-sm"></div>
            <div className="bg-muted/30 h-8 w-[70px] animate-pulse rounded"></div>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted/30 h-8 w-8 animate-pulse rounded"
              ></div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
