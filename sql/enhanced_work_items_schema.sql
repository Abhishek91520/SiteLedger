-- Enhanced Work Item Details Schema
-- This supports multi-level checks for work items

-- Work Item Detail Definitions (Master Configuration)
CREATE TABLE IF NOT EXISTS work_item_detail_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_code VARCHAR(10) NOT NULL,
    category VARCHAR(100), -- For F & G: 'room_flooring' or 'balcony_flooring'
    detail_name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL,
    requires_bhk_type VARCHAR(10), -- NULL, '1BHK', '2BHK'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Item Details Progress (Per Flat)
CREATE TABLE IF NOT EXISTS work_item_details_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    detail_config_id UUID NOT NULL REFERENCES work_item_detail_config(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(flat_id, work_item_id, detail_config_id)
);

-- Flat Notes
CREATE TABLE IF NOT EXISTS flat_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
    work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
    note_text TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flat Images (using Supabase Storage)
CREATE TABLE IF NOT EXISTS flat_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
    work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    display_order INTEGER DEFAULT 0
);

-- Insert Work Item Detail Configurations
-- Work Item A: Marble Window Patti (Single check - no details needed)
-- Work Item H: Tapa Riser (Single check - no details needed)
-- Work Item I: Shop Flooring (Single check - no details needed)

-- Work Item B: WC & Bath Frame (3 checks)
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order) VALUES
('B', NULL, 'Room Window', 1),
('B', NULL, 'Bathroom Window', 2),
('B', NULL, 'Bathroom Frame', 3);

-- Work Item C: Kitchen Platform (2 checks)
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order) VALUES
('C', NULL, 'Half', 1),
('C', NULL, 'Full', 2);

-- Work Item D: Bathroom Tiles (2 checks for normal, 1 for 1BHK refugee)
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order) VALUES
('D', NULL, 'Common Bathroom', 1),
('D', NULL, 'Master Bathroom', 2);

-- Work Item E: Platform Tiles (2 checks)
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order) VALUES
('E', NULL, 'Half', 1),
('E', NULL, 'Full', 2);

-- Work Item F: Room & Balcony Flooring (Complex with categories and BHK types)
-- Room Flooring
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order, requires_bhk_type) VALUES
('F', 'room_flooring', 'Hall', 1, NULL), -- All flats
('F', 'room_flooring', 'Kitchen', 2, NULL), -- All flats
('F', 'room_flooring', 'Bedroom', 3, NULL), -- All flats
('F', 'room_flooring', 'Master Bedroom', 4, '2BHK'); -- Only 2BHK

-- Balcony Flooring
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order, requires_bhk_type) VALUES
('F', 'balcony_flooring', 'Hall Balcony', 5, NULL), -- All flats
('F', 'balcony_flooring', 'Kitchen Balcony', 6, NULL), -- All flats
('F', 'balcony_flooring', 'Bedroom Balcony', 7, NULL), -- All flats
('F', 'balcony_flooring', 'Master Bedroom Balcony', 8, '2BHK'); -- Only 2BHK

-- Work Item G: Skirting (Same structure as F)
-- Room Skirting
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order, requires_bhk_type) VALUES
('G', 'room_skirting', 'Hall', 1, NULL),
('G', 'room_skirting', 'Kitchen', 2, NULL),
('G', 'room_skirting', 'Bedroom', 3, NULL),
('G', 'room_skirting', 'Master Bedroom', 4, '2BHK');

-- Balcony Skirting
INSERT INTO work_item_detail_config (work_item_code, category, detail_name, display_order, requires_bhk_type) VALUES
('G', 'balcony_skirting', 'Hall Balcony', 5, NULL),
('G', 'balcony_skirting', 'Kitchen Balcony', 6, NULL),
('G', 'balcony_skirting', 'Bedroom Balcony', 7, NULL),
('G', 'balcony_skirting', 'Master Bedroom Balcony', 8, '2BHK');

-- Indexes for performance
CREATE INDEX idx_work_item_details_progress_flat ON work_item_details_progress(flat_id);
CREATE INDEX idx_work_item_details_progress_work_item ON work_item_details_progress(work_item_id);
CREATE INDEX idx_flat_notes_flat ON flat_notes(flat_id);
CREATE INDEX idx_flat_images_flat ON flat_images(flat_id);
CREATE INDEX idx_work_item_detail_config_code ON work_item_detail_config(work_item_code);

-- Enable Row Level Security
ALTER TABLE work_item_detail_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_details_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE flat_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flat_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow authenticated users)
CREATE POLICY "Users can view work item detail config" ON work_item_detail_config
    FOR SELECT USING (true);

CREATE POLICY "Users can view work item details progress" ON work_item_details_progress
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert work item details progress" ON work_item_details_progress
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update work item details progress" ON work_item_details_progress
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view flat notes" ON flat_notes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert flat notes" ON flat_notes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update flat notes" ON flat_notes
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view flat images" ON flat_images
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert flat images" ON flat_images
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete flat images" ON flat_images
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- View for easy querying of flat completion status
CREATE OR REPLACE VIEW v_flat_work_item_completion AS
SELECT 
    f.id as flat_id,
    f.flat_number,
    fl.floor_number,
    w.code as wing_code,
    w.name as wing_name,
    f.bhk_type,
    f.is_refuge,
    f.is_joint_refuge,
    wi.id as work_item_id,
    wi.code as work_item_code,
    wi.name as work_item_name,
    COUNT(DISTINCT widc.id) as total_checks,
    COUNT(DISTINCT CASE WHEN widp.is_completed THEN widp.detail_config_id END) as completed_checks,
    CASE 
        WHEN COUNT(DISTINCT widc.id) = COUNT(DISTINCT CASE WHEN widp.is_completed THEN widp.detail_config_id END)
        THEN true
        ELSE false
    END as is_fully_completed,
    ROUND(
        (COUNT(DISTINCT CASE WHEN widp.is_completed THEN widp.detail_config_id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT widc.id), 0)) * 100, 
        2
    ) as completion_percentage
FROM flats f
INNER JOIN floors fl ON f.floor_id = fl.id
INNER JOIN wings w ON fl.wing_id = w.id
CROSS JOIN work_items wi
LEFT JOIN work_item_detail_config widc ON widc.work_item_code = wi.code
    AND widc.is_active = true
    AND (widc.requires_bhk_type IS NULL OR widc.requires_bhk_type = f.bhk_type)
LEFT JOIN work_item_details_progress widp ON 
    widp.flat_id = f.id 
    AND widp.work_item_id = wi.id
    AND widp.detail_config_id = widc.id
GROUP BY f.id, f.flat_number, fl.floor_number, w.code, w.name, f.bhk_type, f.is_refuge, f.is_joint_refuge,
         wi.id, wi.code, wi.name;

COMMENT ON VIEW v_flat_work_item_completion IS 'Shows completion status of work items for each flat with detailed check counts';
