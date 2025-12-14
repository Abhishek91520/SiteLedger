-- DELETE DUPLICATE FLATS AND PROPERLY UPDATE BHK TYPES
-- Run this to fix the issue caused by the previous script

DO $$
DECLARE
    wing_a_id UUID;
    wing_b_id UUID;
    wing_c_id UUID;
    deleted_count INT := 0;
BEGIN
    -- Get wing IDs
    SELECT id INTO wing_a_id FROM wings WHERE code = 'A' LIMIT 1;
    SELECT id INTO wing_b_id FROM wings WHERE code = 'B' LIMIT 1;
    SELECT id INTO wing_c_id FROM wings WHERE code = 'C' LIMIT 1;

    RAISE NOTICE 'Starting cleanup...';

    -- STEP 1: Delete duplicate flats that were created in last hour (safe - no progress data yet)
    DELETE FROM flats 
    WHERE created_at > (NOW() - INTERVAL '1 hour')
      AND floor_id IN (SELECT id FROM floors WHERE wing_id IN (wing_a_id, wing_b_id));
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate flats created recently', deleted_count;

    -- STEP 2: Now properly update BHK types for EXISTING flats
    -- Wing A: Update BHK types (existing flats only)
    RAISE NOTICE 'Updating Wing A BHK types...';
    
    UPDATE flats SET bhk_type = '2BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_a_id 
      AND RIGHT(flats.flat_number, 2) = '01';
    
    UPDATE flats SET bhk_type = '2BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_a_id 
      AND RIGHT(flats.flat_number, 2) = '02';
    
    UPDATE flats SET bhk_type = '1BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_a_id 
      AND RIGHT(flats.flat_number, 2) = '03';
    
    UPDATE flats SET bhk_type = '2BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_a_id 
      AND RIGHT(flats.flat_number, 2) = '04';

    -- Wing B: Update BHK types (existing flats only)  
    RAISE NOTICE 'Updating Wing B BHK types...';
    
    UPDATE flats SET bhk_type = '1BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '01';
    
    UPDATE flats SET bhk_type = '2BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '02';
    
    UPDATE flats SET bhk_type = '2BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '03';
    
    UPDATE flats SET bhk_type = '2BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '04';
    
    UPDATE flats SET bhk_type = '1BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '05';
    
    UPDATE flats SET bhk_type = '1BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '06';
    
    UPDATE flats SET bhk_type = '1BHK' 
    FROM floors f 
    WHERE flats.floor_id = f.id 
      AND f.wing_id = wing_b_id 
      AND RIGHT(flats.flat_number, 2) = '07';

    RAISE NOTICE 'Cleanup and update completed!';
END $$;

-- Verify the results
SELECT 
    w.code as wing,
    COUNT(*) as total_flats,
    COUNT(CASE WHEN fl.bhk_type = '1BHK' THEN 1 END) as bhk_1,
    COUNT(CASE WHEN fl.bhk_type = '2BHK' THEN 1 END) as bhk_2
FROM flats fl
JOIN floors f ON fl.floor_id = f.id
JOIN wings w ON f.wing_id = w.id
GROUP BY w.code
ORDER BY w.code;

-- Expected results:
-- Wing A: ~68 flats (4 per floor × 17 floors)
-- Wing B: Should match whatever was there originally
-- Wing C: ~100 flats (unchanged)
-- Total should be 276 flats
