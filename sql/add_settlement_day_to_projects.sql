-- Add settlement_day column to projects table
-- This column specifies which day of the month settlements should be processed
-- Default is the 10th of each month

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS settlement_day INTEGER DEFAULT 10 
CHECK (settlement_day >= 1 AND settlement_day <= 31);

-- Add comment to explain the column
COMMENT ON COLUMN projects.settlement_day IS 'Day of the month when labour settlements are processed (1-31)';
