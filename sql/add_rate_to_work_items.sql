-- Add rate_per_unit column to work_items table
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS rate_per_unit DECIMAL(15, 2) DEFAULT 0.00;

-- Update with some default rates (you can modify these)
-- Based on typical tiling work rates
UPDATE work_items SET rate_per_unit = 0.00 WHERE code = 'A'; -- Marble Window Patti
UPDATE work_items SET rate_per_unit = 0.00 WHERE code = 'B'; -- WC & Bath Frame
UPDATE work_items SET rate_per_unit = 5285.00 WHERE code = 'C'; -- Kitchen Platform
UPDATE work_items SET rate_per_unit = 6161.00 WHERE code = 'D'; -- Bathroom Tiles
UPDATE work_items SET rate_per_unit = 5945.00 WHERE code = 'E'; -- Platform Tiles
UPDATE work_items SET rate_per_unit = 14217.00 WHERE code = 'F'; -- Room & Balcony Flooring
UPDATE work_items SET rate_per_unit = 5170.00 WHERE code = 'G'; -- Skirting
UPDATE work_items SET rate_per_unit = 0.00 WHERE code = 'H'; -- Tapa Riser
UPDATE work_items SET rate_per_unit = 0.00 WHERE code = 'I'; -- Shop Flooring
