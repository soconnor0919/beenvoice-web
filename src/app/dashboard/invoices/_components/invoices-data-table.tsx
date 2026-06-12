"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { StatusBadge, type StatusType } from "~/components/data/status-badge";
import { PDFDownloadButton } from "~/app/dashboard/invoices/[id]/_components/pdf-download-button";
import { DataTable, DataTableColumnHeader } from "~/components/data/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Eye,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  Send,
  ChevronDown,
} from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { getEffectiveInvoiceStatus } from "~/lib/invoice-status";
import { formatCurrency } from "~/lib/currency";
import type { StoredInvoiceStatus } from "~/types/invoice";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  businessId: string | null;
  issueDate: Date;
  dueDate: Date;
  status: string;
  totalAmount: number;
  taxRate: number;
  currency: string;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date | null;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  business?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  items?: Array<{
    id: string;
    invoiceId: string;
    date: Date;
    description: string;
    hours: number;
    rate: number;
    amount: number;
    position: number;
    createdAt: Date;
  }> | null;
}

interface InvoicesDataTableProps {
  invoices: Invoice[];
}

const getStatusType = (invoice: Invoice): StatusType =>
  getEffectiveInvoiceStatus(
    invoice.status as StoredInvoiceStatus,
    invoice.dueDate,
  );

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date));

export function InvoicesDataTable({ invoices }: InvoicesDataTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<Invoice[]>([]);

  const utils = api.useUtils();

  const deleteInvoice = api.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted");
      void utils.invoices.getAll.invalidate();
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (e) => toast.error(e.message ?? "Failed to delete invoice"),
  });

  const bulkDelete = api.invoices.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${data.deleted} invoice${data.deleted !== 1 ? "s" : ""} deleted`,
      );
      void utils.invoices.getAll.invalidate();
      setBulkDeleteDialogOpen(false);
      setPendingBulkDelete([]);
    },
    onError: (e) => toast.error(e.message ?? "Failed to delete invoices"),
  });

  const bulkUpdateStatus = api.invoices.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${data.updated} invoice${data.updated !== 1 ? "s" : ""} updated`,
      );
      void utils.invoices.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Failed to update invoices"),
  });

  const columns: ColumnDef<Invoice>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
          data-action-button="true"
        />
      ),
      cell: ({ row }: { row: Row<Invoice> }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
          data-action-button="true"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "client.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Client" />
      ),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 hidden p-2 sm:flex">
              <FileText className="text-primary h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {invoice.client?.name ?? "—"}
              </p>
              <p className="text-muted-foreground truncate text-xs sm:text-sm">
                {invoice.invoiceNumber}
              </p>
              <div className="mt-1 flex items-center gap-2 sm:hidden">
                <StatusBadge
                  status={getStatusType(invoice)}
                  className="text-xs"
                />
                <span className="text-foreground text-xs font-semibold">
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "issueDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">
            {formatDate(row.getValue("issueDate"))}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            Due {formatDate(new Date(row.original.dueDate))}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusBadge
          status={getStatusType(row.original)}
          className={
            getStatusType(row.original) === "sent" ? "status-pending" : ""
          }
        />
      ),
      filterFn: (row, _id, value: string[]) =>
        value.includes(getStatusType(row.original)),
      meta: {
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
      },
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <p className="text-sm font-semibold">
            {formatCurrency(row.getValue("totalAmount"), row.original.currency)}
          </p>
          <p className="text-muted-foreground text-xs">
            {row.original.items?.length ?? 0} items
          </p>
        </div>
      ),
      meta: {
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Link href={`/dashboard/invoices/${invoice.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="hover-scale h-8 w-8 p-0"
                data-action-button="true"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
              <Button
                variant="ghost"
                size="sm"
                className="hover-scale h-8 w-8 p-0"
                data-action-button="true"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="hover-scale text-destructive hover:text-destructive/80 h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setInvoiceToDelete(invoice);
                setDeleteDialogOpen(true);
              }}
              data-action-button="true"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {invoice.items && invoice.client && (
              <div data-action-button="true">
                <PDFDownloadButton invoiceId={invoice.id} variant="icon" />
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const filterableColumns = [
    {
      id: "status",
      title: "Status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Sent", value: "sent" },
        { label: "Paid", value: "paid" },
        { label: "Overdue", value: "overdue" },
      ],
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={invoices}
        searchKey="invoiceNumber"
        searchPlaceholder="Search invoices..."
        initialSorting={[{ id: "issueDate", desc: true }]}
        filterableColumns={filterableColumns}
        onRowClick={(invoice) =>
          router.push(`/dashboard/invoices/${invoice.id}`)
        }
        selectionActions={(selected, clear) => (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkUpdateStatus.isPending}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Mark as
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdateStatus.mutate(
                      { ids: selected.map((i) => i.id), status: "sent" },
                      { onSuccess: clear },
                    )
                  }
                >
                  <Send className="mr-2 h-4 w-4" /> Mark Sent
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdateStatus.mutate(
                      { ids: selected.map((i) => i.id), status: "paid" },
                      { onSuccess: clear },
                    )
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdateStatus.mutate(
                      { ids: selected.map((i) => i.id), status: "draft" },
                      { onSuccess: clear },
                    )
                  }
                >
                  <FileText className="mr-2 h-4 w-4" /> Mark Draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDelete.isPending}
              onClick={() => {
                setPendingBulkDelete(selected);
                setBulkDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete ({selected.length})
            </Button>
          </>
        )}
      />

      {/* Single delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice{" "}
              <strong>{invoiceToDelete?.invoiceNumber}</strong> for{" "}
              <strong>{invoiceToDelete?.client?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                invoiceToDelete &&
                deleteInvoice.mutate({ id: invoiceToDelete.id })
              }
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? "Deleting..." : "Delete Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {pendingBulkDelete.length} Invoice
              {pendingBulkDelete.length !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {pendingBulkDelete.length} invoice
              {pendingBulkDelete.length !== 1 ? "s" : ""}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDelete.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                bulkDelete.mutate({ ids: pendingBulkDelete.map((i) => i.id) })
              }
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending
                ? "Deleting..."
                : `Delete ${pendingBulkDelete.length} Invoice${pendingBulkDelete.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
