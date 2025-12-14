-- Fix Bathroom Quantities in progress_entries
-- Updates existing progress_entries to reflect actual number of bathrooms completed

DO $$
DECLARE
    bathroom_work_item_id UUID;
    progress_record RECORD;
    completed_checks_count INTEGER;
    correct_quantity NUMERIC;
BEGIN
    -- Get Work Item D (Bathroom Tiles) ID
    SELECT id INTO bathroom_work_item_id 
    FROM work_items 
    WHERE code = 'D' 
    LIMIT 1;

    IF bathroom_work_item_id IS NULL THEN
        RAISE EXCEPTION 'Work Item D not found';
    END IF;

    RAISE NOTICE 'Fixing quantities for Work Item D (Bathroom Tiles)...';

    -- Loop through all progress entries for bathroom work
    FOR progress_record IN 
        SELECT 
            pe.id as progress_id,
            pe.flat_id,
            pe.work_item_id,
            pe.quantity_completed as old_quantity,
            f.flat_number,
            f.is_refuge,
            f.is_joint_refuge
        FROM progress_entries pe
        JOIN flats f ON pe.flat_id = f.id
        WHERE pe.work_item_id = bathroom_work_item_id
    LOOP
        -- Count completed checks for this flat
        SELECT COUNT(*) INTO completed_checks_count
        FROM work_item_details_progress
        WHERE flat_id = progress_record.flat_id
          AND work_item_id = bathroom_work_item_id
          AND is_completed = true;

        -- Determine correct quantity
        IF progress_record.is_joint_refuge THEN
            -- Joint refuge: 0.5 (shared bathroom)
            correct_quantity := 0.5;
        ELSE
            -- Normal or refugee: use number of completed checks
            correct_quantity := completed_checks_count;
        END IF;

        -- Update or delete based on correct quantity
        IF correct_quantity > 0 AND progress_record.old_quantity != correct_quantity THEN
            -- Update to correct quantity (must be > 0 due to constraint)
            UPDATE progress_entries
            SET 
                quantity_completed = correct_quantity,
                updated_at = NOW()
            WHERE id = progress_record.progress_id;

            RAISE NOTICE 'Updated flat % from quantity % to %', 
                progress_record.flat_number, 
                progress_record.old_quantity, 
                correct_quantity;
        ELSIF correct_quantity = 0 THEN
            -- Delete entry if no checks are completed (can't set to 0 due to constraint)
            DELETE FROM progress_entries
            WHERE id = progress_record.progress_id;

            RAISE NOTICE 'Deleted progress entry for flat % (no checks completed)', 
                progress_record.flat_number;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migration completed!';
END $$;

-- Verify the results
SELECT 
    wi.code as work_item,
    wi.name,
    COUNT(DISTINCT pe.flat_id) as flats_completed,
    SUM(pe.quantity_completed) as total_quantity,
    ROUND(AVG(pe.quantity_completed), 2) as avg_quantity_per_flat
FROM progress_entries pe
JOIN work_items wi ON pe.work_item_id = wi.id
WHERE wi.code = 'D'
GROUP BY wi.code, wi.name;

-- Detailed breakdown
SELECT 
    f.flat_number,
    f.is_refuge,
    f.is_joint_refuge,
    pe.quantity_completed,
    COUNT(widp.id) as checks_completed
FROM progress_entries pe
JOIN flats f ON pe.flat_id = f.id
JOIN work_items wi ON pe.work_item_id = wi.id
LEFT JOIN work_item_details_progress widp ON 
    widp.flat_id = pe.flat_id AND 
    widp.work_item_id = pe.work_item_id AND 
    widp.is_completed = true
WHERE wi.code = 'D'
GROUP BY f.flat_number, f.is_refuge, f.is_joint_refuge, pe.quantity_completed
ORDER BY f.flat_number;
