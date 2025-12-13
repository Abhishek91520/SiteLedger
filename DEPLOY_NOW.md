# 🚀 Deploy SiteLedger to Vercel - Step by Step

## ✅ Step 1: Code is on GitHub
Your code is now at: **https://github.com/Abhishek91520/SiteLedger**

---

## 📝 Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended for First Time)

1. **Go to Vercel:**
   - Open: https://vercel.com
   - Click **"Sign Up"** or **"Login"**
   - Sign in with GitHub (recommended)

2. **Import Project:**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find **"Abhishek91520/SiteLedger"** in the list
   - Click **"Import"**

3. **Configure Project:**
   - **Project Name:** `siteledger` (or your choice)
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `./` (keep default)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)

4. **Add Environment Variables:**
   Click **"Environment Variables"** section:
   
   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://htefecajmenpzgonqkey.supabase.co`
   - Check all environments: ✅ Production, ✅ Preview, ✅ Development
   
   **Variable 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZWZlY2FqbWVucHpnb25xa2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MjAwODQsImV4cCI6MjA4MTE5NjA4NH0.QC5ozLBcWEBwiSfY8AZbH99OLTKzCPuUwiacS8tbSno`
   - Check all environments: ✅ Production, ✅ Preview, ✅ Development

5. **Deploy:**
   - Click **"Deploy"**
   - Wait 2-3 minutes for build to complete
   - ✅ Your site will be live!

---

### Option B: Using Vercel CLI (Faster for Future Deploys)

1. **Install Vercel CLI:**
   ```powershell
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```powershell
   vercel login
   ```
   - Choose your login method (GitHub recommended)
   - Complete authentication in browser

3. **Deploy:**
   ```powershell
   vercel
   ```
   
   **Answer the prompts:**
   - Set up and deploy? → **Y**
   - Which scope? → Select your account
   - Link to existing project? → **N**
   - What's your project's name? → `siteledger` (or your choice)
   - In which directory is your code located? → `./` (press Enter)
   - Want to override settings? → **N**

4. **Add Environment Variables:**
   You'll need to add environment variables via Vercel Dashboard:
   - Go to your project on vercel.com
   - Settings → Environment Variables
   - Add both variables as shown in Option A

5. **Redeploy with Environment Variables:**
   ```powershell
   vercel --prod
   ```

---

## 🌐 Your Site Will Be Live At:

After deployment, you'll get URLs like:
- **Production:** `https://siteledger.vercel.app`
- **Preview (branches):** `https://siteledger-git-branch.vercel.app`

---

## ✅ Post-Deployment Checklist

1. **Test Your Live Site:**
   - [ ] Open the Vercel URL
   - [ ] Try logging in (use your Supabase credentials)
   - [ ] Check Dashboard loads
   - [ ] Test 3D Visual Progress
   - [ ] Create a test invoice
   - [ ] Download PDF
   - [ ] Toggle dark mode
   - [ ] Test on mobile (DevTools)

2. **Verify Database Connection:**
   - [ ] Login works → Database connected ✅
   - [ ] Dashboard shows data → Queries working ✅
   - [ ] Can create invoices → Write operations working ✅

3. **Check for Errors:**
   - [ ] Open browser console (F12)
   - [ ] Look for red errors
   - [ ] Check Vercel deployment logs if issues

---

## 🔧 Troubleshooting

### Issue: Build Failed
**Check Vercel build logs for errors**
- Go to Deployments → Click on failed deployment
- Check "Building" section for error details

**Common fixes:**
```powershell
# Local test
npm install
npm run build
```

### Issue: Site loads but "Supabase Connection Error"
**Check environment variables:**
- Go to Vercel Dashboard → Settings → Environment Variables
- Ensure both variables are set for all environments
- Redeploy: Deployments → ⋯ Menu → Redeploy

### Issue: 404 on page refresh
**Should be fixed by `vercel.json`**
- Check that `vercel.json` is in your repository
- If not, it's already created and committed!

### Issue: PDF Generation Fails
**Usually works fine in production**
- jsPDF is included in bundle
- Test locally first: `npm run build && npm run preview`

---

## 🎯 Next Steps

1. **Custom Domain (Optional):**
   - Vercel Dashboard → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration

2. **Enable Analytics:**
   - Vercel Dashboard → Analytics
   - Enable Web Analytics (free)

3. **Set Up Continuous Deployment:**
   - Already configured! ✅
   - Push to `main` branch → Auto-deploys to production
   - Push to other branches → Creates preview deployments

4. **Monitor Your Site:**
   - Check Vercel Analytics for usage
   - Monitor Supabase dashboard for database metrics

---

## 🔄 Future Updates

To update your live site:

1. **Make changes locally**
2. **Commit:**
   ```powershell
   git add .
   git commit -m "Your update message"
   ```
3. **Push:**
   ```powershell
   git push origin main
   ```
4. **Vercel auto-deploys!** ✅

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **GitHub Repo:** https://github.com/Abhishek91520/SiteLedger

---

## 🎉 You're Ready!

**Choose your deployment method:**
- 🌐 Vercel Dashboard: https://vercel.com
- 💻 Vercel CLI: `vercel`

**Your app will be live in ~2 minutes!** 🚀

---

**Built with ❤️ for Abhimanyu Tiling Works**
