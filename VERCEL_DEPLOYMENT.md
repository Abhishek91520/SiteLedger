# Vercel Deployment Guide for SiteLedger

## 🚀 Quick Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   - First deployment will ask configuration questions
   - Accept defaults or customize as needed
   - Project will be deployed to a preview URL

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

---

### Option 2: Deploy via Vercel Dashboard (Easiest)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Vercel deployment"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click **"Add New..."** → **"Project"**
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Configure Environment Variables:**
   - Click **"Environment Variables"**
   - Add these variables:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Get these from: Supabase Dashboard → Project Settings → API

4. **Deploy:**
   - Click **"Deploy"**
   - Wait 2-3 minutes
   - Your site will be live at `your-project.vercel.app`

---

## ⚙️ Environment Variables Setup

### In Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add these variables for **Production**, **Preview**, and **Development**:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Getting Supabase Credentials:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"Settings"** (⚙️) → **"API"**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

---

## 📋 Pre-Deployment Checklist

### 1. Database Migrations
✅ Run these in Supabase SQL Editor before deploying:

```sql
-- 1. Add rates to work items
-- Run: sql/add_rate_to_work_items.sql

-- 2. Setup refuge flat rules
-- Run: sql/setup_refuge_applicability.sql

-- 3. Update work item names (if not done)
-- Run: sql/update_work_item_names.sql
```

### 2. Environment Variables
✅ Create `.env` file locally (for testing):

```env
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```

⚠️ **NEVER commit `.env` to Git!** (Already in `.gitignore`)

### 3. Build Test
✅ Test production build locally:

```bash
npm run build
npm run preview
```

Open http://localhost:4173 and test:
- Login/Logout
- Dashboard loads
- 3D Visual Progress renders
- Billing invoices work
- PDF download/preview works

### 4. Remove Console Logs (Optional)
Search for `console.log` in:
- `src/pages/Billing.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/VisualProgress.jsx`

Either remove or wrap in development checks:
```javascript
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
}
```

---

## 🔧 Vercel Configuration Explained

### vercel.json

```json
{
  "buildCommand": "npm run build",           // Builds with Vite
  "outputDirectory": "dist",                 // Vite output folder
  "framework": "vite",                       // Auto-detected
  "rewrites": [
    {
      "source": "/(.*)",                     // Catch all routes
      "destination": "/index.html"           // SPA routing
    }
  ]
}
```

**Why rewrites?**
- Enables React Router to work on Vercel
- All routes (e.g., `/billing`, `/visual-progress`) serve `index.html`
- React Router handles client-side routing

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain:

1. Go to Project Settings → Domains
2. Click **"Add Domain"**
3. Enter your domain: `siteledger.yourdomain.com`
4. Follow DNS configuration instructions
5. Vercel will auto-provision SSL certificate

### DNS Records:
```
Type: CNAME
Name: siteledger (or @)
Value: cname.vercel-dns.com
```

---

## 🔐 Security Configuration

### Supabase Row Level Security (RLS)

Ensure RLS is enabled for all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;

-- Add policies (example for projects)
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);
```

---

## 🚨 Troubleshooting

### Issue: "Build Failed"

**Check:**
1. Environment variables set correctly in Vercel
2. Run `npm run build` locally to see errors
3. All dependencies in `package.json`

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: "Page Not Found on Refresh"

**Problem:** Vercel not routing correctly

**Solution:** Ensure `vercel.json` has rewrites (already added)

### Issue: "Supabase Connection Failed"

**Check:**
1. Environment variables in Vercel Dashboard
2. Variable names: `VITE_` prefix required
3. No trailing slashes in URL
4. Correct anon key (not service_role key)

**Test:**
```bash
# In browser console
console.log(import.meta.env.VITE_SUPABASE_URL)
// Should show your Supabase URL
```

### Issue: "3D Visualization Not Loading"

**Cause:** Three.js bundles can be large

**Solution:**
- Already optimized with code splitting
- Vercel handles this automatically
- If still slow, enable compression in `vercel.json` (already configured)

### Issue: "PDF Download Not Working"

**Check:**
1. jsPDF libraries included in bundle
2. No CORS issues (shouldn't be an issue with jsPDF)
3. Browser allows downloads

**Test:**
```bash
# Check bundle includes jsPDF
npm run build
# Look for jspdf in dist/assets/*.js
```

---

## 📊 Deployment Analytics

### Vercel Analytics (Free Tier)

Enable in Vercel Dashboard:
1. Go to Analytics tab
2. Enable **Web Analytics**
3. See:
   - Page views
   - Unique visitors
   - Top pages
   - Device breakdown

### Performance Monitoring

Vercel automatically tracks:
- Build times
- Deploy duration
- Page load speed (Web Vitals)

---

## 🔄 Continuous Deployment

### Automatic Deploys:

Once connected to GitHub:
- ✅ Push to `main` → Auto-deploy to production
- ✅ Push to other branches → Auto-deploy to preview URL
- ✅ Pull Requests → Preview deployment with unique URL

### Branch Protection:

Recommended Git workflow:
```bash
# Development
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature
# Create PR → Preview deployment

# Production
git checkout main
git merge feature/new-feature
git push origin main
# Auto-deploy to production
```

---

## 🎯 Post-Deployment

### 1. Test Everything:

- [ ] Login/Logout works
- [ ] Dashboard shows correct data
- [ ] Bulk Update saves flats
- [ ] 3D Visual Progress renders
- [ ] Billing creates invoices
- [ ] PDF download works
- [ ] PDF preview opens
- [ ] Dark mode toggle works
- [ ] Mobile view responsive

### 2. Share URLs:

- **Production:** `https://your-project.vercel.app`
- **Preview:** `https://your-project-git-branch.vercel.app`

### 3. Monitor:

- Check Vercel Dashboard for errors
- Monitor Supabase logs
- Watch for user feedback

---

## 💰 Vercel Pricing

### Hobby Plan (Free):
- ✅ Unlimited projects
- ✅ Automatic HTTPS
- ✅ Serverless functions
- ✅ 100GB bandwidth/month
- ✅ Fast CDN
- **Perfect for SiteLedger!**

### Pro Plan ($20/month):
- Everything in Hobby
- Advanced analytics
- More bandwidth
- Team collaboration

---

## 📞 Support

### Vercel Help:
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

### SiteLedger Issues:
- Check `TESTING_INVOICE.md` for testing guide
- Check `INVOICE_IMPLEMENTATION.md` for technical details
- Review console logs in browser DevTools

---

## ✅ Deployment Checklist

Before clicking Deploy:

- [ ] Supabase migrations executed
- [ ] Environment variables added to Vercel
- [ ] Local build test passed (`npm run build`)
- [ ] `.gitignore` includes `.env`
- [ ] `vercel.json` created
- [ ] Git repository initialized
- [ ] Code committed to GitHub (if using GitHub deploy)
- [ ] Console logs removed or wrapped
- [ ] README.md updated with production URL

After Deployment:

- [ ] Test login on live site
- [ ] Verify database connection
- [ ] Test invoice PDF generation
- [ ] Check mobile responsiveness
- [ ] Share URL with team

---

## 🎉 You're Ready!

Choose your deployment method:

### Quick Start (CLI):
```bash
npm install -g vercel
vercel login
vercel
```

### Or use Vercel Dashboard:
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

**Your site will be live in ~2 minutes! 🚀**
