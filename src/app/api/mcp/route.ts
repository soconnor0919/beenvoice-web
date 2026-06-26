import { TRPCError } from "@trpc/server";
import { z, type ZodType } from "zod";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { getAppUrl } from "~/lib/app-url";

export const runtime = "nodejs";

type JsonRpcId = string | number | null;
type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};
type McpCaller = ReturnType<typeof createCaller>;

const dateString = z.string().min(1);
const emptyableString = z.string().optional().or(z.literal(""));
const invoiceStatus = z.enum(["draft", "sent", "paid"]);
const paymentMethod = z.enum([
  "cash",
  "check",
  "bank_transfer",
  "credit_card",
  "paypal",
  "other",
]);

const invoiceItemSchema = z.object({
  date: dateString,
  description: z.string().min(1),
  hours: z.number().min(0),
  rate: z.number().min(0),
});

const clientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  addressLine1: z.string().max(255).optional().or(z.literal("")),
  addressLine2: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(50).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  defaultHourlyRate: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
});

const businessCreateSchema = z.object({
  name: z.string().min(1).max(255),
  nickname: emptyableString,
  email: z.string().email().optional().or(z.literal("")),
  phone: emptyableString,
  addressLine1: emptyableString,
  addressLine2: emptyableString,
  city: emptyableString,
  state: emptyableString,
  postalCode: emptyableString,
  country: emptyableString,
  website: z.string().url().optional().or(z.literal("")),
  taxId: emptyableString,
  logoUrl: emptyableString,
  isDefault: z.boolean().default(false),
});

const invoiceCreateSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoicePrefix: z.string().optional(),
  businessId: emptyableString,
  clientId: z.string().min(1),
  issueDate: dateString,
  dueDate: dateString,
  status: invoiceStatus.default("draft"),
  notes: emptyableString,
  emailMessage: emptyableString,
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().length(3).default("USD"),
  items: z.array(invoiceItemSchema).min(1),
});

const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  id: z.string(),
});

const expenseCreateSchema = z.object({
  date: dateString,
  description: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().length(3).default("USD"),
  category: z.string().optional().or(z.literal("")),
  billable: z.boolean().default(false),
  reimbursable: z.boolean().default(false),
  taxDeductible: z.boolean().default(false),
  notes: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  businessId: z.string().optional().or(z.literal("")),
  invoiceId: z.string().optional().or(z.literal("")),
});

const expenseUpdateSchema = expenseCreateSchema.partial().extend({ id: z.string() });

const recurringItemSchema = z.object({
  description: z.string().min(1),
  hours: z.number().min(0),
  rate: z.number().min(0),
  position: z.number().int().default(0),
});

const recurringCreateSchema = z.object({
  name: z.string().min(1).max(255),
  clientId: z.string().min(1),
  businessId: z.string().optional().or(z.literal("")),
  schedule: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  invoicePrefix: z.string().optional().default("#"),
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().length(3).default("USD"),
  notes: z.string().optional().or(z.literal("")),
  emailMessage: z.string().optional().or(z.literal("")),
  items: z.array(recurringItemSchema).min(1),
});

const recurringUpdateSchema = recurringCreateSchema.extend({ id: z.string() });

const jsonSchemas = {
  empty: { type: "object", properties: {}, additionalProperties: false },
  id: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  },
  invoiceId: {
    type: "object",
    properties: { invoiceId: { type: "string" } },
    required: ["invoiceId"],
    additionalProperties: false,
  },
  invoiceStatus: {
    type: "object",
    properties: {
      id: { type: "string" },
      status: { type: "string", enum: ["draft", "sent", "paid"] },
    },
    required: ["id", "status"],
    additionalProperties: false,
  },
  paymentCreate: {
    type: "object",
    properties: {
      invoiceId: { type: "string" },
      amount: { type: "number", exclusiveMinimum: 0 },
      date: { type: "string", format: "date-time" },
      method: {
        type: "string",
        enum: ["cash", "check", "bank_transfer", "credit_card", "paypal", "other"],
      },
      notes: { type: "string", maxLength: 500 },
    },
    required: ["invoiceId", "amount", "date"],
    additionalProperties: false,
  },
  clientCreate: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      email: { type: "string" },
      phone: { type: "string", maxLength: 50 },
      addressLine1: { type: "string", maxLength: 255 },
      addressLine2: { type: "string", maxLength: 255 },
      city: { type: "string", maxLength: 100 },
      state: { type: "string", maxLength: 50 },
      postalCode: { type: "string", maxLength: 20 },
      country: { type: "string", maxLength: 100 },
      defaultHourlyRate: { type: "number", minimum: 0 },
      currency: { type: "string", minLength: 3, maxLength: 3 },
    },
    required: ["name"],
    additionalProperties: false,
  },
  invoiceCreate: {
    type: "object",
    properties: {
      invoiceNumber: { type: "string", minLength: 1 },
      invoicePrefix: { type: "string" },
      businessId: { type: "string" },
      clientId: { type: "string", minLength: 1 },
      issueDate: { type: "string", format: "date-time" },
      dueDate: { type: "string", format: "date-time" },
      status: { type: "string", enum: ["draft", "sent", "paid"] },
      notes: { type: "string" },
      emailMessage: { type: "string" },
      taxRate: { type: "number", minimum: 0, maximum: 100 },
      currency: { type: "string", minLength: 3, maxLength: 3 },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            date: { type: "string", format: "date-time" },
            description: { type: "string", minLength: 1 },
            hours: { type: "number", minimum: 0 },
            rate: { type: "number", minimum: 0 },
          },
          required: ["date", "description", "hours", "rate"],
          additionalProperties: false,
        },
      },
    },
    required: ["invoiceNumber", "clientId", "issueDate", "dueDate", "items"],
    additionalProperties: false,
  },
  businessCreate: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      nickname: { type: "string", maxLength: 255 },
      email: { type: "string" },
      phone: { type: "string" },
      addressLine1: { type: "string" },
      addressLine2: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      postalCode: { type: "string" },
      country: { type: "string" },
      website: { type: "string" },
      taxId: { type: "string" },
      logoUrl: { type: "string" },
      isDefault: { type: "boolean" },
    },
    required: ["name"],
    additionalProperties: false,
  },
  expenseCreate: {
    type: "object",
    properties: {
      date: { type: "string", format: "date-time" },
      description: { type: "string", minLength: 1 },
      amount: { type: "number", minimum: 0 },
      currency: { type: "string", minLength: 3, maxLength: 3 },
      category: { type: "string", enum: ["Travel", "Meals & Entertainment", "Software & Subscriptions", "Hardware & Equipment", "Office Supplies", "Marketing", "Professional Services", "Utilities", "Other"] },
      billable: { type: "boolean" },
      reimbursable: { type: "boolean" },
      taxDeductible: { type: "boolean" },
      notes: { type: "string", maxLength: 500 },
      clientId: { type: "string" },
      businessId: { type: "string" },
      invoiceId: { type: "string" },
    },
    required: ["date", "description", "amount"],
    additionalProperties: false,
  },
  recurringItem: {
    type: "object",
    properties: {
      description: { type: "string", minLength: 1 },
      hours: { type: "number", minimum: 0 },
      rate: { type: "number", minimum: 0 },
      position: { type: "integer" },
    },
    required: ["description", "hours", "rate"],
    additionalProperties: false,
  },
  recurringCreate: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      clientId: { type: "string", minLength: 1 },
      businessId: { type: "string" },
      schedule: { type: "string", enum: ["weekly", "biweekly", "monthly", "quarterly", "yearly"] },
      invoicePrefix: { type: "string" },
      taxRate: { type: "number", minimum: 0, maximum: 100 },
      currency: { type: "string", minLength: 3, maxLength: 3 },
      notes: { type: "string" },
      emailMessage: { type: "string" },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            description: { type: "string", minLength: 1 },
            hours: { type: "number", minimum: 0 },
            rate: { type: "number", minimum: 0 },
            position: { type: "integer" },
          },
          required: ["description", "hours", "rate"],
          additionalProperties: false,
        },
      },
    },
    required: ["name", "clientId", "schedule", "items"],
    additionalProperties: false,
  },
  invoiceSend: {
    type: "object",
    properties: {
      invoiceId: { type: "string" },
      customSubject: { type: "string" },
      customMessage: { type: "string" },
      ccEmails: { type: "string", description: "Comma-separated CC email addresses" },
      bccEmails: { type: "string", description: "Comma-separated BCC email addresses" },
    },
    required: ["invoiceId"],
    additionalProperties: false,
  },
  bulkIds: {
    type: "object",
    properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 } },
    required: ["ids"],
    additionalProperties: false,
  },
  bulkStatus: {
    type: "object",
    properties: {
      ids: { type: "array", items: { type: "string" }, minItems: 1 },
      status: { type: "string", enum: ["draft", "sent", "paid"] },
    },
    required: ["ids", "status"],
    additionalProperties: false,
  },
} as const;

type ToolDefinition = {
  description: string;
  inputSchema: Record<string, unknown>;
  schema: ZodType;
  handler: (input: unknown, caller: McpCaller) => Promise<unknown>;
};

function defineTool<TInput>(tool: {
  description: string;
  inputSchema: Record<string, unknown>;
  schema: ZodType<TInput>;
  handler: (input: TInput, caller: McpCaller) => Promise<unknown>;
}): ToolDefinition {
  return {
    description: tool.description,
    inputSchema: tool.inputSchema,
    schema: tool.schema,
    handler: async (input, caller) => tool.handler(input as TInput, caller),
  };
}

function parseDate(value: string, fieldName: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} must be a valid ISO date string`,
    });
  }
  return date;
}

function parseInvoiceItems(items: z.infer<typeof invoiceItemSchema>[]) {
  return items.map((item) => ({
    ...item,
    date: parseDate(item.date, "item.date"),
  }));
}

function textResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data ?? null, null, 2) }],
  };
}

const tools = {
  invoices_list: defineTool({
    description: "List invoices for the authenticated user. Optionally filter by status ('draft', 'sent', or 'paid') and/or clientId.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "sent", "paid"], description: "Filter by invoice status" },
        clientId: { type: "string", description: "Filter by client ID" },
      },
      additionalProperties: false,
    },
    schema: z.object({
      status: z.enum(["draft", "sent", "paid"]).optional(),
      clientId: z.string().optional(),
    }).optional().default({}),
    handler: async (input, caller) => caller.invoices.getAll(input ?? {}),
  }),
  invoices_get: defineTool({
    description: "Get one invoice by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.invoices.getById(input),
  }),
  invoices_create: defineTool({
    description: "Create an invoice with line items.",
    inputSchema: jsonSchemas.invoiceCreate,
    schema: invoiceCreateSchema,
    handler: async (input, caller) =>
      caller.invoices.create({
        ...input,
        issueDate: parseDate(input.issueDate, "issueDate"),
        dueDate: parseDate(input.dueDate, "dueDate"),
        items: parseInvoiceItems(input.items),
      }),
  }),
  invoices_update: defineTool({
    description: "Update invoice fields and optionally replace line items.",
    inputSchema: {
      ...jsonSchemas.invoiceCreate,
      required: ["id"],
      properties: {
        id: { type: "string" },
        ...jsonSchemas.invoiceCreate.properties,
      },
    },
    schema: invoiceUpdateSchema,
    handler: async (input, caller) =>
      caller.invoices.update({
        ...input,
        issueDate: input.issueDate
          ? parseDate(input.issueDate, "issueDate")
          : undefined,
        dueDate: input.dueDate ? parseDate(input.dueDate, "dueDate") : undefined,
        items: input.items ? parseInvoiceItems(input.items) : undefined,
      }),
  }),
  invoices_update_status: defineTool({
    description: "Update an invoice status to draft, sent, or paid.",
    inputSchema: jsonSchemas.invoiceStatus,
    schema: z.object({ id: z.string(), status: invoiceStatus }),
    handler: async (input, caller) => caller.invoices.updateStatus(input),
  }),
  invoices_delete: defineTool({
    description: "Delete an invoice by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.invoices.delete(input),
  }),
  payments_list_for_invoice: defineTool({
    description: "List payments recorded for an invoice.",
    inputSchema: jsonSchemas.invoiceId,
    schema: z.object({ invoiceId: z.string() }),
    handler: async (input, caller) => caller.payments.getByInvoice(input),
  }),
  payments_create: defineTool({
    description: "Record a payment for an invoice.",
    inputSchema: jsonSchemas.paymentCreate,
    schema: z.object({
      invoiceId: z.string(),
      amount: z.number().positive(),
      date: dateString,
      method: paymentMethod.default("other"),
      notes: z.string().max(500).optional(),
    }),
    handler: async (input, caller) =>
      caller.payments.create({
        ...input,
        date: parseDate(input.date, "date"),
      }),
  }),
  payments_delete: defineTool({
    description: "Delete a payment by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.payments.delete(input),
  }),
  clients_list: defineTool({
    description: "List clients for the authenticated beenvoice user.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.clients.getAll(),
  }),
  clients_get: defineTool({
    description: "Get one client by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.clients.getById(input),
  }),
  clients_create: defineTool({
    description: "Create a client.",
    inputSchema: jsonSchemas.clientCreate,
    schema: clientCreateSchema,
    handler: async (input, caller) => caller.clients.create(input),
  }),
  clients_update: defineTool({
    description: "Update a client.",
    inputSchema: {
      ...jsonSchemas.clientCreate,
      required: ["id"],
      properties: { id: { type: "string" }, ...jsonSchemas.clientCreate.properties },
    },
    schema: clientCreateSchema.partial().extend({ id: z.string() }),
    handler: async (input, caller) => caller.clients.update(input),
  }),
  clients_delete: defineTool({
    description: "Delete a client by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.clients.delete(input),
  }),
  businesses_list: defineTool({
    description: "List businesses for the authenticated beenvoice user.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.businesses.getAll(),
  }),
  businesses_get: defineTool({
    description: "Get one business by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.businesses.getById(input),
  }),
  businesses_get_default: defineTool({
    description: "Get the user's default business.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.businesses.getDefault(),
  }),
  businesses_create: defineTool({
    description: "Create a business profile.",
    inputSchema: jsonSchemas.businessCreate,
    schema: businessCreateSchema,
    handler: async (input, caller) => caller.businesses.create(input),
  }),
  businesses_update: defineTool({
    description: "Update a business profile. All business fields should be provided.",
    inputSchema: {
      ...jsonSchemas.businessCreate,
      required: ["id", "name"],
      properties: {
        id: { type: "string" },
        ...jsonSchemas.businessCreate.properties,
      },
    },
    schema: businessCreateSchema.extend({ id: z.string() }),
    handler: async (input, caller) => caller.businesses.update(input),
  }),
  businesses_set_default: defineTool({
    description: "Set a business as the default for new invoices.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.businesses.setDefault(input),
  }),
  businesses_delete: defineTool({
    description: "Delete a business by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.businesses.delete(input),
  }),
  time_clock_in: defineTool({
    description:
      "Start a time clock entry for the authenticated user. Fails if a timer is already running. Use invoiceId to link directly to a specific invoice (the time will be added to that invoice on clock-out). Use startedAt to backdate the start time (e.g. if you forgot to clock in earlier). Cannot be in the future.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", maxLength: 500 },
        clientId: { type: "string" },
        invoiceId: { type: "string", description: "Link this timer to a specific invoice. On clock-out, time is added directly to this invoice." },
        rate: { type: "number", minimum: 0 },
        startedAt: { type: "string", format: "date-time", description: "Optional backdated start time (ISO 8601). Defaults to now." },
      },
      additionalProperties: false,
    },
    schema: z.object({
      description: z.string().max(500).default(""),
      clientId: z.string().optional().or(z.literal("")),
      invoiceId: z.string().optional(),
      rate: z.number().min(0).optional(),
      startedAt: z.string().optional(),
    }),
    handler: async (input, caller) =>
      caller.timeEntries.clockIn({
        ...input,
        startedAt: input.startedAt ? parseDate(input.startedAt, "startedAt") : undefined,
      }),
  }),
  time_clock_out: defineTool({
    description:
      "Stop the currently running timer for the authenticated user. Returns the completed time entry with computed hours. If the entry was linked to a specific invoice (via invoiceId at clock-in), the time is added directly to that invoice. Otherwise, if the entry has a client, a line item is automatically added to their latest open invoice. The invoice is returned in the 'invoice' field.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", maxLength: 500 },
      },
      additionalProperties: false,
    },
    schema: z.object({
      description: z.string().max(500).optional(),
    }),
    handler: async (input, caller) => caller.timeEntries.clockOut(input),
  }),
  time_get_running: defineTool({
    description: "Get the currently running timer, if any. Returns null if no timer is running.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.timeEntries.getRunning(),
  }),
  time_entries_list: defineTool({
    description: "List completed time entries for the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    schema: z.object({
      clientId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
    handler: async (input, caller) =>
      caller.timeEntries.getAll({
        clientId: input.clientId,
        from: input.from ? parseDate(input.from, "from") : undefined,
        to: input.to ? parseDate(input.to, "to") : undefined,
      }),
  }),
  time_entries_create: defineTool({
    description:
      "Create a manual time entry (for backdating or importing existing records). Hours are auto-computed from startedAt/endedAt if not provided.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", maxLength: 500 },
        clientId: { type: "string" },
        startedAt: { type: "string", format: "date-time" },
        endedAt: { type: "string", format: "date-time" },
        hours: { type: "number", minimum: 0 },
        rate: { type: "number", minimum: 0 },
        notes: { type: "string", maxLength: 500 },
      },
      required: ["startedAt"],
      additionalProperties: false,
    },
    schema: z.object({
      description: z.string().max(500).default(""),
      clientId: z.string().optional().or(z.literal("")),
      startedAt: dateString,
      endedAt: dateString.optional(),
      hours: z.number().min(0).optional(),
      rate: z.number().min(0).optional(),
      notes: z.string().max(500).optional(),
    }),
    handler: async (input, caller) =>
      caller.timeEntries.create({
        ...input,
        startedAt: parseDate(input.startedAt, "startedAt"),
        endedAt: input.endedAt ? parseDate(input.endedAt, "endedAt") : undefined,
      }),
  }),
  time_entries_update: defineTool({
    description: "Update an existing time entry by ID. All fields are optional except id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        description: { type: "string", maxLength: 500 },
        clientId: { type: "string" },
        startedAt: { type: "string", format: "date-time" },
        endedAt: { type: "string", format: "date-time" },
        hours: { type: "number", minimum: 0 },
        rate: { type: "number", minimum: 0 },
        notes: { type: "string", maxLength: 500 },
      },
      required: ["id"],
      additionalProperties: false,
    },
    schema: z.object({
      id: z.string(),
      description: z.string().max(500).optional(),
      clientId: z.string().optional().or(z.literal("")),
      startedAt: dateString.optional(),
      endedAt: dateString.optional(),
      hours: z.number().min(0).optional(),
      rate: z.number().min(0).optional(),
      notes: z.string().max(500).optional().or(z.literal("")),
    }),
    handler: async (input, caller) =>
      caller.timeEntries.update({
        ...input,
        startedAt: input.startedAt ? parseDate(input.startedAt, "startedAt") : undefined,
        endedAt: input.endedAt ? parseDate(input.endedAt, "endedAt") : undefined,
      }),
  }),
  time_entries_delete: defineTool({
    description: "Delete a time entry by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.timeEntries.delete(input),
  }),
  time_entries_get_summary: defineTool({
    description:
      "Get total hours, total earnings, and entry count for the authenticated user, optionally filtered by date range.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    schema: z.object({
      from: dateString.optional(),
      to: dateString.optional(),
    }),
    handler: async (input, caller) =>
      caller.timeEntries.getSummary({
        from: input.from ? parseDate(input.from, "from") : undefined,
        to: input.to ? parseDate(input.to, "to") : undefined,
      }),
  }),
  // ── Expenses ────────────────────────────────────────────────────────────────
  expenses_list: defineTool({
    description: "List all expenses for the authenticated user, ordered by date descending.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.expenses.getAll(),
  }),
  expenses_get: defineTool({
    description: "Get a single expense by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.expenses.getById(input),
  }),
  expenses_create: defineTool({
    description: "Create an expense. Category must be one of the allowed values. Set billable=true if this will be charged to a client, taxDeductible=true for tax purposes.",
    inputSchema: jsonSchemas.expenseCreate,
    schema: expenseCreateSchema,
    handler: async (input, caller) =>
      caller.expenses.create({
        ...input,
        date: parseDate(input.date, "date"),
      }),
  }),
  expenses_update: defineTool({
    description: "Update an existing expense by ID. All fields are optional except id.",
    inputSchema: {
      ...jsonSchemas.expenseCreate,
      required: ["id"],
      properties: { id: { type: "string" }, ...jsonSchemas.expenseCreate.properties },
    },
    schema: expenseUpdateSchema,
    handler: async (input, caller) =>
      caller.expenses.update({
        ...input,
        date: input.date ? parseDate(input.date, "date") : undefined,
      }),
  }),
  expenses_delete: defineTool({
    description: "Delete an expense by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.expenses.delete(input),
  }),

  // ── Recurring Invoices ───────────────────────────────────────────────────────
  recurring_list: defineTool({
    description: "List all recurring invoice templates for the authenticated user, ordered by next due date.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.recurringInvoices.getAll(),
  }),
  recurring_create: defineTool({
    description: "Create a recurring invoice template. Invoices will be auto-generated on the given schedule. Items are line item templates (description, hours, rate).",
    inputSchema: jsonSchemas.recurringCreate,
    schema: recurringCreateSchema,
    handler: async (input, caller) => caller.recurringInvoices.create(input),
  }),
  recurring_update: defineTool({
    description: "Update a recurring invoice template. Replaces all items.",
    inputSchema: {
      ...jsonSchemas.recurringCreate,
      required: ["id", "name", "clientId", "schedule", "items"],
      properties: { id: { type: "string" }, ...jsonSchemas.recurringCreate.properties },
    },
    schema: recurringUpdateSchema,
    handler: async (input, caller) => caller.recurringInvoices.update(input),
  }),
  recurring_pause: defineTool({
    description: "Pause a recurring invoice template. No invoices will be generated until resumed.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.recurringInvoices.pause(input),
  }),
  recurring_resume: defineTool({
    description: "Resume a paused recurring invoice template.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.recurringInvoices.resume(input),
  }),
  recurring_generate_now: defineTool({
    description: "Immediately generate a draft invoice from a recurring template, regardless of schedule. Returns the new invoice ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.recurringInvoices.generateNow(input),
  }),
  recurring_delete: defineTool({
    description: "Delete a recurring invoice template by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.recurringInvoices.delete(input),
  }),

  // ── Dashboard ────────────────────────────────────────────────────────────────
  dashboard_get_stats: defineTool({
    description: "Get a business overview: total revenue (paid invoices), pending amount (sent/overdue invoices), overdue invoice count, total clients, month-over-month revenue change percentage, 6-month revenue chart data, and 5 most recent invoices.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.dashboard.getStats(),
  }),

  // ── Invoice extras ───────────────────────────────────────────────────────────
  invoices_get_current_open: defineTool({
    description: "Get the most recent draft invoice for the authenticated user. Useful for quickly finding the active working invoice.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.invoices.getCurrentOpen(),
  }),
  invoices_send: defineTool({
    description: "Send an invoice to the client via email with a PDF attachment. Updates the invoice status to 'sent'. Requires email to be configured (Resend API key on the business or platform).",
    inputSchema: jsonSchemas.invoiceSend,
    schema: z.object({
      invoiceId: z.string(),
      customSubject: z.string().optional(),
      customMessage: z.string().optional(),
      ccEmails: z.string().optional(),
      bccEmails: z.string().optional(),
    }),
    handler: async (input, caller) => caller.email.sendInvoice({ ...input, useHtml: false }),
  }),
  invoices_send_reminder: defineTool({
    description: "Send a payment reminder email to the client for a sent or overdue invoice.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        customMessage: { type: "string", description: "Optional custom message to include in the reminder" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    schema: z.object({ id: z.string(), customMessage: z.string().optional() }),
    handler: async (input, caller) => caller.invoices.sendReminder(input),
  }),
  invoices_generate_public_token: defineTool({
    description: "Generate a shareable public link for an invoice. Returns a web view URL (/i/{token}) and a direct PDF URL (/api/i/{token}/pdf). Set ttlHours to make the link expire automatically (e.g. 24 for a 24-hour preview link). Omit ttlHours for a permanent link.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        ttlHours: { type: "number", exclusiveMinimum: 0, description: "Hours until the link expires. Omit for a permanent link." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    schema: z.object({ id: z.string(), ttlHours: z.number().positive().optional() }),
    handler: async (input, caller) => {
      const result = await caller.invoices.generatePublicToken(input);
      const base = getAppUrl();
      return {
        ...result,
        webUrl: `${base}/i/${result.token}`,
        pdfUrl: `${base}/api/i/${result.token}/pdf`,
      };
    },
  }),
  invoices_revoke_public_token: defineTool({
    description: "Revoke the public shareable link for an invoice, making it inaccessible without authentication.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.invoices.revokePublicToken(input),
  }),
  invoices_bulk_update_status: defineTool({
    description: "Update the status of multiple invoices at once.",
    inputSchema: jsonSchemas.bulkStatus,
    schema: z.object({
      ids: z.array(z.string()).min(1),
      status: z.enum(["draft", "sent", "paid"]),
    }),
    handler: async (input, caller) => caller.invoices.bulkUpdateStatus(input),
  }),
  invoices_bulk_delete: defineTool({
    description: "Delete multiple invoices at once.",
    inputSchema: jsonSchemas.bulkIds,
    schema: z.object({ ids: z.array(z.string()).min(1) }),
    handler: async (input, caller) => caller.invoices.bulkDelete(input),
  }),

  // ── Invoice Templates ────────────────────────────────────────────────────────
  templates_list: defineTool({
    description: "List all saved invoice templates (notes and terms). Use these to populate invoice notes/terms fields.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.invoiceTemplates.getAll(),
  }),
  templates_list_by_type: defineTool({
    description: "List invoice templates filtered by type: 'notes' for invoice notes, 'terms' for payment terms.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", enum: ["notes", "terms"] } },
      required: ["type"],
      additionalProperties: false,
    },
    schema: z.object({ type: z.enum(["notes", "terms"]) }),
    handler: async (input, caller) => caller.invoiceTemplates.getByType(input),
  }),
  templates_create: defineTool({
    description: "Create an invoice template. Set isDefault=true to automatically apply this template to new invoices of this type.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 255 },
        type: { type: "string", enum: ["notes", "terms"] },
        content: { type: "string", minLength: 1 },
        isDefault: { type: "boolean" },
      },
      required: ["name", "content"],
      additionalProperties: false,
    },
    schema: z.object({
      name: z.string().min(1).max(255),
      type: z.enum(["notes", "terms"]).default("notes"),
      content: z.string().min(1),
      isDefault: z.boolean().default(false),
    }),
    handler: async (input, caller) => caller.invoiceTemplates.create(input),
  }),
  templates_update: defineTool({
    description: "Update an existing invoice template by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string", minLength: 1, maxLength: 255 },
        type: { type: "string", enum: ["notes", "terms"] },
        content: { type: "string", minLength: 1 },
        isDefault: { type: "boolean" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    schema: z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      type: z.enum(["notes", "terms"]).optional(),
      content: z.string().min(1).optional(),
      isDefault: z.boolean().optional(),
    }),
    handler: async (input, caller) => caller.invoiceTemplates.update(input),
  }),
  templates_delete: defineTool({
    description: "Delete an invoice template by ID.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.invoiceTemplates.delete(input),
  }),

  // ── Business email config ─────────────────────────────────────────────────────
  businesses_get_email_config: defineTool({
    description: "Get the email configuration for a business (Resend domain, from-name, and whether an API key is set). The API key itself is never returned.",
    inputSchema: jsonSchemas.id,
    schema: z.object({ id: z.string() }),
    handler: async (input, caller) => caller.businesses.getEmailConfig(input),
  }),
  businesses_update_email_config: defineTool({
    description: "Configure custom email sending for a business via Resend. Set resendApiKey and resendDomain to send invoices from your own domain. Set emailFromName for the sender display name.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        resendApiKey: { type: "string", description: "Resend API key (re_...)" },
        resendDomain: { type: "string", description: "Verified Resend sending domain (e.g. mail.example.com)" },
        emailFromName: { type: "string", description: "Display name for the From field" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    schema: z.object({
      id: z.string(),
      resendApiKey: z.string().optional().or(z.literal("")),
      resendDomain: z.string().optional().or(z.literal("")),
      emailFromName: z.string().optional().or(z.literal("")),
    }),
    handler: async (input, caller) => caller.businesses.updateEmailConfig(input),
  }),

  // ── User profile ──────────────────────────────────────────────────────────────
  profile_get: defineTool({
    description: "Get the authenticated user's profile: id, name, email, and role.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.settings.getProfile(),
  }),
  profile_update: defineTool({
    description: "Update the authenticated user's display name.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", minLength: 1 } },
      required: ["name"],
      additionalProperties: false,
    },
    schema: z.object({ name: z.string().min(1) }),
    handler: async (input, caller) => caller.settings.updateProfile(input),
  }),
} satisfies Record<string, ToolDefinition>;

function rpcResult(id: JsonRpcId, result: unknown, init?: ResponseInit) {
  return Response.json({ jsonrpc: "2.0", id, result }, init);
}

function rpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  status = 400,
  data?: unknown,
) {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message, data } },
    { status },
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function handleMcpRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    jsonrpc?: unknown;
    id?: JsonRpcId;
    method?: unknown;
    params?: unknown;
  } | null;

  if (body?.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(null, -32600, "Invalid JSON-RPC request");
  }

  if (body.id === undefined) {
    return new Response(null, { status: 202 });
  }

  const ctx = await createTRPCContext({ headers: request.headers });
  if (!ctx.session?.user || ctx.authSource !== "api-key") {
    return rpcError(body.id, -32001, "A valid beenvoice API key is required", 401);
  }

  if (body.method === "initialize") {
    return rpcResult(body.id, {
      protocolVersion: "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: "beenvoice", version: "0.1.0" },
    });
  }

  if (body.method === "ping") {
    return rpcResult(body.id, {});
  }

  if (body.method === "tools/list") {
    return rpcResult(body.id, {
      tools: Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
  }

  if (body.method === "tools/call") {
    const params = z
      .object({
        name: z.string(),
        arguments: z.unknown().optional(),
      })
      .safeParse(body.params);

    if (!params.success) {
      return rpcError(body.id, -32602, "Invalid tool call parameters", 400);
    }

    const tool = tools[params.data.name as keyof typeof tools];
    if (!tool) {
      return rpcError(body.id, -32602, `Unknown tool: ${params.data.name}`, 400);
    }

    const input = tool.schema.safeParse(params.data.arguments ?? {});
    if (!input.success) {
      return rpcError(
        body.id,
        -32602,
        "Invalid tool arguments",
        400,
        input.error.flatten(),
      );
    }

    try {
      const caller = createCaller(async () => ctx);
      return rpcResult(body.id, textResult(await tool.handler(input.data, caller)));
    } catch (error) {
      return rpcError(body.id, -32000, getErrorMessage(error), 500);
    }
  }

  return rpcError(body.id, -32601, `Method not found: ${body.method}`, 404);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function GET() {
  return rpcError(null, -32000, "Method not allowed", 405);
}

export async function DELETE() {
  return rpcError(null, -32000, "Method not allowed", 405);
}
