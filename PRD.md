# Technical PRD — School Network Equipment Inventory Management System
### (Detailed Build Specification for AI Agentic Coding — Google Antigravity)

**Version:** 2.0 (Technical Expansion of PRD v1.0)
**Status:** Ready for Implementation
**Target Workflow:** Agentic / Vibe Coding via Google Antigravity
**Base Document:** School Network Equipment Inventory Management System — PRD v1.0

---

## 0. Cara Menggunakan Dokumen Ini

Dokumen ini adalah **derivative teknis** dari PRD v1.0 (functional source of truth tetap PRD v1.0). Tujuannya adalah menerjemahkan requirement fungsional menjadi spesifikasi yang **cukup presisi untuk dieksekusi oleh coding agent** (Antigravity) tanpa perlu banyak clarifying question, sambil tetap menyisakan ruang keputusan implementasi wajar (arsitektur detail, naming, dsb).

Struktur dokumen:

1. Tech stack & arsitektur (fixed, agar agent tidak berpindah-pindah stack antar task).
2. Data model lengkap (entity, field, tipe, relasi, constraint).
3. State machine (Status, Condition, Loan, Incident, Maintenance, Stock Opname).
4. API contract per modul (REST, request/response shape).
5. Halaman & komponen UI per modul, dengan rincian elemen dan interaksi.
6. Permission matrix eksplisit (role × action).
7. Non-functional & validation rules.
8. **Build plan bertahap (phased milestones)** — dirancang agar agent bekerja per-phase, dengan definition of done yang bisa diverifikasi.
9. Prompt/task breakdown yang siap dipakai sebagai instruksi ke Antigravity per phase.

> Catatan untuk agent: Ikuti urutan phase di Bagian 8. Jangan mulai phase berikutnya sebelum Definition of Done phase sebelumnya terpenuhi. Semua keputusan desain visual mengikuti Bagian 7 (UX Principles) dan referensi ManageEngine-style enterprise IT UI.

---

## 1. Tech Stack & Arsitektur

Stack berikut dipilih agar **konsisten, type-safe, dan cepat untuk agentic coding** (minim boilerplate, ekosistem besar, dokumentasi banyak sehingga agent kecil kemungkinan berhalusinasi API).

### 1.1 Application Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 15 (App Router)** + TypeScript | Full-stack dalam satu repo, cocok untuk agent membangun UI + API sekaligus |
| UI Library | **shadcn/ui** + Tailwind CSS | Component headless, mudah dikustom, konsisten dengan prinsip UI operational/enterprise |
| Icon | lucide-react | Konsisten dengan shadcn |
| State/data fetching | **TanStack Query (React Query)** | Cocok untuk table-heavy app dengan pagination/filter/mutation |
| Table | **TanStack Table** | Wajib untuk kebutuhan sorting/filter/pagination/column visibility/row selection (Bagian 48 PRD asli) |
| Form | **React Hook Form** + **Zod** | Validation schema-driven, dipakai bersama di client & server |
| ORM | **Prisma** | Schema-first, migration jelas, cocok untuk agent generate model |
| Database | **PostgreSQL** | Relational, mendukung constraint & referential integrity yang dibutuhkan (unique Asset Tag, dsb) |
| Auth | **Auth.js (NextAuth v5)** dengan Credentials Provider + JWT session | Login dibuat Admin (no self-registration), role-based |
| File storage (photo, attachment, import file) | **Local disk (dev)** → **S3-compatible bucket (prod)**, via abstraction layer `lib/storage.ts` | Agar mudah diganti provider tanpa ubah business logic |
| QR Code | `qrcode` (generate) + `@zxing/browser` atau `html5-qrcode` (scan di browser/mobile) | |
| Import/Export | `exceljs` (xlsx) + `papaparse` (csv) | |
| Charts (dashboard) | **Recharts** | |
| Notification (in-app) | Polling atau **Server-Sent Events**; DB table `notifications` | Email = future enhancement, TIDAK dibangun di MVP |
| Audit log | Middleware Prisma (`$extends`) yang menulis ke tabel `audit_logs` pada setiap create/update/delete pada entity tercatat | |
| Testing | Vitest (unit) + Playwright (E2E untuk flow kritis: loan approval, double-booking prevention) | |
| Deployment target | Vercel (app) + managed Postgres (Neon/Supabase) | Tidak wajib, dapat disesuaikan |

### 1.2 Arsitektur Folder (disarankan)

```text
/app
  /(auth)/login
  /(dashboard)
    /dashboard
    /inventory
      /[deviceId]
      /import
    /loans
      /new
      /[loanId]
    /incidents
      /[incidentId]
    /maintenance
      /[maintenanceId]
    /stock-opname
      /[sessionId]
    /users
      /import
    /categories
    /locations
    /reports
    /audit-log
    /settings
  /api
    /devices
    /loans
    /incidents
    /maintenance
    /stock-opname
    /users
    /categories
    /locations
    /reports
    /notifications
    /audit-log
    /auth
/components
  /ui            (shadcn primitives)
  /data-table    (reusable TanStack Table wrapper: search, filter, pagination, column visibility, bulk toolbar)
  /forms
  /dashboard
  /qr
/lib
  /auth.ts
  /permissions.ts     (role & capability matrix, single source of truth)
  /prisma.ts
  /storage.ts
  /audit.ts
  /availability.ts    (derived-field logic: device availability)
  /validators          (Zod schemas, shared client+server)
/prisma
  /schema.prisma
  /migrations
/types
```

### 1.3 Prinsip Arsitektur Kunci

- **Availability adalah derived value**, bukan kolom yang di-set manual (lihat Bagian 12 PRD asli & Bagian 3 dokumen ini). Implementasikan sebagai fungsi murni `computeAvailability(device, activeLoans)` yang dipanggil di query layer, **jangan** simpan sebagai boolean column yang bisa stale.
- **Status vs Condition adalah dua field independen** — jangan pernah digabung jadi satu enum.
- **Technician adalah capability, bukan role** — model sebagai `isTechnician: boolean` pada User, terpisah dari `baseRole: enum`.
- **Semua mutasi penting wajib melewati audit middleware** — jangan tulis manual di tiap endpoint; gunakan Prisma middleware/extension terpusat agar tidak ada yang lupa.
- **Loan approval bersifat all-or-nothing per request** (BR-022) — jangan desain skema yang memungkinkan partial approval di MVP.
- **Double-booking prevention** wajib pakai DB-level constraint/transaction (unique partial index: satu device hanya boleh punya 1 baris `loan_items` dengan status `active`/`approved-pending-pickup`), bukan hanya validasi di application layer.

---

## 2. Data Model (Prisma-style Schema Reference)

> Ini adalah referensi field-level. Agent boleh menambahkan field teknis (id, createdAt, updatedAt, dsb) sesuai konvensi Prisma standar, tapi field bisnis di bawah wajib ada.

### 2.1 `User`

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| fullName | String | required |
| email | String | unique, required |
| username | String | unique, optional jika email dipakai sbg login |
| studentOrEmployeeId | String | unique, nullable |
| baseRole | Enum(`STUDENT`,`TEACHER`,`ADMIN`) | required — BR-002 |
| isTechnician | Boolean | default false — capability, BR-003 |
| department | String | nullable |
| contact | String | nullable |
| status | Enum(`ACTIVE`,`INACTIVE`) | default ACTIVE |
| passwordHash | String | required |
| createdAt / updatedAt | DateTime | |

Constraint: hanya Admin yang bisa create user (BR-001). Tidak ada endpoint self-register.

### 2.2 `Category`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| name | String | unique |
| status | Enum(`ACTIVE`,`ARCHIVED`) | default ACTIVE — BR-015 |
| createdAt/updatedAt | DateTime | |

Seed default: Router, Switch, Access Point, Firewall, Server, Wireless Controller, Modem, Network Adapter, UPS, Rack, Cable, Peripheral, Other.

### 2.3 `Location`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| name | String | unique |
| parentLocationId | String? | nullable, self-relation — foundation utk hierarchical location (future) |
| status | Enum(`ACTIVE`,`ARCHIVED`) | |

### 2.4 `Device`

| Field | Type | Notes |
|---|---|---|
| id | String | PK, stabil sepanjang lifecycle (BR-020) |
| assetTag | String | **unique**, required |
| serialNumber | String? | unique jika terisi |
| qrCodeValue | String | unique, generated saat create, **tidak boleh berubah** meski nama/lokasi berubah |
| categoryId | String | FK → Category |
| deviceType | String | free text atau sub-taxonomy |
| brand | String | |
| model | String | |
| locationId | String | FK → Location (current location) |
| acquisitionDate | Date? | |
| yearAcquired | Int? | |
| acquisitionSource | String? | |
| purchasePrice | Decimal? | |
| warrantyInfo | String? | |
| status | Enum(`AVAILABLE`,`BORROWED`,`UNDER_MAINTENANCE`,`LOST`,`RETIRED`,`DISPOSED`) | lihat state machine §3.1 |
| condition | Enum(`EXCELLENT`,`GOOD`,`FAIR`,`DAMAGED`,`CRITICAL`) | independen dari status — §3.2 |
| currentCustodianUserId | String? | FK → User, terisi saat borrowed |
| description | String? | |
| notes | String? | |
| photoUrl | String? | |
| createdAt/updatedAt | DateTime | |

Derived (tidak disimpan di DB, dihitung di query layer):
```
isAvailableForLoan =
  status === 'AVAILABLE'
  AND no active/approved-pending loan_item referencing this device
  AND status NOT IN ('UNDER_MAINTENANCE','LOST','RETIRED','DISPOSED')
```

### 2.5 `LoanRequest`

| Field | Type | Notes |
|---|---|---|
| id | String | PK, human-readable code e.g. `LR-2026-001` |
| requesterId | String | FK → User |
| purpose | String | required |
| startDate | Date | required |
| expectedReturnDate | Date | required — BR: wajib tersedia |
| notes | String? | |
| status | Enum(`PENDING_APPROVAL`,`APPROVED`,`REJECTED`,`ACTIVE`,`RETURNED`,`PARTIALLY_RETURNED`) | §3.3 |
| approverId | String? | FK → User |
| approvedAt | DateTime? | |
| rejectionReason | String? | |
| createdAt/updatedAt | DateTime | |

### 2.6 `LoanItem`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| loanRequestId | String | FK |
| deviceId | String | FK |
| itemStatus | Enum(`PENDING`,`APPROVED`,`ACTIVE`,`RETURNED`,`REJECTED`) | mengikuti parent, all-or-nothing (BR-022) |
| returnedAt | DateTime? | |
| returnCondition | Enum(condition values)? | dicatat per device — BR-009 |
| returnNotes | String? | |

**Constraint kritis (BR-006, BR-021):** partial unique index / application-level transaction untuk menjamin satu `deviceId` tidak muncul di lebih dari satu `LoanItem` dengan `itemStatus IN ('APPROVED','ACTIVE')` secara bersamaan.

### 2.7 `Incident`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| deviceId | String | FK |
| reporterId | String | FK → User |
| reportDate | DateTime | default now |
| description | String | required |
| severity | Enum(`LOW`,`MEDIUM`,`HIGH`,`CRITICAL`) | |
| locationId | String? | lokasi saat kejadian |
| photoUrl | String? | |
| notes | String? | |
| status | Enum(`REPORTED`,`UNDER_REVIEW`,`VERIFIED`,`IN_PROGRESS`,`RESOLVED`) | §3.4 |
| verificationOutcome | Enum(`NO_ISSUE_FOUND`,`MINOR_ISSUE`,`MAJOR_ISSUE`,`MAINTENANCE_REQUIRED`,`REPLACEMENT_REQUIRED`,`RETIREMENT_RECOMMENDED`)? | diisi Technician saat verifikasi |
| verifiedById | String? | FK → User (technician) |
| verifiedAt | DateTime? | |

### 2.8 `Maintenance`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| deviceId | String | FK |
| relatedIncidentId | String? | FK, nullable |
| technicianId | String | FK → User (isTechnician=true) |
| maintenanceType | String | e.g. Preventive/Corrective |
| problem | String | |
| diagnosis | String? | |
| actionTaken | String? | |
| partsReplaced | String? | |
| cost | Decimal? | |
| startDate | Date | |
| completionDate | Date? | |
| result | String? | |
| notes | String? | |
| attachmentUrl | String? | |
| status | Enum(`OPEN`,`IN_PROGRESS`,`WAITING_PARTS`,`COMPLETED`,`CANCELLED`) | §3.5 |

### 2.9 `StockOpnameSession`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| sessionName | String | |
| locationScope | String[] (Location ids) | |
| categoryScope | String[] (Category ids) | |
| startDate | Date | |
| assignedVerifierId | String | FK → User |
| notes | String? | |
| status | Enum(`OPEN`,`IN_PROGRESS`,`COMPLETED`) | |

### 2.10 `StockOpnameRecord`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| sessionId | String | FK |
| deviceId | String | FK |
| verificationResult | Enum(`FOUND`,`MISSING`,`WRONG_LOCATION`,`DAMAGED`,`UNVERIFIED`) | default UNVERIFIED |
| physicalLocationId | String? | jika WRONG_LOCATION |
| physicalCondition | Enum(condition)? | jika DAMAGED |
| reconciled | Boolean | default false — reconciliation butuh review manual (BR-018) |
| reconciledById | String? | |
| reconciledAt | DateTime? | |

### 2.11 `AuditLog`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| actorId | String | FK → User |
| action | String | e.g. `DEVICE_STATUS_CHANGED` |
| targetType | String | e.g. `Device` |
| targetId | String | |
| previousValue | Json? | |
| newValue | Json? | |
| context | Json? | metadata tambahan (mis. bulk action batch id) |
| createdAt | DateTime | |

Akses hanya untuk Admin (§44 PRD asli).

### 2.12 `Notification`

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| userId | String | FK (penerima) |
| type | Enum (lihat §43 PRD asli) | |
| payload | Json | referensi entity terkait |
| isRead | Boolean | default false |
| createdAt | DateTime | |

---

## 3. State Machines (Wajib Diimplementasikan Sebagai Guard Function, Bukan Sekadar Enum)

Untuk setiap entity di bawah, buat fungsi `canTransition(current, next): boolean` terpusat di `lib/state-machines/*.ts` dan **panggil dari API layer**, jangan biarkan client menentukan transisi bebas.

### 3.1 Device Status

```text
AVAILABLE ──┬─→ BORROWED ──→ AVAILABLE
            ├─→ UNDER_MAINTENANCE ──→ AVAILABLE
            ├─→ LOST
            └─→ RETIRED ──→ DISPOSED
BORROWED ──→ UNDER_MAINTENANCE (mis. rusak saat return)
Any non-terminal ──→ LOST (pelaporan kehilangan)
```
Terminal states: `DISPOSED`. `RETIRED` semi-terminal (hanya bisa → DISPOSED).
Status TIDAK boleh diubah langsung oleh Student/Teacher biasa — hanya Technician (dalam konteks incident/maintenance) atau Admin, dan sistem sendiri (mis. saat loan approved → BORROWED).

### 3.2 Device Condition

```text
EXCELLENT ↔ GOOD ↔ FAIR ↔ DAMAGED ↔ CRITICAL
```
Condition bebas berubah dua arah (tidak strict linear), tapi setiap perubahan wajib tercatat di audit log dengan actor & alasan (biasanya terkait incident/maintenance/return inspection).

### 3.3 Loan Request Status

```text
PENDING_APPROVAL ──approve──→ APPROVED ──pickup──→ ACTIVE ──return semua item──→ RETURNED
PENDING_APPROVAL ──reject──→ REJECTED
ACTIVE ──return sebagian item──→ PARTIALLY_RETURNED ──return sisanya──→ RETURNED
```
Catatan: **approval sendiri bersifat all-or-nothing (BR-022)** — tidak ada `PARTIALLY_APPROVED`. `PARTIALLY_RETURNED` hanya terjadi di tahap *return*, bukan approval, dan ini valid karena BR-009 memperbolehkan return condition per-device (device bisa dikembalikan satu-satu).

### 3.4 Incident Status

```text
REPORTED → UNDER_REVIEW → VERIFIED → IN_PROGRESS → RESOLVED
```
Linear, tidak boleh skip step (mis. REPORTED langsung ke RESOLVED tanpa verifikasi Technician — melanggar BR-010).

### 3.5 Maintenance Status

```text
OPEN → IN_PROGRESS ⇄ WAITING_PARTS → COMPLETED
OPEN/IN_PROGRESS/WAITING_PARTS → CANCELLED
```

### 3.6 LoanItem ↔ Device Status Side Effects (harus diimplementasikan sebagai transaction)

| Event | Device.status | LoanItem.itemStatus |
|---|---|---|
| Loan approved | AVAILABLE → BORROWED | PENDING → APPROVED (lalu ACTIVE saat pickup, atau langsung ACTIVE jika tanpa step pickup terpisah) |
| Loan rejected | tidak berubah | PENDING → REJECTED |
| Device returned, no issue | BORROWED → AVAILABLE | → RETURNED |
| Device returned, damaged | BORROWED → UNDER_MAINTENANCE (dan trigger create Incident, §24 PRD asli) | → RETURNED |

---

## 4. Permission Matrix (Single Source of Truth untuk `lib/permissions.ts`)

Legend: ✅ full, 🟡 own-data only, ⚠️ butuh capability Technician, ❌ tidak boleh.

| Action | Student | Teacher | +Technician cap. | Admin |
|---|---|---|---|---|
| View inventory (sesuai visibility) | ✅ | ✅ | ✅ | ✅ |
| View device detail | ✅ | ✅ | ✅ | ✅ |
| Create loan request | ✅ | ✅ | ✅ | ✅ |
| View loan history | 🟡 own | 🟡 own | 🟡 own | ✅ all |
| Approve/reject loan | ❌ | ❌ | ❌* | ✅ |
| Report incident | ✅ | ✅ | ✅ | ✅ |
| View incident status | 🟡 own report | 🟡 own report | ✅ all | ✅ |
| Verify incident | ❌ | ❌ | ⚠️ ✅ | ✅ |
| Create/manage maintenance | ❌ | ❌ | ⚠️ ✅ | ✅ |
| Change device status/condition | ❌ | ❌ | ⚠️ ✅ (dalam konteks incident/maintenance) | ✅ |
| CRUD device master data | ❌ | ❌ | ❌ | ✅ |
| CRUD category/location | ❌ | ❌ | ❌ | ✅ |
| Bulk actions (device/user) | ❌ | ❌ | ❌ | ✅ |
| Import CSV/XLSX | ❌ | ❌ | ❌ | ✅ |
| Manage users & roles | ❌ | ❌ | ❌ | ✅ |
| Stock opname session create | ❌ | ❌ | ❌ | ✅ |
| Stock opname physical verify | ❌ | ❌ | 🟡 jika assigned verifier | ✅ |
| View reports | ❌ (kecuali diberi izin) | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | ✅ |
| Manage settings | ❌ | ❌ | ❌ | ✅ |

`*` Approver default = Admin. PRD menyebut "authorized approver" — implementasikan sebagai flag `canApproveLoans` yang default hanya true untuk Admin, tapi arsitektur permission harus **extensible** (agent boleh siapkan field ini di User meski MVP hanya Admin yang true), agar future enhancement mudah tanpa migrasi besar.

Implementasi: buat helper `hasPermission(user, action, resource?)` — dipanggil di setiap API route sebelum eksekusi. Jangan taruh logic permission di komponen UI saja (UI hanya untuk hide/show, server tetap harus reject).

---

## 5. API Contract (REST, per Modul)

Base path: `/api`. Semua response mengikuti envelope:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 100 } }
```
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {} } }
```

### 5.1 Auth
- `POST /api/auth/login` — { email/username, password } → session cookie.
- `POST /api/auth/logout`

### 5.2 Devices
- `GET /api/devices` — query: `search, categoryId, locationId, brand, model, status, condition, yearAcquired, availableOnly, page, pageSize, sortBy, sortDir`
- `GET /api/devices/:id` — detail + history (loan/incident/maintenance/location/activity)
- `POST /api/devices` — Admin only
- `PATCH /api/devices/:id` — Admin only (perubahan status/condition via technician pakai endpoint terpisah, lihat §5.5/5.6, agar validasi state machine spesifik konteks)
- `DELETE /api/devices/:id` — soft-delete/archive only jika tidak ada historical dependency (BR-015); return 409 jika ada dependency
- `POST /api/devices/bulk` — { deviceIds[], action, payload } — Admin only, wajib return preview jika `dryRun: true`
- `POST /api/devices/import` — multipart upload → returns `importJobId`
- `GET /api/devices/import/:jobId` — status & result (total/success/failed/skipped/duplicate) + `errorReportUrl`
- `GET /api/devices/:id/qrcode` — returns QR image (svg/png)
- `GET /api/devices/lookup?qr=...` atau `?assetTag=...` — dipakai untuk QR scan & stock opname lookup

### 5.3 Loans
- `GET /api/loans` — filter: status, requesterId, overdue=true
- `POST /api/loans` — { deviceIds[], purpose, startDate, expectedReturnDate, notes } → validasi semua device available sebelum create (reservasi sementara, §23 PRD asli)
- `GET /api/loans/:id`
- `POST /api/loans/:id/approve` — Admin only, all-or-nothing
- `POST /api/loans/:id/reject` — { reason }
- `POST /api/loans/:id/items/:itemId/return` — { condition, notes } — per-device return (BR-009)

### 5.4 Incidents
- `GET /api/incidents`
- `POST /api/incidents` — { deviceId, description, severity, locationId?, photoUrl?, notes? }
- `GET /api/incidents/:id`
- `POST /api/incidents/:id/verify` — Technician only — { verificationOutcome, updatedStatus?, updatedCondition? }
- `PATCH /api/incidents/:id/status` — transisi mengikuti §3.4

### 5.5 Maintenance
- `GET /api/maintenance`
- `POST /api/maintenance` — Technician only, boleh reference `relatedIncidentId`
- `PATCH /api/maintenance/:id` — update diagnosis/action/parts/cost/status
- `POST /api/maintenance/:id/complete` — { result, deviceStatus?, deviceCondition?, resolveRelatedIncident?: boolean }

### 5.6 Stock Opname
- `POST /api/stock-opname/sessions`
- `GET /api/stock-opname/sessions/:id`
- `POST /api/stock-opname/sessions/:id/records` — { deviceId, verificationResult, physicalLocationId?, physicalCondition? } — dipanggil per scan/lookup
- `POST /api/stock-opname/sessions/:id/reconcile` — { recordIds[] } → apply perubahan ke Device setelah review (BR-018)
- `GET /api/stock-opname/sessions/:id/report`

### 5.7 Users
- `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`
- `POST /api/users/:id/technician-capability` — { enable: boolean } — Admin only
- `POST /api/users/bulk`
- `POST /api/users/import`, `GET /api/users/import/:jobId`

### 5.8 Master Data
- `GET/POST/PATCH /api/categories`, `/api/locations` (archive via PATCH status)

### 5.9 Reports
- `GET /api/reports/:type` — type ∈ {inventory, by-category, by-location, status, condition, loans, overdue-loans, incidents, maintenance, lost-devices, retired-devices, stock-opname}
- `GET /api/reports/:type/export?format=csv|xlsx`

### 5.10 Notifications
- `GET /api/notifications`
- `POST /api/notifications/:id/read`

### 5.11 Audit Log
- `GET /api/audit-log` — Admin only, filter: actorId, targetType, dateRange

### 5.12 Dashboard
- `GET /api/dashboard/summary` — semua metrik §8.1 & §8.2 PRD asli dalam satu payload (hindari waterfall request di client)

---

## 6. Spesifikasi Halaman & Komponen UI

Prinsip global (§47–§50 PRD asli): clean, operational, information-dense, table-centric, punya loading/empty/error/success state di setiap page.

### 6.1 Shared Component: `<DataTable />`
Wajib reusable di semua modul table-centric (Device, Loan, Incident, Maintenance, User, Stock Opname records, Audit Log). Fitur wajib:
- Server-side search box (debounced).
- Filter bar (dropdown per kolom yang applicable).
- Column sort (klik header).
- Pagination (page size selector).
- Column visibility toggle.
- Row selection (checkbox) → memunculkan **contextual bulk action toolbar** di atas tabel (§48 PRD asli).
- Export button (CSV/XLSX) yang menghormati filter aktif.
- Empty state dengan CTA sesuai konteks (mis. "Belum ada device — Tambah device pertama").

### 6.2 Login Page
Form email/username + password. Error state jelas untuk kredensial salah / akun nonaktif. Tidak ada link "Daftar" (no self-registration).

### 6.3 Dashboard (`/dashboard`)
- Grid KPI cards (§8.1): Total, Available, Borrowed, Under Maintenance, Damaged, Lost, Retired, Active Loans, Pending Loan Requests, Open Damage Reports, Ongoing Maintenance, Active Users.
- Chart section (Recharts): Devices by Category (bar/pie), Devices by Location (bar), Devices by Status (donut), Maintenance trend (line, per bulan), Damage trend (line), Loan activity (line).
- "Recent Activities" feed (dari AuditLog, 10 terbaru, link ke target).
- Semua card klik-able → navigasi ke halaman terkait dengan filter pre-applied (mis. klik "Pending Loan Requests" → `/loans?status=PENDING_APPROVAL`).

### 6.4 Device Inventory (`/inventory`)
- `<DataTable>` dengan kolom: Photo thumbnail, Asset Tag, Device (Brand+Model), Category, Location, Status (badge warna), Condition (badge warna), Custodian (jika borrowed).
- Filter: Category, Location, Brand, Model, Status, Condition, Year Acquired, "Available Only" toggle.
- Row klik → detail. Bulk toolbar (Admin only): Change Category/Location/Status/Condition/Year, Archive/Retire, Export Selected.
- Tombol "Import" → `/inventory/import`. Tombol "Add Device" (Admin only) → modal/side-panel form.

### 6.5 Device Detail (`/inventory/[deviceId]`)
- Header: foto besar, Asset Tag, QR code (downloadable/printable), Status & Condition badge, tombol aksi kontekstual (Report Damage / Edit / Change Status, sesuai permission).
- Tab: Overview (identity, classification, location, acquisition, warranty) | Loan History | Incident History | Maintenance History | Location History | Activity History.
- Setiap history tab = mini `<DataTable>` read-only, link ke record penuh.

### 6.6 Device Import (`/inventory/import`)
Stepper mengikuti flow §15 PRD asli persis: **Upload → Column Mapping → Validation → Preview → Confirmation → Processing → Result**. Setiap step adalah state terpisah di UI (bukan single form). Result step menampilkan ringkasan angka + tombol download error report.

### 6.7 Loan — Browse & Create (`/loans/new`)
- Device picker: grid/list device available dengan filter (Available Only default ON, Category, Location, Brand, Model, Condition) + search.
- Device yang tidak available tampil **disabled dengan status terlihat** (§19 PRD asli), bukan disembunyikan.
- Multi-select → "Selected Devices" panel (sticky sidebar) menampilkan device terpilih + tombol remove.
- Step berikutnya: form Purpose, Start Date, Expected Return Date, Notes → Review → Submit.
- Setelah submit → redirect ke detail loan dengan status Pending Approval.

### 6.8 Loan List & Detail (`/loans`, `/loans/[loanId]`)
- List: filter status, requester (Admin view all, user view own), overdue flag.
- Detail: info request, list device (per-item status), tombol Approve/Reject (Admin, all-or-nothing — satu tombol untuk seluruh request, bukan per-item), tombol Return per device (muncul saat status ACTIVE), form return condition per device.

### 6.9 Incident (`/incidents`, `/incidents/[incidentId]`)
- List dengan filter status/severity.
- "Report Damage" form: pilih device (atau prefilled dari QR scan/device detail), description, severity, photo upload, notes.
- Detail: timeline status (§27), tombol "Verify" khusus Technician (form verificationOutcome + optional update status/condition device).

### 6.10 Maintenance (`/maintenance`, `/maintenance/[maintenanceId]`)
- List filter status/technician/device.
- Create/edit form sesuai §29.1. Tombol "Complete Maintenance" (Technician) membuka form: result, update device status?, update device condition?, resolve related incident? (checkbox).

### 6.11 Stock Opname (`/stock-opname`)
- Session list + create session form (Session Name, Location Scope multi-select, Category Scope multi-select, Start Date, Assigned Verifier, Notes).
- Session detail: dua mode input — **QR Scan** (kamera, mobile-friendly) dan **Asset Tag/Search** manual — keduanya menuju form quick-verify (Found/Missing/Wrong Location/Damaged/Unverified).
- Progress bar (Verified X / Total Expected).
- "Reconciliation" tab: tabel discrepancy (System vs Physical), checkbox pilih mana yang di-apply, tombol "Reconcile Selected" (BR-018 — tidak ada auto-apply).
- Report tab sesuai §41.

### 6.12 User Management (`/users`)
Sama pola dengan Device: `<DataTable>`, filter role/capability/status/department, bulk toolbar, import stepper (sama pola dengan device import).

### 6.13 Categories & Locations (`/categories`, `/locations`)
Simple CRUD table, tombol Archive/Reactivate (bukan delete jika ada dependency — cek via API sebelum tampilkan tombol delete keras).

### 6.14 Reports (`/reports`)
Grid kartu tiap jenis report (§42) → klik buka preview table + tombol export CSV/XLSX.

### 6.15 Audit Log (`/audit-log`)
Read-only `<DataTable>`, Admin only, filter actor/target type/date range, expand row untuk lihat previous/new value diff.

### 6.16 Settings (`/settings`)
Tab: School Info, Inventory Config, Loan Config (mis. default loan duration), User Config, Notification Preferences, Import Config. Semua perubahan tercatat di audit log; tidak boleh ada aksi yang menghapus historical record dari sini.

### 6.17 QR Scan Entry Point (Mobile)
Route `/scan` (atau native browser camera trigger) → hasil scan redirect ke `/inventory/[deviceId]` dengan action bar kontekstual sesuai permission (View / Report Damage / Verify Stock Opname jika ada active session assigned ke user).

### 6.18 Responsive Behavior
Desktop = primary (semua modul full). Mobile = terbatas ke: Login, Search device, QR scan, View device, Report damage, View loan (list+detail, read only + return action), Basic approval (tombol approve/reject sederhana). Bulk management & import **disembunyikan/dinonaktifkan** di breakpoint mobile (bukan dibuat responsive penuh) — sesuai §51 PRD asli.

---

## 7. Non-Functional, Validation & Security Rules (Ringkas untuk Implementasi)

- **Auth:** password hashing (bcrypt/argon2), session JWT httpOnly cookie, middleware Next.js untuk protect route grup `(dashboard)` dan setiap API route.
- **Authorization:** double-check — hide di UI **dan** reject di API (403) menggunakan `lib/permissions.ts`.
- **Input validation:** Zod schema per endpoint, digunakan juga di React Hook Form (single source schema di `/lib/validators`).
- **File upload validation:** batasi tipe (image/jpeg,png untuk foto; csv/xlsx untuk import), batas ukuran (mis. 5MB foto, 20MB import file), scan nama file untuk path traversal.
- **Rate limiting:** minimal pada `/api/auth/login` (brute force protection).
- **Uniqueness enforcement:** Asset Tag, Serial Number (jika ada), QR value, Email/Username, Student/Employee ID — enforce di DB level (unique constraint), bukan hanya di aplikasi.
- **Referential integrity:** Category/Location yang punya device terkait tidak boleh dihapus (return 409), hanya bisa di-archive (BR-015).
- **Soft delete pattern:** gunakan kolom `status: ACTIVE/ARCHIVED` untuk master data, jangan hard delete row yang punya historical reference.
- **Transaction safety:** loan approval, return, dan reconciliation stock opname **wajib** dibungkus `prisma.$transaction` untuk mencegah race condition (khususnya double-booking, BR-021).
- **Audit completeness:** setiap mutation pada Device (status/condition/location), Loan (create/approve/reject/return), Incident (create/verify), Maintenance (create/complete), User (create/role change/technician capability), Bulk Action, Import — wajib tercatat via middleware terpusat, bukan manual per-route.
- **Pagination default:** page size 20-50, wajib server-side (jangan fetch semua lalu paginate di client untuk dataset besar).
- **Loading/Empty/Error state:** setiap page fetch data via React Query — manfaatkan `isLoading/isError/data.length===0` secara konsisten lewat wrapper komponen agar tidak duplikatif.

---

## 8. Phased Build Plan untuk Agentic Coding (Antigravity)

> Setiap phase dirancang untuk **satu sesi kerja agent** yang jelas start/end-nya, dengan Definition of Done (DoD) yang bisa dicek otomatis atau manual cepat. Kerjakan berurutan — jangan lompat phase karena banyak modul saling bergantung (mis. Loan butuh Device, Incident butuh Device, Maintenance butuh Incident+Device).

### Phase 0 — Project Scaffold
**Task:** Init Next.js 15 + TypeScript + Tailwind + shadcn/ui. Setup Prisma + PostgreSQL connection. Setup Auth.js dengan Credentials Provider. Buat folder structure sesuai §1.2.
**DoD:** `npm run dev` jalan, halaman login tampil, koneksi DB berhasil (`prisma db push` sukses).

### Phase 1 — Auth & User Management + Permission Layer
**Task:** Implementasikan `User` model, seed 1 Admin default, login/logout, `lib/permissions.ts` dengan matrix §4, middleware proteksi route. Bangun halaman `/users` (CRUD, bulk actions, technician capability toggle) dan `/users/import`.
**DoD:** Admin bisa login, create user baru dengan role & capability, user baru bisa login sesuai permission-nya (verifikasi manual 1 skenario Student non-technician & 1 Teacher+technician).

### Phase 2 — Master Data: Category & Location
**Task:** CRUD + archive/reactivate untuk Category & Location, seed data default (§32, §33 PRD asli).
**DoD:** Admin bisa create/archive category & location; category/location terpakai tidak bisa dihapus keras.

### Phase 3 — Device Inventory Core
**Task:** `Device` model + derived availability logic (`lib/availability.ts`), `/inventory` list (`<DataTable>` reusable component dibangun di phase ini karena dipakai modul lain), device detail page (tanpa history tab dulu), QR code generation, create/edit device form (Admin).
**DoD:** Admin bisa CRUD device, QR code ter-generate & stabil, availability berubah otomatis ketika status diubah manual via edit form, search/filter/sort/pagination berfungsi di `<DataTable>`.

### Phase 4 — Device Bulk Actions & Import
**Task:** Bulk action toolbar + endpoint, import stepper (Upload→Mapping→Validation→Preview→Confirm→Process→Result) dengan downloadable error report.
**DoD:** Import 50+ baris CSV contoh berhasil dengan beberapa baris sengaja invalid → hasil menunjukkan success/failed/duplicate count yang benar & error report bisa diunduh.

### Phase 5 — Loan Management (Modul Paling Kritis)
**Task:** `LoanRequest` + `LoanItem` model dengan constraint anti double-booking, halaman browse/select device untuk loan, submit request, approval (all-or-nothing), return per-device, update status Device otomatis via transaction (§3.6).
**DoD:** 
1. User bisa buat loan multi-device.
2. Admin approve → semua device jadi Borrowed, tidak ada device lain bisa memilih device yang sama.
3. Test skenario: dua request pending untuk device sama → hanya satu yang bisa disetujui, yang lain harus di-reject atau device tersebut otomatis hilang dari opsi.
4. Return per-device menyimpan condition masing-masing dan mengubah status device sesuai §3.6.

### Phase 6 — Incident Management
**Task:** `Incident` model, form report (termasuk dari QR scan entry point), halaman verifikasi Technician, update status/condition device dari hasil verifikasi (BR-010, BR-011).
**DoD:** Non-technician user report kerusakan → status REPORTED, tidak mengubah device status. Technician verifikasi → bisa update status/condition device, tercatat di audit log.

### Phase 7 — Maintenance Management
**Task:** `Maintenance` model, workflow Technician, completion flow yang bisa update device status/condition & resolve related incident.
**DoD:** Technician buat maintenance dari incident terverifikasi, complete maintenance → device kembali Available/status sesuai hasil, incident terkait otomatis Resolved jika dicentang.

### Phase 8 — Stock Opname
**Task:** Session model, QR/Asset Tag lookup untuk verifikasi cepat, reconciliation flow (review sebelum apply), report.
**DoD:** Buat session, verifikasi beberapa device (found/missing/wrong location/damaged), reconciliation tab menampilkan discrepancy dengan benar, apply reconciliation mengubah data device hanya untuk record yang dicentang.

### Phase 9 — Dashboard & Reports
**Task:** Endpoint summary agregat, halaman dashboard dengan KPI card + chart (Recharts), halaman reports dengan export CSV/XLSX per jenis (§42).
**DoD:** Semua KPI §8.1 tampil dengan angka benar (cross-check manual terhadap data test), setiap report bisa diexport dan filenya valid dibuka di Excel.

### Phase 10 — Notifications & Audit Log UI
**Task:** In-app notification (list, mark as read, trigger di setiap event §43), halaman Audit Log dengan filter & diff viewer.
**DoD:** Setiap event kunci (loan submit/approve/reject, damage report, maintenance start/complete) memicu notifikasi ke user terkait; audit log menampilkan seluruh mutation dengan actor & before/after value.

### Phase 11 — Settings, Responsive Polish, QA Pass
**Task:** Halaman settings, uji seluruh state (loading/empty/error) tiap modul, uji responsive sesuai §6.18, uji ulang seluruh Business Rules BR-001–BR-024 sebagai checklist manual/E2E.
**DoD:** Checklist BR-001–BR-024 (Bagian 9 dokumen ini) lulus semua, Definition of Done PRD asli §61 terpenuhi untuk seluruh modul.

> **Instruksi eksekusi untuk Antigravity:** pada setiap phase, agent boleh membuat sub-task/plan sendiri, tapi **tidak boleh mengubah data model atau business rule di Bagian 2–4** tanpa menandainya eksplisit sebagai "deviation" beserta alasan. Jika requirement ambigu, agent memilih interpretasi paling konsisten dengan Bagian 58 (Product Principles: Inventory First, Operational Over Decorative, Bulk Operations First-Class, History Matters, Prevent Bad Data, Simple Where Possible, Progressive Complexity) dan menuliskan asumsi tersebut di commit message / PR description, bukan diam-diam.

---

## 9. Business Rules Checklist (untuk QA / Acceptance Test — mengacu BR-001–BR-024 PRD asli)

| # | Rule | Cara Verifikasi |
|---|---|---|
| BR-001 | User dibuat oleh Admin | Tidak ada endpoint/halaman self-register |
| BR-002 | Base role: Student/Teacher/Admin | Enum di schema hanya 3 nilai |
| BR-003 | Technician = capability | Field `isTechnician` terpisah dari `baseRole` |
| BR-004 | Semua loan butuh approval | Tidak ada path create loan langsung ACTIVE |
| BR-005 | Multi-device per loan request | `LoanItem[]` per `LoanRequest` |
| BR-006 | 1 device max 1 active loan | Constraint/transaction teruji dgn concurrent request |
| BR-007 | Hanya device available bisa dipilih | Device picker filter server-side |
| BR-008 | Borrowed/Maintenance/Lost/Retired/Disposed tidak bisa dipinjam | `computeAvailability()` cover semua kondisi |
| BR-009 | Return condition per device | Field `returnCondition` di `LoanItem`, form input per item |
| BR-010 | Damage report wajib diverifikasi Technician dulu | Report tidak langsung ubah device status/condition |
| BR-011 | Technician ubah status/condition tanpa approval Admin | Endpoint verify/complete tidak butuh extra admin approval step |
| BR-012 | Status ≠ Condition | Dua enum/field terpisah di schema & UI |
| BR-013 | Historical records dipertahankan | Tidak ada hard delete pada Loan/Incident/Maintenance/StockOpname records |
| BR-014 | Category/Location dikelola Admin | Permission matrix §4 |
| BR-015 | Master data dependency → archive, bukan delete | API return 409 + auto-suggest archive |
| BR-016 | Bulk actions butuh confirmation + audit | Modal konfirmasi + entry AuditLog per bulk batch |
| BR-017 | Import lewat validation & preview | Stepper wajib melalui semua step, tidak bisa skip ke Processing |
| BR-018 | Stock opname butuh reconciliation review | Tidak ada auto-apply, ada tombol confirm eksplisit |
| BR-019 | Auditability perubahan penting | Audit middleware cover semua entity di §2 |
| BR-020 | Device ID & QR stabil | QR value tidak regenerate saat edit device |
| BR-021 | No double booking | Sama dengan BR-006, uji concurrent |
| BR-022 | All-or-nothing approval | Tidak ada endpoint approve per-item |
| BR-023 | Return inspection sebelum Available lagi | Return flow selalu minta condition sebelum status device di-update |
| BR-024 | Maintenance completion bisa update status/condition | Field opsional di `complete` endpoint |

---

## 10. Contoh Prompt Siap Pakai untuk Antigravity (Per Phase)

Salin salah satu blok ini sebagai instruksi awal ke Antigravity agent, sesuaikan phase yang sedang dikerjakan.

```text
Kamu sedang membangun "School Network Equipment Inventory Management System"
mengikuti dokumen Technical PRD ini secara ketat. Kerjakan HANYA Phase [N]
sesuai Bagian 8 dokumen. Gunakan tech stack di Bagian 1, data model di
Bagian 2, state machine di Bagian 3, permission matrix di Bagian 4, API
contract di Bagian 5, dan spesifikasi UI di Bagian 6 sebagai acuan wajib.

Jangan mengubah keputusan arsitektur atau field data model tanpa
menandainya eksplisit sebagai "DEVIATION" beserta alasan singkat di akhir
laporan pekerjaan.

Setelah selesai, verifikasi Definition of Done Phase [N] satu per satu dan
laporkan hasilnya secara eksplisit (pass/fail per poin).
```

---

## 11. Ringkasan Perubahan dari PRD v1.0

Dokumen ini **tidak mengubah** requirement fungsional, business rules, atau non-goals dari PRD v1.0. Yang ditambahkan:

1. Tech stack & folder structure konkret agar agent tidak perlu menebak.
2. Data model lengkap (field-level) sehingga skema database bisa langsung digenerate.
3. State machine eksplisit untuk setiap entity, mencegah agent membuat transisi status yang melanggar business rule.
4. Permission matrix eksplisit dalam bentuk tabel, siap dijadikan kode `lib/permissions.ts`.
5. API contract per modul agar frontend & backend konsisten tanpa perlu banyak iterasi.
6. Spesifikasi UI per halaman & komponen shared (`<DataTable>`) untuk konsistensi visual & fungsional.
7. **Phased build plan** dengan Definition of Done per fase — dirancang khusus agar cocok dikerjakan bertahap oleh coding agent seperti Antigravity, dengan checkpoint verifikasi yang jelas.
8. Business Rules checklist (BR-001–BR-024) sebagai acceptance test siap pakai.

PRD v1.0 tetap menjadi **functional source of truth**; dokumen ini adalah **technical companion** yang menerjemahkannya menjadi instruksi build yang presisi.
