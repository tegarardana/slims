# SLIMS (School Lab & Inventory Management System)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)

**SLIMS** is a comprehensive, modern **School Network Equipment & Lab Facility Management System**. Built with Next.js App Router, Prisma ORM, and PostgreSQL, it is designed to streamline tracking hardware assets, managing equipment borrowing requests, logging maintenance/incidents, and conducting stock opname audits.

---

## 🚀 Key Features

* **📊 Interactive Analytics Dashboard**: Real-time overview metrics, charts, recent activities, and pending task indicators.
* **📦 Asset & Inventory Tracking**: Complete catalog for network devices (routers, switches, access points, servers) with detailed hardware specifications, conditions, and **dynamic QR Code generation** for physical asset tagging.
* **🔑 Role-Based Access Control (RBAC)**: Secure authentication and granular permissions for **Administrators**, **Teachers (Technicians)**, and **Students** powered by Auth.js (Next-Auth).
* **🤝 Equipment Loan Workflow**: End-to-end borrowing lifecycle from request submission to approval, handover, return condition inspection, and automatic device state updates.
* **⚠️ Incident Reporting & Verification**: Fast logging for broken, damaged, or lost equipment with severity classifications, photo attachments, and admin/technician verification.
* **🛠️ Maintenance & Repair Tracking**: Diagnostic logging, technician assignment, repair cost tracking, and restoration workflows.
* **📋 Stock Opname Audit**: Scheduled inventory reconciliation by location and category with live scan reconciliation.
* **📝 Audit Logs**: Automatically tracks critical administrative actions (who, what, when, previous vs new values) for system accountability.
* **📥 CSV & Excel Data Utilities**: Export reports and import bulk users/inventory with CSV parser and Excel generator.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
* **Authentication**: [Auth.js v5 (Next-Auth)](https://authjs.dev/)
* **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
* **Data Grid & State**: [@tanstack/react-table](https://tanstack.com/table/latest), [@tanstack/react-query](https://tanstack.com/query/latest)
* **Charts**: [Recharts](https://recharts.org/)
* **Utilities**: `exceljs`, `papaparse`, `qrcode`, `bcryptjs`, `zod`, `lru-cache`

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router
│   ├── (auth)/           # Authentication (Login)
│   ├── (dashboard)/      # Protected dashboard modules
│   │   ├── dashboard/    # Analytics overview
│   │   ├── inventory/    # Devices & category catalog
│   │   ├── loans/        # Loan & return management
│   │   ├── incidents/    # Damaged/missing item reports
│   │   ├── maintenance/  # Repair records & service logs
│   │   ├── stock-opname/ # Physical audit counting
│   │   ├── users/        # User management & bulk imports
│   │   ├── audit-logs/   # Immutable system audit trail
│   │   ├── reports/      # Reporting & data export
│   │   └── settings/     # System preferences & configs
│   └── api/              # API Route Handlers (REST endpoints)
├── components/           # Reusable UI & layout components
├── lib/                  # State machines, validators, auth & prisma client
├── prisma/               # Schema definitions, migrations & database seeders
├── public/               # Static assets & favicons
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

---

## ⚙️ Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v20.x LTS or higher)
* [PostgreSQL](https://www.postgresql.org/) (v14+ running locally or cloud)

### 1. Clone the Repository
```bash
git clone https://github.com/tegarardana/slims.git
cd slims
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your database credentials and secret key:
```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/slims?schema=public"

# Auth.js secret key (generate using: openssl rand -base64 32)
AUTH_SECRET="your-secure-random-32-char-string-here"

# Application URL
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true

# Default password for seed admin
SEED_ADMIN_PASSWORD="YourSecureAdminPassword123!"
```

### 4. Setup Database & Seed Initial Data
Push the Prisma schema to your PostgreSQL database and run the seeder:
```bash
# Push schema structure to database
npx prisma db push

# (Optional) Seed default admin and sample master data
npx tsx prisma/seed.ts
```

---

## 🚀 Running the Application

### Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Production Build
```bash
# Build the production bundle
npm run build

# Start the production server
npm run start
```

### Linting
```bash
npm run lint
```

---

## 🔑 Default Administrator Credentials
After running the seeder script, log in with:
* **Username / Email**: `admin@slims.edu` (or `admin`)
* **Password**: *Password configured in `SEED_ADMIN_PASSWORD` (default: `Admin@123!` or `admin123`)*

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
