"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "~/components/ui/button";
import { DataTable, DataTableColumnHeader } from "~/components/data/data-table";
import { UserPlus, Pencil, Trash2, Plus, Users } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";

// Type for client data
interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date | null;
}

interface ClientsDataTableProps {
  clients: Client[];
}

const formatAddress = (client: Client) => {
  const parts = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.state,
    client.postalCode,
  ].filter(Boolean);
  return parts.join(", ") || "—";
};

export function ClientsDataTable({
  clients: initialClients,
}: ClientsDataTableProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const utils = api.useUtils();

  const deleteClientMutation = api.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      setClients(clients.filter((c) => c.id !== clientToDelete?.id));
      setClientToDelete(null);
      void utils.clients.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete client: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (!clientToDelete) return;
    deleteClientMutation.mutate({ id: clientToDelete.id });
  };

  const handleRowClick = (client: Client) => {
    router.push(`/dashboard/clients/${client.id}`);
  };

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 hidden p-2 sm:flex">
              <UserPlus className="text-primary h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{client.name}</p>
              <p className="text-muted-foreground truncate text-sm">
                {client.email ?? "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => row.original.phone ?? "—",
      meta: {
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell",
      },
    },
    {
      id: "address",
      header: "Address",
      cell: ({ row }) => formatAddress(row.original),
      meta: {
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt");
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }).format(new Date(date as Date));
      },
      meta: {
        headerClassName: "hidden xl:table-cell",
        cellClassName: "hidden xl:table-cell",
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                data-action-button="true"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              data-action-button="true"
              onClick={() => setClientToDelete(client)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={clients}
        searchKey="name"
        searchPlaceholder="Search clients..."
        emptyTitle="Create your first client"
        emptyDescription="Add clients to bill them and keep contact details in one place."
        emptyIcon={<Users className="h-6 w-6" />}
        emptyAction={
          <Button asChild>
            <Link href="/dashboard/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add client
            </Link>
          </Button>
        }
        onRowClick={handleRowClick}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              client &quot;{clientToDelete?.name}&quot; and remove all
              associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteClientMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
