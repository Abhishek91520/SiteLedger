# C Wing BHK Type Update - Impact Analysis

## Date: December 21, 2025

## Requirement
- **101, 104, 106 series**: C101, C104, C106, C201, C204, C206, C301, C304, C306... → **2BHK**
- **All other flats in C wing**: C102, C103, C105, C107, C202, C203... → **1BHK**

---

## Impact Analysis

### 1. **Database Changes**
- **Table**: `flats`
- **Field**: `bhk_type`
- **Affected**: Only C wing flats
- **Operation**: Simple UPDATE query (no data loss)

### 2. **Code Impact** ✅ NO CODE CHANGES NEEDED

#### Areas Already Handling BHK Types Correctly:

**a) EnhancedFlatWorkItem.jsx (Modal for detail checks)**
- Lines 40-43: Already filters configs by `requires_bhk_type`
- Logic: If config specifies BHK type, only shows for matching flats
- **Impact**: Flats will automatically show correct checks for new BHK type

**b) VisualProgress.jsx (3D View)**
- Lines 285-300: `getApplicableConfigs()` filters by BHK type
- Lines 440-450: `getApplicableConfigsForFlat()` filters by BHK type
- **Impact**: Completion percentage calculations will use correct checks

**c) BulkUpdate.jsx (Bulk Update Page)**
- Lines 220-227: Filters applicable configs by BHK type
- **Impact**: Filter dropdowns will show correct checks for each flat

### 3. **User-Facing Impact**

#### Before Update:
- C wing flats might be showing wrong detail checks
- If a 2BHK flat was marked as 1BHK, it would show 1BHK-specific checks

#### After Update:
- **101, 104, 106 series**: Will show 2BHK-specific detail checks
- **Other flats**: Will show 1BHK-specific detail checks
- Completion percentages will recalculate based on NEW applicable checks

### 4. **Existing Data Safety** ✅ SAFE

#### What Happens to Old Data:

**a) progress_entries (Main progress records)**
- **Status**: NOT AFFECTED
- **Reason**: Quantity values remain valid
- Bathroom D quantities already calculated correctly based on refuge status

**b) work_item_details_progress (Individual check records)**
- **Status**: NOT DELETED
- **Behavior**: Old check records remain in database
- **Display**: Modal will only SHOW checks for current BHK type
- **Example**: If flat was 1BHK with checks 1-4, now 2BHK with checks 1-8:
  - Checks 1-4 remain completed in database
  - Modal shows all 8 checks (1-4 completed, 5-8 pending)
  - Percentage = 4/8 = 50%

**c) flat_notes and flat_images**
- **Status**: NOT AFFECTED
- Notes and images are independent of BHK type

### 5. **Detailed Check Configuration Impact**

**Only affects work items with BHK-specific configs:**

Check `work_item_detail_config` table:
```sql
SELECT work_item_code, detail_name, requires_bhk_type 
FROM work_item_detail_config 
WHERE requires_bhk_type IS NOT NULL;
```

Common BHK-specific work items:
- Electrical points (1BHK = fewer points, 2BHK = more points)
- Plumbing fixtures (1BHK = fewer, 2BHK = more)
- Flooring areas (1BHK = smaller, 2BHK = larger)

### 6. **Testing Checklist After Update**

1. **Open a 101/104/106 series flat in BulkUpdate**
   - Should show 2BHK-specific checks
   - Badge count should reflect 2BHK check count

2. **Open other C wing flat**
   - Should show 1BHK-specific checks
   - Badge count should reflect 1BHK check count

3. **3D View for C wing**
   - Completion colors should update based on new check counts
   - Percentages may change (e.g., 4/8 = 50% instead of 4/4 = 100%)

4. **Dashboard**
   - Work item progress should recalculate
   - C wing progress percentages may change

---

## Execution Steps

### Step 1: Run Analysis Queries
Execute first 3 sections of `update_c_wing_bhk_types.sql` in Supabase SQL Editor to see current state.

### Step 2: Backup (Optional but Recommended)
```sql
-- Create backup of current BHK types
CREATE TABLE flats_bhk_backup AS
SELECT id, flat_number, bhk_type, created_at
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C';
```

### Step 3: Execute Updates
Run Step 4 and Step 5 from the SQL file.

### Step 4: Verify
Run Step 6 to confirm updates are correct.

### Step 5: Test Application
- Refresh browser
- Test BulkUpdate page with C wing flats
- Check 3D view completion percentages
- Verify work item detail checks show correctly

---

## Rollback Plan (if needed)

If you have backup:
```sql
UPDATE flats
SET bhk_type = b.bhk_type
FROM flats_bhk_backup b
WHERE flats.id = b.id;
```

Without backup (restore to original if needed):
- You'll need to manually set BHK types back
- OR re-run the update with different criteria

---

## Summary

✅ **SAFE TO EXECUTE**
- No code changes required
- No data loss
- Reversible
- Application already handles BHK filtering correctly

⚠️ **EXPECT CHANGES IN:**
- Completion percentages for affected flats
- Number of detail checks shown per flat
- Filter options in BulkUpdate page

📊 **ESTIMATED TIME:**
- SQL execution: < 5 seconds
- Testing: 5-10 minutes
- Total impact: Minimal, immediate effect

---

## Action Required

1. **Review** this analysis
2. **Execute** `sql/update_c_wing_bhk_types.sql` in Supabase SQL Editor
3. **Test** application with C wing flats
4. **Confirm** changes are correct

No code deployment needed - this is a data-only update!
