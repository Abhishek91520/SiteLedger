# Pre-Production Quick Fixes
# Run this checklist before deploying to production

echo "🚀 SiteLedger - Production Preparation"
echo "======================================"
echo ""

# 1. Check if migrations are ready
echo "✓ Step 1: Database migrations ready"
echo "  - sql/add_rate_to_work_items.sql"
echo "  - sql/setup_refuge_applicability.sql"  
echo "  - sql/update_work_item_names.sql"
echo "  ⚠️  Run these in Supabase SQL Editor!"
echo ""

# 2. Build the production version
echo "✓ Step 2: Building production version..."
npm run build

if [ $? -eq 0 ]; then
    echo "  ✓ Build successful!"
else
    echo "  ✗ Build failed! Fix errors before proceeding."
    exit 1
fi
echo ""

# 3. Preview the production build
echo "✓ Step 3: Test production build locally"
echo "  Run: npm run preview"
echo "  Then test all features manually"
echo ""

# 4. Environment check
echo "✓ Step 4: Environment variables"
if [ -f ".env" ]; then
    echo "  ✓ .env file exists"
else
    echo "  ✗ .env file missing!"
    echo "  Copy .env.example and fill in your values"
fi
echo ""

# 5. Final checklist
echo "✓ Step 5: Final Checklist"
echo "  [ ] Database migrations executed"
echo "  [ ] Environment variables configured"
echo "  [ ] Production build tested locally"
echo "  [ ] Manual QA completed"
echo "  [ ] All features tested"
echo "  [ ] Mobile responsive checked"
echo "  [ ] Dark mode tested"
echo "  [ ] Authentication flow tested"
echo "  [ ] Billing calculations verified"
echo "  [ ] Refuge flat rules tested"
echo ""

echo "📋 Next Steps:"
echo "  1. Deploy to Vercel/Netlify"
echo "  2. Configure production environment variables"
echo "  3. Test on staging first"
echo "  4. Monitor for errors in first 24 hours"
echo ""
echo "🎉 Good luck with your launch!"
