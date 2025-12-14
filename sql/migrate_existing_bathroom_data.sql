-- Migration Script: Convert Existing Bathroom Progress to Detailed Checks
-- Run this ONCE to migrate existing bathroom work item data to the new multi-check system

-- Step 1: Get the bathroom work item ID
DO $$
DECLARE
    bathroom_work_item_id UUID;
    common_bathroom_config_id UUID;
    master_bathroom_config_id UUID;
    flat_record RECORD;
    existing_progress RECORD;
BEGIN
    -- Get work item D (Bathroom Tiles) ID
    SELECT id INTO bathroom_work_item_id 
    FROM work_items 
    WHERE code = 'D' 
    LIMIT 1;

    -- Get detail config IDs
    SELECT id INTO common_bathroom_config_id 
    FROM work_item_detail_config 
    WHERE work_item_code = 'D' AND detail_name = 'Common Bathroom' 
    LIMIT 1;

    SELECT id INTO master_bathroom_config_id 
    FROM work_item_detail_config 
    WHERE work_item_code = 'D' AND detail_name = 'Master Bathroom' 
    LIMIT 1;

    RAISE NOTICE 'Work Item D ID: %', bathroom_work_item_id;
    RAISE NOTICE 'Common Bathroom Config ID: %', common_bathroom_config_id;
    RAISE NOTICE 'Master Bathroom Config ID: %', master_bathroom_config_id;

    -- Check if we have the necessary IDs
    IF bathroom_work_item_id IS NULL OR common_bathroom_config_id IS NULL OR master_bathroom_config_id IS NULL THEN
        RAISE EXCEPTION 'Required IDs not found. Make sure enhanced_work_items_schema.sql has been run.';
    END IF;

    -- Loop through all existing progress entries for bathroom work
    FOR existing_progress IN 
        SELECT pe.*, f.is_refuge, f.is_joint_refuge
        FROM progress_entries pe
        JOIN flats f ON pe.flat_id = f.id
        WHERE pe.work_item_id = bathroom_work_item_id
          AND pe.quantity_completed > 0
    LOOP
        RAISE NOTICE 'Processing flat_id: %, is_refuge: %, is_joint_refuge: %', 
            existing_progress.flat_id, existing_progress.is_refuge, existing_progress.is_joint_refuge;

        -- Insert Common Bathroom check (all flats have this)
        INSERT INTO work_item_details_progress (
            flat_id,
            work_item_id,
            detail_config_id,
            is_completed,
            completed_at,
            completed_by,
            created_at,
            updated_at
        )
        VALUES (
            existing_progress.flat_id,
            bathroom_work_item_id,
            common_bathroom_config_id,
            true,
            existing_progress.created_at,
            existing_progress.created_by,
            existing_progress.created_at,
            NOW()
        )
        ON CONFLICT (flat_id, work_item_id, detail_config_id) 
        DO UPDATE SET
            is_completed = true,
            completed_at = EXCLUDED.completed_at,
            updated_at = NOW();

        -- Insert Master Bathroom check (only for non-refugee flats)
        -- Skip for refugee flats (they only have 1 bathroom)
        IF NOT existing_progress.is_refuge THEN
            INSERT INTO work_item_details_progress (
                flat_id,
                work_item_id,
                detail_config_id,
                is_completed,
                completed_at,
                completed_by,
                created_at,
                updated_at
            )
            VALUES (
                existing_progress.flat_id,
                bathroom_work_item_id,
                master_bathroom_config_id,
                true,
                existing_progress.created_at,
                existing_progress.created_by,
                existing_progress.created_at,
                NOW()
            )
            ON CONFLICT (flat_id, work_item_id, detail_config_id) 
            DO UPDATE SET
                is_completed = true,
                completed_at = EXCLUDED.completed_at,
                updated_at = NOW();
        END IF;
    END LOOP;

    RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Step 2: Verify the migration
SELECT 
    f.flat_number,
    f.is_refuge,
    f.is_joint_refuge,
    widc.detail_name,
    widp.is_completed,
    widp.completed_at
FROM work_item_details_progress widp
JOIN flats f ON widp.flat_id = f.id
JOIN work_items wi ON widp.work_item_id = wi.id
JOIN work_item_detail_config widc ON widp.detail_config_id = widc.id
WHERE wi.code = 'D'
ORDER BY f.flat_number, widc.detail_name;

-- Step 3: Summary report
SELECT 
    CASE 
        WHEN f.is_refuge THEN 'Refugee Flat'
        ELSE 'Normal Flat'
    END as flat_type,
    COUNT(DISTINCT f.id) as total_flats,
    COUNT(DISTINCT CASE WHEN widp.is_completed THEN f.id END) as flats_with_progress,
    COUNT(widp.id) as total_checks,
    COUNT(CASE WHEN widp.is_completed THEN 1 END) as completed_checks
FROM flats f
LEFT JOIN work_item_details_progress widp ON f.id = widp.flat_id
LEFT JOIN work_items wi ON widp.work_item_id = wi.id AND wi.code = 'D'
GROUP BY f.is_refuge;
