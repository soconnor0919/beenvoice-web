"use client";

import {
  ArrowLeft,
  Building,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Info,
  Key,
  Loader2,
  Mail,
  Save,
  Star,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AddressForm } from "~/components/forms/address-form";
import { FloatingActionBar } from "~/components/layout/floating-action-bar";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import {
  formatPhoneNumber,
  formatTaxId,
  formatWebsiteUrl,
  isValidEmail,
  PLACEHOLDERS,
  VALIDATION_MESSAGES,
} from "~/lib/form-constants";
import { api } from "~/trpc/react";

interface BusinessFormProps {
  businessId?: string;
  mode: "create" | "edit";
}

interface FormData {
  name: string;
  nickname: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  website: string;
  taxId: string;
  isDefault: boolean;
  resendApiKey: string;
  resendDomain: string;
  emailFromName: string;
}

interface FormErrors {
  name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  taxId?: string;
  resendApiKey?: string;
  resendDomain?: string;
  emailFromName?: string;
}

const initialFormData: FormData = {
  name: "",
  nickname: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  website: "",
  taxId: "",
  isDefault: false,
  resendApiKey: "",
  resendDomain: "",
  emailFromName: "",
};

export function BusinessForm({ businessId, mode }: BusinessFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch business data if editing
  const { data: business, isLoading: isLoadingBusiness } =
    api.businesses.getById.useQuery(
      { id: businessId! },
      { enabled: mode === "edit" && !!businessId },
    );

  // Fetch email configuration if editing
  const { data: emailConfig, isLoading: isLoadingEmailConfig } =
    api.businesses.getEmailConfig.useQuery(
      { id: businessId! },
      { enabled: mode === "edit" && !!businessId },
    );

  // Update email configuration mutation
  const updateEmailConfig = api.businesses.updateEmailConfig.useMutation({
    onError: (error) => {
      toast.error(`Failed to update email configuration: ${error.message}`);
    },
  });

  const createBusiness = api.businesses.create.useMutation({
    onError: (error) => {
      toast.error(error.message || "Failed to create business");
    },
  });

  const updateBusiness = api.businesses.update.useMutation({
    onError: (error) => {
      toast.error(error.message || "Failed to update business");
    },
  });

  // Load business data when editing
  useEffect(() => {
    if (business && mode === "edit") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync loaded business data into the edit form.
      setFormData({
        name: business.name,
        nickname: business.nickname ?? "",
        email: business.email ?? "",
        phone: business.phone ?? "",
        addressLine1: business.addressLine1 ?? "",
        addressLine2: business.addressLine2 ?? "",
        city: business.city ?? "",
        state: business.state ?? "",
        postalCode: business.postalCode ?? "",
        country: business.country ?? "United States",
        website: business.website ?? "",
        taxId: business.taxId ?? "",
        isDefault: business.isDefault ?? false,
        resendApiKey: "", // Never pre-fill API key for security
        resendDomain: emailConfig?.resendDomain ?? "",
        emailFromName: emailConfig?.emailFromName ?? "",
      });
    }
  }, [business, emailConfig, mode]);

  const handleInputChange = (field: string, value: string | boolean) => {
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

  const handleTaxIdChange = (value: string) => {
    const formatted = formatTaxId(value, "EIN");
    handleInputChange("taxId", formatted);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = VALIDATION_MESSAGES.required;
    }
    // Nickname validation (optional, max 255 chars)
    if (formData.nickname && formData.nickname.trim().length > 255) {
      newErrors.nickname = "Nickname must be 255 characters or less";
    }

    // Email validation
    if (formData.email.trim() && !isValidEmail(formData.email.trim())) {
      newErrors.email = VALIDATION_MESSAGES.email;
    }

    // Phone validation (basic check for US format)
    if (formData.phone.trim()) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length > 0 && phoneDigits.length < 10) {
        newErrors.phone = VALIDATION_MESSAGES.phone;
      }
    }

    // Address validation if any address field is filled (excluding country as it has a default)
    const hasAddressData = !!(
      formData.addressLine1.trim() ||
      formData.city.trim() ||
      formData.state.trim() ||
      formData.postalCode.trim()
    );

    // Also check if country was explicitly changed from default
    const hasNonDefaultCountry =
      formData.country.trim() && formData.country.trim() !== "United States";
    const hasAnyAddressInput = hasAddressData || hasNonDefaultCountry;

    // Only validate address if user has actually entered address data
    if (hasAnyAddressInput) {
      if (!formData.addressLine1.trim())
        newErrors.addressLine1 = VALIDATION_MESSAGES.required;
      if (!formData.city.trim()) newErrors.city = VALIDATION_MESSAGES.required;
      if (!formData.country.trim())
        newErrors.country = VALIDATION_MESSAGES.required;

      // Only require US-specific fields if country is United States AND we have actual address data
      if (formData.country.trim() === "United States" && hasAddressData) {
        if (!formData.state.trim())
          newErrors.state = VALIDATION_MESSAGES.required;
        if (!formData.postalCode.trim())
          newErrors.postalCode = VALIDATION_MESSAGES.required;
      }
    }

    // Email configuration validation
    // API Key validation
    if (
      formData.resendApiKey.trim() &&
      !formData.resendApiKey.trim().startsWith("re_")
    ) {
      newErrors.resendApiKey = "Resend API key should start with 're_'";
    }

    // Domain validation
    if (formData.resendDomain.trim()) {
      const domainRegex =
        /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,})+$/;
      if (!domainRegex.test(formData.resendDomain.trim())) {
        newErrors.resendDomain =
          "Please enter a valid domain (e.g., yourdomain.com)";
      }
    }

    // If API key is provided, domain must also be provided
    if (formData.resendApiKey.trim() && !formData.resendDomain.trim()) {
      newErrors.resendDomain = "Domain is required when API key is provided";
    }

    // If domain is provided, API key must also be provided (unless there's already one on the server)
    // In edit mode, if domain comes from server and API key field is empty, don't require new API key
    const userEnteredDomain =
      formData.resendDomain.trim() !== (emailConfig?.resendDomain ?? "");

    if (
      formData.resendDomain.trim() &&
      !formData.resendApiKey.trim() &&
      !emailConfig?.hasApiKey &&
      (mode === "create" || userEnteredDomain)
    ) {
      newErrors.resendApiKey = "API key is required when domain is provided";
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
      // Format website URL before submission
      const dataToSubmit = {
        ...formData,
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || undefined,
        website: formData.website ? formatWebsiteUrl(formData.website) : "",
      };

      if (mode === "create") {
        // Create business data (excluding email config fields)
        const businessData = {
          name: dataToSubmit.name,
          nickname: dataToSubmit.nickname,
          email: dataToSubmit.email,
          phone: dataToSubmit.phone,
          addressLine1: dataToSubmit.addressLine1,
          addressLine2: dataToSubmit.addressLine2,
          city: dataToSubmit.city,
          state: dataToSubmit.state,
          postalCode: dataToSubmit.postalCode,
          country: dataToSubmit.country,
          website: dataToSubmit.website,
          taxId: dataToSubmit.taxId,
          isDefault: dataToSubmit.isDefault,
        };

        const newBusiness = await createBusiness.mutateAsync(businessData);

        // Update email configuration separately if any email fields have values
        const newApiKey = formData.resendApiKey.trim();
        const newDomain = formData.resendDomain.trim();
        const newFromName = formData.emailFromName.trim();

        const hasEmailData = newApiKey || newDomain || newFromName;

        if (newBusiness && hasEmailData) {
          await updateEmailConfig.mutateAsync({
            id: newBusiness.id,
            resendApiKey: newApiKey || undefined,
            resendDomain: newDomain || undefined,
            emailFromName: newFromName || undefined,
          });
        }

        toast.success("Business created successfully");
        router.push("/dashboard/entities?tab=businesses");
      } else {
        // Update business data (excluding email config fields)
        const businessData = {
          name: dataToSubmit.name,
          nickname: dataToSubmit.nickname,
          email: dataToSubmit.email,
          phone: dataToSubmit.phone,
          addressLine1: dataToSubmit.addressLine1,
          addressLine2: dataToSubmit.addressLine2,
          city: dataToSubmit.city,
          state: dataToSubmit.state,
          postalCode: dataToSubmit.postalCode,
          country: dataToSubmit.country,
          website: dataToSubmit.website,
          taxId: dataToSubmit.taxId,
          isDefault: dataToSubmit.isDefault,
        };

        await updateBusiness.mutateAsync({
          id: businessId!,
          ...businessData,
        });

        // Only update email configuration if there are actual changes or new values
        const currentApiKey = emailConfig?.hasApiKey ? "EXISTING" : "";
        const currentDomain = emailConfig?.resendDomain ?? "";
        const currentFromName = emailConfig?.emailFromName ?? "";

        const newApiKey = formData.resendApiKey.trim();
        const newDomain = formData.resendDomain.trim();
        const newFromName = formData.emailFromName.trim();

        const hasEmailChanges =
          (newApiKey && newApiKey !== currentApiKey) ||
          newDomain !== currentDomain ||
          newFromName !== currentFromName;

        if (hasEmailChanges) {
          await updateEmailConfig.mutateAsync({
            id: businessId!,
            resendApiKey: newApiKey || undefined,
            resendDomain: newDomain || undefined,
            emailFromName: newFromName || undefined,
          });
        }

        toast.success("Business updated successfully");
        router.push("/dashboard/entities?tab=businesses");
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
    router.push("/dashboard/entities?tab=businesses");
  };

  if (
    (mode === "edit" && isLoadingBusiness) ||
    (mode === "edit" && isLoadingEmailConfig)
  ) {
    return (
      <div className="space-y-6 pb-32">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-32">
        <PageHeader
          title={mode === "edit" ? "Edit Business" : "Add Business"}
          description={
            mode === "edit"
              ? "Update business information below"
              : "Enter business details below to add a new business."
          }
          variant="gradient"
        >
          <Button
            type="submit"
            form="business-form"
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
                  {mode === "create" ? "Create Business" : "Save Changes"}
                </span>
              </>
            )}
          </Button>
        </PageHeader>

        <form id="business-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Main Form Container - styled like data table */}
          <div className="space-y-4">
            {/* Basic Information */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center">
                    <Building className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Enter your business details
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Business Name
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder={PLACEHOLDERS.name}
                      className={`${errors.name ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                    {errors.name && (
                      <p className="text-destructive text-sm">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nickname" className="text-sm font-medium">
                      Nickname
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="nickname"
                      value={formData.nickname}
                      onChange={(e) =>
                        handleInputChange("nickname", e.target.value)
                      }
                      placeholder="e.g., Personal, Work, LLC"
                      disabled={isSubmitting}
                    />
                    {errors.nickname && (
                      <p className="text-destructive text-sm">
                        {errors.nickname}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId" className="text-sm font-medium">
                      Tax ID (EIN)
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => handleTaxIdChange(e.target.value)}
                      placeholder={PLACEHOLDERS.taxId}
                      className={`${errors.taxId ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                      maxLength={10}
                    />
                    {errors.taxId && (
                      <p className="text-destructive text-sm">{errors.taxId}</p>
                    )}
                  </div>

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

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium">
                    Website
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    placeholder={PLACEHOLDERS.website}
                    className={`${errors.website ? "border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {errors.website && (
                    <p className="text-destructive text-sm">{errors.website}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center">
                    <svg
                      className="text-muted-foreground h-5 w-5"
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
                    <CardTitle>Business Address</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Your business location
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

            {/* Email Configuration */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center">
                    <Mail className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Email Configuration</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Configure your own Resend API key and domain for sending
                      invoices
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Status */}
                {mode === "edit" && (
                  <div className="bg-muted/50 flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Current Status:
                      </span>
                      {emailConfig?.hasApiKey && emailConfig?.resendDomain ? (
                        <Badge
                          variant="default"
                          className="bg-primary/10 text-primary"
                        >
                          <Key className="mr-1 h-3 w-3" />
                          Custom Configuration Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Globe className="mr-1 h-3 w-3" />
                          Using System Default
                        </Badge>
                      )}
                    </div>
                    {emailConfig?.resendDomain && (
                      <span className="text-muted-foreground text-sm">
                        Domain: {emailConfig.resendDomain}
                      </span>
                    )}
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    To use your own email configuration, you&apos;ll need to:
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>
                        Create a free account at{" "}
                        <a
                          href="https://resend.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          resend.com
                        </a>
                      </li>
                      <li>Verify your domain in the Resend dashboard</li>
                      <li>Get your API key from the Resend dashboard</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="resendApiKey"
                      className="flex items-center gap-2"
                    >
                      <Key className="h-4 w-4" />
                      Resend API Key
                      {mode === "edit" && emailConfig?.hasApiKey && (
                        <Badge variant="outline" className="text-xs">
                          Currently Set
                        </Badge>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="resendApiKey"
                        type={showApiKey ? "text" : "password"}
                        value={formData.resendApiKey}
                        onChange={(e) =>
                          handleInputChange("resendApiKey", e.target.value)
                        }
                        placeholder={
                          mode === "edit" && emailConfig?.hasApiKey
                            ? "••••••••••••••••••••••••••••••••"
                            : "re_..."
                        }
                        className={
                          errors.resendApiKey ? "border-destructive" : ""
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.resendApiKey && (
                      <p className="text-destructive text-sm">
                        {errors.resendApiKey}
                      </p>
                    )}
                  </div>

                  {/* Domain */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="resendDomain"
                      className="flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Verified Domain
                    </Label>
                    <Input
                      id="resendDomain"
                      type="text"
                      value={formData.resendDomain}
                      onChange={(e) =>
                        handleInputChange("resendDomain", e.target.value)
                      }
                      placeholder="yourdomain.com"
                      className={
                        errors.resendDomain ? "border-destructive" : ""
                      }
                    />
                    {errors.resendDomain && (
                      <p className="text-destructive text-sm">
                        {errors.resendDomain}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      This domain must be verified in your Resend account before
                      emails can be sent.
                    </p>
                  </div>

                  {/* From Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="emailFromName"
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      From Name (Optional)
                    </Label>
                    <Input
                      id="emailFromName"
                      type="text"
                      value={formData.emailFromName}
                      onChange={(e) =>
                        handleInputChange("emailFromName", e.target.value)
                      }
                      placeholder={formData.name || "Your Business Name"}
                      className={
                        errors.emailFromName ? "border-destructive" : ""
                      }
                    />
                    {errors.emailFromName && (
                      <p className="text-destructive text-sm">
                        {errors.emailFromName}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      This will appear as the sender name in emails. Defaults to
                      your business name.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="bg-card border-border border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center">
                    <Star className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Settings</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Configure business preferences
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted border-border/40 flex items-center justify-between border p-4">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="isDefault"
                      className="text-base font-medium"
                    >
                      Default Business
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Set this as your default business for new invoices
                    </p>
                  </div>
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      handleInputChange("isDefault", checked)
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>

      <FloatingActionBar
        leftContent={
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2">
              <FileText className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {mode === "create"
                  ? "Creating a new business"
                  : "Editing business details"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {mode === "create"
                  ? "Complete the form to create your business"
                  : "Update your business information"}
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
          className="shadow-md"
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
                {mode === "create" ? "Create Business" : "Save Changes"}
              </span>
            </>
          )}
        </Button>
      </FloatingActionBar>
    </>
  );
}
