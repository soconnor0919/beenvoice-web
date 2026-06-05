"use client";

import { Copy, Key, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

function formatApiKeyDate(value: Date | string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function ApiAccessSettings() {
  const utils = api.useUtils();
  const [keyName, setKeyName] = React.useState("");
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const endpoint =
    typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;

  const { data: apiKeys = [], isLoading } = api.apiKeys.list.useQuery();

  const createApiKey = api.apiKeys.create.useMutation({
    onSuccess: (result) => {
      setCreatedKey(result.key);
      setKeyName("");
      toast.success("API key created");
      void utils.apiKeys.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const revokeApiKey = api.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      void utils.apiKeys.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke API key");
    },
  });

  const handleCreateKey = (event: React.FormEvent) => {
    event.preventDefault();
    if (!keyName.trim()) {
      toast.error("Enter a key name");
      return;
    }
    createApiKey.mutate({ name: keyName.trim() });
  };

  return (
    <div className="space-y-8">
      <Card className="form-section bg-card border-border border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Key className="text-primary h-5 w-5" />
            API Access
          </CardTitle>
          <CardDescription>
            Manage API keys for MCP clients and direct tRPC access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCreateKey} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Key Name</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="api-key-name"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="Claude Desktop"
                  maxLength={100}
                />
                <Button
                  type="submit"
                  disabled={createApiKey.isPending}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createApiKey.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </form>

          <div className="space-y-2">
            <Label htmlFor="mcp-endpoint">MCP Endpoint</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input id="mcp-endpoint" value={endpoint} readOnly />
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyText(endpoint, "Endpoint")}
                className="w-full sm:w-auto"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          {createdKey && (
            <div className="border-primary/30 bg-primary/5 space-y-3 border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">New API key</p>
                  <p className="text-muted-foreground text-sm">
                    This key is shown once.
                  </p>
                </div>
                <Badge variant="outline">Bearer</Badge>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={createdKey} readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  onClick={() => void copyText(createdKey, "API key")}
                  className="w-full sm:w-auto"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">Active Keys</h3>
              <Badge variant="secondary">{apiKeys.length}</Badge>
            </div>

            {isLoading ? (
              <div className="text-muted-foreground border p-4 text-sm">
                Loading keys...
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-muted-foreground border p-4 text-sm">
                No API keys created.
              </div>
            ) : (
              <div className="divide-border border">
                {apiKeys.map((apiKey) => {
                  const revoked = Boolean(apiKey.revokedAt);
                  return (
                    <div
                      key={apiKey.id}
                      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium break-words">
                            {apiKey.name}
                          </p>
                          <Badge variant={revoked ? "destructive" : "outline"}>
                            {revoked ? "Revoked" : apiKey.keyPrefix}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Created {formatApiKeyDate(apiKey.createdAt)} · Last
                          used {formatApiKeyDate(apiKey.lastUsedAt)}
                        </p>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={revoked || revokeApiKey.isPending}
                            className="w-full sm:w-auto"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately block requests using{" "}
                              <span className="font-medium">{apiKey.name}</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                revokeApiKey.mutate({ id: apiKey.id })
                              }
                            >
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
