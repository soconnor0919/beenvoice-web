"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "~/components/layout/page-tabs";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Star } from "lucide-react";

interface TemplateForm {
  name: string;
  type: "notes" | "terms";
  content: string;
  isDefault: boolean;
}

const defaultForm: TemplateForm = {
  name: "",
  type: "notes",
  content: "",
  isDefault: false,
};

type InvoiceTemplate = RouterOutputs["invoiceTemplates"]["getAll"][number];

interface TemplateListProps {
  items: InvoiceTemplate[];
  type: "notes" | "terms";
  isLoading: boolean;
  onCreate: (type: "notes" | "terms") => void;
  onEdit: (template: InvoiceTemplate) => void;
  onDelete: (id: string) => void;
}

function TemplateList({
  items,
  type,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
}: TemplateListProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onCreate(type)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New{" "}
          {type === "notes" ? "Notes" : "Terms"} Template
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          No {type} templates yet.
        </div>
      ) : (
        items.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{template.name}</p>
                    {template.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="mr-1 h-3 w-3" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-3 text-sm whitespace-pre-wrap">
                    {template.content}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8 w-8 p-0"
                    onClick={() => onDelete(template.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState<"notes" | "terms">("notes");

  const utils = api.useUtils();
  const { data: templates = [], isLoading } =
    api.invoiceTemplates.getAll.useQuery();

  const create = api.invoiceTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      void utils.invoiceTemplates.getAll.invalidate();
      setOpen(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });
  const update = api.invoiceTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      void utils.invoiceTemplates.getAll.invalidate();
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });
  const del = api.invoiceTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      void utils.invoiceTemplates.getAll.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpen = (type: "notes" | "terms") => {
    setEditId(null);
    setForm({ ...defaultForm, type });
    setOpen(true);
  };
  const handleEdit = (t: InvoiceTemplate) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      type: t.type as "notes" | "terms",
      content: t.content,
      isDefault: t.isDefault,
    });
    setOpen(true);
  };
  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }
    if (editId) update.mutate({ id: editId, ...form });
    else create.mutate(form);
  };

  const notesTemplates = templates.filter((t) => t.type === "notes");
  const termsTemplates = templates.filter((t) => t.type === "terms");

  return (
    <DashboardPage className="pb-6">
      <DashboardPageHeader
        title="Invoice Templates"
        description="Reusable notes and payment terms for your invoices"
      />

      <PageTabs value={tab} onValueChange={(v) => setTab(v as "notes" | "terms")}>
        <PageTabsList>
          <PageTabsTrigger value="notes">
            <FileText className="mr-1.5 h-4 w-4" /> Notes (
            {notesTemplates.length})
          </PageTabsTrigger>
          <PageTabsTrigger value="terms">
            <FileText className="mr-1.5 h-4 w-4" /> Terms (
            {termsTemplates.length})
          </PageTabsTrigger>
        </PageTabsList>
        <PageTabsContent value="notes">
          <TemplateList
            items={notesTemplates}
            type="notes"
            isLoading={isLoading}
            onCreate={handleOpen}
            onEdit={handleEdit}
            onDelete={setDeleteId}
          />
        </PageTabsContent>
        <PageTabsContent value="terms">
          <TemplateList
            items={termsTemplates}
            type="terms"
            isLoading={isLoading}
            onCreate={handleOpen}
            onEdit={handleEdit}
            onDelete={setDeleteId}
          />
        </PageTabsContent>
      </PageTabs>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Standard Payment Terms"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Tabs
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as "notes" | "terms" }))
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="Template content…"
                className="min-h-[120px]"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={form.isDefault}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, isDefault: !!v }))
                }
              />
              <span className="text-sm">Set as default for {form.type}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending
                ? "Saving…"
                : editId
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && del.mutate({ id: deleteId })}
              disabled={del.isPending}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPage>
  );
}
