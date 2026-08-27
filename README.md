# SLIMS (School Lab & Inventory Management System)

**SLIMS** is a comprehensive, state-of-the-art **School Network Equipment & Lab Facility Management System**. Built with Next.js, Prisma ORM, and PostgreSQL, it is designed to streamline the tracking of network hardware assets, manage borrowing requests, log equipment maintenance/incidents, and facilitate stock opname audits.

---

## 🚀 Key Features

*   **📊 Interactive Dashboard**: A premium dashboard with real-time overview metrics, charts, recent activities, and pending tasks.
*   **📦 Asset & Inventory Tracking**: Complete database of equipment (routers, switches, servers, access points) with detailed specifications, status (Available, Borrowed, Under Maintenance, etc.), conditions, and **dynamic QR Code generation** for physical asset tags.
*   **🔑 Role-Based Access Control (RBAC)**: Distinct permissions and views for **Administrators**, **Teachers (Technicians)**, and **Students** secured with Auth.js (Next-Auth).
*   **🤝 Loan & Borrowing System**: End-to-end borrowing workflow from student request to admin/teacher approval, return condition tracking, and automatic device status updates.
*   **⚠️ Incident Reporting & Verification**: Quick report logging for broken, lost, or misplaced equipment with severity tiers, photo attachment capability, and admin/technician verification.
*   **🛠️ Maintenance Management**: Technician assignment, diagnostic logging, cost tracking, repair logs, and equipment restoration workflows.
*   **📋 Stock Opname**: Scheduled inventory audits by location and category with live reconciliation interfaces.
*   **📝 Audit Logs**: Automatically records administrative actions (who, what, when, previous vs new values) for total system accountability.
*   **📥 CSV/Excel Data Utility**: Export reports and import bulk inventory lists using built-in CSV parsing and Excel generators.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **ORM**: [Prisma ORM](https://www.prisma.io/)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Authentication**: [Auth.js v5 (Next-Auth)](https://authjs.dev/)
*   **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/) (Icons)
*   **State & Table Utilities**: [@tanstack/react-query](https://tanstack.com/query/latest) (React Query), [@tanstack/react-table](https://tanstack.com/table/latest) (React Table)
*   **Charts**: [Recharts](https://recharts.org/)
*   **Utilities**: `exceljs` (Excel report generation), `papaparse` (CSV processing), `qrcode` (QR tag generator), `bcryptjs` (password hashing), `zod` (runtime schema validation)

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router Pages
│   ├── (auth)/           # Login page
│   ├── (dashboard)/      # Main application modules
│   │   ├── dashboard/    # Main dashboard interface
│   │   ├── inventory/    # Devices & category list
│   │   ├── loans/        # Loan requests workflow
│   │   ├── incidents/    # Damaged/missing logs
│   │   ├── maintenance/  # Device repair records
│   │   ├── stock-opname/ # Audit count sessions
│   │   ├── users/        # User management (Admin only)
│   │   ├── audit-logs/   # System trace audit trail
│   │   └── settings/     # App configurations
│   └── api/              # API Route Handlers (Auth API endpoints)
├── components/           # Reusable UI & Layout components
├── lib/                  # Shared utilities (validators, prisma client, auth config)
├── prisma/               # Prisma database schema & seed scripts
│   ├── schema.prisma     # PostgreSQL data model definitions
│   └── seed.ts           # Initial master data & default admin seeder
├── public/               # Static assets (images, icons)
├── package.json          # Project dependencies & scripts
└── tsconfig.json         # TypeScript configuration
```

---

## ⚙️ Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v20.x LTS or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) database running on port `5432`

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/slims.git
cd slims
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
# PostgreSQL connection string
DATABASE_URL="postgresql://db_user:db_password@localhost:5432/slims?schema=public"

# Auth.js secret key (can generate with: openssl rand -base64 32)
AUTH_SECRET="your-32-character-secret-key"

# Canonical URL of the application
AUTH_URL="http://localhost:3000/api/auth"

# Trust host header behind proxies (set to true)
AUTH_TRUST_HOST=true
```

### 4. Setup Database & Seed Master Data
Synchronize the PostgreSQL database with the Prisma schema and populate the initial administrator account, categories, and locations:
```bash
# Push schema structure to database
npx prisma db push

# Seed default admin and master data
npx tsx prisma/seed.ts
```

---

## 🚀 Running the Application

### Development Server
Run the application in development mode with hot reloading:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Production Build
Compile the application into optimized static assets and server code:
```bash
# Build the production bundle
npm run build

# Start the built production server
npm run start
```

### Formatting & Linting
Check code quality and compliance with:
```bash
npm run lint
```

---

## 🔑 Default Administrator Credentials
Once seeded, you can log in to the application using the default credentials:
*   **Email**: `admin@slims.edu` (or Username: `admin`)
*   **Password**: `admin123`
