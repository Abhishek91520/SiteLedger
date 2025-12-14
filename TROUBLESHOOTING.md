# Common Issues & Solutions

## 🚨 Issue 1: "Failed to upload images"

### Possible Causes:
1. Storage bucket not created
2. Storage policies not applied
3. File too large (>5MB)
4. Network issue

### Solutions:

**Step 1: Verify Storage Bucket Exists**
```
1. Go to Supabase Dashboard
2. Navigate to Storage
3. Check if "flat-images" bucket exists
4. If not, create it (Private bucket, 5MB limit)
```

**Step 2: Apply Storage Policies**
```sql
-- Run this in Supabase SQL Editor:
-- (Copy from sql/storage_setup.sql)

CREATE POLICY "Authenticated users can upload flat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flat-images');

CREATE POLICY "Authenticated users can view flat images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'flat-images');

CREATE POLICY "Authenticated users can delete flat images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'flat-images');

CREATE POLICY "Authenticated users can update flat images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'flat-images');
```

**Step 3: Check File Size**
- Images must be less than 5MB
- Compress large images before uploading

**Step 4: Check Browser Console**
```
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for error messages
4. Share error with support team
```

---

## 🚨 Issue 2: "3D view sidebar shows no details"

### Symptoms:
- Click on flat in 3D view
- Sidebar opens but shows no work items, notes, or images
- Says "Overall Completion: 0%"

### Solutions:

**Step 1: Verify Database Schema**
```
1. Go to Supabase Dashboard → SQL Editor
2. Run this query to check tables exist:

SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
    'work_item_detail_config', 
    'work_item_details_progress', 
    'flat_notes', 
    'flat_images'
);

3. Should return 4 rows
4. If missing, run sql/enhanced_work_items_schema.sql
```

**Step 2: Check if Detail Configs Are Loaded**
```sql
-- Run in SQL Editor:
SELECT * FROM work_item_detail_config LIMIT 10;

-- Should show configurations for work items B, C, D, E, F, G
-- If empty, re-run the INSERT statements from schema file
```

**Step 3: Verify Flat Has Progress Data**
```sql
-- Replace {flat_id} with actual flat ID
SELECT * FROM work_item_details_progress 
WHERE flat_id = '{flat_id}' 
LIMIT 10;

-- If empty, no progress has been entered yet
-- Use Bulk Update page to add progress first
```

---

## 🚨 Issue 3: "Modal doesn't open when clicking flat card"

### Symptoms:
- Click flat card in Bulk Update page
- Nothing happens
- No modal appears

### Solutions:

**Step 1: Check Browser Console**
```
1. F12 → Console tab
2. Look for JavaScript errors
3. Common errors:
   - "selectedWorkItem is null" → Select a work item first
   - "workItems.find is not a function" → Page data not loaded
```

**Step 2: Verify Work Item Selected**
```
1. Make sure a work item is selected from dropdown
2. Try refreshing the page
3. Re-select wing and work item
```

**Step 3: Clear Browser Cache**
```
1. Press Ctrl+Shift+Delete
2. Clear cache and cookies
3. Refresh page (Ctrl+F5)
```

---

## 🚨 Issue 4: "Refugee flat shows wrong number of bathrooms"

### Symptoms:
- A-702 shows 2 bathrooms instead of 1 (shared)
- Regular refugee shows 2 instead of 1

### Solutions:

**Step 1: Verify Flat Flags**
```sql
-- Check flat configuration:
SELECT flat_number, is_refuge, is_joint_refuge, bathroom_count 
FROM flats 
WHERE flat_number IN ('A-702', 'B-702', 'A-1202', 'B-1202', 'A-1501');

Expected:
- A-702: is_refuge=true, is_joint_refuge=true, bathroom_count=1
- B-702: is_refuge=true, is_joint_refuge=true, bathroom_count=1
- A-1501: is_refuge=true, is_joint_refuge=false, bathroom_count=1
```

**Step 2: Update Flat Flags if Wrong**
```sql
-- For joint refuge (A-702, B-702, A-1202, B-1202):
UPDATE flats 
SET is_refuge = true, is_joint_refuge = true, bathroom_count = 1
WHERE flat_number IN ('A-702', 'B-702', 'A-1202', 'B-1202');

-- For other refuge flats:
UPDATE flats 
SET is_refuge = true, is_joint_refuge = false, bathroom_count = 1
WHERE flat_number LIKE '%-1501';
```

---

## 🚨 Issue 5: "2BHK flat shows same checks as 1BHK for Work Item F"

### Symptoms:
- 2BHK flat doesn't show "Master Bedroom" options
- Only shows Hall, Kitchen, Bedroom (6 checks instead of 8)

### Solutions:

**Step 1: Verify BHK Type in Database**
```sql
SELECT flat_number, bhk_type FROM flats WHERE flat_number = 'A-101';
-- Should return '2BHK' for 2-bedroom flats
-- Should return '1BHK' for 1-bedroom flats
```

**Step 2: Update BHK Type if Wrong**
```sql
-- For 2BHK flats (example):
UPDATE flats SET bhk_type = '2BHK' WHERE flat_number = 'A-101';

-- For 1BHK flats:
UPDATE flats SET bhk_type = '1BHK' WHERE flat_number = 'A-104';
```

**Step 3: Verify Detail Configs**
```sql
SELECT * FROM work_item_detail_config 
WHERE work_item_code IN ('F', 'G') 
AND detail_name LIKE '%Master%';

-- Should show 4 rows (2 for F, 2 for G)
-- All should have requires_bhk_type = '2BHK'
```

---

## 🚨 Issue 6: "GST calculation is wrong on invoice"

### Symptoms:
- Enter ₹11,800 but base amount is not ₹10,000
- CGST/SGST percentages don't add up

### Solution:

**Verify Calculation:**
```
Formula: Base = Total / 1.18

Example:
- Total (including GST): ₹11,800
- Base Amount: ₹11,800 / 1.18 = ₹10,000
- CGST @ 9%: ₹10,000 × 0.09 = ₹900
- SGST @ 9%: ₹10,000 × 0.09 = ₹900
- Total: ₹10,000 + ₹900 + ₹900 = ₹11,800 ✓
```

If wrong, clear browser cache and refresh.

---

## 🚨 Issue 7: "Mobile bottom navigation covers content"

### Symptoms:
- On mobile, bottom navigation bar overlaps invoice cards
- Can't click buttons at bottom of page

### Solution:

**Already Fixed:** Billing page has `pb-24` padding
If still happening:
1. Check if running latest code version
2. Pull latest from GitHub: `git pull origin main`
3. Restart dev server: `npm run dev`

---

## 🚨 Issue 8: "Can't create invoice for completed flat"

### Symptoms:
- All work items show 100% complete
- Billing page won't allow invoice creation
- Error: "Work items incomplete"

### Solution:

**Step 1: Verify ALL Checks Complete**
```sql
-- Check completion for specific flat:
SELECT * FROM v_flat_work_item_completion 
WHERE flat_number = 'A-101';

-- Look for any work items with is_fully_completed = false
```

**Step 2: Check Progress Entries**
```sql
-- Verify progress_entries table updated:
SELECT wi.code, pe.quantity_completed 
FROM progress_entries pe
JOIN work_items wi ON pe.work_item_id = wi.id
WHERE pe.flat_id = (SELECT id FROM flats WHERE flat_number = 'A-101');

-- All should have quantity_completed > 0
```

**Step 3: Complete Missing Work Items**
1. Go to Bulk Update page
2. For each incomplete work item:
   - Open flat modal
   - Check all boxes
   - Save
3. Verify flat turns GREEN in 3D view
4. Try billing again

---

## 🚨 Issue 9: "Page loads slowly / freezes"

### Symptoms:
- 3D view takes forever to load
- Browser becomes unresponsive
- "Out of memory" errors

### Solutions:

**Step 1: Reduce Data Load**
```
1. Instead of "All Work Items", select specific work item
2. Use wing filter to limit flats shown
3. Close other browser tabs
```

**Step 2: Clear Browser Cache**
```
1. Ctrl+Shift+Delete
2. Clear all cached images and files
3. Clear cookies
4. Restart browser
```

**Step 3: Check Database Indexes**
```sql
-- Verify indexes exist:
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('progress_entries', 'work_item_details_progress');

-- If missing, run schema file again
```

---

## 🚨 Issue 10: "Changes not saving"

### Symptoms:
- Check boxes, click Save
- Success message shows
- Reopen modal, checkboxes are unchecked

### Solutions:

**Step 1: Check RLS Policies**
```sql
-- Verify user has insert/update permissions:
SELECT * FROM pg_policies 
WHERE tablename = 'work_item_details_progress';

-- Should show 3 policies: SELECT, INSERT, UPDATE
```

**Step 2: Verify User Authentication**
```javascript
// Run in browser console (F12):
const { data, error } = await supabase.auth.getUser()
console.log('User:', data.user?.email)

// Should show logged-in email
// If null, log out and log back in
```

**Step 3: Check Network Tab**
```
1. F12 → Network tab
2. Save changes
3. Look for POST requests to work_item_details_progress
4. Check response:
   - 201 Created = Success ✓
   - 403 Forbidden = RLS policy issue
   - 500 Error = Database issue
```

---

## 📞 Still Having Issues?

### Debug Information to Collect:
1. **Browser:** Chrome/Firefox/Safari + version
2. **Device:** Desktop/Mobile + OS
3. **Error Message:** Exact text shown
4. **Console Errors:** F12 → Console → Screenshot
5. **Steps to Reproduce:** Detailed list
6. **User Email:** Account having the issue

### Contact Support:
- Email: [Your support email]
- Include all debug information above
- Attach screenshots if possible

---

## ✅ Quick Health Check

Run this to verify system is healthy:

```sql
-- Check all tables exist:
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_name IN (
    'wings', 'floors', 'flats', 'work_items', 
    'progress_entries', 'work_item_detail_config', 
    'work_item_details_progress', 'flat_notes', 'flat_images'
);
-- Should return: 9

-- Check detail configs loaded:
SELECT COUNT(*) as config_count FROM work_item_detail_config;
-- Should return: 26 (3+2+2+2+8+8)

-- Check storage bucket exists:
SELECT * FROM storage.buckets WHERE name = 'flat-images';
-- Should return: 1 row

-- Check RLS policies:
SELECT COUNT(*) as policy_count FROM pg_policies 
WHERE tablename IN ('work_item_detail_config', 'work_item_details_progress', 'flat_notes', 'flat_images');
-- Should return: 10 policies
```

If all pass ✓ → System is healthy!
