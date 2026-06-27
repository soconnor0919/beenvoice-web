import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  type Styles,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import {
  isFixedLineItem,
} from "~/lib/invoice-line-item";
import React from "react";
import {
  type PdfFontFamily,
  type ResolvedPdfFonts,
  pdfFontCacheKey,
  resolvePdfFonts,
} from "~/lib/pdf-fonts";

// Fallback download function for better browser compatibility
function downloadBlob(blob: Blob, filename: string): void {
  try {
    // Validate blob before download
    if (!blob || blob.size === 0) {
      throw new Error("Invalid blob for download");
    }

    // First try using file-saver
    saveAs(blob, filename);
  } catch (error) {
    console.warn("file-saver failed, using fallback method:", error);

    try {
      // Fallback to manual download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Add MIME type hint to link
      if (blob.type) {
        link.type = blob.type;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("PDF download initiated successfully via fallback method");

      // Clean up the object URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log("Object URL cleaned up");
      }, 1000);
    } catch (fallbackError) {
      console.error("Both download methods failed:", fallbackError);
      throw new Error("Unable to download PDF file");
    }
  }
}

export interface InvoiceData {
  invoiceNumber: string;
  invoicePrefix?: string | null;
  issueDate: Date;
  dueDate: Date;
  status: string;
  totalAmount: number;
  taxRate: number;
  currency?: string | null;
  notes?: string | null;
  business?: {
    name: string;
    nickname?: string | null;
    email?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    website?: string | null;
    taxId?: string | null;
  } | null;
  client?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  items?: Array<{
    date: Date;
    description: string;
    hours: number;
    rate: number;
    amount: number;
  } | null> | null;
}

export interface PDFGenerationSettings {
  pdfTemplate?: "classic" | "minimal";
  pdfAccentColor?: string;
  pdfFontFamily?: PdfFontFamily;
  pdfNumericFontFamily?: PdfFontFamily;
  pdfFooterText?: string;
  pdfShowLogo?: boolean;
  pdfShowPageNumbers?: boolean;
}

const defaultPDFSettings: Required<PDFGenerationSettings> = {
  pdfTemplate: "classic",
  pdfAccentColor: "#111827",
  pdfFontFamily: "sans",
  pdfNumericFontFamily: "mono",
  pdfFooterText: "Professional Invoicing",
  pdfShowLogo: true,
  pdfShowPageNumbers: true,
};

function resolvePDFSettings(settings?: PDFGenerationSettings) {
  return { ...defaultPDFSettings, ...settings };
}

function mapLegacyPdfFont(
  fontFamily: string,
  fonts: ResolvedPdfFonts,
): string {
  switch (fontFamily) {
    case "Helvetica-Bold":
      return fonts.bold;
    case "Helvetica":
      return fonts.regular;
    case "Courier-Bold":
      return fonts.monoBold;
    case "Courier":
      return fonts.mono;
    default:
      return fontFamily;
  }
}

function remapStyleFontFamilies<T extends Styles>(
  sheet: T,
  fonts: ResolvedPdfFonts,
): T {
  const remapped = {} as T;

  for (const [key, style] of Object.entries(sheet)) {
    const fontFamily = (style as { fontFamily?: string }).fontFamily;
    remapped[key as keyof T] = {
      ...style,
      ...(fontFamily
        ? { fontFamily: mapLegacyPdfFont(fontFamily, fonts) }
        : {}),
    } as T[keyof T];
  }

  return remapped;
}

type PdfStyleBundle = {
  styles: typeof baseStyles;
  minimalStyles: typeof baseMinimalStyles;
  fonts: ResolvedPdfFonts;
  getStatusStyle: (
    status: string,
  ) => Array<Record<string, string | number>>;
};

const pdfStyleCache = new Map<string, PdfStyleBundle>();

function getPdfStyleBundle(
  bodyFamily: PdfFontFamily,
  numericFamily: PdfFontFamily,
): PdfStyleBundle {
  const cacheKey = pdfFontCacheKey(bodyFamily, numericFamily);
  const cached = pdfStyleCache.get(cacheKey);
  if (cached) return cached;

  const fonts = resolvePdfFonts(bodyFamily, numericFamily);
  const styles = remapStyleFontFamilies(baseStyles, fonts);
  const bundle: PdfStyleBundle = {
    styles,
    minimalStyles: baseMinimalStyles,
    fonts,
    getStatusStyle: (status: string) => {
      switch (status.toLowerCase()) {
        case "paid":
          return [styles.statusBadge, styles.statusPaid];
        case "sent":
          return [styles.statusBadge, styles.statusPaid];
        case "overdue":
          return [
            styles.statusBadge,
            { backgroundColor: "#fef2f2", color: "#dc2626" },
          ];
        case "draft":
          return [
            styles.statusBadge,
            { backgroundColor: "#f9fafb", color: "#9ca3af" },
          ];
        default:
          return [styles.statusBadge, styles.statusUnpaid];
      }
    },
  };

  pdfStyleCache.set(cacheKey, bundle);
  return bundle;
}

const baseStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: 40,
  },

  // Dense header (first page)
  denseHeader: {
    marginBottom: 30,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 20,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  businessSection: {
    flexDirection: "column",
    flex: 1,
  },

  businessName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: "#0f0f0f",
    marginBottom: 4,
  },

  businessInfo: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#6b7280",
    lineHeight: 1.4,
    marginBottom: 3,
  },

  businessAddress: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#6b7280",
    lineHeight: 1.4,
    marginTop: 4,
  },

  invoiceSection: {
    flexDirection: "column",
    alignItems: "flex-end",
  },

  invoiceTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
    marginBottom: 8,
  },

  invoiceNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 4,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },

  statusPaid: {
    backgroundColor: "#f9fafb",
    color: "#374151",
  },

  statusUnpaid: {
    backgroundColor: "#f9fafb",
    color: "#6b7280",
  },

  // Details section (first page only)
  detailsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  detailsColumn: {
    flex: 1,
    marginRight: 20,
  },

  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
    marginBottom: 12,
  },

  clientName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#0f0f0f",
    marginBottom: 2,
  },

  clientInfo: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#6b7280",
    lineHeight: 1.4,
    marginBottom: 2,
  },

  clientAddress: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#6b7280",
    lineHeight: 1.4,
    marginTop: 4,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  detailLabel: {
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#6b7280",
    flex: 1,
  },

  detailValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
    flex: 1,
    textAlign: "right",
  },

  // Notes section (first page only)
  notesSection: {
    marginTop: 0,
    marginBottom: 0,
    padding: 12,
    backgroundColor: "#f9fafb",
  },

  notesTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
    marginBottom: 6,
  },

  notesContent: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#374151",
    lineHeight: 1.4,
  },

  businessContact: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#6b7280",
    lineHeight: 1.4,
  },

  // Separator styles
  headerSeparator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 8,
  },

  // Abridged header (other pages)
  abridgedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: "1px solid #e5e7eb",
  },

  abridgedBusinessName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
  },

  abridgedInvoiceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  abridgedInvoiceTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
  },

  abridgedInvoiceNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },

  // Table styles
  tableContainer: {
    marginBottom: 20,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  tableHeaderCell: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    paddingHorizontal: 4,
  },

  tableHeaderDate: {
    width: "15%",
  },

  tableHeaderDescription: {
    width: "40%",
  },

  tableHeaderHours: {
    width: "12%",
    textAlign: "right",
  },

  tableHeaderRate: {
    width: "15%",
    textAlign: "right",
  },

  tableHeaderAmount: {
    width: "18%",
    textAlign: "right",
  },

  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    paddingVertical: 6,
    alignItems: "flex-start",
    minHeight: 24,
  },

  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },

  tableCell: {
    fontSize: 10,
    color: "#0f0f0f",
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily: "Helvetica",
  },

  tableCellDate: {
    width: "15%",
    fontFamily: "Courier",
    alignSelf: "flex-start",
  },

  tableCellDescription: {
    width: "40%",
    lineHeight: 1.4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    textAlign: "left",
    flexWrap: "wrap",
    fontFamily: "Helvetica",
  },

  tableCellHours: {
    width: "12%",
    textAlign: "right",
    fontFamily: "Courier",
    alignSelf: "flex-start",
  },

  tableCellRate: {
    width: "15%",
    textAlign: "right",
    fontFamily: "Courier",
    alignSelf: "flex-start",
  },

  tableCellAmount: {
    width: "18%",
    textAlign: "right",
    fontFamily: "Courier-Bold",
    alignSelf: "flex-start",
  },

  // Bottom section with notes and totals
  bottomSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  notesContainer: {
    width: 240,
  },

  totalsContainer: {
    width: 240,
    break: false,
  },

  totalsBox: {
    width: "100%",
    padding: 12,
    backgroundColor: "#f9fafb",
    break: false,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingVertical: 1,
  },

  totalLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontFamily: "Helvetica",
  },

  totalAmount: {
    fontSize: 11,
    fontFamily: "Courier-Bold",
    color: "#0f0f0f",
  },

  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
  },

  finalTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f0f0f",
  },

  finalTotalAmount: {
    fontSize: 14,
    fontFamily: "Courier-Bold",
    color: "#0f0f0f",
  },

  itemCount: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 6,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
  },

  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  pageNumber: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#6b7280",
  },
});

const baseMinimalStyles = StyleSheet.create({
  page: {
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 32,
  },
  denseHeader: {
    marginBottom: 16,
    paddingBottom: 12,
  },
  headerTop: {
    marginBottom: 10,
  },
  businessName: {
    fontSize: 14,
    marginBottom: 2,
  },
  businessInfo: {
    fontSize: 8,
    lineHeight: 1.25,
    marginBottom: 1,
  },
  businessAddress: {
    fontSize: 8,
    lineHeight: 1.25,
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 18,
    marginBottom: 3,
  },
  invoiceNumber: {
    fontSize: 10,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "#ffffff",
    fontSize: 8,
  },
  headerSeparator: {
    marginVertical: 4,
  },
  detailsSection: {
    marginBottom: 10,
  },
  detailsColumn: {
    marginRight: 14,
  },
  sectionTitle: {
    fontSize: 8,
    marginBottom: 5,
  },
  clientName: {
    fontSize: 9,
    marginBottom: 1,
  },
  clientInfo: {
    fontSize: 8,
    lineHeight: 1.25,
    marginBottom: 1,
  },
  clientAddress: {
    fontSize: 8,
    lineHeight: 1.25,
    marginTop: 2,
  },
  detailRow: {
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 8,
  },
  detailValue: {
    fontSize: 8,
  },
  tableContainer: {
    marginBottom: 10,
  },
  tableHeader: {
    backgroundColor: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  tableHeaderCell: {
    fontSize: 8,
    paddingHorizontal: 2,
  },
  tableRow: {
    paddingVertical: 3,
    minHeight: 16,
  },
  tableCell: {
    fontSize: 8,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  tableCellDescription: {
    lineHeight: 1.2,
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  bottomSection: {
    marginTop: 10,
  },
  notesContainer: {
    width: 260,
  },
  notesSection: {
    padding: 0,
    backgroundColor: "#ffffff",
  },
  notesTitle: {
    fontSize: 8,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 8,
    lineHeight: 1.25,
  },
  totalsContainer: {
    width: 190,
  },
  totalsBox: {
    padding: 0,
    backgroundColor: "#ffffff",
  },
  totalRow: {
    marginBottom: 2,
    paddingVertical: 0,
  },
  totalLabel: {
    fontSize: 8,
  },
  totalAmount: {
    fontSize: 8,
  },
  finalTotalRow: {
    marginTop: 5,
    paddingTop: 5,
  },
  finalTotalLabel: {
    fontSize: 9,
  },
  finalTotalAmount: {
    fontSize: 10,
  },
  itemCount: {
    fontSize: 7,
    marginTop: 4,
  },
  footer: {
    bottom: 20,
    left: 32,
    right: 32,
    paddingTop: 7,
  },
  pageNumber: {
    fontSize: 8,
  },
});

// Helper functions
const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "PAID";
    case "draft":
    case "sent":
    case "overdue":
    default:
      return "UNPAID";
  }
};

function getColumnWidths(showRate: boolean) {
  return showRate
    ? {
        date: "15%",
        description: "40%",
        hours: "12%",
        rate: "15%",
        amount: "18%",
      }
    : { date: "15%", description: "48%", hours: "14%", amount: "23%" };
}

// Dense header component (first page)
const DenseHeader: React.FC<{
  invoice: InvoiceData;
  settings: Required<PDFGenerationSettings>;
  pdfStyles: PdfStyleBundle;
}> = ({ invoice, settings, pdfStyles }) => {
  const { styles, minimalStyles, getStatusStyle } = pdfStyles;
  const isMinimal = settings.pdfTemplate === "minimal";

  return (
    <View
      style={[styles.denseHeader, isMinimal ? minimalStyles.denseHeader : {}]}
    >
      <View
        style={[styles.headerTop, isMinimal ? minimalStyles.headerTop : {}]}
      >
        <View style={styles.businessSection}>
          <Text
            style={[
              styles.businessName,
              isMinimal ? minimalStyles.businessName : {},
              { color: settings.pdfAccentColor },
            ]}
          >
            {invoice.business?.name ?? "Your Business Name"}
          </Text>
          {invoice.business?.email && (
            <Text
              style={[
                styles.businessInfo,
                isMinimal ? minimalStyles.businessInfo : {},
              ]}
            >
              {invoice.business.email}
            </Text>
          )}
          {invoice.business?.phone && (
            <Text
              style={[
                styles.businessInfo,
                isMinimal ? minimalStyles.businessInfo : {},
              ]}
            >
              {invoice.business.phone}
            </Text>
          )}
          {(invoice.business?.addressLine1 ??
            invoice.business?.city ??
            invoice.business?.state) && (
            <Text
              style={[
                styles.businessAddress,
                isMinimal ? minimalStyles.businessAddress : {},
              ]}
            >
              {[
                invoice.business?.addressLine1,
                invoice.business?.addressLine2,
                invoice.business?.city &&
                invoice.business?.state &&
                invoice.business?.postalCode
                  ? `${invoice.business.city}, ${invoice.business.state} ${invoice.business.postalCode}`
                  : [
                      invoice.business?.city,
                      invoice.business?.state,
                      invoice.business?.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", "),
                invoice.business?.country,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          )}
        </View>

        <View style={styles.invoiceSection}>
          <Text
            style={[
              styles.invoiceTitle,
              isMinimal ? minimalStyles.invoiceTitle : {},
              { color: settings.pdfAccentColor },
            ]}
          >
            INVOICE
          </Text>
          <Text
            style={[
              styles.invoiceNumber,
              isMinimal ? minimalStyles.invoiceNumber : {},
            ]}
          >
            {invoice.invoicePrefix ?? "#"}
            {invoice.invoiceNumber}
          </Text>
          <View
            style={[
              ...getStatusStyle(invoice.status),
              isMinimal ? minimalStyles.statusBadge : {},
            ]}
          >
            <Text>{getStatusLabel(invoice.status)}</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.headerSeparator,
          isMinimal ? minimalStyles.headerSeparator : {},
        ]}
      />

      <View
        style={[
          styles.detailsSection,
          isMinimal ? minimalStyles.detailsSection : {},
        ]}
      >
        <View
          style={[
            styles.detailsColumn,
            isMinimal ? minimalStyles.detailsColumn : {},
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              isMinimal ? minimalStyles.sectionTitle : {},
            ]}
          >
            BILL TO:
          </Text>
          <Text
            style={[
              styles.clientName,
              isMinimal ? minimalStyles.clientName : {},
            ]}
          >
            {invoice.client?.name ?? "N/A"}
          </Text>
          {invoice.client?.email && (
            <Text
              style={[
                styles.clientInfo,
                isMinimal ? minimalStyles.clientInfo : {},
              ]}
            >
              {invoice.client.email}
            </Text>
          )}
          {invoice.client?.phone && (
            <Text
              style={[
                styles.clientInfo,
                isMinimal ? minimalStyles.clientInfo : {},
              ]}
            >
              {invoice.client.phone}
            </Text>
          )}
          {(invoice.client?.addressLine1 ??
            invoice.client?.city ??
            invoice.client?.state) && (
            <Text
              style={[
                styles.clientAddress,
                isMinimal ? minimalStyles.clientAddress : {},
              ]}
            >
              {[
                invoice.client?.addressLine1,
                invoice.client?.addressLine2,
                invoice.client?.city,
                invoice.client?.state,
                invoice.client?.postalCode,
              ]
                .filter(Boolean)
                .join(", ")}
              {invoice.client?.country ? "\n" + invoice.client.country : ""}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.detailsColumn,
            isMinimal ? minimalStyles.detailsColumn : {},
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              isMinimal ? minimalStyles.sectionTitle : {},
            ]}
          >
            INVOICE DETAILS:
          </Text>
          <View
            style={[styles.detailRow, isMinimal ? minimalStyles.detailRow : {}]}
          >
            <Text
              style={[
                styles.detailLabel,
                isMinimal ? minimalStyles.detailLabel : {},
              ]}
            >
              Issue Date:
            </Text>
            <Text
              style={[
                styles.detailValue,
                isMinimal ? minimalStyles.detailValue : {},
              ]}
            >
              {formatDate(invoice.issueDate)}
            </Text>
          </View>
          <View
            style={[styles.detailRow, isMinimal ? minimalStyles.detailRow : {}]}
          >
            <Text
              style={[
                styles.detailLabel,
                isMinimal ? minimalStyles.detailLabel : {},
              ]}
            >
              Due Date:
            </Text>
            <Text
              style={[
                styles.detailValue,
                isMinimal ? minimalStyles.detailValue : {},
              ]}
            >
              {formatDate(invoice.dueDate)}
            </Text>
          </View>
          <View
            style={[styles.detailRow, isMinimal ? minimalStyles.detailRow : {}]}
          >
            <Text
              style={[
                styles.detailLabel,
                isMinimal ? minimalStyles.detailLabel : {},
              ]}
            >
              Invoice #:
            </Text>
            <Text
              style={[
                styles.detailValue,
                isMinimal ? minimalStyles.detailValue : {},
              ]}
            >
              {invoice.invoiceNumber}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Table header component
const TableHeader: React.FC<{
  settings: Required<PDFGenerationSettings>;
  showRate: boolean;
  pdfStyles: PdfStyleBundle;
}> = ({ settings, showRate, pdfStyles }) => {
  const { styles, minimalStyles } = pdfStyles;
  const cols = getColumnWidths(showRate);
  const isMinimal = settings.pdfTemplate === "minimal";
  return (
    <View
      style={[styles.tableHeader, isMinimal ? minimalStyles.tableHeader : {}]}
    >
      <Text
        style={[
          styles.tableHeaderCell,
          isMinimal ? minimalStyles.tableHeaderCell : {},
          { width: cols.date },
        ]}
      >
        Date
      </Text>
      <Text
        style={[
          styles.tableHeaderCell,
          isMinimal ? minimalStyles.tableHeaderCell : {},
          { width: cols.description },
        ]}
      >
        Description
      </Text>
      <Text
        style={[
          styles.tableHeaderCell,
          isMinimal ? minimalStyles.tableHeaderCell : {},
          styles.tableHeaderHours,
          { width: cols.hours },
        ]}
      >
        Hours
      </Text>
      {showRate && (
        <Text
          style={[
            styles.tableHeaderCell,
            isMinimal ? minimalStyles.tableHeaderCell : {},
            styles.tableHeaderRate,
            { width: cols.rate },
          ]}
        >
          Rate
        </Text>
      )}
      <Text
        style={[
          styles.tableHeaderCell,
          isMinimal ? minimalStyles.tableHeaderCell : {},
          styles.tableHeaderAmount,
          { width: cols.amount },
        ]}
      >
        Amount
      </Text>
    </View>
  );
};

// Footer component
const NotesSection: React.FC<{
  invoice: InvoiceData;
  settings: Required<PDFGenerationSettings>;
  pdfStyles: PdfStyleBundle;
}> = ({ invoice, settings, pdfStyles }) => {
  const { styles, minimalStyles } = pdfStyles;
  if (!invoice.notes) return null;
  const isMinimal = settings.pdfTemplate === "minimal";

  return (
    <View
      style={[
        styles.notesContainer,
        isMinimal ? minimalStyles.notesContainer : {},
      ]}
    >
      <View
        style={[
          styles.notesSection,
          isMinimal ? minimalStyles.notesSection : {},
        ]}
      >
        <Text
          style={[styles.notesTitle, isMinimal ? minimalStyles.notesTitle : {}]}
        >
          NOTES
        </Text>
        <Text
          style={[
            styles.notesContent,
            isMinimal ? minimalStyles.notesContent : {},
          ]}
        >
          {invoice.notes}
        </Text>
      </View>
    </View>
  );
};

const Footer: React.FC<{
  settings: Required<PDFGenerationSettings>;
  pdfStyles: PdfStyleBundle;
}> = ({ settings, pdfStyles }) => {
  const { styles, minimalStyles, fonts } = pdfStyles;
  const isMinimal = settings.pdfTemplate === "minimal";

  return (
    <View style={[styles.footer, isMinimal ? minimalStyles.footer : {}]} fixed>
      <View style={styles.footerLogo}>
        {settings.pdfShowLogo && (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt.
          <Image
            src="/beenvoice-logo.png"
            style={{
              width: 120,
              height: 18,
              marginRight: 8,
            }}
          />
        )}
        <Text
          style={{
            fontSize: isMinimal ? 8 : 9,
            fontFamily: fonts.regular,
            color: "#6b7280",
            marginLeft: settings.pdfShowLogo ? 8 : 0,
          }}
        >
          {settings.pdfFooterText}
        </Text>
      </View>
      {settings.pdfShowPageNumbers && (
        <Text
          style={[styles.pageNumber, isMinimal ? minimalStyles.pageNumber : {}]}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      )}
    </View>
  );
};

// Enhanced totals section component
const TotalsSection: React.FC<{
  invoice: InvoiceData;
  items: Array<NonNullable<InvoiceData["items"]>[0]>;
  settings: Required<PDFGenerationSettings>;
  pdfStyles: PdfStyleBundle;
}> = ({ invoice, items, settings, pdfStyles }) => {
  const { styles, minimalStyles, fonts } = pdfStyles;
  const currency = invoice.currency ?? "USD";
  const subtotal = items.reduce((sum, item) => sum + (item?.amount ?? 0), 0);
  const taxAmount = (subtotal * invoice.taxRate) / 100;
  const total = subtotal + taxAmount;
  const isMinimal = settings.pdfTemplate === "minimal";

  return (
    <View
      style={[
        styles.totalsContainer,
        isMinimal ? minimalStyles.totalsContainer : {},
      ]}
    >
      <View
        style={[
          styles.totalsBox,
          isMinimal
            ? {
                ...minimalStyles.totalsBox,
                backgroundColor: "#ffffff",
                borderTop: "1px solid #e5e7eb",
                paddingHorizontal: 0,
              }
            : {},
        ]}
      >
        <Text
          style={{
            fontSize: isMinimal ? 8 : 11,
            fontFamily: fonts.bold,
            color: "#0f0f0f",
            textAlign: isMinimal ? "left" : "center",
            marginBottom: isMinimal ? 5 : 8,
            paddingBottom: isMinimal ? 3 : 6,
          }}
        >
          INVOICE SUMMARY
        </Text>

        <View
          style={[styles.totalRow, isMinimal ? minimalStyles.totalRow : {}]}
        >
          <Text
            style={[
              styles.totalLabel,
              isMinimal ? minimalStyles.totalLabel : {},
            ]}
          >
            Subtotal:
          </Text>
          <Text
            style={[
              styles.totalAmount,
              isMinimal ? minimalStyles.totalAmount : {},
            ]}
          >
            {formatCurrency(subtotal, currency)}
          </Text>
        </View>

        {invoice.taxRate > 0 && (
          <View
            style={[styles.totalRow, isMinimal ? minimalStyles.totalRow : {}]}
          >
            <Text
              style={[
                styles.totalLabel,
                isMinimal ? minimalStyles.totalLabel : {},
              ]}
            >
              Tax ({invoice.taxRate}%):
            </Text>
            <Text
              style={[
                styles.totalAmount,
                isMinimal ? minimalStyles.totalAmount : {},
              ]}
            >
              {formatCurrency(taxAmount, currency)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.finalTotalRow,
            isMinimal ? minimalStyles.finalTotalRow : {},
          ]}
        >
          <Text
            style={[
              styles.finalTotalLabel,
              isMinimal ? minimalStyles.finalTotalLabel : {},
            ]}
          >
            TOTAL:
          </Text>
          <Text
            style={[
              styles.finalTotalAmount,
              isMinimal ? minimalStyles.finalTotalAmount : {},
              { color: settings.pdfAccentColor },
            ]}
          >
            {formatCurrency(total, currency)}
          </Text>
        </View>

        <Text
          style={[styles.itemCount, isMinimal ? minimalStyles.itemCount : {}]}
        >
          {items.length} line item{items.length !== 1 ? "s" : ""}
        </Text>
      </View>
    </View>
  );
};

// Main PDF component
export const InvoicePDF: React.FC<{
  invoice: InvoiceData;
  settings?: PDFGenerationSettings;
}> = ({ invoice, settings: inputSettings }) => {
  const settings = resolvePDFSettings(inputSettings);
  const pdfStyles = getPdfStyleBundle(
    settings.pdfFontFamily,
    settings.pdfNumericFontFamily,
  );

  return (
    <InvoicePDFDocument
      invoice={invoice}
      settings={settings}
      pdfStyles={pdfStyles}
    />
  );
};

const InvoicePDFDocument: React.FC<{
  invoice: InvoiceData;
  settings: Required<PDFGenerationSettings>;
  pdfStyles: PdfStyleBundle;
}> = ({ invoice, settings, pdfStyles }) => {
  const { styles, minimalStyles } = pdfStyles;
  const items = invoice.items?.filter(Boolean) ?? [];
  const currency = invoice.currency ?? "USD";
  const showRate = new Set(items.map((item) => item?.rate)).size > 1;
  const cols = getColumnWidths(showRate);
  const isMinimal = settings.pdfTemplate === "minimal";

  return (
    <Document>
      <Page
        size="LETTER"
        style={[styles.page, isMinimal ? minimalStyles.page : {}]}
      >
        <DenseHeader
          invoice={invoice}
          settings={settings}
          pdfStyles={pdfStyles}
        />

        {items.length > 0 && (
          <View
            style={[
              styles.tableContainer,
              isMinimal ? minimalStyles.tableContainer : {},
            ]}
          >
            <TableHeader
              settings={settings}
              showRate={showRate}
              pdfStyles={pdfStyles}
            />
            {items.map(
              (item, index) =>
                item && (
                  <View
                    key={`invoice-item-${index}`}
                    wrap={false}
                    style={[
                      styles.tableRow,
                      isMinimal ? minimalStyles.tableRow : {},
                      settings.pdfTemplate === "classic" && index % 2 === 0
                        ? styles.tableRowAlt
                        : {},
                    ]}
                  >
                    <Text
                      style={[
                        styles.tableCell,
                        isMinimal ? minimalStyles.tableCell : {},
                        styles.tableCellDate,
                        { width: cols.date },
                      ]}
                    >
                      {formatDate(item.date)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        isMinimal ? minimalStyles.tableCell : {},
                        styles.tableCellDescription,
                        isMinimal ? minimalStyles.tableCellDescription : {},
                        { width: cols.description },
                      ]}
                    >
                      {item.description}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        isMinimal ? minimalStyles.tableCell : {},
                        styles.tableCellHours,
                        { width: cols.hours },
                      ]}
                    >
                      {isFixedLineItem(item.hours) ? "—" : item.hours}
                    </Text>
                    {showRate && (
                      <Text
                        style={[
                          styles.tableCell,
                          isMinimal ? minimalStyles.tableCell : {},
                          styles.tableCellRate,
                          { width: cols.rate },
                        ]}
                      >
                        {formatCurrency(item.rate, currency)}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.tableCell,
                        isMinimal ? minimalStyles.tableCell : {},
                        styles.tableCellAmount,
                        { width: cols.amount },
                      ]}
                    >
                      {formatCurrency(item.amount, currency)}
                    </Text>
                  </View>
                ),
            )}
          </View>
        )}

        <View
          style={[
            styles.bottomSection,
            isMinimal ? minimalStyles.bottomSection : {},
          ]}
          wrap={false}
        >
          {invoice.notes && (
            <NotesSection
              invoice={invoice}
              settings={settings}
              pdfStyles={pdfStyles}
            />
          )}
          <TotalsSection
            invoice={invoice}
            items={items}
            settings={settings}
            pdfStyles={pdfStyles}
          />
        </View>

        <Footer settings={settings} pdfStyles={pdfStyles} />
      </Page>
    </Document>
  );
};

// Export functions
export async function generateInvoicePDF(
  invoice: InvoiceData,
  settings?: PDFGenerationSettings,
): Promise<void> {
  try {
    // Validate invoice data
    if (!invoice) {
      throw new Error("Invoice data is required");
    }

    if (!invoice.invoiceNumber) {
      throw new Error("Invoice number is required");
    }

    if (!invoice.client?.name) {
      throw new Error("Client information is required");
    }

    // Generate PDF blob
    const originalBlob = await pdf(
      <InvoicePDF invoice={invoice} settings={settings} />,
    ).toBlob();

    // Validate blob
    if (!originalBlob || originalBlob.size === 0) {
      throw new Error("Generated PDF is empty");
    }

    // Create a new blob with explicit MIME type to ensure proper PDF handling
    const blob = new Blob([originalBlob], { type: "application/pdf" });

    // Create filename with timestamp for uniqueness
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Invoice_${invoice.invoiceNumber}_${timestamp}.pdf`;

    // Download the PDF with fallback support
    downloadBlob(blob, filename);
  } catch (error) {
    // Log the actual error for debugging
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  }
}

// Additional utility function for generating PDF without downloading
export async function generateInvoicePDFBlob(
  invoice: InvoiceData,
  settings?: PDFGenerationSettings,
): Promise<Blob> {
  try {
    // Validate invoice data
    if (!invoice) {
      throw new Error("Invoice data is required");
    }

    if (!invoice.invoiceNumber) {
      throw new Error("Invoice number is required");
    }

    if (!invoice.client?.name) {
      throw new Error("Client information is required");
    }

    // Generate PDF blob
    const originalBlob = await pdf(
      <InvoicePDF invoice={invoice} settings={settings} />,
    ).toBlob();

    // Validate blob
    if (!originalBlob || originalBlob.size === 0) {
      throw new Error("Generated PDF is empty");
    }

    // Create a new blob with explicit MIME type to ensure proper PDF handling
    const blob = new Blob([originalBlob], { type: "application/pdf" });

    return blob;
  } catch (error) {
    // Re-throw with consistent error handling
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate PDF blob");
  }
}
