"use client";

import {
  AlertTriangle,
  Building,
  ChevronDown,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  Info,
  Key,
  Monitor,
  Palette,
  Shield,
  Upload,
  User,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { useAuthSession } from "~/hooks/use-auth-session";
import * as React from "react";
import { useState } from "react";

import Link from "next/link";
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
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { InputColor } from "~/components/ui/input-color";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import { env } from "~/env";
import { Switch } from "~/components/ui/switch";
import { Slider } from "~/components/ui/slider";
import { useAnimationPreferences } from "~/components/providers/animation-preferences-provider";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
  pageTabsGridClass,
} from "~/components/layout/page-tabs";
import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAppearance } from "~/components/providers/appearance-provider";
import { brand, colorModes } from "~/lib/branding";
import type { PdfTemplate } from "~/lib/appearance";
import { ApiAccessSettings } from "./api-access-settings";
import { ImportPageHeaderActions } from "./invoice-import/import-page-header-actions";

const InvoiceImportPage = dynamic(
  () =>
    import("~/components/invoice-import-page").then(
      (module) => module.InvoiceImportPage,
    ),
  {
    loading: () => (
      <div className="bg-muted/30 text-muted-foreground flex h-32 items-center justify-center rounded-lg border text-sm">
        Loading import tools...
      </div>
    ),
  },
);

const PdfPreviewFrame = dynamic(
  () => import("./pdf-preview-frame").then((module) => module.PdfPreviewFrame),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 text-muted-foreground flex h-[680px] items-center justify-center border text-sm">
        Loading PDF preview...
      </div>
    ),
  },
);

function isFullHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

const SETTINGS_TABS = ["general", "preferences", "data", "api"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function isSettingsTab(value: string | null | undefined): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

export function SettingsContent({
  initialTab = "general",
}: {
  initialTab?: SettingsTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = isSettingsTab(tabParam) ? tabParam : initialTab;

  const handleTabChange = (value: string) => {
    if (!isSettingsTab(value)) return;
    router.replace(`/dashboard/settings?tab=${value}`, { scroll: false });
  };

  const { data: session } = useAuthSession();
  const [name, setName] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [importData, setImportData] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importMethod, setImportMethod] = useState<"file" | "paste">("file");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const authentikEnabled = env.NEXT_PUBLIC_AUTHENTIK_ENABLED === true;
  const { colorMode, updateAppearance, isUpdating: appearanceUpdating } =
    useAppearance();
  const utils = api.useUtils();
  const { data: pdfSettings } = api.settings.getPdfSettings.useQuery();
  const updatePdfSettingsMutation = api.settings.updatePdfSettings.useMutation({
    onSuccess: async () => {
      await utils.settings.getPdfSettings.invalidate();
      toast.success("Invoice PDF settings updated");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to update PDF settings: ${error.message}`);
    },
  });

  const savePdfSettings = (patch: {
    pdfTemplate?: PdfTemplate;
    pdfAccentColor?: string;
    pdfFooterText?: string;
    pdfShowLogo?: boolean;
    pdfShowPageNumbers?: boolean;
  }) => {
    updatePdfSettingsMutation.mutate(patch);
  };

  const handleLinkAuthentik = async () => {
    setIsLinking(true);
    try {
      await authClient.signIn.oauth2({
        providerId: "authentik",
        callbackURL: "/dashboard/settings",
      });
    } catch {
      toast.error("Failed to link account");
      setIsLinking(false);
    }
  };

  // Animation preferences via provider (centralized)
  const {
    prefersReducedMotion,
    animationSpeedMultiplier,
    updatePreferences,
    isUpdating: animationPrefsUpdating,
    setPrefersReducedMotion,
    setAnimationSpeedMultiplier,
  } = useAnimationPreferences();

  const handleSaveAnimationPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences({
      prefersReducedMotion,
      animationSpeedMultiplier,
    });
    toast.success("Animation preferences updated");
  };

  // Queries
  const { data: profile, refetch: refetchProfile } =
    api.settings.getProfile.useQuery();
  const isAdmin = profile?.role === "admin";
  const { data: dataStats } = api.settings.getDataStats.useQuery();

  // Mutations
  const updateProfileMutation = api.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      void refetchProfile();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const changePasswordMutation = api.settings.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });

  const exportDataQuery = api.settings.exportData.useQuery(undefined, {
    enabled: false,
  });

  // Handle download logic
  const handleDownload = React.useCallback((data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beenvoice-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Data backup downloaded successfully");
  }, []);

  const importDataMutation = api.settings.importData.useMutation({
    onSuccess: (result) => {
      const { imported } = result;
      toast.success(
        `Data imported successfully! Added ${imported.clients} clients, ${imported.businesses} businesses, ${imported.invoices} invoices, ${imported.expenses} expenses, ${imported.timeEntries} time entries, and ${imported.recurringInvoices} recurring invoices.`,
      );
      setImportData("");
      setIsImportDialogOpen(false);
      void refetchProfile();
    },
    onError: (error: { message: string }) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const deleteDataMutation = api.settings.deleteAllData.useMutation({
    onSuccess: () => {
      toast.success("All data has been permanently deleted");
      setDeleteConfirmText("");
    },
    onError: (error: { message: string }) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    updateProfileMutation.mutate({ name: name.trim() });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  const handleExportData = async () => {
    try {
      const result = await exportDataQuery.refetch();
      if (result.data) {
        handleDownload(result.data);
      }
    } catch (error) {
      toast.error(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Type guard for backup data
  const isValidBackupData = (data: unknown): boolean => {
    if (typeof data !== "object" || data === null) return false;

    const obj = data as Record<string, unknown>;
    return !!(
      obj.exportDate &&
      obj.version &&
      obj.user &&
      obj.clients &&
      obj.businesses &&
      obj.invoices &&
      Array.isArray(obj.clients) &&
      Array.isArray(obj.businesses) &&
      Array.isArray(obj.invoices)
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData: unknown = JSON.parse(content);

        if (isValidBackupData(parsedData)) {
          // @ts-expect-error Server handles validation of backup data format
          importDataMutation.mutate(parsedData);
        } else {
          toast.error("Invalid backup file format");
        }
      } catch {
        toast.error("Invalid JSON format. Please check your backup file.");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleImportData = () => {
    try {
      const parsedData: unknown = JSON.parse(importData);

      if (isValidBackupData(parsedData)) {
        // @ts-expect-error Server handles validation of backup data format
        importDataMutation.mutate(parsedData);
      } else {
        toast.error("Invalid backup file format");
      }
    } catch {
      toast.error("Invalid JSON format. Please check your backup file.");
    }
  };

  const handleDeleteAllData = () => {
    if (deleteConfirmText !== "delete all my data") {
      toast.error("Please type 'delete all my data' to confirm");
      return;
    }
    deleteDataMutation.mutate({ confirmText: deleteConfirmText });
  };

  // Set initial name value when profile loads
  React.useEffect(() => {
    if (profile?.name && !name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync async profile data into an editable form field.
      setName(profile.name);
    }
    if (session?.user) {
      setName(session.user.name ?? "");
    }
  }, [session, profile?.name, name]);

  // (Removed direct DOM mutation; provider handles applying preferences globally)

  const dataStatItems = [
    {
      label: "Clients",
      value: dataStats?.clients ?? 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Businesses",
      value: dataStats?.businesses ?? 0,
      icon: Building,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      label: "Invoices",
      value: dataStats?.invoices ?? 0,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-accent",
    },
  ];

  return (
    <PageTabs value={activeTab} onValueChange={handleTabChange}>
      <PageTabsList>
        <PageTabsTrigger value="general">General</PageTabsTrigger>
        <PageTabsTrigger value="preferences">Preferences</PageTabsTrigger>
        <PageTabsTrigger value="data">Data</PageTabsTrigger>
        <PageTabsTrigger value="api">API</PageTabsTrigger>
      </PageTabsList>

      <PageTabsContent value="general">
        <div className={cn(pageTabsGridClass, "lg:grid-cols-2")}>
          {/* Profile Section */}
          <Card className="form-section bg-card border-border border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <User className="text-primary h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={session?.user?.email ?? ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-muted-foreground text-sm">
                    Email address cannot be changed
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  variant="default"
                  className="hover-lift"
                >
                  {updateProfileMutation.isPending
                    ? "Updating..."
                    : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Key className="text-primary h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Change your password and manage account security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  variant="default"
                >
                  {changePasswordMutation.isPending
                    ? "Changing Password..."
                    : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {authentikEnabled && (
            <Card className="bg-card border-border border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <LinkIcon className="text-primary h-5 w-5" />
                  Connected Accounts
                </CardTitle>
                <CardDescription>
                  Manage your linked social accounts and SSO providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                        <Shield className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="leading-none font-medium">
                          Authentik SSO
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Connect your corporate account
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      disabled={isLinking}
                      onClick={handleLinkAuthentik}
                    >
                      {isLinking ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="bg-card border-border border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="text-primary h-5 w-5" />
              Legal
            </CardTitle>
            <CardDescription>
              Review how we handle your data and the terms for using{" "}
              {brand.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/terms">Terms of Service</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/privacy">Privacy Policy</Link>
            </Button>
          </CardContent>
        </Card>
      </PageTabsContent>

      <PageTabsContent value="preferences">
        <Card className="bg-card border-border border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Palette className="text-primary h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Choose light, dark, or match your system setting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm space-y-2">
              <Label className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Color mode
              </Label>
              <Select
                value={colorMode}
                onValueChange={(value) =>
                  updateAppearance({
                    colorMode: value as typeof colorMode,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorModes.map((modeOption) => (
                    <SelectItem
                      key={modeOption.value}
                      value={modeOption.value}
                    >
                      {modeOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs leading-snug">
                {
                  colorModes.find(
                    (modeOption) => modeOption.value === colorMode,
                  )?.description
                }
              </p>
            </div>
            {appearanceUpdating && (
              <p className="text-muted-foreground text-xs">Saving...</p>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="text-primary h-5 w-5" />
                Invoice Settings
              </CardTitle>
              <CardDescription>
                Configure generated invoice PDFs and preview the real document
                output.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={cn(
                  pageTabsGridClass,
                  "xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]",
                )}
              >
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Template
                      </Label>
                      <Select
                        value={pdfSettings?.pdfTemplate ?? "classic"}
                        onValueChange={(value) =>
                          savePdfSettings({
                            pdfTemplate: value as PdfTemplate,
                          })
                        }
                        disabled={updatePdfSettingsMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-muted-foreground text-xs leading-snug">
                        Minimal removes shaded table fills for a cleaner
                        document.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <InputColor
                        label="PDF Accent"
                        value={pdfSettings?.pdfAccentColor ?? "#111827"}
                        onBlur={() => undefined}
                        onChange={(value) => {
                          if (isFullHexColor(value)) {
                            savePdfSettings({ pdfAccentColor: value });
                          }
                        }}
                        className="mt-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Input
                      value={pdfSettings?.pdfFooterText ?? ""}
                      onChange={(event) =>
                        savePdfSettings({ pdfFooterText: event.target.value })
                      }
                      disabled={updatePdfSettingsMutation.isPending}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="flex items-start justify-between gap-4 border p-3">
                      <div className="space-y-1">
                        <Label>Show Logo</Label>
                        <p className="text-muted-foreground text-xs">
                          Include the beenvoice logo in the PDF footer.
                        </p>
                      </div>
                      <Switch
                        checked={pdfSettings?.pdfShowLogo ?? true}
                        onCheckedChange={(checked) =>
                          savePdfSettings({ pdfShowLogo: Boolean(checked) })
                        }
                        disabled={updatePdfSettingsMutation.isPending}
                        aria-label="Toggle PDF logo"
                      />
                    </div>

                    <div className="flex items-start justify-between gap-4 border p-3">
                      <div className="space-y-1">
                        <Label>Page Numbers</Label>
                        <p className="text-muted-foreground text-xs">
                          Show page count in the PDF footer.
                        </p>
                      </div>
                      <Switch
                        checked={pdfSettings?.pdfShowPageNumbers ?? true}
                        onCheckedChange={(checked) =>
                          savePdfSettings({
                            pdfShowPageNumbers: Boolean(checked),
                          })
                        }
                        disabled={updatePdfSettingsMutation.isPending}
                        aria-label="Toggle PDF page numbers"
                      />
                    </div>
                  </div>
                </div>

                <PdfPreviewFrame
                  businessName={brand.name}
                  settings={{
                    pdfTemplate: pdfSettings?.pdfTemplate ?? "classic",
                    pdfAccentColor: pdfSettings?.pdfAccentColor ?? "#111827",
                    pdfFooterText:
                      pdfSettings?.pdfFooterText ?? "Professional Invoicing",
                    pdfShowLogo: pdfSettings?.pdfShowLogo ?? true,
                    pdfShowPageNumbers: pdfSettings?.pdfShowPageNumbers ?? true,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accessibility & Animation */}
        <Card className="bg-card border-border border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Info className="text-primary h-5 w-5" />
              Accessibility & Animation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSaveAnimationPreferences}
              className="space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <Label>Reduce Motion</Label>
                  <p className="text-muted-foreground text-xs leading-snug">
                    Turn this on to reduce or remove non-essential animations
                    and transitions.
                  </p>
                </div>
                <Switch
                  checked={prefersReducedMotion}
                  onCheckedChange={(checked) =>
                    setPrefersReducedMotion(Boolean(checked))
                  }
                  aria-label="Toggle reduced motion"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="mb-0">Animation Speed Multiplier</Label>
                  <span className="text-muted-foreground text-xs font-medium">
                    {prefersReducedMotion
                      ? "1.00x (locked)"
                      : `${animationSpeedMultiplier.toFixed(2)}x`}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-snug">
                  Adjust global animation duration scaling. Lower values (0.25×,
                  0.5×, 0.75×) slow animations; higher values (2×, 3×, 4×) speed
                  them up.
                </p>
                <div className="flex flex-col gap-2">
                  {/* Slider (desktop / larger screens) */}
                  <div className="hidden sm:block">
                    <Slider
                      value={[animationSpeedMultiplier]}
                      min={0.25}
                      max={4}
                      step={0.25}
                      ticks={[0.25, 0.5, 0.75, 1, 2, 3, 4]}
                      formatTick={(t) => (t === 1 ? "1x" : `${t}x`)}
                      onValueChange={(v: number[]) =>
                        setAnimationSpeedMultiplier(v[0] ?? 1)
                      }
                      aria-label="Animation speed multiplier"
                      className="mt-1"
                      disabled={prefersReducedMotion}
                    />
                  </div>
                  {/* Dropdown fallback (small screens) */}
                  <div className="block sm:hidden">
                    <select
                      className="bg-background border-border text-foreground w-full rounded-md border px-2 py-2 text-sm disabled:opacity-60"
                      value={animationSpeedMultiplier}
                      disabled={prefersReducedMotion}
                      onChange={(e) =>
                        setAnimationSpeedMultiplier(
                          parseFloat(e.target.value) || 1,
                        )
                      }
                      aria-label="Animation speed multiplier select"
                    >
                      {[0.25, 0.5, 0.75, 1, 2, 3, 4].map((v) => (
                        <option key={v} value={v}>
                          {v === 1 ? "1x (default)" : `${v}x`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={animationPrefsUpdating}
                variant="default"
              >
                {animationPrefsUpdating ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageTabsContent>

      <PageTabsContent value="data">
        {/* Data Overview */}
        <Card className="form-section bg-card border-border border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Database className="text-primary h-5 w-5" />
              Account Data
            </CardTitle>
            <CardDescription>
              Overview of your stored information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataStatItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="bg-card rounded-lg border p-4 transition-shadow hover:shadow-sm"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${item.bgColor}`}>
                          <Icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <span className="font-medium break-words">
                          {item.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-foreground text-2xl font-bold">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-card border-border border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="text-primary h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Backup, restore, or manage your account data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button
                  onClick={handleExportData}
                  disabled={exportDataQuery.isFetching}
                  variant="outline"
                  className="w-full sm:flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportDataQuery.isFetching
                    ? "Exporting..."
                    : "Export Backup"}
                </Button>

                <Dialog
                  open={isImportDialogOpen}
                  onOpenChange={setIsImportDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:flex-1">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Backup
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import Backup Data</DialogTitle>
                      <DialogDescription>
                        Upload your backup JSON file or paste the contents
                        below. This will add the data to your existing account.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Import Method Selector */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            importMethod === "file" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setImportMethod("file")}
                          className="flex-1"
                        >
                          <FileUp className="mr-2 h-4 w-4" />
                          Upload File
                        </Button>
                        <Button
                          type="button"
                          variant={
                            importMethod === "paste" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setImportMethod("paste")}
                          className="flex-1"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Paste Content
                        </Button>
                      </div>

                      {/* File Upload Method */}
                      {importMethod === "file" && (
                        <div className="space-y-2">
                          <Label htmlFor="backup-file">
                            Select Backup File
                          </Label>
                          <Input
                            id="backup-file"
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            disabled={importDataMutation.isPending}
                          />
                          <p className="text-muted-foreground text-sm">
                            Select the JSON backup file you previously exported.
                          </p>
                        </div>
                      )}

                      {/* Manual Paste Method */}
                      {importMethod === "paste" && (
                        <div className="space-y-2">
                          <Label htmlFor="backup-content">Backup Content</Label>
                          <Textarea
                            id="backup-content"
                            placeholder="Paste your backup JSON data here..."
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            rows={12}
                            className="font-mono text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsImportDialogOpen(false);
                          setImportData("");
                          setImportMethod("file");
                        }}
                      >
                        Cancel
                      </Button>
                      {importMethod === "paste" && (
                        <Button
                          onClick={handleImportData}
                          disabled={
                            !importData.trim() || importDataMutation.isPending
                          }
                          variant="default"
                        >
                          {importDataMutation.isPending
                            ? "Importing..."
                            : "Import Data"}
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Backup Information */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span className="font-medium">Backup Information</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="border-border bg-muted/20 border p-4">
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>
                        • Regular backups protect your important business data
                      </li>
                      <li>
                        • Backup files contain all data in secure JSON format
                      </li>
                      <li>
                        • Import adds to existing data without replacing
                        anything
                      </li>
                      <li>
                        • Upload JSON files directly or paste content manually
                      </li>
                      <li>
                        • Store backup files in a secure, accessible location
                      </li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Import Invoices */}
        <Card className="bg-card border-border border">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileUp className="text-primary h-5 w-5" />
                  Import Invoices
                </CardTitle>
                <CardDescription>
                  Upload CSV or JSON files to create draft invoices in bulk
                </CardDescription>
              </div>
              <ImportPageHeaderActions />
            </div>
          </CardHeader>
          <CardContent>
            <InvoiceImportPage />
          </CardContent>
        </Card>

        {/* Delete Account (Danger Zone) */}
        <Card className="bg-card border-destructive/50 border">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 space-y-2">
                  <Label htmlFor="confirm-delete">
                    Type <span className="font-bold">delete all my data</span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="delete all my data"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteConfirmText !== "delete all my data"}
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </PageTabsContent>

      <PageTabsContent value="api">
        <ApiAccessSettings />
      </PageTabsContent>
    </PageTabs>
  );
}
