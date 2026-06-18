![beenvoice Logo](public/beenvoice-logo.png)

# beenvoice — Invoicing Made Simple

Modern invoicing for freelancers and small businesses: clients, businesses, invoices, time tracking, expenses, recurring billing, PDF/email delivery, and optional SSO.

**Architecture (dense):** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)  
**Mobile companion:** [../beenvoice-app/README.md](../beenvoice-app/README.md)

## Stack at a glance

| Layer | Tech |
|-------|------|
| App | Next.js 16 App Router, React 19 |
| API | tRPC 11 + SuperJSON |
| DB | PostgreSQL, Drizzle ORM |
| Auth | better-auth (email/password, Authentik OIDC, Expo mobile) |
| UI | shadcn/ui, Tailwind v4 |
| Email / PDF | Resend, @react-pdf/renderer |
| Package manager | Bun |

## Features

- **🔐 Authentication** — better-auth: email/password, password reset, optional Authentik OIDC, Expo mobile sessions
- **⏱ Time clock** — running timer, one per user; clock-out can append invoice line items
- **🤖 MCP API** — `/api/mcp` for automation via API keys (`bv_…`)
- **👥 Client Management** - Create, edit, and manage client information
- **🏢 Business Profiles** - Manage your business details, logo, and email settings
- **📄 Professional Invoices** - Generate detailed invoices with line items
- **📅 Timesheet View** - Calendar-based time entry with month and week views
- **📧 Email Delivery** - Send invoices via email using Resend
- **📥 PDF Export** - Download invoices as professional PDFs
- **📊 CSV Import** - Bulk import invoice data from CSV files
- **💰 Flexible Pricing** - Set custom rates and calculate totals automatically
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **🎨 Modern UI** - Clean, professional interface built with shadcn/ui
- **⚡ Type-Safe** - Full TypeScript support with tRPC for API calls
- **💾 PostgreSQL Database** - Robust relational database with Drizzle ORM

## 🚀 Tech Stack

- **Frontend**: Next.js 16 with App Router
- **Backend**: tRPC for type-safe API calls
- **Database**: Drizzle ORM with PostgreSQL
- **Authentication**: better-auth with email/password and Authentik OIDC SSO
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **Email**: Resend for transactional email delivery
- **PDF**: @react-pdf/renderer for invoice PDF generation
- **Package Manager**: Bun

## 📦 Installation

### Prerequisites

- Node.js 18+ or Bun
- Docker & Docker Compose (for local PostgreSQL)
- Git

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/beenvoice.git
   cd beenvoice
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your configuration:

   ```env
   # Database
   DATABASE_URL="postgresql://postgres:password@localhost:5432/beenvoice"
   DB_DISABLE_SSL="true"

   # Authentication
   AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"

   # Application
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NODE_ENV="development"

   # Email (optional for local dev)
   RESEND_API_KEY="your-resend-api-key"
   RESEND_DOMAIN="yourdomain.com"
   ```

4. **Start the development database**

   ```bash
   docker compose -f docker-compose.dev.yml up -d db
   ```

5. **Push the database schema**

   ```bash
   bun run db:push
   ```

6. **Start the development server**

   ```bash
   bun run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project structure

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for routers, schema, auth, and MCP.

```
beenvoice/
├── src/app/           # Pages + /api (auth, trpc, mcp, cron, public PDF)
├── src/server/api/    # tRPC routers
├── src/server/db/     # Drizzle schema + pool
├── src/components/    # UI + domain components
├── src/lib/           # auth, PDF, email, branding
├── drizzle/           # SQL migrations
└── docs/              # Architecture + UI guides
```

## 🎯 Usage

### Getting Started

1. **Register an Account**
   - Visit the sign-up page
   - Enter your name, email, and password

2. **Set Up Your Business**
   - Navigate to Business Settings
   - Add your business name, contact info, and logo
   - Configure email settings for invoice delivery (Resend API key + domain)

3. **Add Your First Client**
   - Navigate to the Clients page
   - Click "Add New Client"
   - Fill in client details (name, email, phone, address)

4. **Create an Invoice**
   - Go to the Invoices page
   - Click "Create New Invoice"
   - Select a client and optionally a business profile
   - Add line items with descriptions, dates, hours, and rates
   - Use the Timesheet tab for calendar-based time entry
   - Save and send or download as PDF

### Features Overview

#### Client Management

- Create and edit client profiles
- Store contact information and addresses
- Set default hourly rates per client
- Search and filter client list

#### Invoice Creation

- Select from existing clients and business profiles
- Add multiple line items with drag-and-drop reordering
- Set custom rates per item
- Automatic total calculations with configurable tax rate
- Timesheet calendar view for date-based time tracking
- Professional invoice formatting

#### Invoice Delivery

- Send invoices via email directly from the app
- Rich text email composer with preview
- Resend and re-deliver sent invoices
- Track invoice status: Draft → Sent → Paid (+ Overdue)

#### User Interface

- Clean, modern design
- Fully responsive — desktop, tablet, and mobile
- Intuitive navigation with breadcrumbs
- Toast notifications for feedback
- Dark mode support

## 🔧 Development

### Available Scripts

```bash
# Development
bun run dev          # Start development server (Turbo)
bun run build        # Build for production
bun run start        # Start production server

# Database
bun run db:push      # Push schema changes to database
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
bun run db:generate  # Generate new migration

# Docker
bun run docker:up    # Start deployment compose stack
bun run docker:dev:up # Start development compose stack with exposed PostgreSQL
bun run docker:down  # Stop Docker services

# Code Quality
bun run lint         # Run ESLint
bun run lint:fix     # Fix ESLint issues
bun run format:write # Format code with Prettier
bun run typecheck    # Run TypeScript type checking
```

### Docker Compose

Use the base compose file for deployment. It keeps PostgreSQL internal to the
compose network:

```bash
docker compose up -d
```

For local development, use the dev compose file to expose PostgreSQL on
`${POSTGRES_PORT:-5432}`:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Set `DISABLE_SIGNUPS=true` to block new email/password account registration.

### Database Schema

The application uses the following core tables:

- **users** - User accounts and authentication
- **sessions** - Active user sessions
- **clients** - Client information and contact details
- **businesses** - Business profiles with email/logo settings
- **invoices** - Invoice headers with client and business relationships
- **invoice_items** - Individual line items with pricing and position ordering

### API surface

- **tRPC** — `/api/trpc` — primary API for web and mobile (session cookies)
- **MCP** — `/api/mcp` — JSON-RPC tools for integrations (API key only)
- **REST auth** — `/api/auth/register`, forgot/reset password (mobile + custom flows)
- **Public** — `/i/[token]`, `/api/i/[token]/pdf`

All business logic lives in `src/server/api/routers/`. Input validation via Zod.

## 🎨 Customization

### Styling

The app uses Tailwind CSS v4 with a custom design system:

- **Primary Color**: Green (#16a34a)
- **Font**: Geist for professional typography
- **Components**: shadcn/ui component library
- **Spacing**: 4px grid system

### Branding

Update the logo and colors in:

- `src/components/logo.tsx` - Main logo component
- `src/styles/globals.css` - Color variables
- `src/app/layout.tsx` - Font configuration

## 🚀 Deployment

You can deploy this application to any platform that supports Next.js and PostgreSQL (Docker, Coolify, Railway, etc.).

1. **Build the application:**

   ```bash
   bun run build
   ```

2. **Set up production environment variables** (see `.env.local` example above, adjusting URLs and secrets for production)

3. **Run database migrations:**

   ```bash
   bun run db:push
   ```

4. **Start the server:**
   ```bash
   bun start
   ```

### Environment Variables

Required for production:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
AUTH_SECRET="your-long-random-secret"
BETTER_AUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"

# Email (required for invoice sending)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_DOMAIN="yourdomain.com"

# Optional: Authentik SSO
AUTHENTIK_ISSUER="https://your-authentik-instance/application/o/beenvoice/"
AUTHENTIK_CLIENT_ID="your-client-id"
AUTHENTIK_CLIENT_SECRET="your-client-secret"
```

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- **Coolify**: Deploy with Docker Compose support
- **Railway**: Connect your GitHub repository (includes managed PostgreSQL)
- **DigitalOcean App Platform**: Deploy with automatic scaling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use shadcn/ui components for consistency
- Implement proper error handling
- Follow the existing code style (Prettier + ESLint configs provided)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [T3 Stack](https://create.t3.gg/) for the excellent development stack
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [better-auth](https://www.better-auth.com/) for modern authentication
- [Drizzle ORM](https://orm.drizzle.team/) for database management
- [Resend](https://resend.com/) for reliable email delivery

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/beenvoice/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/beenvoice/discussions)

---

Built for freelancers and small businesses who deserve better invoicing tools.
