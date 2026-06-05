import { clientsRouter } from "~/server/api/routers/clients";
import { businessesRouter } from "~/server/api/routers/businesses";
import { invoicesRouter } from "~/server/api/routers/invoices";
import { settingsRouter } from "~/server/api/routers/settings";
import { emailRouter } from "~/server/api/routers/email";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { expensesRouter } from "~/server/api/routers/expenses";
import { invoiceTemplatesRouter } from "~/server/api/routers/invoiceTemplates";
import { paymentsRouter } from "~/server/api/routers/payments";
import { recurringInvoicesRouter } from "~/server/api/routers/recurring-invoices";
import { apiKeysRouter } from "~/server/api/routers/apiKeys";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  businesses: businessesRouter,
  invoices: invoicesRouter,
  settings: settingsRouter,
  email: emailRouter,
  dashboard: dashboardRouter,
  expenses: expensesRouter,
  invoiceTemplates: invoiceTemplatesRouter,
  payments: paymentsRouter,
  recurringInvoices: recurringInvoicesRouter,
  apiKeys: apiKeysRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.clients.getAll();
 *       ^? Client[]
 */
export const createCaller = createCallerFactory(appRouter);
