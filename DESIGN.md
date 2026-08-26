# School Network Equipment Inventory Management System

**Version:** 1.0  
**Status:** Final  
**Document Type:** UI/UX Design Specification  
**Related Document:** `PRD.md`

---

## 1. Purpose

Dokumen ini menjadi visual dan interaction specification untuk School Network Equipment Inventory Management System.

DESIGN.md digunakan oleh:

1. Google Stitch untuk menghasilkan UI/UX design.
2. Google Antigravity sebagai visual reference saat melakukan implementation.
3. Developer sebagai reference untuk component, layout, interaction, dan responsive behavior.

`PRD.md` adalah source of truth untuk functional requirements.

`DESIGN.md` adalah source of truth untuk visual design, UX pattern, information hierarchy, dan interface behavior.

Jika terdapat konflik:

- PRD menentukan **WHAT the system does**.
- DESIGN menentukan **HOW the system should look and behave**.

---

# 2. Product Design Direction

Aplikasi adalah internal operational application untuk mengelola perangkat jaringan sekolah yang digunakan sebagai fasilitas belajar siswa.

Design harus terasa seperti:

- Professional
- Modern
- Clean
- Reliable
- Operational
- Efficient
- Structured
- Information-dense
- Easy to understand

Design bukan ditujukan sebagai:

- Marketing website
- Consumer social application
- Gaming dashboard
- Futuristic AI interface
- Excessively decorative SaaS dashboard

Primary design philosophy:

> Clean enough to understand. Dense enough to operate.

---

# 3. Design Reference

Primary visual and UX reference:

- ManageEngine ServiceDesk Plus
- ManageEngine AssetExplorer

Referensi digunakan untuk mengambil pola:

- Enterprise sidebar navigation
- Asset management tables
- Dashboard structure
- Search and filtering
- Status indicators
- Asset detail pages
- Approval workflows
- Maintenance workflows
- Administrative settings
- Operational dashboards
- Bulk management
- Data-heavy interfaces

Reference hanya digunakan sebagai design inspiration.

Do not copy:

- Logo
- Branding
- Illustrations
- Proprietary graphics
- Exact pixel-level layouts
- Exact visual identity

Application harus memiliki visual identity sendiri.

---

# 4. Target User Experience

User harus dapat memahami aplikasi tanpa membutuhkan training panjang.

Setiap halaman harus menjawab tiga pertanyaan:

1. What am I looking at?
2. What is the current status?
3. What can I do next?

Primary UX priorities:

1. Clarity
2. Efficiency
3. Discoverability
4. Consistency
5. Error prevention
6. Information visibility
7. Visual polish

Operational efficiency lebih penting daripada visual novelty.

---

# 5. Application Structure

Application menggunakan desktop-first enterprise application layout.

```text
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ Logo | Global Search              Notifications | User      │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│ SIDEBAR        │ MAIN CONTENT                               │
│                │                                            │
│ Navigation     │ Page Header                                │
│                │                                            │
│                │ Content                                    │
│                │                                            │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
````

Desktop:

- Persistent sidebar
    
- Persistent top header
    
- Scrollable content area
    

Mobile:

- Sidebar becomes drawer
    
- Header remains accessible
    
- Content becomes single-column
    

---

# 6. Main Navigation

Recommended navigation:

```text
Dashboard

Inventory
  Devices
  Categories
  Locations

Loans
  All Loans
  My Loans
  Pending Approval

Operations
  Incidents
  Maintenance
  Stock Opname

Reports

Administration
  Users
  Activity Log
  Settings
```

Navigation visibility harus mengikuti role dan permission.

---

# 7. Role-Based Navigation

## Student

Primary navigation:

```text
Dashboard
Devices
My Loans
Report Damage
```

Student tidak melihat administrative modules.

---

## Teacher

Primary navigation:

```text
Dashboard
Devices
My Loans
Report Damage
```

Jika memiliki technician capability:

```text
Operations
  Incidents
  Maintenance
```

---

## Technician

Primary navigation:

```text
Dashboard
Devices
Loans
Operations
  Incidents
  Maintenance
  Stock Opname
```

---

## Admin

Full navigation:

```text
Dashboard
Inventory
Loans
Operations
Reports
Administration
```

---

# 8. Application Header

Header terdiri dari:

Left:

- Application logo/name
    

Center:

- Global search
    

Right:

- Notifications
    
- Help
    
- User avatar
    
- User name
    
- Account menu
    

Header tidak menggunakan oversized branding.

Recommended height:

```text
56–64px
```

---

# 9. Global Search

Global search merupakan primary productivity feature.

Placeholder:

```text
Search devices, users, loans...
```

Searchable entities:

- Devices
    
- Asset Tags
    
- Serial Numbers
    
- Users
    
- Loans
    
- Incidents
    
- Maintenance records
    

Search result harus menampilkan entity type.

Example:

```text
Search: SW-001

DEVICES

SW-001
Cisco Catalyst 2960
Lab TKJ 1

LOANS

LR-2026-004
Ahmad Fauzan
```

Keyboard shortcut:

```text
Ctrl + K
```

or:

```text
⌘ + K
```

---

# 10. Sidebar

Sidebar default state:

```text
Expanded
```

Sidebar dapat collapse menjadi icon-only mode.

Expanded:

```text
▣ Dashboard

▣ Inventory
    Devices
    Categories
    Locations

▣ Loans
    All Loans
    My Loans
    Pending Approval

▣ Operations
    Incidents
    Maintenance
    Stock Opname

▣ Reports

▣ Administration
    Users
    Activity Log
    Settings
```

Collapsed:

- Icons only
    
- Tooltip on hover
    

Mobile:

- Drawer navigation
    

---

# 11. Breadcrumb

Breadcrumb digunakan pada pages dengan hierarchy.

Example:

```text
Inventory / Devices / SW-001
```

Breadcrumb:

- Small
    
- Muted
    
- Clickable
    
- Located above page title
    

---

# 12. Page Header

Standard page header:

```text
Devices
Manage all network equipment and learning devices.

                    [Import] [Export] [Add Device]
```

Structure:

```text
Breadcrumb

Page Title
Description

Primary Action
Secondary Actions
```

Page title:

```text
24–28px
Semibold
```

Do not use oversized hero-style page headers.

---

# 13. Visual Design Language

Visual language:

- Light
    
- Neutral
    
- Professional
    
- Minimal
    
- Structured
    

Default surfaces:

```text
Application background → very light neutral
Content surface        → white
Borders                → subtle gray
Text                   → dark neutral
Secondary text         → muted gray
```

Use borders more frequently than shadows.

---

# 14. Color System

Primary brand color:

```text
Deep Blue / Indigo
```

Use primary color for:

- Primary buttons
    
- Active navigation
    
- Links
    
- Selected states
    
- Important interactive controls
    

Semantic colors:

```text
Success → Green
Warning → Amber
Danger  → Red
Info    → Blue
Neutral → Gray
```

Color must never be the only status indicator.

Example:

Correct:

```text
● Available
```

Incorrect:

```text
●
```

---

# 15. Typography

Primary font:

```text
Inter
```

Fallback:

```text
system-ui, sans-serif
```

Typography hierarchy:

```text
Page Title       24–28px / Semibold
Section Title    18–20px / Semibold
Card Title       15–16px / Medium
Body             14–15px
Table             13–14px
Metadata          12–13px
```

Avoid excessively large typography.

Application should feel information-dense but readable.

---

# 16. Spacing System

Use consistent spacing scale:

```text
4
8
12
16
20
24
32
40
48
```

Default page padding:

```text
24px
```

Smaller screens:

```text
16px
```

Avoid arbitrary spacing values wherever possible.

---

# 17. Border Radius

Recommended:

```text
Small      4–6px
Default    6–8px
Large      10–12px
```

Pill radius should primarily be used for:

- Status badges
    
- Tags
    
- Filter chips
    

Avoid making every component heavily rounded.

---

# 18. Shadows

Use shadows sparingly.

Prefer:

```text
Border + surface contrast
```

instead of:

```text
Heavy card shadow
```

Shadows primarily used for:

- Dropdowns
    
- Popovers
    
- Modals
    
- Floating elements
    

---

# 19. Buttons

Primary:

```text
[ Add Device ]
```

Secondary:

```text
[ Import ]
[ Export ]
```

Tertiary:

```text
Cancel
```

Danger:

```text
[ Delete ]
```

Button hierarchy must be obvious.

Do not place multiple competing primary buttons in the same action area.

---

# 20. Icons

Recommended icon library:

```text
Lucide Icons
```

Style:

- Outline
    
- Consistent stroke
    
- Simple
    
- Functional
    

Important actions should include text.

Prefer:

```text
[ Edit ]
```

over:

```text
[ ✎ ]
```

Icons may be used alone only for familiar utility actions such as:

- Search
    
- Notifications
    
- More menu
    
- Close
    

---

# 21. Status Badges

Status badges should be compact.

Device status examples:

```text
Available
Borrowed
Under Maintenance
Lost
Retired
Disposed
```

Condition:

```text
Excellent
Good
Fair
Damaged
Critical
```

Status and condition should use different visual treatment.

Example:

```text
[ Available ]

[ Good ]
```

---

# 22. Dashboard

Dashboard adalah operational overview.

Desktop structure:

```text
Dashboard

Good morning, Admin.

┌────────────┬────────────┬────────────┬────────────┐
│ 1,248      │ 982        │ 143        │ 37         │
│ Devices    │ Available  │ Borrowed   │ Maintenance│
└────────────┴────────────┴────────────┴────────────┘

Inventory Status
┌─────────────────────────────────────────────────────┐
│                                                     │
│                       Chart                         │
│                                                     │
└─────────────────────────────────────────────────────┘

Devices by Category
┌────────────────────────┐
│        Chart           │
└────────────────────────┘

Devices by Location
┌────────────────────────┐
│        Chart           │
└────────────────────────┘

Recent Activity
┌─────────────────────────────────────────────────────┐
│ Activity list                                       │
└─────────────────────────────────────────────────────┘
```

Dashboard harus fokus pada:

- Current state
    
- Exceptions
    
- Operational workload
    
- Important actions
    

---

# 23. Dashboard KPI Cards

KPI card harus:

- Compact
    
- Easy to scan
    
- Actionable
    
- Consistent
    

Example:

```text
Available Devices

982

24 more than last month
```

Trend hanya digunakan jika actual data tersedia.

Do not generate fake trend information.

---

# 24. Dashboard Charts

Recommended charts:

- Device status
    
- Device condition
    
- Device category
    
- Device location
    
- Loan activity
    
- Maintenance activity
    

Avoid:

- 3D charts
    
- Decorative charts
    
- Excessive colors
    
- Excessive gradients
    
- Charts without actionable meaning
    

---

# 25. Device Inventory

Device Inventory merupakan primary management interface.

Layout:

```text
Devices
Manage all devices and learning equipment.

[Import] [Export] [Add Device]

┌────────────────────────────────────────────────────────────┐
│ Total Devices │ Available │ Borrowed │ Maintenance        │
└────────────────────────────────────────────────────────────┘

Search devices...

Category ▼
Location ▼
Status ▼
Condition ▼

[Bulk Actions]                         [Columns]

┌────────────────────────────────────────────────────────────┐
│ □ │ Device │ Category │ Location │ Status │ Condition │ ⋮ │
├────────────────────────────────────────────────────────────┤
│ □ │ SW-001 │ Switch   │ Lab 1    │Available│ Good     │ ⋮ │
│ □ │ RTR-01 │ Router   │ Lab 2    │Borrowed │ Excellent│ ⋮ │
└────────────────────────────────────────────────────────────┘
```

---

# 26. Device Table

Recommended columns:

```text
Checkbox
Device
Asset Tag
Serial Number
Category
Location
Brand / Model
Status
Condition
Year
Updated
Actions
```

Device identity should be visually strongest.

Example:

```text
SW-001
Cisco Catalyst 2960
```

Secondary metadata should use smaller muted text.

---

# 27. Device Table Interaction

Row hover:

- Subtle background change
    

Row click:

- Open Device Detail
    

Checkbox:

- Select device
    

Selected rows:

- Display bulk action toolbar
    

Example:

```text
3 devices selected

[Change Location]
[Change Status]
[Change Condition]
[Export]
[More]
```

---

# 28. Inventory Filters

Standard filters:

```text
Search

Category
Location
Status
Condition
Brand
Year
```

Active filters should become removable chips:

```text
Category: Router ×
Status: Available ×
Location: Lab TKJ 1 ×
```

Advanced filters can be placed inside filter drawer.

---

# 29. Bulk Action

Bulk action appears only after records are selected.

Default state:

```text
[Import] [Export] [Add Device]
```

Selected state:

```text
5 selected

[Change Location]
[Change Status]
[Change Condition]
[Export]
[More]
```

Destructive actions should be separated inside More.

---

# 30. Bulk Edit Modal

Example:

```text
Change Location

5 devices selected

New Location

[ Lab TKJ 2 ▼ ]

This action will update the location of
5 devices.

[Cancel] [Apply Changes]
```

Always display:

- Number of affected records
    
- New value
    
- Action consequence
    

---

# 31. Device Detail

Device detail layout:

```text
Inventory / Devices / SW-001

SW-001
Cisco Catalyst 2960

[Available] [Good]

[Edit] [More]

┌────────────────────────────┬──────────────────────────────┐
│ Device Information         │ Current Location             │
│                            │                              │
│ Asset Tag                  │ Lab TKJ 1                   │
│ Serial Number              │                              │
│ Category                   │                              │
│ Brand                      │                              │
│ Model                      │                              │
│ Year Acquired              │                              │
└────────────────────────────┴──────────────────────────────┘

Overview | Loans | Incidents | Maintenance | Activity
```

---

# 32. Device QR Code

Device detail harus menyediakan QR section.

```text
┌─────────────────────┐
│                     │
│      QR CODE        │
│                     │
└─────────────────────┘

SW-001

[Print]
```

QR code tidak perlu oversized.

If scanned:

```text
Device
↓
Device Summary
↓
Available Actions
```

---

# 33. Add Device

Form menggunakan logical sections.

```text
Add Device

Basic Information
-----------------
Asset Tag
Serial Number
Category

Device Information
------------------
Device Type
Brand
Model

Location
--------
Location

Acquisition
-----------
Year Acquired
Acquisition Date
Warranty

Operational
-----------
Status
Condition

Additional
----------
Description
Notes
Photo

[Cancel] [Create Device]
```

Do not create one giant unstructured form.

---

# 34. Device Import

Import workflow:

```text
1. Upload File
        ↓
2. Map Columns
        ↓
3. Validate
        ↓
4. Preview
        ↓
5. Import
```

Progress indicator must be visible.

Supported source:

- CSV
    
- Excel
    

---

# 35. Import Preview

Example:

```text
Import Preview

1,240 rows detected

✓ 1,218 valid
⚠ 18 warnings
✕ 4 errors

[View Errors]

Asset Tag | Category | Location | Status
SW-001    | Switch   | Lab 1    | Available
SW-002    | Switch   | Lab 1    | Available
...

[Cancel] [Import 1,218 Records]
```

Invalid rows must not silently enter the database.

---

# 36. Loan Management

Loan management uses queue-based UI.

```text
Loans

[New Loan]

All | Pending | Active | Overdue | Returned

Search loans...

Loan ID
Borrower
Devices
Purpose
Due Date
Status
```

---

# 37. Multi-Device Loan

Users must be able to select multiple devices in one loan request.

This is a primary workflow.

Selection screen:

```text
Select Devices

Choose one or more available devices.

[Search devices...]

[Available Only ✓]

Category ▼
Location ▼
Condition ▼

────────────────────────────────────────────

□ SW-001
  Cisco Catalyst 2960
  Lab TKJ 1
  Good
  Available

□ SW-002
  Cisco Catalyst 2960
  Lab TKJ 1
  Good
  Available

□ RTR-001
  MikroTik RB4011
  Lab TKJ 2
  Excellent
  Available
```

Selected count must always be visible.

---

# 38. Available Device Visibility

Availability must be visually obvious.

Available:

```text
[Available]
```

Unavailable:

```text
[Borrowed]
Not available
```

Unavailable devices may still appear when the filter is disabled, but cannot be selected.

Example:

```text
SW-003
Cisco Catalyst 2960

[Borrowed]

Not available

Currently borrowed until Aug 30.
```

---

# 39. Selected Device Panel

Desktop:

Use sticky right-side panel.

```text
Selected Devices

3 devices

✓ SW-001
✓ SW-002
✓ RTR-001

[Clear All]

[Continue]
```

Mobile:

Use bottom sheet or sticky bottom selection bar.

---

# 40. Loan Request Flow

Workflow:

```text
Select Devices
      ↓
Loan Details
      ↓
Review
      ↓
Submit
      ↓
Approval
```

---

# 41. Loan Review

Example:

```text
Review Loan Request

Borrower
Ahmad Fauzan

Purpose
Routing & Switching Practice

Loan Period
28 Aug 2026 — 30 Aug 2026

Devices
4 devices

SW-001
Cisco Catalyst 2960

SW-002
Cisco Catalyst 2960

RTR-001
MikroTik RB4011

AP-003
TP-Link EAP

Notes
...

[Back] [Submit Request]
```

---

# 42. Loan Approval

Approval screen:

```text
Loan Request #LR-2026-001

[Pending Approval]

Borrower
Ahmad Fauzan

Purpose
Routing & Switching Practice

Requested Devices
4 devices

Loan Period
28 Aug — 30 Aug

Notes
...

[Reject] [Approve]
```

Approve should be the primary action.

Reject requires confirmation and rejection reason.

---

# 43. Loan Detail

Loan detail contains:

- Request metadata
    
- Borrower
    
- Purpose
    
- Loan period
    
- Device list
    
- Approval history
    
- Return status
    
- Notes
    

Per-device status:

```text
Device       Status       Condition
SW-001       Returned     Good
SW-002       Returned     Good
RTR-001      Borrowed     Good
AP-003       Borrowed     Good
```

---

# 44. Return Flow

Return interface:

```text
Return Loan

Device       Condition
-----------------------
SW-001       Good
SW-002       Good
RTR-001      Damaged
AP-003       Good

Return Notes
[....................]

[Cancel] [Complete Return]
```

Condition should be editable per device.

If damaged:

```text
Condition: Damaged
```

System may offer:

```text
[Report Damage]
```

---

# 45. Incident Management

Incident page is queue-based.

```text
Incidents

[Report Damage]

All
Reported
Under Review
In Progress
Resolved

Incident
Device
Reporter
Severity
Status
Age
```

---

# 46. Report Damage

Form:

```text
Report Device Damage

Device
[ SW-001 ]

Problem
[........................]

Severity
[ Medium ▼ ]

Description
[........................]

Photos
[ Upload ]

[Cancel] [Submit Report]
```

If initiated from QR scan, Device should be automatically populated.

---

# 47. Incident Detail

Example:

```text
INC-2026-0042

SW-001
Cisco Catalyst 2960

[Under Review]

Reported by
Ahmad Fauzan

Problem
Port 12 not functioning.

Description
...

Attachments
...

Technician Actions

[Verify Incident]
```

---

# 48. Technician Verification

Technician verification should be explicit.

```text
Verify Incident

Finding
[ Hardware Issue ▼ ]

Severity
[ Major ▼ ]

Device Condition
[ Damaged ▼ ]

Recommended Action
[ Maintenance Required ▼ ]

Technician Notes
[........................]

[Cancel] [Verify Incident]
```

After successful verification:

```text
[Verified]
```

---

# 49. Maintenance

Maintenance page:

```text
Maintenance

[Create Maintenance]

Maintenance ID
Device
Type
Technician
Status
Started
Completed
Result
```

Statuses:

```text
Open
In Progress
Waiting Parts
Completed
Cancelled
```

---

# 50. Maintenance Detail

Example:

```text
Maintenance #MNT-2026-004

Device
SW-001

Related Incident
INC-2026-0042

Technician
Budi

Diagnosis
Faulty interface module.

Action Taken
Replaced module.

Parts
Interface module

Cost
Rp xxx

Status
Completed
```

---

# 51. Stock Opname

Stock opname uses progress-based workflow.

```text
Stock Opname

Lab TKJ 1
August 2026

Progress

████████████████░░░░ 80%

Verified
80

Expected
100

Discrepancies
4

[Start Verification]
```

---

# 52. QR Scanner

QR scanning interface should be simple and utility-focused.

```text
Scan Device

┌─────────────────────────┐
│                         │
│       CAMERA            │
│       VIEWFINDER        │
│                         │
└─────────────────────────┘

Point camera at QR code.

or

[Enter Asset Tag]
```

Recent scans:

```text
SW-001 ✓
SW-002 ✓
RTR-001 ✓
```

---

# 53. QR Scan Result

Example:

```text
SW-001

Cisco Catalyst 2960

[Available]
[Good]

Lab TKJ 1

[View Details]
[Report Damage]
```

Available actions depend on role and permission.

---

# 54. User Management

User management follows the same table pattern as Device Inventory.

```text
Users

[Import] [Export] [Add User]

Total Users
Active
Technicians
Inactive

Search users...

Role ▼
Technician Capability ▼
Status ▼

User
Role
Technician
Class
Status
Last Active
Actions
```

---

# 55. User Role Representation

Base role and technician capability must be visually separate.

Example:

```text
Ahmad Fauzan

[Student]
[Technician]
```

This prevents Technician from appearing to be an independent base role.

---

# 56. User Import

User import uses:

```text
Upload
↓
Map Columns
↓
Validate
↓
Preview
↓
Import
```

Supported:

- CSV
    
- Excel
    

Validation errors must be visible before import.

---

# 57. Bulk User Management

When users are selected:

```text
10 users selected

[Change Role]
[Enable Technician]
[Disable Technician]
[Activate]
[Deactivate]
[Export]
[More]
```

Bulk changes must display affected record count.

---

# 58. Category Management

Category management uses a simple administrative table.

```text
Categories

[Add Category]

Category
Devices
Status
Actions

Router
82
Active

Switch
124
Active

Access Point
64
Active
```

Deleting a category that is still referenced by devices should require a safe workflow.

Possible options:

```text
Reassign devices
Deactivate category
Cancel
```

Hard delete should not silently orphan devices.

---

# 59. Location Management

Location management:

```text
Locations

[Add Location]

Location
Devices
Status
Actions

Lab TKJ 1
120
Active

Lab TKJ 2
100
Active

Storage
48
Active
```

Location should support:

- Building
    
- Room
    
- Description
    

But keep UI simple.

---

# 60. Reports

Reports page:

```text
Reports

Inventory

[Inventory Overview]
[Device Status]
[Device Condition]
[Devices by Location]

Loans

[Loan Activity]
[Overdue Loans]
[Loan History]

Maintenance

[Maintenance Activity]
[Incident Report]

Audit

[Activity Report]
```

Reports support:

- Date range
    
- Filters
    
- Export
    

---

# 61. Activity Log

Audit interface:

```text
Activity Log

Actor
Action
Target
Time

Admin
Updated Location
SW-001
10:32

Budi
Verified Incident
INC-0042
10:21

Ahmad
Submitted Loan
LR-001
09:54
```

Clicking an activity opens details.

---

# 62. Settings

Settings use grouped sections.

```text
Settings

General
  School Information

Inventory
  Categories
  Locations
  Device Configuration

Loans
  Loan Configuration

Users
  User Configuration

Notifications
  Notification Preferences
```

Avoid one huge settings page.

---

# 63. Notifications

Notification center is accessible from header.

Example:

```text
Notifications

Loan request approved
LR-2026-001
5 min ago

Device damage reported
SW-001
20 min ago

Loan due tomorrow
RTR-001
1 hour ago
```

Unread notifications use a subtle visual indicator.

---

# 64. Empty States

Empty states must be useful and actionable.

Example:

```text
No devices found

Try changing your filters or add a new device.

[Clear Filters] [Add Device]
```

Do not use oversized decorative illustrations.

---

# 65. Loading States

Use skeleton loading for:

- KPI cards
    
- Tables
    
- Device detail
    
- Lists
    
- Dashboard sections
    

Avoid full-screen loading whenever possible.

---

# 66. Error States

Example:

```text
Something went wrong

We couldn't load the device list.

[Try Again]
```

Errors should be human-readable.

Never expose raw technical exceptions to normal users.

---

# 67. Confirmation Dialog

Confirmation dialog must communicate:

1. What will happen.
    
2. Number of affected records.
    
3. Whether action is reversible.
    

Example:

```text
Deactivate 24 users?

These users will no longer be able to access
the system.

[Cancel] [Deactivate Users]
```

---

# 68. Toast Notifications

Use toast for lightweight feedback.

Success:

```text
✓ Device created successfully.
```

Warning:

```text
4 records were skipped.
```

Error:

```text
Unable to save device.
```

Critical information must not exist only inside toast messages.

---

# 69. Modal Guidelines

Use modal for:

- Confirmation
    
- Simple forms
    
- Quick actions
    

Use full page / dedicated workflow for:

- Import
    
- Complex forms
    
- Loan creation
    
- Stock opname
    
- Maintenance workflows
    

---

# 70. Responsive Design

Application is desktop-first but must be responsive.

## Desktop

Use:

- Persistent sidebar
    
- Multi-column layouts
    
- Dense tables
    
- Sticky contextual panels
    

## Tablet

Use:

- Collapsible sidebar
    
- Reduced columns
    
- Horizontal table scrolling when required
    

## Mobile

Use:

- Drawer navigation
    
- Single-column layout
    
- Card/list transformation
    
- Sticky bottom actions where useful
    
- Large enough touch targets
    

---

# 71. Mobile Device Inventory

On mobile, dense desktop tables may transform into cards.

Example:

```text
SW-001
Cisco Catalyst 2960

Switch
Lab TKJ 1

[Available] [Good]

Asset Tag: SW-001
Serial: FOC12345

›
```

---

# 72. Mobile Loan Selection

Mobile is a critical workflow.

```text
Select Devices

[Search...]

[Available Only ✓]

Category ▼

┌──────────────────────────┐
│ □ SW-001                 │
│ Cisco Catalyst 2960      │
│ Lab TKJ 1                │
│ Available · Good         │
└──────────────────────────┘

┌──────────────────────────┐
│ □ RTR-001                │
│ MikroTik RB4011          │
│ Lab TKJ 2                │
│ Available · Excellent    │
└──────────────────────────┘

────────────────────────────
2 devices selected

[Continue]
```

---

# 73. Accessibility

UI must support:

- Keyboard navigation
    
- Visible focus states
    
- Semantic controls
    
- Form labels
    
- Accessible error messages
    
- Adequate contrast
    
- Screen reader-friendly labels
    

Do not rely on color alone.

Touch targets should be sufficiently large on mobile.

---

# 74. Data Density

Application should be more information-dense than consumer applications.

Tables should use:

- Compact rows
    
- Clear alignment
    
- Strong column hierarchy
    
- Small metadata
    
- Consistent spacing
    

But avoid:

- Tiny text
    
- Extremely compressed rows
    
- Difficult-to-click controls
    

Target:

> Dense enough for operations, spacious enough for readability.

---

# 75. Table Design System

All management tables must share the same patterns:

- Header height
    
- Row height
    
- Checkbox placement
    
- Status badge
    
- Actions column
    
- Pagination
    
- Sorting
    
- Filtering
    
- Loading state
    
- Empty state
    
- Error state
    

Do not create a completely different table style for every module.

---

# 76. Standard Table Toolbar

Recommended:

```text
Search...

[Filter]
[Sort]

[Bulk Actions]

                     [Export]
```

If page has creation capability:

```text
[Add Device]
```

should remain the primary action.

---

# 77. Pagination

Tables should support:

```text
Rows per page:
25 ▼

1–25 of 1,248

‹ Previous    1 2 3 ... 50    Next ›
```

For large datasets, server-side pagination should be preferred during implementation.

---

# 78. Sorting

Sortable columns should show:

```text
Device ↑
```

or:

```text
Device ↓
```

Do not make every column sortable unless meaningful.

---

# 79. Permission-Aware UI

UI should adapt to permissions.

Example Student:

```text
View Device
Borrow Device
Report Damage
```

Technician:

```text
View Device
Report Damage
Verify Incident
Maintenance
Update Condition
```

Admin:

```text
Full Management
```

Important:

UI hiding is not authorization.

Backend authorization must always enforce permissions independently.

---

# 80. Admin UX

Admin experience should prioritize:

- Large datasets
    
- Bulk actions
    
- Import
    
- Export
    
- Search
    
- Filtering
    
- Configuration
    
- Auditability
    

Admin UI should be practical rather than decorative.

---

# 81. Technician UX

Technician experience should prioritize:

- Incident queue
    
- Maintenance queue
    
- Device lookup
    
- QR scanning
    
- Condition updates
    
- Status updates
    
- Verification
    

The technician should quickly answer:

> What needs my attention right now?

---

# 82. Student UX

Student experience should be intentionally simpler.

Primary tasks:

```text
Find available device
Request loan
View my loans
Report damage
```

Administrative complexity should not be exposed.

---

# 83. Teacher UX

Teacher experience:

```text
Find devices
Request loan
View my loans
Report damage
```

If teacher has technician capability:

```text
Incidents
Maintenance
```

become available.

---

# 84. Role-Based Dashboard

## Admin Dashboard

Show:

- Total inventory
    
- Available devices
    
- Borrowed devices
    
- Maintenance devices
    
- Damaged devices
    
- Overdue loans
    
- Open incidents
    
- Recent activity
    

## Teacher Dashboard

Show:

- Available devices
    
- My loans
    
- Pending requests
    
- Recent activity
    

## Student Dashboard

Show:

- Available devices
    
- My active loans
    
- Pending requests
    
- Recently borrowed devices
    

## Technician Dashboard

Show:

- Open incidents
    
- Devices requiring attention
    
- Active maintenance
    
- Recent damage reports
    

---

# 85. Exception Visibility

Operational exceptions should receive stronger visual attention.

High visibility:

```text
Overdue
Damaged
Critical
Lost
Missing
```

Normal visibility:

```text
Available
Good
Completed
```

This helps users focus on what needs attention.

---

# 86. Progressive Disclosure

Do not expose every piece of information simultaneously.

Example Device Detail:

Primary:

- Device identity
    
- Status
    
- Condition
    
- Location
    

Secondary:

- Acquisition
    
- Warranty
    
- Description
    

Advanced:

- Activity
    
- History
    
- Maintenance
    
- Loan history
    

---

# 87. Design System Components

Required reusable components:

## Navigation

- App Shell
    
- Sidebar
    
- Header
    
- Breadcrumb
    
- User Menu
    

## Data

- Data Table
    
- Pagination
    
- Search
    
- Filter Bar
    
- Filter Drawer
    
- Sortable Header
    
- Status Badge
    
- Tag
    
- Empty State
    

## Forms

- Input
    
- Select
    
- Multi Select
    
- Date Picker
    
- Textarea
    
- Checkbox
    
- Radio
    
- File Upload
    
- Form Section
    

## Feedback

- Toast
    
- Alert
    
- Modal
    
- Confirmation Dialog
    
- Skeleton
    
- Error State
    
- Success State
    

## Operational

- KPI Card
    
- Timeline
    
- Activity Feed
    
- QR Code
    
- QR Scanner
    
- Stepper
    
- Progress Indicator
    
- Approval Panel
    

---

# 88. Component Consistency

Similar operations must use identical interaction patterns.

Examples:

Device Import:

```text
Upload
→ Mapping
→ Validation
→ Preview
→ Import
```

User Import:

```text
Upload
→ Mapping
→ Validation
→ Preview
→ Import
```

Device Bulk Edit:

```text
Select
→ Choose Action
→ Configure Value
→ Confirm
```

User Bulk Edit:

```text
Select
→ Choose Action
→ Configure Value
→ Confirm
```

---

# 89. Form Design Principles

Forms must:

- Group related fields
    
- Clearly identify required fields
    
- Show validation near fields
    
- Preserve user input when possible
    
- Prevent accidental data loss
    

Required fields should use:

```text
*
```

or explicit:

```text
Required
```

Do not use unclear placeholders as labels.

---

# 90. Destructive Actions

Destructive actions:

- Delete
    
- Deactivate
    
- Retire
    
- Dispose
    
- Reject
    

must use confirmation.

Example:

```text
Delete Category?

This category is currently used by 42 devices.

You must reassign those devices before
deleting this category.

[Cancel] [Review Devices]
```

System should prefer safe state transitions over destructive deletion.

---

# 91. Animation

Animation should be minimal and functional.

Allowed:

- Drawer transition
    
- Modal transition
    
- Dropdown transition
    
- Toast appearance
    
- Table state transition
    
- Progress transition
    

Avoid:

- Decorative animation
    
- Large page transitions
    
- Excessive motion
    
- Animated backgrounds
    

---

# 92. QR Scanner Design Principle

QR scanner should feel like a utility.

Do not turn it into a flashy camera experience.

Primary workflow:

```text
Scan
↓
Recognize Device
↓
Show Status
↓
Perform Action
```

---

# 93. Notification Priority

Notifications should be prioritized by operational importance.

High:

- Loan approval required
    
- Overdue loan
    
- Critical incident
    
- Device discrepancy
    

Medium:

- Maintenance update
    
- Loan reminder
    

Low:

- General activity
    

---

# 94. Design for Large Dataset

Inventory may contain hundreds or thousands of devices.

Therefore UI must support:

- Search
    
- Filter
    
- Sort
    
- Pagination
    
- Bulk selection
    
- Bulk editing
    
- Import
    
- Export
    

Never assume users will manually manage records one by one.

---

# 95. Design for Migration

Import interface must feel safe because it may be used to migrate from an existing platform.

Important visual elements:

```text
Records detected
Valid records
Warnings
Errors
Duplicates
```

Preview must be available before committing import.

---

# 96. Design for Operational Trust

The application manages physical equipment.

Users must be able to understand:

- Where the device is.
    
- What condition it is in.
    
- Who is using it.
    
- Whether it is available.
    
- What happened to it.
    
- Who changed its information.
    

Therefore detail pages and activity history are important.

---

# 97. Visual Priority

When deciding between visual decoration and information:

```text
Information > Action > Status > Decoration
```

---

# 98. Avoid Overdesign

Do not use:

- Glassmorphism
    
- Excessive gradients
    
- Huge hero sections
    
- Large illustrations
    
- 3D graphics
    
- Decorative blobs
    
- Excessive shadows
    
- Excessive rounded cards
    
- Neon colors
    
- Futuristic HUD interfaces
    
- Excessive animations
    

The application should look like a serious internal enterprise system.

---

# 99. Google Stitch Instructions

Google Stitch should use this document as the primary design specification.

Generate high-fidelity screens for the following:

```text
1. Application Shell
2. Admin Dashboard
3. Teacher Dashboard
4. Student Dashboard
5. Technician Dashboard
6. Device Inventory
7. Device Detail
8. Add Device
9. Edit Device
10. Device Import
11. Device Import Mapping
12. Device Import Validation
13. Device Import Preview
14. Loan Management
15. Multi-Device Selection
16. Loan Review
17. Loan Approval
18. Loan Detail
19. Return Device
20. Incident Management
21. Report Damage
22. Incident Detail
23. Technician Verification
24. Maintenance
25. Maintenance Detail
26. Stock Opname
27. QR Scanner
28. QR Scan Result
29. User Management
30. Add User
31. User Import
32. User Import Validation
33. User Bulk Edit
34. Category Management
35. Location Management
36. Reports
37. Activity Log
38. Settings
39. Empty States
40. Error States
41. Loading States
42. Confirmation Modals
```

---

# 100. Google Stitch Output Expectations

The generated design should include:

- Desktop screens
    
- Mobile screens for critical workflows
    
- Reusable components
    
- Consistent design tokens
    
- Consistent navigation
    
- Consistent table patterns
    
- Consistent forms
    
- Consistent status system
    

Critical states:

```text
Default
Hover
Selected
Disabled
Loading
Empty
Error
Success
Confirmation
```

---

# 101. Critical Screens for MVP

If Stitch limits the number of screens, prioritize:

### Priority 1

```text
Application Shell
Dashboard
Device Inventory
Device Detail
Multi-Device Loan Selection
Loan Review
Loan Approval
Incident Management
Technician Verification
User Management
```

### Priority 2

```text
Add Device
Device Import
Loan Detail
Return Flow
Maintenance
QR Scanner
Category Management
Location Management
```

### Priority 3

```text
Reports
Stock Opname
Activity Log
Settings
Advanced States
```

---

# 102. Implementation Handoff

Google Stitch output is a visual reference.

Google Antigravity should reproduce:

- Layout hierarchy
    
- Navigation
    
- Typography
    
- Spacing
    
- Component hierarchy
    
- Color semantics
    
- Table behavior
    
- Form structure
    
- Responsive behavior
    
- Interaction patterns
    
- Operational workflows
    

Generated Stitch code does not have to be reused if it conflicts with the selected application architecture.

Visual intent and UX behavior are more important than generated implementation code.

---

# 103. Antigravity Implementation Rule

When implementing the application:

1. Read `PRD.md`.
    
2. Read `DESIGN.md`.
    
3. Inspect all Stitch-generated assets and screens.
    
4. Identify reusable components.
    
5. Implement the application shell first.
    
6. Implement design tokens.
    
7. Implement shared components.
    
8. Implement pages module by module.
    
9. Connect pages to the actual data model.
    
10. Implement role-based access.
    
11. Implement validation and error handling.
    
12. Implement responsive behavior.
    
13. Test all critical workflows.
    

Do not implement pages independently with unrelated UI patterns.

---

# 104. Visual Source of Truth

When Stitch screenshots/design and implementation differ:

The implementation should reproduce the intended visual result shown by Stitch while maintaining:

- Accessibility
    
- Responsive behavior
    
- Component reusability
    
- Application architecture
    
- Backend security
    
- Performance
    

---

# 105. Design Acceptance Criteria

The design is considered complete when:

- All MVP modules have defined screens.
    
- Application shell is defined.
    
- Navigation is defined.
    
- Dashboard is defined.
    
- Device inventory is defined.
    
- Device detail is defined.
    
- Device creation/editing is defined.
    
- Device import is defined.
    
- Bulk device editing is defined.
    
- Multi-device loan selection is defined.
    
- Available/unavailable device states are defined.
    
- Loan approval is defined.
    
- Return flow is defined.
    
- Incident reporting is defined.
    
- Technician verification is defined.
    
- Maintenance is defined.
    
- QR scanner is defined.
    
- Stock opname is defined.
    
- User management is defined.
    
- User import is defined.
    
- Bulk user editing is defined.
    
- Category management is defined.
    
- Location management is defined.
    
- Reports are defined.
    
- Activity log is defined.
    
- Settings are defined.
    
- Empty states are defined.
    
- Loading states are defined.
    
- Error states are defined.
    
- Confirmation states are defined.
    
- Responsive behavior is defined.
    
- Role-based UI behavior is defined.
    
- Design system is consistent across modules.
    

---

# 106. Final Design Statement

The final product should feel like:

> A serious, modern, enterprise-grade asset management system designed specifically for managing school network equipment and learning facilities.

The application should combine:

```text
ManageEngine-style operational UX
+
Modern SaaS visual design
+
School-specific workflows
+
High information density
+
Simple user experience
```

Final visual target:

> Clean + Modern + Enterprise + Operational + Efficient + Easy to Understand

The design should never prioritize visual novelty over operational usability.
