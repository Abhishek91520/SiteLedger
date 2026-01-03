# Quick Installation Guide - Labour Module

## Step 1: Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Bucket name: `labour-documents`
4. Make it **Public** (for image URLs to work)
5. Click "Create bucket"

### Set Storage Policies

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload labour documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'labour-documents');

-- Allow public read access
CREATE POLICY "Public can view labour documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'labour-documents');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update labour documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'labour-documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete labour documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'labour-documents');
```

## Step 2: Execute SQL Migration

1. Go to Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy entire contents of `sql/labour_attendance_schema.sql`
4. Paste and click "Run"
5. Verify success messages

### Verify Tables Created

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('workers', 'worker_attendance', 'worker_settlements');

-- Should return 3 rows
```

### Verify Views Created

```sql
-- Check if views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('v_worker_unpaid_balance', 'v_monthly_labour_cost');

-- Should return 2 rows
```

## Step 3: Add Settlement Day to Projects

If your projects table doesn't have `settlement_day` field:

```sql
-- Add settlement_day column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS settlement_day INTEGER DEFAULT 10;

-- Set default value for existing projects
UPDATE projects 
SET settlement_day = 10 
WHERE settlement_day IS NULL;
```

## Step 4: Test the Module

### A. Test Worker Creation

1. Navigate to **Workers** page
2. Click **"+ Add Worker"**
3. Fill in:
   - Name: Test Worker
   - Mobile: 9876543210
   - Age: 25
   - Category: Helper
   - Base Wage: 500
   - Travel Allowance: 50
   - Joining Date: Today
   - Project: Select any
4. (Optional) Upload images
5. Click **Save**
6. Verify worker appears in list

### B. Test Attendance Marking

1. Navigate to **Attendance** page
2. You should see "Test Worker" in the list
3. Click **P** (Present) button
4. Daily pay should show: ₹550 (500 + 50)
5. Enter Kharci: 200
6. Add Remarks: Test attendance
7. Click **Save All Attendance**
8. Verify success message

### C. Test Settlement

1. Navigate to **Settlements** page
2. Select current month
3. You should see "Test Worker" with balance
4. Click **Settle**
5. Review calculation:
   - Earned: ₹550
   - Kharci: ₹200
   - Net Payable: ₹350
6. Enter payment details
7. Click **Confirm Settlement**
8. Verify settlement processed

### D. Test Worker Release

1. Navigate to **Workers** page
2. Click **Release** on "Test Worker"
3. Enter last working date: Today
4. Enter reason: Testing
5. Click **Calculate Final Settlement**
6. Review and enter payment
7. Click **Confirm Release**
8. Verify worker shows as "Released"
9. Try marking attendance (should be blocked)

### E. Test Reports

1. Navigate to **Labour Reports** page
2. Select current month
3. Verify all statistics:
   - Active Workers: Should show count
   - Monthly Cost: Should show total
   - Pending Payments: Should show balance
   - Attendance Breakdown: Should show P: 1

## Step 5: Mobile Testing

1. Open on mobile browser
2. Test **Attendance** page (main mobile use case):
   - Tap attendance types
   - Enter kharci
   - Save
3. Test Call/WhatsApp buttons in Workers page
4. Verify responsive layout

## Step 6: Clean Up Test Data (Optional)

```sql
-- Delete test attendance
DELETE FROM worker_attendance WHERE worker_id IN (
  SELECT id FROM workers WHERE full_name = 'Test Worker'
);

-- Delete test settlements
DELETE FROM worker_settlements WHERE worker_id IN (
  SELECT id FROM workers WHERE full_name = 'Test Worker'
);

-- Release test worker (don't delete, just release)
UPDATE workers 
SET status = 'released', 
    last_working_date = CURRENT_DATE,
    release_reason = 'Test data cleanup'
WHERE full_name = 'Test Worker';
```

## Troubleshooting

### Issue: "relation 'workers' does not exist"
**Solution:** SQL migration not executed. Go to Step 2.

### Issue: Images not uploading
**Solution:** Storage bucket not created or not public. Go to Step 1.

### Issue: "Cannot insert into worker_attendance"
**Solution:** RLS policies blocking. Check if you're authenticated.

### Issue: Views returning empty data
**Solution:** No data in tables yet. Add workers and mark attendance first.

### Issue: Settlement day not showing in projects
**Solution:** Run SQL from Step 3 to add column.

## Quick SQL Checks

```sql
-- Count workers
SELECT status, COUNT(*) 
FROM workers 
GROUP BY status;

-- Count attendance records
SELECT COUNT(*) as total_attendance 
FROM worker_attendance;

-- Count settlements
SELECT settlement_type, COUNT(*) 
FROM worker_settlements 
GROUP BY settlement_type;

-- Check unpaid balances
SELECT w.full_name, v.unpaid_balance
FROM v_worker_unpaid_balance v
JOIN workers w ON w.id = v.worker_id
WHERE v.unpaid_balance > 0;
```

## All Set! 🎉

Your Labour & Attendance Management module is now ready to use.

### Quick Access URLs

- Workers: http://localhost:5173/workers
- Attendance: http://localhost:5173/daily-attendance
- Settlements: http://localhost:5173/settlements
- Reports: http://localhost:5173/labour-reports

---

**Need Help?** Refer to `LABOUR_MODULE_README.md` for complete documentation.
