"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/data/data-table";
import {
  formatLineItemDetail,
  isFixedLineItem,
} from "~/lib/invoice-line-item";

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Type for invoice item data
interface InvoiceItem {
  id: string;
  invoiceId: string;
  date: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  position: number;
  createdAt: Date;
}

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
}

const columns: ColumnDef<InvoiceItem>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("date")),
    meta: {
      headerClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <>
          {/* Desktop: plain description */}
          <div className="hidden font-medium sm:block">{item.description}</div>
          {/* Mobile: description + date + hours @ rate stacked */}
          <div className="sm:hidden">
            <p className="font-medium">{item.description}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatDate(item.date)} &middot;{" "}
              {formatLineItemDetail(item.hours, item.rate, formatCurrency)}
            </p>
          </div>
        </>
      );
    },
  },
  {
    accessorKey: "hours",
    header: "Hours",
    cell: ({ row }) => {
      const hours = row.getValue<number>("hours");
      return (
        <div className="text-right">{isFixedLineItem(hours) ? "—" : hours}</div>
      );
    },
    meta: {
      headerClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
    },
  },
  {
    accessorKey: "rate",
    header: "Rate",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="text-right">
          {isFixedLineItem(item.hours)
            ? "—"
            : `${formatCurrency(item.rate)}/hr`}
        </div>
      );
    },
    meta: {
      headerClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="text-primary text-right font-medium">
        {formatCurrency(row.getValue("amount"))}
      </div>
    ),
  },
];

export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={items}
      showSearch={false}
      showColumnVisibility={false}
      showPagination={false}
    />
  );
}
