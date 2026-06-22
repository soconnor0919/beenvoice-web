import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `beenvoice_${name}`);

// Auth-related tables (keeping existing)
export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }).notNull(),
  email: d.varchar({ length: 255 }).notNull().unique(),
  emailVerified: d.boolean().default(false).notNull(),
  image: d.varchar({ length: 255 }),
  createdAt: d.timestamp().notNull().defaultNow(),
  updatedAt: d
    .timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  password: d.varchar({ length: 255 }), // Matched DB: varchar(255)
  resetToken: d.varchar({ length: 255 }), // Matched DB: varchar(255)
  resetTokenExpiry: d.timestamp(),
  // Custom fields
  prefersReducedMotion: d.boolean().default(false).notNull(),
  animationSpeedMultiplier: d.real().default(1).notNull(),
  colorTheme: d.varchar({ length: 50 }).default("slate").notNull(),
  customColor: d.varchar({ length: 50 }),
  theme: d.varchar({ length: 20 }).default("system").notNull(),
  interfaceTheme: d.varchar({ length: 50 }).default("beenvoice").notNull(),
  fontPreference: d.varchar({ length: 50 }).default("brand").notNull(),
  bodyFontPreference: d.varchar({ length: 50 }).default("brand").notNull(),
  headingFontPreference: d.varchar({ length: 50 }).default("brand").notNull(),
  radiusPreference: d.varchar({ length: 20 }).default("xl").notNull(),
  sidebarStyle: d.varchar({ length: 20 }).default("floating").notNull(),
  role: d.varchar({ length: 20 }).default("user").notNull(),
}));

export const platformSettings = createTable("platform_setting", (d) => ({
  id: d.varchar({ length: 50 }).notNull().primaryKey().default("global"),
  brandName: d.varchar({ length: 100 }).default("beenvoice").notNull(),
  brandTagline: d
    .varchar({ length: 255 })
    .default(
      "Simple and efficient invoicing for freelancers and small businesses",
    )
    .notNull(),
  brandLogoText: d.varchar({ length: 100 }).default("beenvoice").notNull(),
  brandIcon: d.varchar({ length: 20 }).default("$").notNull(),
  colorTheme: d.varchar({ length: 50 }).default("slate").notNull(),
  customColor: d.varchar({ length: 50 }),
  theme: d.varchar({ length: 20 }).default("system").notNull(),
  interfaceTheme: d.varchar({ length: 50 }).default("beenvoice").notNull(),
  bodyFontPreference: d.varchar({ length: 50 }).default("brand").notNull(),
  headingFontPreference: d.varchar({ length: 50 }).default("brand").notNull(),
  radiusPreference: d.varchar({ length: 20 }).default("xl").notNull(),
  sidebarStyle: d.varchar({ length: 20 }).default("floating").notNull(),
  pdfTemplate: d.varchar({ length: 20 }).default("classic").notNull(),
  pdfAccentColor: d.varchar({ length: 50 }).default("#111827").notNull(),
  pdfFooterText: d
    .varchar({ length: 120 })
    .default("Professional Invoicing")
    .notNull(),
  pdfShowLogo: d.boolean().default(true).notNull(),
  pdfShowPageNumbers: d.boolean().default(true).notNull(),
  createdAt: d.timestamp().notNull().defaultNow(),
  updatedAt: d
    .timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  apiKeys: many(apiKeys),
  clients: many(clients),
  businesses: many(businesses),
  invoices: many(invoices),
  sessions: many(sessions),
  expenses: many(expenses),
  invoiceTemplates: many(invoiceTemplates),
  recurringInvoices: many(recurringInvoices),
  timeEntries: many(timeEntries),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()), // Matched DB: text
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    accountId: d.varchar({ length: 255 }).notNull(),
    providerId: d.varchar({ length: 255 }).notNull(),
    accessToken: d.text(),
    refreshToken: d.text(),
    accessTokenExpiresAt: d.timestamp(),
    refreshTokenExpiresAt: d.timestamp(),
    scope: d.varchar({ length: 255 }),
    idToken: d.text(),
    password: d.text(), // Matched DB: text
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d
      .timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("account_userId_idx").on(t.userId)],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()), // Matched DB: text
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    token: d.varchar({ length: 255 }).notNull().unique(),
    expiresAt: d.timestamp().notNull(),
    ipAddress: d.text(), // Matched DB: text
    userAgent: d.text(), // Matched DB: text
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d
      .timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const apiKeys = createTable(
  "api_key",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 100 }).notNull(),
    keyHash: d.varchar({ length: 64 }).notNull().unique(),
    keyPrefix: d.varchar({ length: 16 }).notNull(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastUsedAt: d.timestamp(),
    expiresAt: d.timestamp(),
    revokedAt: d.timestamp(),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d
      .timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("api_key_hash_idx").on(t.keyHash),
    index("api_key_user_id_idx").on(t.userId),
    index("api_key_revoked_at_idx").on(t.revokedAt),
  ],
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    id: d
      .text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()), // Matched DB: text
    identifier: d.varchar({ length: 255 }).notNull(),
    value: d.text().notNull(),
    expiresAt: d.timestamp().notNull(),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d
      .timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("verification_token_identifier_idx").on(t.identifier)],
);

export const ssoProviders = createTable(
  "sso_provider",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    providerId: d.varchar({ length: 255 }).notNull().unique(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    redirectURI: d.varchar({ length: 255 }).notNull().default(""), // Added detailed fields
    oidcConfig: d.text(),
    samlConfig: d.text(),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d
      .timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("sso_provider_user_id_idx").on(t.userId)],
);

// Invoicing app tables
export const clients = createTable(
  "client",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    email: d.varchar({ length: 255 }),
    phone: d.varchar({ length: 50 }),
    addressLine1: d.varchar({ length: 255 }),
    addressLine2: d.varchar({ length: 255 }),
    city: d.varchar({ length: 100 }),
    state: d.varchar({ length: 50 }),
    postalCode: d.varchar({ length: 20 }),
    country: d.varchar({ length: 100 }),
    defaultHourlyRate: d.real(),
    currency: d.varchar({ length: 3 }).default("USD").notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("client_created_by_idx").on(t.createdById),
    index("client_name_idx").on(t.name),
    index("client_email_idx").on(t.email),
  ],
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clients.createdById],
    references: [users.id],
  }),
  invoices: many(invoices),
  timeEntries: many(timeEntries),
}));

export const businesses = createTable(
  "business",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    nickname: d.varchar({ length: 255 }),
    email: d.varchar({ length: 255 }),
    phone: d.varchar({ length: 50 }),
    addressLine1: d.varchar({ length: 255 }),
    addressLine2: d.varchar({ length: 255 }),
    city: d.varchar({ length: 100 }),
    state: d.varchar({ length: 50 }),
    postalCode: d.varchar({ length: 20 }),
    country: d.varchar({ length: 100 }),
    website: d.varchar({ length: 255 }),
    taxId: d.varchar({ length: 100 }),
    logoUrl: d.varchar({ length: 500 }),
    isDefault: d.boolean().default(false),
    // Email configuration for custom Resend setup
    resendApiKey: d.varchar({ length: 255 }),
    resendDomain: d.varchar({ length: 255 }),
    emailFromName: d.varchar({ length: 255 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("business_created_by_idx").on(t.createdById),
    index("business_name_idx").on(t.name),
    index("business_nickname_idx").on(t.nickname),
    index("business_email_idx").on(t.email),
    index("business_is_default_idx").on(t.isDefault),
  ],
);

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [businesses.createdById],
    references: [users.id],
  }),
  invoices: many(invoices),
}));

export const invoices = createTable(
  "invoice",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceNumber: d.varchar({ length: 100 }).notNull(),
    invoicePrefix: d.varchar({ length: 20 }).default("#"),
    businessId: d.varchar({ length: 255 }).references(() => businesses.id),
    clientId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => clients.id),
    issueDate: d.timestamp().notNull(),
    dueDate: d.timestamp().notNull(),
    status: d.varchar({ length: 50 }).notNull().default("draft"), // draft, sent, paid (overdue computed)
    totalAmount: d.real().notNull().default(0),
    taxRate: d.real().notNull().default(0.0),
    notes: d.varchar({ length: 1000 }),
    emailMessage: d.varchar({ length: 2000 }),
    currency: d.varchar({ length: 3 }).default("USD").notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    publicToken: d.varchar({ length: 255 }).unique(),
    publicTokenExpiresAt: d.timestamp(),
    lastReminderSentAt: d.timestamp(),
    sendReminderAt: d.timestamp(),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("invoice_business_id_idx").on(t.businessId),
    index("invoice_client_id_idx").on(t.clientId),
    index("invoice_created_by_idx").on(t.createdById),
    index("invoice_number_idx").on(t.invoiceNumber),
    index("invoice_status_idx").on(t.status),
    index("invoice_public_token_idx").on(t.publicToken),
  ],
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [invoices.createdById],
    references: [users.id],
  }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
}));

export const invoiceItems = createTable(
  "invoice_item",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    date: d.timestamp().notNull(),
    description: d.varchar({ length: 500 }).notNull(),
    hours: d.real().notNull(),
    rate: d.real().notNull(),
    amount: d.real().notNull(),
    position: d.integer().notNull().default(0), // NEW: position for ordering
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("invoice_item_invoice_id_idx").on(t.invoiceId),
    index("invoice_item_date_idx").on(t.date),
    index("invoice_item_position_idx").on(t.position), // NEW: index for position
  ],
);

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const expenses = createTable(
  "expense",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: d.varchar({ length: 255 }).references(() => businesses.id),
    clientId: d.varchar({ length: 255 }).references(() => clients.id),
    invoiceId: d
      .varchar({ length: 255 })
      .references(() => invoices.id, { onDelete: "set null" }),
    date: d.timestamp().notNull(),
    description: d.varchar({ length: 500 }).notNull(),
    amount: d.real().notNull(),
    currency: d.varchar({ length: 3 }).default("USD").notNull(),
    category: d.varchar({ length: 100 }),
    billable: d.boolean().default(false).notNull(),
    reimbursable: d.boolean().default(false).notNull(),
    taxDeductible: d.boolean().default(false).notNull(),
    notes: d.varchar({ length: 500 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("expense_created_by_idx").on(t.createdById),
    index("expense_client_id_idx").on(t.clientId),
    index("expense_invoice_id_idx").on(t.invoiceId),
    index("expense_date_idx").on(t.date),
    index("expense_billable_idx").on(t.billable),
  ],
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  business: one(businesses, {
    fields: [expenses.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [expenses.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [expenses.invoiceId],
    references: [invoices.id],
  }),
  createdBy: one(users, {
    fields: [expenses.createdById],
    references: [users.id],
  }),
}));

export const invoiceTemplates = createTable(
  "invoice_template",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    type: d.varchar({ length: 50 }).notNull().default("notes"), // "notes" | "terms"
    content: d.text().notNull(),
    isDefault: d.boolean().default(false).notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("invoice_template_created_by_idx").on(t.createdById),
    index("invoice_template_type_idx").on(t.type),
  ],
);

export const invoiceTemplatesRelations = relations(
  invoiceTemplates,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [invoiceTemplates.createdById],
      references: [users.id],
    }),
  }),
);

// ─── Invoice Payments ────────────────────────────────────────────────────────

export const invoicePayments = createTable(
  "invoice_payment",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: d.real().notNull(),
    currency: d.varchar({ length: 3 }).default("USD").notNull(),
    date: d.timestamp().notNull(),
    method: d
      .varchar({ length: 50 })
      .notNull()
      .default("other"), // cash | check | bank_transfer | credit_card | paypal | other
    notes: d.varchar({ length: 500 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("invoice_payment_invoice_id_idx").on(t.invoiceId),
    index("invoice_payment_created_by_idx").on(t.createdById),
  ],
);

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
  createdBy: one(users, {
    fields: [invoicePayments.createdById],
    references: [users.id],
  }),
}));

// ─── Recurring Invoices ───────────────────────────────────────────────────────

export const recurringInvoices = createTable(
  "recurring_invoice",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    clientId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => clients.id),
    businessId: d.varchar({ length: 255 }).references(() => businesses.id),
    schedule: d.varchar({ length: 20 }).notNull().default("monthly"), // weekly | biweekly | monthly | quarterly | yearly
    status: d.varchar({ length: 20 }).notNull().default("active"), // active | paused
    invoicePrefix: d.varchar({ length: 20 }).default("#"),
    taxRate: d.real().notNull().default(0),
    currency: d.varchar({ length: 3 }).default("USD").notNull(),
    notes: d.varchar({ length: 1000 }),
    emailMessage: d.varchar({ length: 2000 }),
    nextDueAt: d.timestamp().notNull(),
    lastGeneratedAt: d.timestamp(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("recurring_invoice_created_by_idx").on(t.createdById),
    index("recurring_invoice_client_id_idx").on(t.clientId),
    index("recurring_invoice_status_idx").on(t.status),
    index("recurring_invoice_next_due_idx").on(t.nextDueAt),
  ],
);

export const recurringInvoicesRelations = relations(
  recurringInvoices,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [recurringInvoices.clientId],
      references: [clients.id],
    }),
    business: one(businesses, {
      fields: [recurringInvoices.businessId],
      references: [businesses.id],
    }),
    createdBy: one(users, {
      fields: [recurringInvoices.createdById],
      references: [users.id],
    }),
    items: many(recurringInvoiceItems),
  }),
);

export const recurringInvoiceItems = createTable(
  "recurring_invoice_item",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recurringInvoiceId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => recurringInvoices.id, { onDelete: "cascade" }),
    description: d.varchar({ length: 500 }).notNull(),
    hours: d.real().notNull(),
    rate: d.real().notNull(),
    position: d.integer().notNull().default(0),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("recurring_invoice_item_recurring_id_idx").on(t.recurringInvoiceId),
  ],
);

export const recurringInvoiceItemsRelations = relations(
  recurringInvoiceItems,
  ({ one }) => ({
    recurringInvoice: one(recurringInvoices, {
      fields: [recurringInvoiceItems.recurringInvoiceId],
      references: [recurringInvoices.id],
    }),
  }),
);

// ─── Time Entries ─────────────────────────────────────────────────────────────

export const timeEntries = createTable(
  "time_entry",
  (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    description: d.varchar({ length: 500 }).notNull().default(""),
    clientId: d
      .varchar({ length: 255 })
      .references(() => clients.id, { onDelete: "set null" }),
    invoiceId: d
      .varchar({ length: 255 })
      .references(() => invoices.id, { onDelete: "set null" }),
    startedAt: d.timestamp().notNull(),
    endedAt: d.timestamp(), // null = currently running
    hours: d.real(), // stored when stopped
    rate: d.real(),
    notes: d.varchar({ length: 500 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("time_entry_created_by_idx").on(t.createdById),
    index("time_entry_client_id_idx").on(t.clientId),
    index("time_entry_started_at_idx").on(t.startedAt),
    index("time_entry_ended_at_idx").on(t.endedAt),
    uniqueIndex("time_entry_one_running_per_user_idx")
      .on(t.createdById)
      .where(sql`${t.endedAt} is null`),
  ],
);

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [timeEntries.invoiceId],
    references: [invoices.id],
  }),
  createdBy: one(users, {
    fields: [timeEntries.createdById],
    references: [users.id],
  }),
}));
