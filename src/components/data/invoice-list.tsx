"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { StatusBadge, type StatusType } from "~/components/data/status-badge";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Plus,
  User,
} from "lucide-react";

export function InvoiceList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const { data: invoices, isLoading, refetch } = api.invoices.getAll.useQuery();
  const deleteInvoice = api.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      void refetch();
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete invoice");
    },
  });

  const filteredInvoices =
    invoices?.filter(
      (invoice) =>
        invoice.invoiceNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ) ?? [];

  const handleDelete = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoice.mutate({ id: invoiceToDelete });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="bg-muted h-4 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="bg-muted h-3 animate-pulse rounded" />
                <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Invoices Yet</CardTitle>
          <CardDescription>
            Get started by creating your first invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/invoices/new">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Invoice
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Label htmlFor="search">Search invoices</Label>
          <Input
            id="search"
            placeholder="Search by invoice number or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{invoice.invoiceNumber}</span>
                <div className="flex space-x-1">
                  <Link href={`/dashboard/invoices/${invoice.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {invoice.status === "draft" ? (
                    <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Only draft invoices can be edited"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(invoice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <div className="flex items-center justify-between">
                <StatusBadge status={invoice.status as StatusType} />
                <span className="text-primary text-lg font-bold">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-muted-foreground flex items-center text-sm">
                <User className="mr-2 h-4 w-4" />
                {invoice.client.name}
              </div>
              <div className="text-muted-foreground flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4" />
                Due: {formatDate(invoice.dueDate)}
              </div>
              <div className="text-muted-foreground flex items-center text-sm">
                <FileText className="mr-2 h-4 w-4" />
                {invoice.items.length} item
                {invoice.items.length !== 1 ? "s" : ""}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
