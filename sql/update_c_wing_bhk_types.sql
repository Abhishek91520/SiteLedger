-- Impact Analysis and Update for C Wing BHK Types
-- Date: 2025-12-21
-- Requirement: 
--   - Flat numbers ending in 01, 04, 06 (C101, C104, C106, C201, C204, C206, etc.) = 2BHK
--   - All other flats in C wing = 1BHK
--   - Special case: 17th floor only has 1701, 1702, 1705, 1706 (1703, 1704 are amenities)

-- Step 1: Check current BHK types in C wing
SELECT 
    w.code as wing,
    fl.floor_number,
    f.flat_number,
    f.bhk_type as current_bhk,
    CASE 
        WHEN f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06' 
        THEN '2BHK'
        ELSE '1BHK'
    END as proposed_bhk,
    CASE 
        WHEN f.bhk_type != (CASE 
            WHEN f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06' 
            THEN '2BHK'
            ELSE '1BHK'
        END)
        THEN 'NEEDS UPDATE'
        ELSE 'OK'
    END as status
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'
ORDER BY fl.floor_number, f.flat_number;

-- Step 2: Count impact
SELECT 
    'Total C Wing Flats' as metric,
    COUNT(*) as count
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'

UNION ALL

SELECT 
    'Flats to be 2BHK (01, 04, 06 series)',
    COUNT(*)
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'
AND (f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06')

UNION ALL

SELECT 
    'Flats to be 1BHK (others)',
    COUNT(*)
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'
AND NOT (f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06')

UNION ALL

SELECT 
    'Flats needing update',
    COUNT(*)
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'
AND f.bhk_type != (
    CASE 
        WHEN f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06' 
        THEN '2BHK'
        ELSE '1BHK'
    END
);

-- Step 3: Check existing progress data that might be affected
SELECT 
    'Progress entries for C wing flats' as metric,
    COUNT(*) as count
FROM progress_entries pe
JOIN flats f ON pe.flat_id = f.id
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'

UNION ALL

SELECT 
    'Detail checks for C wing flats',
    COUNT(*)
FROM work_item_details_progress widp
JOIN flats f ON widp.flat_id = f.id
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C';

-- Step 3b: Check 17th floor flats specifically
-- NOTE: Currently in production: 1701, 1702, 1703, 1704 exist (no 'C' prefix)
--       Future state should be: 1701, 1702, 1705, 1706 (1703→1705, 1704→1706)
SELECT 
    'C Wing 17th Floor Flats' as description,
    f.flat_number,
    f.bhk_type as current_bhk,
    CASE 
        WHEN f.flat_number IN ('1701', 'C1701') THEN '2BHK (ends in 01)'
        WHEN f.flat_number IN ('1702', 'C1702') THEN '1BHK (ends in 02)'
        WHEN f.flat_number IN ('1703', 'C1703') THEN '1BHK (ends in 03) - Will rename to 1705'
        WHEN f.flat_number IN ('1704', 'C1704') THEN '2BHK (ends in 04) - Will rename to 1706'
        WHEN f.flat_number IN ('1705', 'C1705') THEN '1BHK (ends in 05)'
        WHEN f.flat_number IN ('1706', 'C1706') THEN '2BHK (ends in 06)'
        ELSE 'UNEXPECTED'
    END as proposed_change
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C' AND fl.floor_number = 17
ORDER BY f.flat_number;

-- Step 4: UPDATE - Set flats ending in 01, 04, 06 to 2BHK
-- This covers: C101, C104, C106, C201, C204, C206... including C1701, C1706
UPDATE flats
SET bhk_type = '2BHK'
WHERE id IN (
    SELECT f.id
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN wings w ON fl.wing_id = w.id
    WHERE w.code = 'C'
    AND (f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06')
);

-- Step 5: UPDATE - Set all other C wing flats to 1BHK
-- This covers: C102, C103, C105, C107... including C1702, C1705
UPDATE flats
SET bhk_type = '1BHK'
WHERE id IN (
    SELECT f.id
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN wings w ON fl.wing_id = w.id
    WHERE w.code = 'C'
    AND NOT (f.flat_number LIKE '%01' OR f.flat_number LIKE '%04' OR f.flat_number LIKE '%06')
);

-- Step 6: Verify updates
SELECT 
    'After Update: 2BHK count' as metric,
    COUNT(*) as count
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'
AND f.bhk_type = '2BHK'

UNION ALL

SELECT 
    'After Update: 1BHK count',
    COUNT(*)
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C'
AND f.bhk_type = '1BHK';

-- Step 7: Verify 17th floor specifically
SELECT 
    '17th Floor After Update' as description,
    f.flat_number,
    f.bhk_type,
    CASE 
        WHEN f.flat_number LIKE '%01' OR f.flat_number LIKE '%06' THEN 'Should be 2BHK'
        WHEN f.flat_number LIKE '%02' OR f.flat_number LIKE '%05' THEN 'Should be 1BHK'
        WHEN f.flat_number LIKE '%03' OR f.flat_number LIKE '%04' THEN 'Should be AMENITY'
        ELSE 'Check manually'
    END as expected,
    CASE 
        WHEN (f.flat_number LIKE '%01' OR f.flat_number LIKE '%06') AND f.bhk_type = '2BHK' THEN '✓ CORRECT'
        WHEN (f.flat_number LIKE '%02' OR f.flat_number LIKE '%05') AND f.bhk_type = '1BHK' THEN '✓ CORRECT'
        WHEN f.flat_number LIKE '%03' OR f.flat_number LIKE '%04' THEN '⚠ SHOULD BE AMENITY'
        ELSE '✗ WRONG'
    END as status
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C' AND fl.floor_number = 17
ORDER BY f.flat_number;

-- Step 8: Rename 1703 to 1705 and 1704 to 1706
-- This preserves all existing progress data while fixing the flat numbers
-- NOTE: Flat numbers do NOT have 'C' prefix in database, just numbers

-- Check current state before renaming
SELECT 
    'Before Rename' as stage,
    f.flat_number,
    f.bhk_type,
    f.id,
    COUNT(DISTINCT pe.id) as progress_entries,
    COUNT(DISTINCT widp.id) as detail_checks,
    COUNT(DISTINCT fn.id) as notes,
    COUNT(DISTINCT fi.id) as images
FROM flats f
LEFT JOIN progress_entries pe ON f.id = pe.flat_id
LEFT JOIN work_item_details_progress widp ON f.id = widp.flat_id
LEFT JOIN flat_notes fn ON f.id = fn.flat_id
LEFT JOIN flat_images fi ON f.id = fi.flat_id
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C' 
AND fl.floor_number = 17
AND (f.flat_number = '1703' OR f.flat_number = '1704')
GROUP BY f.id, f.flat_number, f.bhk_type;

-- Rename 1703 to 1705
UPDATE flats
SET flat_number = '1705'
WHERE id IN (
    SELECT f.id
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN wings w ON fl.wing_id = w.id
    WHERE w.code = 'C' AND fl.floor_number = 17
    AND f.flat_number = '1703'
);

-- Rename 1704 to 1706
UPDATE flats
SET flat_number = '1706'
WHERE id IN (
    SELECT f.id
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN wings w ON fl.wing_id = w.id
    WHERE w.code = 'C' AND fl.floor_number = 17
    AND f.flat_number = '1704'
);

-- Verify the rename worked
SELECT 
    'After Rename' as stage,
    f.flat_number,
    f.bhk_type,
    COUNT(DISTINCT pe.id) as progress_entries,
    COUNT(DISTINCT widp.id) as detail_checks,
    COUNT(DISTINCT fn.id) as notes,
    COUNT(DISTINCT fi.id) as images
FROM flats f
LEFT JOIN progress_entries pe ON f.id = pe.flat_id
LEFT JOIN work_item_details_progress widp ON f.id = widp.flat_id
LEFT JOIN flat_notes fn ON f.id = fn.flat_id
LEFT JOIN flat_images fi ON f.id = fi.flat_id
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C' 
AND fl.floor_number = 17
AND (f.flat_number = '1705' OR f.flat_number = '1706')
GROUP BY f.id, f.flat_number, f.bhk_type
ORDER BY f.flat_number;

-- Step 9: Final verification of all 17th floor flats
SELECT 
    'Final 17th Floor State' as status,
    f.flat_number,
    f.bhk_type,
    CASE 
        WHEN f.flat_number LIKE '%01' OR f.flat_number LIKE '%06' THEN '✓ 2BHK'
        WHEN f.flat_number LIKE '%02' OR f.flat_number LIKE '%05' THEN '✓ 1BHK'
        ELSE '?'
    END as verification
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
WHERE w.code = 'C' AND fl.floor_number = 17
ORDER BY f.flat_number;

-- NOTES:
-- 17th Floor Transformation:
--   BEFORE:
--   - 1701 → Will be 2BHK (ends in 01) ✓
--   - 1702 → Will be 1BHK (ends in 02) ✓
--   - 1703 → Will be renamed to 1705, then 1BHK ✓
--   - 1704 → Will be renamed to 1706, then 2BHK ✓
--
--   AFTER:
--   - 1701 → 2BHK ✓
--   - 1702 → 1BHK ✓
--   - 1705 → 1BHK ✓ (was 1703)
--   - 1706 → 2BHK ✓ (was 1704)
--
-- All existing progress data, notes, and images are PRESERVED!
-- Just the flat numbers change, everything else stays intact.

-- IMPACT NOTES:
-- 1. This will affect work items that have BHK-specific detail configs
-- 2. When users open flats, they will see different detail checks based on new BHK type
-- 3. Existing progress_entries are NOT affected (quantity remains same)
-- 4. Existing work_item_details_progress records are NOT deleted
--    But the modal will only SHOW checks for the new BHK type
-- 5. This is SAFE - no data loss, only affects which checks are shown/counted