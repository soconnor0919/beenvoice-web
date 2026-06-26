"use client";

import {
  UserPlus,
  Save,
  Loader2,
  ArrowLeft,
  DollarSign,
  FileText,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { AddressForm } from "~/components/forms/address-form";
import { FloatingActionBar } from "~/components/layout/floating-action-bar";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage, dashboardGapClass } from "~/components/layout/dashboard-page";
import { cn } from "~/lib/utils";
import { NumberInput } from "~/components/ui/number-input";
import { api } from "~/trpc/react";
import {
  formatPhoneNumber,
  isValidEmail,
  VALIDATION_MESSAGES,
  PLACEHOLDERS,
} from "~/lib/form-constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { SUPPORTED_CURRENCIES } from "~/lib/currency";

interface ClientFormProps {
  clientId?: string;
  mode: "create" | "edit";
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  defaultHourlyRate: number | null;
  currency: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  defaultHourlyRate?: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  defaultHourlyRate: null,
  currency: "USD",
};

export function ClientForm({ clientId, mode }: ClientFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch client data if editing
  const { data: client, isLoading: isLoadingClient } =
    api.clients.getById.useQuery(
      { id: clientId! },
      { enabled: mode === "edit" && !!clientId },
    );

  const createClient = api.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client created successfully");
      router.push("/dashboard/entities?tab=clients");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create client");
    },
  });

  const updateClient = api.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated successfully");
      router.push("/dashboard/entities?tab=clients");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update client");
    },
  });

  // Load client data when editing
  useEffect(() => {
    if (client && mode === "edit") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync loaded client data into the edit form.
      setFormData({
        name: client.name,
        email: client.email ?? "",
        phone: client.phone ?? "",
        addressLine1: client.addressLine1 ?? "",
        addressLine2: client.addressLine2 ?? "",
        city: client.city ?? "",
        state: client.state ?? "",
        postalCode: client.postalCode ?? "",
        country: client.country ?? "United States",
        defaultHourlyRate: client.defaultHourlyRate ?? null,
        currency: client.currency ?? "USD",
      });
    }
  }, [client, mode]);

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);

    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange("phone", formatted);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = VALIDATION_MESSAGES.required;
    }

    // Email validation
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = VALIDATION_MESSAGES.email;
    }

    // Phone validation (basic check for US format)
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length > 0 && phoneDigits.length < 10) {
        newErrors.phone = VALIDATION_MESSAGES.phone;
      }
    }

    // Address validation if any address field is filled
    const hasAddressData =
      formData.addressLine1 ||
      formData.city ||
      formData.state ||
      formData.postalCode;

    if (hasAddressData) {
      if (!formData.addressLine1)
        newErrors.addressLine1 = VALIDATION_MESSAGES.required;
      if (!formData.city) newErrors.city = VALIDATION_MESSAGES.required;
      if (!formData.country) newErrors.country = VALIDATION_MESSAGES.required;

      if (formData.country === "US") {
        if (!formData.state) newErrors.state = VALIDATION_MESSAGES.required;
        if (!formData.postalCode)
          newErrors.postalCode = VALIDATION_MESSAGES.required;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      const apiData = {
        ...formData,
        defaultHourlyRate: formData.defaultHourlyRate ?? undefined,
      };

      if (mode === "create") {
        await createClient.mutateAsync(apiData);
      } else {
        await updateClient.mutateAsync({
          id: clientId!,
          ...apiData,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.push("/dashboard/entities?tab=clients");
  };

  if (mode === "edit" && isLoadingClient) {
    return (
      <DashboardPage className="pb-32">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </DashboardPage>
    );
  }

  return (
    <>
      <DashboardPage className="pb-32">
        <DashboardPageHeader
          title={mode === "edit" ? "Edit Client" : "Add Client"}
          description={
            mode === "edit"
              ? "Update client information below"
              : "Enter client details below to add a new client."
          }
        >
          <Button
            type="submit"
            form="client-form"
            disabled={isSubmitting}
            variant="default"
            className="shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                <span className="hidden sm:inline">
                  {mode === "create" ? "Creating..." : "Saving..."}
                </span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {mode === "create" ? "Create Client" : "Save Changes"}
                </span>
              </>
            )}
          </Button>
        </DashboardPageHeader>

        <form
          id="client-form"
          onSubmit={handleSubmit}
          className={cn("flex flex-col", dashboardGapClass)}
        >
          {/* Main Form Container - styled like data table */}
          <div className="space-y-4">
            {/* Basic Information */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center">
                    <UserPlus className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Enter the client&apos;s primary details
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Client Name<span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder={PLACEHOLDERS.name}
                    className={`${errors.name ? "border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder={PLACEHOLDERS.email}
                      className={`${errors.email ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-destructive text-sm">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={PLACEHOLDERS.phone}
                      className={`${errors.phone ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                    {errors.phone && (
                      <p className="text-destructive text-sm">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center">
                    <svg
                      className="text-primary h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Address</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Client&apos;s physical location
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AddressForm
                  addressLine1={formData.addressLine1}
                  addressLine2={formData.addressLine2}
                  city={formData.city}
                  state={formData.state}
                  postalCode={formData.postalCode}
                  country={formData.country}
                  onChange={handleInputChange}
                  errors={errors}
                  required={false}
                />
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center">
                    <DollarSign className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Billing Information</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Default billing rates for this client
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="defaultHourlyRate"
                    className="text-sm font-medium"
                  >
                    Default Hourly Rate (Optional)
                  </Label>
                  <p className="text-muted-foreground mb-2 text-xs">
                    This rate will be used as the default when creating new
                    invoice items for this client.
                  </p>
                  <NumberInput
                    value={formData.defaultHourlyRate ?? 0}
                    onChange={(value) =>
                      handleInputChange(
                        "defaultHourlyRate",
                        value === 0 ? null : value,
                      )
                    }
                    min={0}
                    step={1}
                    prefix="$"
                    width="full"
                    disabled={isSubmitting}
                    placeholder="0.00"
                  />
                  {errors.defaultHourlyRate && (
                    <p className="text-destructive text-sm">
                      {errors.defaultHourlyRate}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm font-medium">
                    Currency
                  </Label>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Default currency for invoices created for this client.
                  </p>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => handleInputChange("currency", v)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </DashboardPage>

      <FloatingActionBar
        leftContent={
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2">
              <FileText className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {mode === "create"
                  ? "Creating a new client"
                  : "Editing client details"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {mode === "create"
                  ? "Complete the form to create your client"
                  : "Update your client information"}
              </p>
            </div>
          </div>
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="border-border/40 hover:bg-accent/50"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Cancel</span>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !isDirty}
          variant="default"
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              <span className="hidden sm:inline">
                {mode === "create" ? "Creating..." : "Saving..."}
              </span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {mode === "create" ? "Create Client" : "Save Changes"}
              </span>
            </>
          )}
        </Button>
      </FloatingActionBar>
    </>
  );
}
