-- STEP 1: Check current situation and identify duplicates
SELECT 
    w.code as wing,
    COUNT(*) as total_flats
FROM flats fl
JOIN floors f ON fl.floor_id = f.id
JOIN wings w ON f.wing_id = w.id
GROUP BY w.code
ORDER BY w.code;

-- STEP 2: Check flat number format in database
SELECT 
    flat_number,
    bhk_type,
    is_refuge
FROM flats
WHERE flat_number LIKE 'A-%'
ORDER BY flat_number
LIMIT 20;

-- STEP 3: Identify which flats were incorrectly added (new duplicates)
SELECT 
    f.floor_number,
    fl.flat_number,
    fl.created_at,
    fl.bhk_type
FROM flats fl
JOIN floors f ON fl.floor_id = f.id
JOIN wings w ON f.wing_id = w.id
WHERE w.code IN ('A', 'B')
  AND fl.created_at > (NOW() - INTERVAL '1 hour')  -- Recently created
ORDER BY w.code, f.floor_number, fl.flat_number;
