# ✅ Pre-Deployment Checklist

Use this checklist before deploying to Vercel:

## 🔐 Supabase Setup

- [ ] Database migrations executed
  - [ ] `sql/add_rate_to_work_items.sql`
  - [ ] `sql/setup_refuge_applicability.sql`
  - [ ] `sql/update_work_item_names.sql`

- [ ] Row Level Security (RLS) enabled on all tables

- [ ] Get Supabase credentials:
  - [ ] Project URL (from Settings → API)
  - [ ] Anon/Public key (from Settings → API)

## 💻 Local Setup

- [ ] Dependencies installed: `npm install`
- [ ] `.env` file created with:
  ```
  VITE_SUPABASE_URL=your_url
  VITE_SUPABASE_ANON_KEY=your_key
  ```
- [ ] Local dev server works: `npm run dev`
- [ ] Test production build: `npm run build`
- [ ] Preview build works: `npm run preview`

## 🧪 Testing

- [ ] Login/Logout works
- [ ] Dashboard displays correctly
- [ ] Bulk Update saves data
- [ ] 3D Visual Progress renders
- [ ] Billing creates invoices
- [ ] PDF download works
- [ ] PDF preview opens
- [ ] Dark mode toggles
- [ ] Mobile view responsive

## 📁 Files Ready

- [ ] `vercel.json` exists (for routing)
- [ ] `.gitignore` includes `.env`
- [ ] `.env.example` has template
- [ ] README.md updated
- [ ] No console.log statements (or wrapped in DEV checks)

## 🚀 Vercel Configuration

### If using Vercel CLI:
- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] Logged in: `vercel login`

### If using GitHub:
- [ ] Repository created on GitHub
- [ ] Code committed to Git
- [ ] Pushed to GitHub

## 🌍 Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

- [ ] `VITE_SUPABASE_URL` added
  - Value: `https://your-project.supabase.co`
  - Environments: Production, Preview, Development

- [ ] `VITE_SUPABASE_ANON_KEY` added
  - Value: Your anon/public key
  - Environments: Production, Preview, Development

## 📋 Post-Deployment

After deployment:

- [ ] Site loads at Vercel URL
- [ ] Test login with real credentials
- [ ] Verify database connection
- [ ] Check all pages load
- [ ] Test invoice PDF generation
- [ ] Verify mobile responsiveness
- [ ] Check console for errors (F12)
- [ ] Test dark mode
- [ ] Share URL with team

## 🐛 Troubleshooting

If issues occur:

- [ ] Check Vercel deployment logs
- [ ] Verify environment variables set correctly
- [ ] Check Supabase logs
- [ ] Test locally with production build
- [ ] Clear browser cache
- [ ] Try different browser

## 📊 Performance

After deployment:

- [ ] Check Vercel Analytics
- [ ] Monitor Web Vitals
- [ ] Test load speed
- [ ] Check mobile performance

## 🎯 Optional Enhancements

- [ ] Set up custom domain
- [ ] Configure SSL (auto with Vercel)
- [ ] Enable Vercel Analytics
- [ ] Set up error monitoring
- [ ] Configure branch deploys

---

## Quick Deploy Commands

### Option 1: Vercel CLI
```bash
vercel login
vercel        # Preview
vercel --prod # Production
```

### Option 2: PowerShell Script
```powershell
.\deploy.ps1
```

### Option 3: Bash Script
```bash
./deploy.sh
```

---

**Ready to deploy?** See `VERCEL_DEPLOYMENT.md` for detailed instructions!
