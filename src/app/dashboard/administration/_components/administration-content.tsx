"use client";

import {
  Activity,
  Building2,
  Clock,
  FileText,
  KeyRound,
  Pencil,
  ScrollText,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "~/components/layout/page-layout";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "~/components/layout/page-tabs";
import { dashboardStatGridClass } from "~/components/layout/dashboard-page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  "user.profile_updated": "Profile updated",
  "user.role_updated": "Role updated",
  "user.password_reset_sent": "Password reset sent",
  "platform.pdf_settings_updated": "PDF settings updated",
};

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function AdminOverview() {
  const { data: stats, isLoading, error } = api.admin.getStats.useQuery();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform overview</CardTitle>
          <CardDescription>Unable to load statistics.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statCards = [
    {
      label: "Total users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
    },
    {
      label: `Active (${stats?.activeUserWindowDays ?? 30}d)`,
      value: stats?.activeUsers ?? 0,
      icon: Activity,
    },
    {
      label: "Administrators",
      value: stats?.adminCount ?? 0,
      icon: Shield,
    },
    {
      label: "Invoices",
      value: stats?.totalInvoices ?? 0,
      icon: FileText,
    },
    {
      label: "Businesses",
      value: stats?.totalBusinesses ?? 0,
      icon: Building2,
    },
    {
      label: "Clients",
      value: stats?.totalClients ?? 0,
      icon: Users,
    },
    {
      label: "Time entries",
      value: stats?.totalTimeEntries ?? 0,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="text-primary h-5 w-5" />
            Platform overview
          </CardTitle>
          <CardDescription>
            Aggregate counts only — no customer data, credentials, or bulk PII.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading statistics…</p>
          ) : (
            <div className={dashboardStatGridClass}>
              {statCards.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                      <stat.icon className="h-3.5 w-3.5" />
                      {stat.label}
                    </div>
                    <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type EditUserState = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

function AdminUsers() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [offset, setOffset] = useState(0);
  const [editUser, setEditUser] = useState<EditUserState | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState("");

  const utils = api.useUtils();
  const { data, isLoading, error, isFetching } = api.admin.listUsers.useQuery({
    search: deferredSearch || undefined,
    offset,
    limit: PAGE_SIZE,
  });

  const updateUserMutation = api.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated");
      setEditUser(null);
      void utils.admin.listUsers.invalidate();
      void utils.admin.listAuditLog.invalidate();
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });

  const sendResetMutation = api.admin.sendPasswordReset.useMutation({
    onSuccess: (result) => {
      if (result.emailSent) {
        toast.success("Password reset email sent");
      } else {
        toast.warning(
          "Reset token created, but email could not be sent. Check Resend configuration.",
        );
      }
      setResetUserId(null);
      void utils.admin.listAuditLog.invalidate();
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Administrative access is required.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-primary h-5 w-5" />
            Users
          </CardTitle>
          <CardDescription>
            Search accounts, edit profiles, and manage access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading users…</p>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No users found"
              description={
                deferredSearch
                  ? "Try a different search term."
                  : "No accounts have been created yet."
              }
            />
          ) : (
            <div className="divide-border divide-y border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{user.name}</p>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                      >
                        {user.role}
                      </Badge>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="text-xs">
                          Verified
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Joined{" "}
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditUser({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role as "user" | "admin",
                        })
                      }
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetUserId(user.id);
                        setResetUserName(user.name);
                      }}
                    >
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                      Reset password
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-muted-foreground text-xs">
                Page {currentPage} of {totalPages} · {total} users
                {isFetching ? " · Updating…" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset((value) => value + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={editUser != null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {editUser ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                updateUserMutation.mutate({
                  userId: editUser.id,
                  name: editUser.name,
                  email: editUser.email,
                  role: editUser.role,
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Name</Label>
                <Input
                  id="edit-user-name"
                  value={editUser.name}
                  onChange={(event) =>
                    setEditUser((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-email">Email</Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  value={editUser.email}
                  onChange={(event) =>
                    setEditUser((current) =>
                      current
                        ? { ...current, email: event.target.value }
                        : current,
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-role">Role</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(role) =>
                    setEditUser((current) =>
                      current
                        ? { ...current, role: role as "user" | "admin" }
                        : current,
                    )
                  }
                >
                  <SelectTrigger id="edit-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={resetUserId != null}
        onOpenChange={(open) => {
          if (!open) setResetUserId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send password reset?</AlertDialogTitle>
            <AlertDialogDescription>
              A password reset email will be sent to{" "}
              <span className="font-medium">{resetUserName}</span>. The link
              expires in 24 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendResetMutation.isPending}
              onClick={() => {
                if (resetUserId) {
                  sendResetMutation.mutate({ userId: resetUserId });
                }
              }}
            >
              {sendResetMutation.isPending ? "Sending…" : "Send reset email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AdminAuditLog() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error, isFetching } = api.admin.listAuditLog.useQuery(
    {
      offset,
      limit: PAGE_SIZE,
    },
  );

  const entries = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Administrative access is required.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="text-primary h-5 w-5" />
          Audit log
        </CardTitle>
        <CardDescription>
          Recent administrative actions across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading audit log…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title="No audit events yet"
            description="Administrative actions will appear here."
          />
        ) : (
          <div className="divide-border divide-y border">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {formatAction(entry.action)}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {entry.targetType}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {entry.actor?.name ?? "Unknown admin"} ·{" "}
                  {new Date(entry.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {entry.targetId ? ` · target ${entry.targetId.slice(0, 8)}…` : ""}
                </p>
                {entry.metadata &&
                Object.keys(entry.metadata).length > 0 ? (
                  <p className="text-muted-foreground font-mono text-xs break-all">
                    {JSON.stringify(entry.metadata)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {total > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Page {currentPage} of {totalPages} · {total} events
              {isFetching ? " · Updating…" : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdministrationContent() {
  return (
    <PageTabs defaultValue="overview">
      <PageTabsList>
        <PageTabsTrigger value="overview">Overview</PageTabsTrigger>
        <PageTabsTrigger value="users">Users</PageTabsTrigger>
        <PageTabsTrigger value="audit">Audit log</PageTabsTrigger>
      </PageTabsList>

      <PageTabsContent value="overview">
        <AdminOverview />
      </PageTabsContent>

      <PageTabsContent value="users">
        <AdminUsers />
      </PageTabsContent>

      <PageTabsContent value="audit">
        <AdminAuditLog />
      </PageTabsContent>
    </PageTabs>
  );
}
