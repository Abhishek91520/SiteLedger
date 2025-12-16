-- =====================================================
-- Fix All Work Item Quantities to 1 nos point (except Bathroom)
-- =====================================================
-- This script updates all existing progress_entries to use correct quantities:
-- - Bathroom (D): 2.0 for normal, 1.0 for refugee, 0.5 for joint refuge
-- - All other work items: 1.0 per flat
-- =====================================================

-- Step 1: Update ALL work items to 1.0 first (default)
UPDATE progress_entries
SET quantity_completed = 1.0,
    remarks = COALESCE(remarks, '') || ' [Auto-corrected to 1 nos point]',
    updated_at = NOW()
WHERE quantity_completed != 1.0
  AND work_item_id NOT IN (
    SELECT id FROM work_items WHERE code = 'D'
  );

-- Step 2: Fix Bathroom (Work Item D) quantities based on flat type
-- 2a. Normal flats (not refuge) - should be 2.0 (Common + Master)
UPDATE progress_entries pe
SET quantity_completed = 2.0,
    remarks = COALESCE(remarks, '') || ' [Auto-corrected: Normal flat = 2 bathrooms]',
    updated_at = NOW()
FROM flats f
WHERE pe.flat_id = f.id
  AND pe.work_item_id IN (SELECT id FROM work_items WHERE code = 'D')
  AND (f.is_refuge = false OR f.is_refuge IS NULL)
  AND (f.is_joint_refuge = false OR f.is_joint_refuge IS NULL)
  AND pe.quantity_completed != 2.0;

-- 2b. Refugee flats (non-joint) - should be 1.0 (Common only)
UPDATE progress_entries pe
SET quantity_completed = 1.0,
    remarks = COALESCE(remarks, '') || ' [Auto-corrected: Refugee flat = 1 bathroom]',
    updated_at = NOW()
FROM flats f
WHERE pe.flat_id = f.id
  AND pe.work_item_id IN (SELECT id FROM work_items WHERE code = 'D')
  AND f.is_refuge = true
  AND (f.is_joint_refuge = false OR f.is_joint_refuge IS NULL)
  AND pe.quantity_completed != 1.0;

-- 2c. Joint refuge flats - should be 0.5 (Shared bathroom)
UPDATE progress_entries pe
SET quantity_completed = 0.5,
    remarks = COALESCE(remarks, '') || ' [Auto-corrected: Joint refuge = 0.5 bathroom]',
    updated_at = NOW()
FROM flats f
WHERE pe.flat_id = f.id
  AND pe.work_item_id IN (SELECT id FROM work_items WHERE code = 'D')
  AND f.is_joint_refuge = true
  AND pe.quantity_completed != 0.5;

-- Step 3: Delete any entries with 0 quantity (constraint violation)
DELETE FROM progress_entries
WHERE quantity_completed = 0;

-- Step 4: Verification Query - Check results
SELECT 
  wi.code,
  wi.name,
  f.is_refuge,
  f.is_joint_refuge,
  COUNT(*) as entry_count,
  AVG(pe.quantity_completed) as avg_quantity,
  MIN(pe.quantity_completed) as min_quantity,
  MAX(pe.quantity_completed) as max_quantity
FROM progress_entries pe
JOIN work_items wi ON pe.work_item_id = wi.id
JOIN flats f ON pe.flat_id = f.id
GROUP BY wi.code, wi.name, f.is_refuge, f.is_joint_refuge
ORDER BY wi.code, f.is_refuge, f.is_joint_refuge;

-- Step 5: Summary by Work Item
SELECT 
  wi.code,
  wi.name,
  COUNT(*) as total_entries,
  SUM(pe.quantity_completed) as total_quantity,
  ROUND(AVG(pe.quantity_completed), 2) as avg_quantity_per_entry
FROM progress_entries pe
JOIN work_items wi ON pe.work_item_id = wi.id
GROUP BY wi.code, wi.name
ORDER BY wi.code;

-- Expected results after migration:
-- Work Item A, B, C, E, F, G, H, I: All entries should be 1.0
-- Work Item D (Bathroom):
--   - Normal flats: 2.0
--   - Refugee (non-joint): 1.0
--   - Joint refuge: 0.5
