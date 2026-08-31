# SLIMS (School Lab & Inventory Management System)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)

SLIMS is a web-based inventory and laboratory management system designed for schools and vocational institutions. It handles hardware asset tracking, student/staff equipment loans, incident and repair logging, role-based access control, and periodic physical stock audits.

---

## Core Features

- **Asset and Inventory Management**: Track network hardware, lab computers, tools, and accessories with serial numbers, technical specifications, room assignments, and generated QR codes for physical tagging.
- **Loan and Return Workflow**: Multi-step borrowing flow covering requests, approvals, condition checks during handover, and return verifications.
- **Incident Reporting and Maintenance**: Submit reports for damaged or lost equipment with photo evidence, assign technicians, track repair costs, and update device statuses.
- **Stock Opname (Audits)**: Conduct scheduled inventory reconciliations per room or category using manual or QR scan verification.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Administrators, Teachers/Technicians, and Students using Auth.js session handling.
- **Audit Logs**: Record system changes and administrative actions for traceability.
- **Data Export and Import**: Bulk import user accounts and inventory records via CSV; export inventory and audit reports to Excel.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js (App Router, React 19) |
| Language | TypeScript |
| Database & ORM | PostgreSQL with Prisma ORM |
| Authentication | Auth.js (NextAuth v5) |
| UI & Styling | Tailwind CSS v4, Radix/Base UI, Lucide Icons |
| Data Tables & Charts | TanStack Table, Recharts |
| Utilities | ExcelJS, PapaParse, QRCode, Zod, bcryptjs |

---

## Directory Structure

```text
app/
├── (auth)/             # Login and authentication routes
├── (dashboard)/        # Main application dashboard
│   ├── dashboard/      # Overview metrics and recent activity
│   ├── inventory/      # Hardware items, categories, and QR codes
│   ├── loans/          # Borrowing requests and return workflows
│   ├── incidents/      # Damage and loss reports
│   ├── maintenance/    # Repair assignments and service history
│   ├── stock-opname/   # Physical audit sessions and reconciliation
│   ├── users/          # User management and bulk upload
│   ├── audit-logs/     # System activity logs
│   ├── reports/        # Data export tools
│   └── settings/       # System preferences
└── api/                # API route handlers
components/             # UI primitives and shared components
lib/                    # Auth configuration, database client, validation schemas, and helpers
prisma/                 # Database schema, migrations, and seed scripts
public/                 # Static assets
```

---

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or pnpm / yarn
- A running PostgreSQL instance (local or remote)

### 1. Clone the repository

```bash
git clone https://github.com/tegarardana/slims.git
cd slims
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Open `.env` and fill in your database connection string and secrets:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/slims?schema=public"

# Auth secret key (can be generated using `openssl rand -base64 32`)
AUTH_SECRET="your-random-32-character-secret"

# Application URL
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true

# Initial administrator password for seeding
SEED_ADMIN_PASSWORD="YourSecureAdminPassword123!"
```

### 4. Initialize database and seed data

Sync the schema to your database and run the seeder:

```bash
# Push schema to PostgreSQL
npx prisma db push

# Seed initial admin user and sample data
npx tsx prisma/seed.ts
```

### 5. Start the development server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

- `npm run dev` - Starts the Next.js development server.
- `npm run build` - Builds the application for production.
- `npm run start` - Runs the production build.
- `npm run lint` - Runs ESLint to check for code quality and style issues.

---

## Initial Credentials

After running `npx tsx prisma/seed.ts`, you can sign in with the default admin account:

- **Email / Username**: `admin@slims.edu` or `admin`
- **Password**: The value configured in `SEED_ADMIN_PASSWORD` in your `.env` file.

---

## License

This project is licensed under the [MIT License](LICENSE).
