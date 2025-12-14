-- Fix BHK Types and Add Missing Flats for Wings A, B, C
-- This script will:
-- 1. Update BHK types for existing flats in Wings A and B
-- 2. Add missing flats in Wing B (if needed)
-- 3. Preserve all existing progress data

-- STEP 1: Get Wing IDs
DO $$
DECLARE
    wing_a_id UUID;
    wing_b_id UUID;
    wing_c_id UUID;
    floor_record RECORD;
    flat_record RECORD;
BEGIN
    -- Get wing IDs
    SELECT id INTO wing_a_id FROM wings WHERE code = 'A' LIMIT 1;
    SELECT id INTO wing_b_id FROM wings WHERE code = 'B' LIMIT 1;
    SELECT id INTO wing_c_id FROM wings WHERE code = 'C' LIMIT 1;

    RAISE NOTICE 'Wing A ID: %, Wing B ID: %, Wing C ID: %', wing_a_id, wing_b_id, wing_c_id;

    -- WING A: Update BHK types (4 flats per floor)
    -- 101 - 2BHK, 102 - 2BHK, 103 - 1BHK, 104 - 2BHK
    RAISE NOTICE '=== Updating Wing A BHK Types ===';
    
    FOR floor_record IN 
        SELECT id, floor_number FROM floors WHERE wing_id = wing_a_id ORDER BY floor_number
    LOOP
        -- Update flat 01 to 2BHK
        UPDATE flats SET bhk_type = '2BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'A-' || floor_record.floor_number || '01';
        
        -- Update flat 02 to 2BHK
        UPDATE flats SET bhk_type = '2BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'A-' || floor_record.floor_number || '02';
        
        -- Update flat 03 to 1BHK
        UPDATE flats SET bhk_type = '1BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'A-' || floor_record.floor_number || '03';
        
        -- Update flat 04 to 2BHK
        UPDATE flats SET bhk_type = '2BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'A-' || floor_record.floor_number || '04';
        
        RAISE NOTICE 'Updated Wing A Floor %', floor_record.floor_number;
    END LOOP;

    -- WING B: Update BHK types and add missing flats (7 flats per floor)
    -- 101 - 1BHK, 102 - 2BHK, 103 - 2BHK, 104 - 2BHK, 105 - 1BHK, 106 - 1BHK, 107 - 1BHK
    RAISE NOTICE '=== Updating Wing B BHK Types and Adding Missing Flats ===';
    
    FOR floor_record IN 
        SELECT id, floor_number FROM floors WHERE wing_id = wing_b_id ORDER BY floor_number
    LOOP
        -- Update/Insert flat 01 - 1BHK
        UPDATE flats SET bhk_type = '1BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '01';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '01', '1BHK', FALSE, FALSE);
        END IF;
        
        -- Update/Insert flat 02 - 2BHK
        UPDATE flats SET bhk_type = '2BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '02';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '02', '2BHK', FALSE, FALSE);
        END IF;
        
        -- Update/Insert flat 03 - 2BHK
        UPDATE flats SET bhk_type = '2BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '03';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '03', '2BHK', FALSE, FALSE);
        END IF;
        
        -- Update/Insert flat 04 - 2BHK
        UPDATE flats SET bhk_type = '2BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '04';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '04', '2BHK', FALSE, FALSE);
        END IF;
        
        -- Update/Insert flat 05 - 1BHK
        UPDATE flats SET bhk_type = '1BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '05';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '05', '1BHK', FALSE, FALSE);
        END IF;
        
        -- Update/Insert flat 06 - 1BHK
        UPDATE flats SET bhk_type = '1BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '06';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '06', '1BHK', FALSE, FALSE);
        END IF;
        
        -- Update/Insert flat 07 - 1BHK
        UPDATE flats SET bhk_type = '1BHK' 
        WHERE floor_id = floor_record.id AND flat_number = 'B-' || floor_record.floor_number || '07';
        
        IF NOT FOUND THEN
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, is_joint_refuge)
            VALUES (floor_record.id, 'B-' || floor_record.floor_number || '07', '1BHK', FALSE, FALSE);
        END IF;
        
        RAISE NOTICE 'Updated Wing B Floor %', floor_record.floor_number;
    END LOOP;

    -- Wing C is already correct, no changes needed
    RAISE NOTICE '=== Wing C is already correct - no changes ===';

    RAISE NOTICE '=== Migration Completed Successfully ===';
END $$;

-- STEP 2: Verify the changes
SELECT 
    w.code as wing,
    f.floor_number,
    COUNT(*) as total_flats,
    COUNT(CASE WHEN fl.bhk_type = '1BHK' THEN 1 END) as bhk_1,
    COUNT(CASE WHEN fl.bhk_type = '2BHK' THEN 1 END) as bhk_2
FROM flats fl
JOIN floors f ON fl.floor_id = f.id
JOIN wings w ON f.wing_id = w.id
WHERE w.code IN ('A', 'B', 'C')
GROUP BY w.code, f.floor_number
ORDER BY w.code, f.floor_number;

-- STEP 3: Show detailed breakdown for each wing
SELECT 
    w.code || '-' || f.floor_number || SUBSTRING(fl.flat_number, LENGTH(fl.flat_number)-1, 2) as flat_number,
    fl.bhk_type,
    fl.is_refuge,
    fl.is_joint_refuge,
    COUNT(pe.id) as progress_entries,
    COUNT(widp.id) as detail_checks
FROM flats fl
JOIN floors f ON fl.floor_id = f.id
JOIN wings w ON f.wing_id = w.id
LEFT JOIN progress_entries pe ON fl.id = pe.flat_id
LEFT JOIN work_item_details_progress widp ON fl.id = widp.flat_id
WHERE w.code IN ('A', 'B', 'C') AND f.floor_number = 1
GROUP BY w.code, f.floor_number, fl.flat_number, fl.bhk_type, fl.is_refuge, fl.is_joint_refuge
ORDER BY w.code, fl.flat_number;
