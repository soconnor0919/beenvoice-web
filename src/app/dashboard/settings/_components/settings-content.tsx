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
  Palette,
  Shield,
  Upload,
  User,
  Users,
  Link as LinkIcon,
  Monitor,
  PanelLeft,
  Paintbrush,
  Type,
} from "lucide-react";
import dynamic from "next/dynamic";
import { authClient } from "~/lib/auth-client";
import * as React from "react";
import { useState } from "react";

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
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Slider } from "~/components/ui/slider";
import { useAnimationPreferences } from "~/components/providers/animation-preferences-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAppearance } from "~/components/providers/appearance-provider";
import {
  bodyFontPreferences,
  colorModes,
  colorThemes,
  type ColorTheme,
  headingFontPreferences,
  interfaceThemes,
  radiusPreferences,
  sidebarStyles,
  themePresets,
  type InterfaceTheme,
} from "~/lib/branding";
import { ApiAccessSettings } from "./api-access-settings";

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

function hslChannelsToHex(channels?: string) {
  const [hue, saturation, lightness] =
    channels?.match(/[\d.]+/g)?.map(Number) ?? [];

  if (
    hue === undefined ||
    saturation === undefined ||
    lightness === undefined
  ) {
    return "#16a34a";
  }

  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function hexToHslChannels(hex: string) {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return `0 0% ${Number((lightness * 100).toFixed(1))}%`;
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === red
      ? 60 * (((green - blue) / delta) % 6)
      : max === green
        ? 60 * ((blue - red) / delta + 2)
        : 60 * ((red - green) / delta + 4);

  return `${Number(((hue + 360) % 360).toFixed(1))} ${Number(
    (saturation * 100).toFixed(1),
  )}% ${Number((lightness * 100).toFixed(1))}%`;
}

function isFullHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function SettingsContent() {
  const { data: session } = authClient.useSession();
  // const session = { user: null } as any;
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
  const {
    interfaceTheme,
    bodyFontPreference,
    headingFontPreference,
    radiusPreference,
    sidebarStyle,
    colorMode,
    colorTheme,
    customColor,
    brandName,
    brandTagline,
    brandLogoText,
    brandIcon,
    pdfTemplate,
    pdfAccentColor,
    pdfFooterText,
    pdfShowLogo,
    pdfShowPageNumbers,
    updateAppearance,
    updateAppearanceDebounced,
    isUpdating: appearanceUpdating,
  } = useAppearance();
  const activePreset = themePresets[interfaceTheme];
  const themeModified =
    activePreset.bodyFontPreference !== bodyFontPreference ||
    activePreset.headingFontPreference !== headingFontPreference ||
    activePreset.colorTheme !== colorTheme ||
    activePreset.radiusPreference !== radiusPreference ||
    activePreset.sidebarStyle !== sidebarStyle ||
    activePreset.pdfTemplate !== pdfTemplate ||
    activePreset.pdfAccentColor !== pdfAccentColor;
  const customColorValue = customColor ?? "142.1 76.2% 36.3%";
  const selectAccent = (nextColorTheme: ColorTheme) => {
    updateAppearance({
      colorTheme: nextColorTheme,
      ...(nextColorTheme === "custom" ? { customColor: customColorValue } : {}),
    });
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
      toast.success(
        `Data imported successfully! Added ${result.imported.clients} clients, ${result.imported.businesses} businesses, and ${result.imported.invoices} invoices.`,
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
    <Tabs defaultValue="general">
      <TabsList className="bg-muted/50 grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
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
      </TabsContent>

      <TabsContent value="preferences" className="space-y-8">
        <Card className="bg-card border-border border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Palette className="text-primary h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Select the app skin, color mode, accent, and font stack.
            </CardDescription>
          </CardHeader>
          {!isAdmin ? (
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Platform appearance and branding are managed by an
                administrator.
              </p>
            </CardContent>
          ) : (
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Brand</h3>
                  <p className="text-muted-foreground text-xs">
                    Public-facing name, logo text, and short product tagline.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Brand Name</Label>
                    <Input
                      value={brandName}
                      onChange={(event) =>
                        updateAppearanceDebounced({
                          brandName: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo Text</Label>
                    <Input
                      value={brandLogoText}
                      onChange={(event) =>
                        updateAppearanceDebounced({
                          brandLogoText: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Brand Icon</Label>
                    <Input
                      value={brandIcon}
                      onChange={(event) =>
                        updateAppearanceDebounced({
                          brandIcon: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={brandTagline}
                      onChange={(event) =>
                        updateAppearanceDebounced({
                          brandTagline: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-medium">Theme</h3>
                  <p className="text-muted-foreground text-xs">
                    Presets establish the broad visual language; color mode and
                    accent can still be tuned independently.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4" />
                        Theme Preset
                      </Label>
                      <div className="flex items-center gap-2">
                        {themeModified && (
                          <Badge variant="secondary" className="shrink-0">
                            modified
                          </Badge>
                        )}
                        {themeModified && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => updateAppearance(activePreset)}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                    <Select
                      value={interfaceTheme}
                      onValueChange={(value) => {
                        const nextTheme = value as InterfaceTheme;
                        updateAppearance(themePresets[nextTheme]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {interfaceThemes.map((themeOption) => (
                          <SelectItem
                            key={themeOption.value}
                            value={themeOption.value}
                          >
                            {themeOption.label}
                            {themeOption.value === interfaceTheme &&
                            themeModified
                              ? " (modified)"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-snug">
                      Applies the theme, fonts, accent, corner radius,
                      navigation chrome, and PDF defaults.
                    </p>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {
                        interfaceThemes.find(
                          (themeOption) => themeOption.value === interfaceTheme,
                        )?.description
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Color Mode
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
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-medium">Typography</h3>
                  <p className="text-muted-foreground text-xs">
                    Body and heading fonts are separate so white-label installs
                    can feel native without losing hierarchy.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Body Font
                    </Label>
                    <Select
                      value={bodyFontPreference}
                      onValueChange={(value) =>
                        updateAppearance({
                          bodyFontPreference:
                            value as typeof bodyFontPreference,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyFontPreferences.map((fontOption) => (
                          <SelectItem
                            key={fontOption.value}
                            value={fontOption.value}
                          >
                            {fontOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {
                        bodyFontPreferences.find(
                          (fontOption) =>
                            fontOption.value === bodyFontPreference,
                        )?.description
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Heading Font
                    </Label>
                    <Select
                      value={headingFontPreference}
                      onValueChange={(value) =>
                        updateAppearance({
                          headingFontPreference:
                            value as typeof headingFontPreference,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {headingFontPreferences.map((fontOption) => (
                          <SelectItem
                            key={fontOption.value}
                            value={fontOption.value}
                          >
                            {fontOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {
                        headingFontPreferences.find(
                          (fontOption) =>
                            fontOption.value === headingFontPreference,
                        )?.description
                      }
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-medium">Color</h3>
                  <p className="text-muted-foreground text-xs">
                    Accent controls primary actions, focus rings, and branded
                    highlights.
                  </p>
                </div>
                <div className="space-y-3">
                  <Label>Accent</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {colorThemes.map((themeOption) => (
                      <button
                        key={themeOption.value}
                        type="button"
                        onClick={() => selectAccent(themeOption.value)}
                        className={`border-border bg-background hover:bg-muted flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors ${
                          colorTheme === themeOption.value
                            ? "border-primary bg-muted text-foreground"
                            : ""
                        }`}
                      >
                        <span
                          className="size-4 rounded-full border"
                          style={{ backgroundColor: themeOption.swatch }}
                        />
                        {themeOption.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => selectAccent("custom")}
                      className={`border-border bg-background hover:bg-muted flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors ${
                        colorTheme === "custom"
                          ? "border-primary bg-muted text-foreground"
                          : ""
                      }`}
                    >
                      <span
                        className="size-4 rounded-full border"
                        style={{
                          backgroundColor: customColor
                            ? `hsl(${customColor})`
                            : "hsl(142.1 76.2% 36.3%)",
                        }}
                      />
                      Custom
                    </button>
                  </div>
                  {colorTheme === "custom" && (
                    <div className="space-y-2">
                      <InputColor
                        label="Custom Accent"
                        value={hslChannelsToHex(customColorValue)}
                        onBlur={() => undefined}
                        onChange={(value) => {
                          if (isFullHexColor(value)) {
                            updateAppearanceDebounced({
                              colorTheme: "custom",
                              customColor: hexToHslChannels(value),
                            });
                          }
                        }}
                        className="mt-0"
                      />
                      <Input
                        value={customColorValue}
                        onChange={(event) =>
                          updateAppearanceDebounced({
                            colorTheme: "custom",
                            customColor: event.target.value,
                          })
                        }
                        placeholder="142.1 76.2% 36.3%"
                      />
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs leading-snug">
                    Custom values use HSL channels, for example 142.1 76.2%
                    36.3%.
                  </p>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-medium">Layout</h3>
                  <p className="text-muted-foreground text-xs">
                    Control global rounding and whether navigation floats or
                    sits flush with the viewport.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Paintbrush className="h-4 w-4" />
                      Corner Radius
                    </Label>
                    <Select
                      value={radiusPreference}
                      onValueChange={(value) =>
                        updateAppearance({
                          radiusPreference: value as typeof radiusPreference,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {radiusPreferences.map((radiusOption) => (
                          <SelectItem
                            key={radiusOption.value}
                            value={radiusOption.value}
                          >
                            {radiusOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {
                        radiusPreferences.find(
                          (radiusOption) =>
                            radiusOption.value === radiusPreference,
                        )?.description
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <PanelLeft className="h-4 w-4" />
                      Navigation Chrome
                    </Label>
                    <Select
                      value={sidebarStyle}
                      onValueChange={(value) =>
                        updateAppearance({
                          sidebarStyle: value as typeof sidebarStyle,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sidebarStyles.map((styleOption) => (
                          <SelectItem
                            key={styleOption.value}
                            value={styleOption.value}
                          >
                            {styleOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {
                        sidebarStyles.find(
                          (styleOption) => styleOption.value === sidebarStyle,
                        )?.description
                      }
                    </p>
                  </div>
                </div>
              </section>

              {appearanceUpdating && (
                <p className="text-muted-foreground text-xs">
                  Saving appearance...
                </p>
              )}
            </CardContent>
          )}
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
              <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Template
                      </Label>
                      <Select
                        value={pdfTemplate}
                        onValueChange={(value) =>
                          updateAppearance({
                            pdfTemplate: value as typeof pdfTemplate,
                          })
                        }
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
                        value={pdfAccentColor}
                        onBlur={() => undefined}
                        onChange={(value) => {
                          if (isFullHexColor(value)) {
                            updateAppearance({
                              pdfAccentColor: value,
                            });
                          }
                        }}
                        className="mt-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Input
                      value={pdfFooterText}
                      onChange={(event) =>
                        updateAppearanceDebounced({
                          pdfFooterText: event.target.value,
                        })
                      }
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
                        checked={pdfShowLogo}
                        onCheckedChange={(checked) =>
                          updateAppearance({ pdfShowLogo: Boolean(checked) })
                        }
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
                        checked={pdfShowPageNumbers}
                        onCheckedChange={(checked) =>
                          updateAppearance({
                            pdfShowPageNumbers: Boolean(checked),
                          })
                        }
                        aria-label="Toggle PDF page numbers"
                      />
                    </div>
                  </div>
                </div>

                <PdfPreviewFrame
                  businessName={brandName}
                  settings={{
                    pdfTemplate,
                    pdfAccentColor,
                    pdfFooterText,
                    pdfShowLogo,
                    pdfShowPageNumbers,
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
      </TabsContent>

      <TabsContent value="data" className="space-y-8">
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

        {/* Delete Account (Danger Zone) */}
        <Card className="border-destructive/50 bg-destructive/5 border">
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
      </TabsContent>

      <TabsContent value="api" className="space-y-8">
        <ApiAccessSettings />
      </TabsContent>
    </Tabs>
  );
}
