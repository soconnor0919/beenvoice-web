# beenvoice - AI Assistant Rules

> **Canonical architecture reference:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (stack, routers, schema, auth). This file may lag behind; prefer ARCHITECTURE.md for facts.

## Project Overview
beenvoice-web is the web app and API for beenvoice — Next.js 16, tRPC 11, Drizzle/PostgreSQL, better-auth, and shadcn/ui. Reliability, security, and professional UX are paramount.

**Repository:** [git.soconnor.dev/soconnor/beenvoice-web](https://git.soconnor.dev/soconnor/beenvoice-web)

## Core Development Principles

### 1. Business-First Approach
- **Priority**: Reliability and security over flashy features
- **User Experience**: Professional, clean, and intuitive interface
- **Data Integrity**: Always validate and sanitize user input
- **Error Handling**: Graceful degradation with clear user feedback

### 2. Type Safety & Code Quality
- **TypeScript**: Use strict TypeScript for all new code
- **tRPC**: All API calls must go through tRPC for type safety
- **Validation**: Use Zod schemas for all input validation
- **Error Boundaries**: Implement proper error handling at all levels

## Tech Stack Guidelines

### Frontend (Next.js 16 + App Router)
- Use App Router patterns consistently
- Implement proper loading states and error boundaries
- Use React Server Components where appropriate

### Backend (tRPC + Drizzle)
- All business logic goes through tRPC routers
- Use Drizzle ORM for all database operations
- Implement proper transactions for multi-table operations
- Follow existing router patterns in `src/server/api/routers/`

### Database (PostgreSQL)
- Use Drizzle migrations in `drizzle/`; journal must stay in sync (`drizzle/meta/_journal.json`)
- `db:push` for local iteration; Docker runs `migrate.ts` on startup
- Follow existing schema patterns in `src/server/db/schema.ts`

### Authentication (better-auth)
- Email/password via better-auth + custom `/api/auth/register` REST
- Optional Authentik OIDC (`AUTHENTIK_*`); Expo plugin for mobile
- Route protection via `src/proxy.ts` (session cookie check) and `protectedProcedure`
- `DISABLE_SIGNUPS=true` blocks registration; env booleans parsed in `src/env.js` (not `z.coerce.boolean`)

### Development Tools
- Use ESLint and Prettier for code formatting
- Use TypeScript for type safety
- Exclusively use bun for development and production. Do not use Node.js or Deno.
- Stay away from starting development servers or running builds unless absolutely necessary.
- Run lints and typechecks when helpful.

## Component Architecture

### UI Components (shadcn/ui)
- Use shadcn/ui components as the foundation
- Follow existing component patterns
- Use `cn()` utility for conditional className merging
- Maintain consistent spacing (4px grid system)

### Component Organization
- **Base UI Components**: `src/components/ui/` - Pure, portable shadcn/ui components
- **Project Components**: `src/components/` - Project-specific reusable components
- **Page Components**: `src/app/_components/` - Page-specific components

### UI Component Rules

#### What Belongs in `src/components/ui/` (Portable)
- **Pure shadcn/ui components**: button, input, select, dialog, etc.
- **Generic layout components**: page-layout, card, table
- **Basic form components**: input, textarea, checkbox, switch
- **Navigation components**: breadcrumb, navigation-menu
- **Feedback components**: badge, alert-dialog, toast
- **Data display**: table, skeleton, progress
- **Overlay components**: dialog, sheet, popover, dropdown-menu

#### What Should Move to `src/components/` (Project-Specific)
- **Business logic components**: address-form, status-badge, data-table
- **Domain-specific forms**: client-form, invoice-form, business-form
- **Custom layouts**: page-header, dashboard-breadcrumbs
- **Feature components**: invoice-list, client-list, editable-invoice-items
- **Navigation**: Sidebar, Navbar, navigation
- **Branding**: logo, AddressAutocomplete

#### Immediate Reorganization Needed
**Move from `src/components/ui/` to `src/components/forms/`:**
- `address-form.tsx` - Business-specific address handling
- `file-upload.tsx` - Project-specific file upload logic

**Move from `src/components/ui/` to `src/components/data/`:**
- `data-table.tsx` - Enhanced with business logic
- `status-badge.tsx` - Invoice status specific
- `stats-card.tsx` - Dashboard-specific statistics

**Move from `src/components/ui/` to `src/components/layout/`:**
- `page-layout.tsx` - Project-specific layout patterns
- `quick-action-card.tsx` - Dashboard-specific actions
- `floating-action-bar.tsx` - Project-specific floating actions

**Keep in `src/components/ui/` (Portable):**
- `button.tsx`, `input.tsx`, `select.tsx` - Pure shadcn/ui
- `dialog.tsx`, `sheet.tsx`, `popover.tsx` - Generic overlays
- `table.tsx`, `card.tsx`, `badge.tsx` - Base components
- `calendar.tsx`, `date-picker.tsx` - Generic date components
- `dropdown-menu.tsx`, `navigation-menu.tsx` - Generic navigation
- `skeleton.tsx`, `progress.tsx` - Generic loading states

#### Component Design Principles
- **High Reusability**: Components should accept props for customization
- **Composition over Inheritance**: Use children props and render props
- **Default Values**: Provide sensible defaults for all optional props
- **Type Safety**: Use TypeScript interfaces for all props
- **Accessibility**: Include proper ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-first approach with responsive variants

#### Component Props Pattern
```typescript
interface ComponentProps {
  // Required props
  title: string;

  // Optional props with defaults
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";

  // Styling props
  className?: string;

  // Event handlers
  onClick?: () => void;
  onChange?: (value: string) => void;

  // Content
  children?: React.ReactNode;

  // Accessibility
  "aria-label"?: string;
}
```

#### Component Reusability Guidelines
- **Configurable Content**: Use props for text, labels, and content
- **Flexible Styling**: Accept className and style props for customization
- **Variant System**: Use variant props for different visual states
- **Size Variants**: Provide consistent size options (sm, md, lg, xl)
- **Icon Support**: Accept icon props for visual customization
- **Loading States**: Include loading/skeleton variants
- **Error States**: Handle error states gracefully
- **Empty States**: Provide empty state components

#### Component Customization Examples
```typescript
// Good: Highly customizable component
interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  searchKey?: string;
  searchPlaceholder?: string;
  showPagination?: boolean;
  pageSize?: number;
  className?: string;
  emptyState?: React.ReactNode;
  loading?: boolean;
}

// Good: Flexible form component
interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number";
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  onChange?: (value: string) => void;
}
```

#### Component File Structure
```
src/components/
├── ui/                    # Portable base components
│   ├── button.tsx        # Pure shadcn/ui components
│   ├── input.tsx
│   └── ...
├── forms/                # Project-specific forms
│   ├── address-form.tsx
│   ├── client-form.tsx
│   └── invoice-form.tsx
├── layout/               # Layout components
│   ├── page-header.tsx
│   ├── sidebar.tsx
│   └── navbar.tsx
├── data/                 # Data display components
│   ├── data-table.tsx
│   ├── status-badge.tsx
│   └── invoice-list.tsx
├── navigation/           # Navigation components
│   ├── breadcrumbs.tsx
│   └── navigation.tsx
└── branding/             # Brand-specific components
    ├── logo.tsx
    └── address-autocomplete.tsx
```

### Styling Guidelines
- **Primary Color**: Green (#16a34a) for branding
- **Font**: Geist font family for professional typography
- **Tailwind CSS**: Use utility classes consistently
- **Responsive Design**: Mobile-first approach

## Business Logic Patterns

### Invoice Management
- **Invoice Creation**: Multi-step process with validation
- **Line Items**: Flexible pricing with custom rates
- **Status Tracking**: draft → sent → paid/overdue
- **PDF Generation**: Professional invoice formatting

### Client Management
- **Contact Information**: Complete address and contact details
- **Search & Filter**: Efficient client lookup
- **Data Validation**: Proper email and phone validation

### Business Profile
- **Default Business**: One default business per user
- **Logo Support**: Professional branding
- **Tax Information**: Business tax details

## API Development Rules

### tRPC Router Patterns
```typescript
// Follow this pattern for all routers
export const exampleRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ /* validation schema */ }))
    .mutation(async ({ ctx, input }) => {
      // Business logic here
    }),

  list: protectedProcedure
    .input(z.object({ /* pagination/filtering */ }))
    .query(async ({ ctx, input }) => {
      // Query logic here
    }),
});
```

### Error Handling
- Use toast notifications for user feedback
- Implement proper form validation
- Handle API errors gracefully
- Provide clear error messages

### Security
- Always validate user input with Zod
- Check user permissions for all operations
- Sanitize data before database operations
- Use proper authentication checks

## Database Schema Rules

### Table Structure
- **UUID Primary Keys**: Use `crypto.randomUUID()` for all IDs
- **Timestamps**: Include `createdAt` and `updatedAt` fields
- **User Relations**: All business data linked to users
- **Indexes**: Proper indexing for performance

### Migrations
When adding a new migration:
1. Create the SQL file in `drizzle/` following the numbering sequence (e.g. `0011_my_change.sql`)
2. **Always update `drizzle/meta/_journal.json`** to include the new entry — Drizzle's migrate runner uses this file to determine which migrations to apply. If the entry is missing, the migration will be silently skipped on deploy.

The journal entry format:
```json
{
  "idx": 10,
  "version": "7",
  "when": 1780704000000,
  "tag": "0010_my_change",
  "breakpoints": true
}
```
Use a Unix timestamp in milliseconds for `when`, incrementing `idx` by 1 from the previous entry.

Migrations run automatically at container startup via `bun migrate.ts` (see Dockerfile `CMD`). Do not run them manually.

### Relationships
- **Users → Clients**: One-to-many
- **Users → Businesses**: One-to-many
- **Users → Invoices**: One-to-many
- **Clients → Invoices**: One-to-many
- **Businesses → Invoices**: One-to-many
- **Invoices → Invoice Items**: One-to-many

## File Naming Conventions

### Components & Pages
- **Components**: PascalCase (e.g., `ClientList.tsx`)
- **Pages**: kebab-case (e.g., `new-client.tsx`)
- **Layouts**: `layout.tsx` (Next.js convention)
- **API Routes**: `route.ts` (Next.js convention)

### Utilities & Helpers
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase (e.g., `InvoiceStatus`)

## Development Workflow

### Adding New Features
1. **Database Schema**: Update schema with migrations
2. **tRPC Router**: Add procedures with validation
3. **UI Components**: Create components using shadcn/ui
4. **Pages**: Implement pages with proper routing
5. **Testing**: Verify functionality and error handling

### Code Quality
- **ESLint**: Follow existing linting rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking
- **Performance**: Optimize database queries and React components

## Business Logic Specifics

### Invoice Calculations
- **Subtotal**: Sum of all line items
- **Tax**: Apply tax rate to subtotal
- **Total**: Subtotal + tax
- **Currency**: Handle decimal precision properly

### Status Management
- **Draft**: Initial state, editable
- **Sent**: Invoice sent to client
- **Paid**: Payment received
- **Overdue**: Past due date

### Data Validation
- **Email**: Proper email format validation
- **Phone**: International phone number support
- **Address**: Complete address validation
- **Currency**: Proper decimal handling

## Performance Guidelines

### Database Optimization
- Use proper indexes for frequently queried fields
- Implement pagination for large datasets
- Use transactions for data consistency
- Optimize query patterns

### Frontend Performance
- Use React.memo for expensive components
- Implement proper loading states
- Optimize bundle size
- Use Next.js Image component for images

### Caching Strategy
- Use React Query for client-side caching
- Implement proper cache invalidation
- Use Next.js caching where appropriate

## Security Considerations

### Authentication & Authorization
- All routes require proper authentication
- Check user ownership for all operations
- Implement proper session management
- Use secure password hashing

### Data Protection
- Validate all user inputs
- Sanitize data before database operations
- Implement proper error handling
- Use HTTPS in production

### Business Data Security
- User data isolation
- Proper access controls
- Audit trails for sensitive operations
- Secure API endpoints

## Testing & Quality Assurance

### Manual Testing Checklist
- [ ] Authentication flows work correctly
- [ ] Form validation provides clear feedback
- [ ] Responsive design on all screen sizes
- [ ] Database operations handle errors gracefully
- [ ] PDF generation works correctly
- [ ] Navigation and routing function properly

### Code Review Guidelines
- Check for proper error handling
- Verify type safety
- Ensure consistent styling
- Review security implications
- Test business logic accuracy

## Deployment & Production

### Environment Configuration
- Use proper environment variables (see `.env.example` and `src/env.js`)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` must match the public hostname
- Secure database connections; `DB_DISABLE_SSL=true` for compose Postgres

### Database Management
- Use migrations for schema changes
- Backup data regularly
- Monitor database performance
- Handle database errors gracefully

## Common Patterns & Anti-Patterns

### ✅ Do's
- Use tRPC for all API calls
- Implement proper loading states
- Use toast notifications for feedback
- Follow existing component patterns
- Validate all user inputs
- Use proper TypeScript types

### ❌ Don'ts
- Don't use direct fetch calls
- Don't skip input validation
- Don't ignore error handling
- Don't hardcode business logic
- Don't use any types unnecessarily
- Don't skip proper authentication checks

## Emergency Procedures

### Critical Issues
- **Data Loss**: Immediate database backup
- **Security Breach**: Rotate all secrets
- **Performance Issues**: Database query optimization
- **User Complaints**: Prioritize user experience fixes

### Rollback Strategy
- Keep database migrations reversible
- Maintain version control for all changes
- Test rollback procedures regularly
- Document emergency procedures

## Remember
This is a business application where reliability, security, and professional user experience are critical. Every decision should prioritize these values over development convenience or flashy features.

- Don't create demo pages unless absolutely necessary.
- Don't create unnecessary complexity.
- Don't run builds unless absolutely necessary, if you do, kill the dev servers.
- Don't start new dev servers unless asked.
- Don't start drizzle studio- you cannot do anything with it.
