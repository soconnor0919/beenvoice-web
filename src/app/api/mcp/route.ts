import { TRPCError } from "@trpc/server";
import { z, type ZodType } from "zod";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

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
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

const tools = {
  invoices_list: defineTool({
    description: "List invoices for the authenticated beenvoice user.",
    inputSchema: jsonSchemas.empty,
    schema: z.object({}).optional().default({}),
    handler: async (_input, caller) => caller.invoices.getAll(),
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
      "Start a time clock entry for the authenticated user. Fails if a timer is already running. Use startedAt to backdate the start time (e.g. if you forgot to clock in earlier). Cannot be in the future.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", maxLength: 500 },
        clientId: { type: "string" },
        rate: { type: "number", minimum: 0 },
        startedAt: { type: "string", format: "date-time", description: "Optional backdated start time (ISO 8601). Defaults to now." },
      },
      additionalProperties: false,
    },
    schema: z.object({
      description: z.string().max(500).default(""),
      clientId: z.string().optional().or(z.literal("")),
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
      "Stop the currently running timer for the authenticated user. Returns the completed time entry with computed hours. If the entry has a client, a line item is automatically added to their latest open invoice and the invoice is returned in the 'invoice' field.",
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
