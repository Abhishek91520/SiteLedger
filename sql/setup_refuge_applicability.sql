-- Set up work item applicability for refuge flats
-- Refuge flats do NOT have:
-- - Work Item C (Kitchen Platform with Sink Cutting & Moulding)
-- - Work Item E (Platform Tiles Fixing)

-- Joint refuge flats (is_joint_refuge = TRUE) share 1 bathroom between 2 flats
-- So for Work Item D (Bathroom Tiles), we need to track this specially

-- Mark work items C and E as NOT applicable for all refuge flats
INSERT INTO work_item_applicability (work_item_id, flat_id, is_applicable)
SELECT 
    wi.id as work_item_id,
    f.id as flat_id,
    FALSE as is_applicable
FROM work_items wi
CROSS JOIN flats f
WHERE 
    f.is_refuge = TRUE 
    AND wi.code IN ('C', 'E')
ON CONFLICT (work_item_id, flat_id) 
DO UPDATE SET is_applicable = FALSE;

-- Add a multiplier column to work_items table to handle shared bathrooms
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS quantity_multiplier DECIMAL(5, 2) DEFAULT 1.00;

COMMENT ON COLUMN work_items.quantity_multiplier IS 'Multiplier for quantity calculation. E.g., 0.5 for joint refuge bathrooms (2 flats share 1 bathroom)';

-- Verify the setup
SELECT 
    COUNT(*) as total_exclusions,
    COUNT(DISTINCT f.id) as refuge_flats_count
FROM work_item_applicability wia
JOIN flats f ON wia.flat_id = f.id
JOIN work_items wi ON wia.work_item_id = wi.id
WHERE f.is_refuge = TRUE AND wia.is_applicable = FALSE;
