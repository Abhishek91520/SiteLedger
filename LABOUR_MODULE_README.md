# Labour & Attendance Management Module

## Overview
Complete labour management system for **Abhimanyu Tiling Works** to digitize the traditional khata (attendance register) system for daily-wage workers.

---

## ✅ COMPLETED COMPONENTS

### 1. Database Schema (sql/labour_attendance_schema.sql)
**Status:** ✅ Ready for execution

**Tables Created:**
- `workers` - Worker master data
- `worker_attendance` - Daily attendance records
- `worker_settlements` - Monthly/final settlements

**Views Created:**
- `v_worker_unpaid_balance` - Real-time unpaid balance per worker
- `v_monthly_labour_cost` - Monthly labour cost aggregation

**Features:**
- Row-Level Security (RLS) policies
- Automatic timestamps with triggers
- JSONB fields for edit history and attendance breakdown
- Composite indexes for performance

---

### 2. Pages

#### A. Workers Page (src/pages/Workers.jsx)
**Status:** ✅ Complete

**Features:**
- Worker list with search (name/mobile/category)
- Status filters (Active/Released/All)
- WorkerCard component with wage display
- Smart Call/WhatsApp buttons (opens dialer/WhatsApp directly)
- Add/Edit/View/Release/Reactivate actions
- Mobile-responsive grid layout

**Dependencies:**
- AddEditWorkerModal
- WorkerDetailsModal
- ReleaseWorkerModal

#### B. Daily Attendance Page (src/pages/DailyAttendance.jsx)
**Status:** ✅ Complete

**Features:**
- Mobile-first design for on-site use
- Date selector (max = today)
- One-tap attendance marking (6 types)
- Real-time daily pay calculation display
- Kharci input with validation
- Kharci override with warning prompt
- Remarks field per worker
- Attendance blocking (before joining/after release)
- Batch save with upsert (prevents duplicates)

**Attendance Types & Multipliers:**
- P (Present) = 1.0
- H (Half Day) = 0.5
- P+¼ (Present + Quarter) = 1.25
- P+½ (Present + Half) = 1.5
- P+P (Double) = 2.0
- A (Absent) = 0.0

**Pay Formula:**
```
Daily Pay = (Base Wage × Multiplier) + Travel Allowance
```
**Note:** Travel allowance is NOT multiplied (paid fully for all attendance types except A)

#### C. Settlements Page (src/pages/Settlements.jsx)
**Status:** ✅ Complete

**Features:**
- Project-wise filtering
- Month selection
- Workers list with unpaid balances
- Current month statistics (days worked, earned, kharci)
- Settlement calculation modal
- Attendance breakdown display
- Partial payment support
- Balance carryforward
- Payment mode (Cash/Online)

**Workflow:**
1. Select project and month
2. View workers with pending balances
3. Click "Settle" on worker
4. Review calculation (earned - kharci)
5. Enter payment details
6. Process settlement

#### D. Labour Reports Page (src/pages/LabourReports.jsx)
**Status:** ✅ Complete

**Features:**
- Key metrics dashboard
  - Active workers count
  - Monthly labour cost
  - Pending payments summary
  - Total kharci taken
- Month-over-month comparison
- Attendance breakdown chart
- Project-wise filtering
- Month selection
- Visual analytics with color-coded metrics

---

### 3. Components

#### A. AddEditWorkerModal (src/components/labour/AddEditWorkerModal.jsx)
**Status:** ✅ Complete

**Features:**
- Dual mode (Add/Edit)
- Form fields:
  - Full Name (required)
  - Primary Mobile (10 digits, required)
  - Secondary Mobile (optional)
  - Age (18-100, required)
  - Category: Helper/Mason (required)
  - Base Daily Wage (required)
  - Travel Allowance (optional)
  - Joining Date (required)
  - Project Assignment (required)
- Image uploads (optional):
  - Worker photo
  - Aadhaar front
  - Aadhaar back
- Validation:
  - Mobile: 10 digits only
  - Age: 18-100 range
  - Max file size: 2MB
  - Image type validation
- Supabase Storage integration
- Image preview with hover to replace
- Loading states

#### B. WorkerDetailsModal (src/components/labour/WorkerDetailsModal.jsx)
**Status:** ✅ Complete

**Features:**
- Complete worker profile display
- Status indicator (Active/Released)
- Wage breakdown display
- Contact information with Call/WhatsApp buttons
- Timeline (joining date, last working date)
- Release reason display (if released)
- Project assignment
- Document viewer (photo, Aadhaar)
- Mobile-responsive layout

#### C. ReleaseWorkerModal (src/components/labour/ReleaseWorkerModal.jsx)
**Status:** ✅ Complete

**Features:**
- Last working date selection
- Release reason input (required)
- Final settlement calculation
- Work summary:
  - Total days worked
  - Attendance breakdown
- Financial summary:
  - Total earned
  - Total kharci taken
  - Previous payments
  - Net payable
- Payment details:
  - Payment mode (Cash/Online)
  - Payment date
  - Amount paid (pre-filled with net payable)
  - Partial payment support
  - Payment remarks
- Balance remaining calculation
- Worker status update to 'released'
- Attendance locking after release

---

### 4. Navigation Integration

**Updated Files:**
- src/App.jsx - Added routes
- src/components/Layout.jsx - Added menu items

**New Routes:**
- /workers - Worker management
- /daily-attendance - Daily attendance marking
- /settlements - Monthly salary processing
- /labour-reports - Analytics & reports

**Menu Items Added:**
- Workers (Users icon)
- Attendance (Calendar icon)
- Settlements (DollarSign icon)
- Labour Reports (BarChart3 icon)

---

## Business Rules Implemented

### Worker Management
✅ Workers are NEVER deleted (only released and can be reactivated)  
✅ Workers are system-wide but attendance is project-specific  
✅ Only 2 categories: Helper and Mason (hardcoded)  
✅ Age validation: 18-100 years  
✅ Mobile validation: Exactly 10 digits  

### Attendance Rules
✅ Fixed attendance types (6 types, no custom)  
✅ Formula: (base_wage × multiplier) + travel_allowance  
✅ Travel allowance NEVER multiplied (full amount for P/H/P+¼/P+½/P+P, zero for A)  
✅ Cannot mark attendance before joining_date  
✅ Cannot mark attendance after last_working_date (for released workers)  
✅ Attendance can be edited (with audit trail in JSONB field)  
✅ No automatic holidays (manual marking only)  

### Kharci System
✅ Kharci = Early salary withdrawal  
✅ Validation against unpaid balance  
✅ Override allowed with warning prompt  
✅ Negative balance allowed (intentional for business flexibility)  
✅ Kharci tracked in daily attendance records  

### Settlement Rules
✅ Configurable settlement day per project (default: 10th of month)  
✅ Monthly settlements settle PREVIOUS month  
✅ Mid-month release triggers immediate final settlement  
✅ Settlement types: 'monthly' and 'final'  
✅ Partial payments supported (balance carryforward)  
✅ Attendance breakdown stored in JSONB  
✅ Payment modes: Cash or Online  

### Image Management
✅ Optional images: Worker photo, Aadhaar front/back  
✅ Max file size: 2MB per image  
✅ Auto-compression recommended (handled by browser)  
✅ Stored in Supabase Storage bucket: 'labour-documents'  
✅ Public read access for images  

---

## 📋 TODO: Pre-Launch Checklist

### 1. Database Setup
- [ ] Create Supabase Storage bucket named 'labour-documents'
  - Bucket settings: Public read access
  - Max file size: 2MB
  - Allowed types: image/*
  
- [ ] Execute SQL migration
  ```bash
  # Run in Supabase SQL Editor
  # File: sql/labour_attendance_schema.sql
  ```

- [ ] Verify tables created:
  - [ ] workers
  - [ ] worker_attendance
  - [ ] worker_settlements

- [ ] Verify views created:
  - [ ] v_worker_unpaid_balance
  - [ ] v_monthly_labour_cost

- [ ] Test RLS policies (insert/update/delete as authenticated user)

### 2. Project Configuration
- [ ] Add `settlement_day` field to existing projects table (if not present)
  ```sql
  ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS settlement_day INTEGER DEFAULT 10;
  ```

- [ ] Set settlement day for each project (default: 10)

### 3. Testing Workflow

#### Test 1: Add Worker
- [ ] Open /workers
- [ ] Click "Add Worker"
- [ ] Fill all mandatory fields
- [ ] Upload worker photo (optional)
- [ ] Upload Aadhaar images (optional)
- [ ] Save and verify worker appears in list

#### Test 2: Mark Attendance
- [ ] Open /daily-attendance
- [ ] Select today's date
- [ ] Mark attendance for test worker (try all 6 types)
- [ ] Enter kharci amount
- [ ] Add remarks
- [ ] Save and verify success message

#### Test 3: Settlement
- [ ] Open /settlements
- [ ] Select project and current month
- [ ] Click "Settle" on test worker
- [ ] Review calculation
- [ ] Enter payment details
- [ ] Process settlement
- [ ] Verify worker's balance updated

#### Test 4: Release Worker
- [ ] Open /workers
- [ ] Click "Release" on test worker
- [ ] Select last working date
- [ ] Enter release reason
- [ ] Calculate settlement
- [ ] Enter payment details
- [ ] Confirm release
- [ ] Verify worker status changed to "Released"
- [ ] Try marking attendance (should be blocked)

#### Test 5: Reports
- [ ] Open /labour-reports
- [ ] Select project and month
- [ ] Verify all statistics display correctly
- [ ] Check month-over-month comparison
- [ ] Verify attendance breakdown

### 4. Mobile Testing
- [ ] Test Workers page on mobile
- [ ] Test Daily Attendance on mobile (primary use case)
- [ ] Test Settlement modal on mobile
- [ ] Test Worker Details modal on mobile
- [ ] Verify Call/WhatsApp buttons work on mobile

### 5. Edge Cases
- [ ] Mark attendance for same worker twice (should update, not duplicate)
- [ ] Try kharci amount exceeding balance (should show override prompt)
- [ ] Edit attendance (verify edit_history JSONB updated)
- [ ] Release worker mid-month (verify final settlement calculated correctly)
- [ ] Reactivate released worker (verify status changes back to active)
- [ ] Upload image > 2MB (should show error)
- [ ] Upload non-image file (should show error)

---

## Formula Reference

### Daily Pay Calculation
```javascript
const calculateDailyPay = (baseWage, travelAllowance, attendanceMultiplier) => {
  if (attendanceMultiplier === 0) { // Absent
    return 0
  }
  return (baseWage * attendanceMultiplier) + travelAllowance
}
```

### Examples (Base: ₹500, TA: ₹50)
- **P** (Present): (500 × 1.0) + 50 = ₹550
- **H** (Half): (500 × 0.5) + 50 = ₹300
- **P+¼**: (500 × 1.25) + 50 = ₹675
- **P+½**: (500 × 1.5) + 50 = ₹800
- **P+P** (Double): (500 × 2.0) + 50 = ₹1,050
- **A** (Absent): 0 (no wage, no TA)

### Settlement Calculation
```javascript
Net Payable = Total Earned - Total Kharci - Previous Settlements
```

### Unpaid Balance (Real-time View)
```sql
SELECT 
  (total_earned - total_kharci - total_paid) as unpaid_balance
FROM v_worker_unpaid_balance
WHERE worker_id = ?
```

---

## Integration Points

### Existing System
- **Auth:** Uses existing `useAuth` hook (no new roles/permissions)
- **Projects:** Links to existing `projects` table
- **Supabase:** Uses existing Supabase client
- **Theme:** Uses existing dark mode support
- **Navigation:** Integrated into existing Layout component

### Storage Structure
```
labour-documents/
├── worker-photos/
│   └── {worker_id}_{timestamp}.jpg
├── aadhaar-front/
│   └── {worker_id}_{timestamp}.jpg
└── aadhaar-back/
    └── {worker_id}_{timestamp}.jpg
```

---

## Performance Optimizations

1. **Batch Queries:** Settlements page loads all worker data with balances in parallel
2. **Views:** Database views pre-calculate unpaid balances and monthly costs
3. **Indexes:** Composite indexes on (worker_id, attendance_date) and (project_id, settlement_month, settlement_year)
4. **Upsert:** Daily attendance uses upsert to prevent duplicates
5. **Image Compression:** Client-side image compression before upload (recommended)

---

## Security

- **RLS Policies:** All tables have Row-Level Security enabled
- **Auth Required:** All operations require authenticated user
- **Data Integrity:** Foreign keys ensure referential integrity
- **Audit Trail:** Edit history stored in JSONB for attendance changes
- **No Deletions:** Workers can only be released, never deleted

---

## Mobile-First Design

All pages are optimized for mobile devices:
- Touch-friendly buttons (min 44×44 px)
- Responsive grid layouts
- Bottom sheet modals
- One-tap actions (attendance marking)
- Direct dialer/WhatsApp integration
- Minimal typing required

---

## Future Enhancements (Not in Scope)

- SMS notifications for settlements
- Biometric attendance
- QR code-based marking
- Worker self-service portal
- Advanced analytics/charts
- Export to Excel/PDF
- Multiple project assignments
- Shift-based attendance
- Automatic holiday marking
- Loan/advance management

---

## Support & Documentation

### Key Files
- Schema: `sql/labour_attendance_schema.sql`
- Workers: `src/pages/Workers.jsx`
- Attendance: `src/pages/DailyAttendance.jsx`
- Settlements: `src/pages/Settlements.jsx`
- Reports: `src/pages/LabourReports.jsx`
- Modals: `src/components/labour/`

### Database Views
- `v_worker_unpaid_balance` - Real-time worker balances
- `v_monthly_labour_cost` - Monthly cost aggregation

### Quick Reference
- Attendance Types: P, H, P+¼, P+½, P+P, A
- Pay Formula: (base × multiplier) + TA
- Settlement: earned - kharci - paid

---

**Module Status:** ✅ **READY FOR TESTING**

**Next Step:** Execute SQL migration and create Supabase Storage bucket

---

## Contact
For questions or issues, refer to conversation history or contact development team.

Last Updated: January 3, 2025
