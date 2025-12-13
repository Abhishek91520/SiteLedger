# SiteLedger

**Construction Execution & Billing System for Abhimanyu Tiling Works**

A single-project construction management and billing web application built with React, Tailwind CSS, Supabase, and React Three Fiber. Designed specifically for tracking construction progress, generating GST-compliant invoices, and maintaining immutable audit trails for a single contractor with three attached wings.

---

## 🎯 Project Overview

**Project:** Abhimanyu Tiling Works Main Project  
**Area:** 198,174 sq ft  
**Rate:** ₹90 per sq ft  
**Contract Value:** ₹17,83,56,600 (with 9% CGST + 9% SGST)

### Structure:
- **Wing A:** 16 floors × 4 flats each (3×2BHK + 1×1BHK) = 64 flats
- **Wing B:** 16 floors × 7 flats each (3×2BHK + 4×1BHK) = 112 flats
- **Wing C:** 17 floors (floors 1-16: 6 flats, floor 17: 4 flats) = 100 flats
- **Total:** 276 flats

### Special Features:
- **Refuge Flats with Joint Bathroom Logic:**
  - Wing A Flat 702 + Wing B Flat 702 → Share 1 bathroom
  - Wing A Flat 1202 + Wing B Flat 1202 → Share 1 bathroom
  - Wing C Flat 706 → 1 bathroom (independent refuge)
  - Wing C Flat 1206 → 1 bathroom (independent refuge)

- **Work Items:** A–I (fully DB-driven, configurable)
  - Items C–G: Locked quantities (270, 550, 270, 276, 276)
  - Items A, B, H, I: Editable until first proforma invoice

---

## 🚀 Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS (mobile-first, responsive)
- **3D Visualization:** React Three Fiber + Three.js
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Date Handling:** date-fns

---

## 📦 Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account** (free tier works)
- **Git** (optional, for version control)

---

## 🛠️ Installation & Setup

### 1. Clone or Extract Project

```bash
cd c:\Users\abhis\Desktop\SiteLedger
```

### 2. Install Dependencies

If you encounter PowerShell execution policy issues, use Command Prompt (cmd) or run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then install:

```bash
npm install
```

### 3. Set Up Supabase

#### a. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to initialize (~2 minutes)

#### b. Run Database Migration
1. In Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Copy the entire contents of `supabase/schema.sql`
4. Run the query
5. Verify tables are created in **Database → Tables**

You should see 12 tables:
- projects
- wings
- floors
- flats
- config_versions
- work_items
- work_item_applicability
- progress_entries
- proforma_invoices
- proforma_invoice_items
- proforma_invoice_breakup
- tax_invoices

#### c. Create Admin User
1. In Supabase Dashboard → **Authentication → Users**
2. Click **"Add user"**
3. Select **"Create new user"**
4. Enter email: `admin@example.com` (or your preferred email)
5. Enter a strong password
6. Confirm email manually (toggle "Auto Confirm User")
7. Click **"Create user"**

#### d. Get API Keys
1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (starts with `eyJhbGc...`)

### 4. Configure Environment Variables

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ IMPORTANT:** Never commit `.env` to version control!

### 5. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 6. Login

Use the admin credentials you created in Supabase:
- Email: `admin@example.com`
- Password: (your chosen password)

---

## 📂 Project Structure

```
SiteLedger/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.jsx       # Main layout with navigation
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx  # Authentication state management
│   ├── lib/
│   │   └── supabase.js      # Supabase client configuration
│   ├── pages/               # Route pages
│   │   ├── Login.jsx        # Login page
│   │   ├── Dashboard.jsx    # Project overview & stats
│   │   ├── VisualProgress.jsx  # 2.5D progress visualization
│   │   ├── DailyProgress.jsx   # Progress entry form
│   │   ├── Billing.jsx      # Proforma & Tax invoices
│   │   └── Settings.jsx     # Work item configuration
│   ├── utils/
│   │   └── format.js        # Indian currency & number formatting
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # App entry point
│   └── index.css            # Tailwind CSS + custom styles
├── supabase/
│   └── schema.sql           # Complete database schema
├── .env.example             # Environment variables template
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## 🔐 Authentication

- **Single Admin User Only:** No signup functionality
- **Login:** Email + Password (Supabase Auth)
- **Session Management:** Automatic with Supabase client
- **Protected Routes:** All pages except `/login` require authentication

---

## 📊 Database Schema Overview

### Master Data (Immutable):
- **projects:** Single project with area, rate, GST
- **wings:** A, B, C with floor counts
- **floors:** All floors per wing
- **flats:** 276 flats with BHK type, refuge logic, bathroom counts

### Configuration (Versioned):
- **config_versions:** Tracks config changes, locked after first proforma
- **work_items:** A–I work items with quantities, applicability

### Progress Tracking:
- **progress_entries:** Date + Wing + Floor + Flat + Work Item + Nos + Remarks
  - **Immutable once billed**
  - **Cannot be deleted or edited after billing**

### Invoicing:
- **proforma_invoices:** Work completed claims with GST
- **proforma_invoice_items:** Work items in each proforma
- **proforma_invoice_breakup:** Wing/floor/flat-wise proof
- **tax_invoices:** Actual payments received, linked to proformas

---

## 🎨 UI Features

### ✅ Implemented:
- **Responsive Design:** Mobile-first with bottom navigation
- **Modern UI:** Tailwind CSS with primary blue color scheme
- **Dashboard:** Contract summary, stats, quick actions
- **Daily Progress Entry:** Cascading dropdowns (Wing → Floor → Flat → Work Item)
- **Settings:** Work item configuration with lock status
- **Indian Number Formatting:** ₹1,78,35,660.00 (Lakhs/Crores)
- **Amount in Words:** "Rupees One Crore Seventy Eight Lakh..."

### 🚧 Pending Implementation:
- **Visual Progress (3D):** React Three Fiber visualization
- **Proforma Invoice Generation:** Select work items, PDF export
- **Tax Invoice Generation:** Link to proforma, payment tracking
- **Business Logic Guards:** Double completion prevention, applicability checks
- **PDF Export:** Invoice generation with Indian format

---

## 🧮 Business Logic Rules

### ✅ Enforced in Database:
1. **Immutability:** Billed progress entries cannot be deleted or edited
2. **Config Locking:** After first proforma, config version is locked
3. **Positive Quantities:** Progress quantities must be > 0
4. **Unique Constraints:** Flat numbers per floor, work item codes per version

### 🚧 To Be Implemented in App:
1. **Double Completion Prevention:** Check total completed vs total quantity
2. **Applicability Checks:** Block progress for non-applicable work items
3. **Proforma Validation:** Ensure unbilled work exists before generating
4. **Tax Invoice Validation:** Cannot exceed proforma amount

---

## 🌐 Deployment

### Option 1: Vercel (Recommended for React)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables:**
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. **Set Environment Variables:**
   - In Netlify dashboard → Site Settings → Environment Variables

### Supabase Configuration:
- **Auth Redirect URLs:** Add your production domain in Supabase Dashboard → Authentication → URL Configuration
- **Example:** `https://your-app.vercel.app/`

---

## 🧪 Testing Checklist

### Database:
- [ ] All 12 tables created
- [ ] 276 flats inserted (64 + 112 + 100)
- [ ] Refuge flats marked correctly (702, 1202 in A & B; 706, 1206 in C)
- [ ] Joint refuge partners linked (A-702 ↔ B-702, A-1202 ↔ B-1202)
- [ ] 9 work items created (A–I)
- [ ] Config version 1 is active

### Authentication:
- [ ] Admin user created in Supabase
- [ ] Can login with email/password
- [ ] Session persists on page refresh
- [ ] Logout redirects to login page

### Pages:
- [ ] Dashboard loads project stats
- [ ] Wing summary shows correct flat counts
- [ ] Contract value calculates correctly (₹17,83,56,600)
- [ ] Daily Progress form cascades Wing → Floor → Flat
- [ ] Work items dropdown shows A–I
- [ ] Settings page shows work items with lock status

### Formatting:
- [ ] Indian currency format: ₹1,78,35,660.00
- [ ] Amount in words: "Rupees One Crore..."

---

## 🐛 Known Issues & Pending Tasks

### Phase 1 (Current - Image-Free):
- ✅ Database schema complete
- ✅ Authentication working
- ✅ Dashboard implemented
- ✅ Daily Progress form functional
- ✅ Settings page with config locking
- 🚧 Visual Progress 3D view (placeholder only)
- 🚧 Proforma invoice generation
- 🚧 Tax invoice generation
- 🚧 PDF export functionality

### Phase 2 (Future):
- 📷 Image upload for progress entries
- 📊 Advanced analytics & reporting
- 🔔 Notifications for milestones
- 📱 PWA support for offline work
- 🧾 Payment tracking enhancements

---

## 📞 Support & Maintenance

### Common Issues:

**1. "npm command not found" in PowerShell:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**2. Supabase connection error:**
- Check `.env` file has correct URL and key
- Verify Supabase project is not paused
- Check browser console for CORS errors

**3. Login fails:**
- Verify admin user exists in Supabase Auth
- Check email confirmation status
- Try password reset in Supabase dashboard

**4. Tables not found:**
- Re-run `supabase/schema.sql`
- Check for SQL errors in Supabase logs
- Verify RLS policies are enabled

---

## 📄 License

**Proprietary Software**  
© 2025 Abhimanyu Tiling Works  
Not for redistribution or commercial use without permission.

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Lucide Icons](https://lucide.dev)

---

## 📝 Development Notes

### Critical Design Decisions:
1. **Immutable History:** Once billed, progress entries cannot be modified
2. **Derived Calculations:** "Pending" is never stored, always calculated
3. **Configuration Versioning:** Changes after first proforma create new versions
4. **Master Data Authority:** Flat structure, refuge logic, and bathroom counts are authoritative
5. **GST Compliance:** Separate base/CGST/SGST for all invoices
6. **Indian Standards:** Currency formatting, amount in words, Lakhs/Crores

### Future Extensibility:
- Schema supports images (can add `image_url` to progress_entries)
- Applicability table ready for custom exclusions
- Version system supports multiple configs
- Audit trails via `created_by`, `created_at`, `updated_at`

---

## � Invoice Features

### Proforma Invoices
- Multi-step invoice creation wizard
- Automatic work item selection from completed work
- Real-time GST calculation (CGST + SGST)
- **Amount in Words** (Indian numbering: Crores, Lakhs)
- PDF generation with professional templates
- Preview & Download functionality

### Tax Invoices (GST)
- Payment-based invoice generation
- Link to proforma invoices
- Multiple payment modes (Bank Transfer, UPI, Cheque, Cash, Card)
- Payment reference tracking
- **Amount in Words** display
- PDF export with tax invoice template

### PDF Features
- Professional company header with branding
- Detailed work items table
- GST breakup (CGST/SGST)
- Amount in words (Indian format)
- Payment details and references
- Authorized signatory section

## �🚀 Production Deployment

### Pre-Deployment Checklist:

#### 1. Database Migrations (Required):
Run these SQL files in Supabase SQL Editor:
```sql
-- Add rates to work items
sql/add_rate_to_work_items.sql

-- Setup refuge flat applicability rules
sql/setup_refuge_applicability.sql

-- Update work item names
sql/update_work_item_names.sql
```

#### 2. Environment Setup:
```bash
# Copy .env.example to .env
cp .env.example .env

# Add your Supabase credentials:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### 3. Build & Test:
```bash
npm run build
npm run preview
```

#### 4. Deploy:
- Recommended: Vercel or Netlify
- Set environment variables in hosting dashboard
- Deploy from main branch

### Special Configurations:

**Refuge Flats:**
- No kitchen work (items C & E automatically excluded)
- Joint refuge flats share bathrooms (0.5 quantity for work item D)

**Work Item Rates:**
- A: ₹0 (Marble Window Patti)
- B: ₹0 (WC & Bath Frame)  
- C: ₹5,285 (Kitchen Platform)
- D: ₹6,161 (Bathroom Tiles)
- E: ₹5,945 (Platform Tiles)
- F: ₹14,217 (Room & Balcony Flooring)
- G: ₹5,170 (Skirting)
- H: ₹0 (Tapa Riser)
- I: ₹0 (Shop Flooring)

---

## 🌐 Vercel Deployment

### Quick Start:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel login
vercel --prod
```

### Or use GitHub:
1. Push to GitHub
2. Import to Vercel.com
3. Add environment variables
4. Deploy! 🚀

📖 **Complete Guide:** See `VERCEL_DEPLOYMENT.md`

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

**Built with precision for construction execution discipline.**  
**Memory + Billing + Audit Safety = SiteLedger**
