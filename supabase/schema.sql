-- =====================================================
-- SiteLedger Database Schema
-- Construction Execution & Billing System
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROJECT TABLE
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    area_sqft DECIMAL(10, 2) NOT NULL, -- 198174
    rate_per_sqft DECIMAL(10, 2) NOT NULL, -- 90
    base_value DECIMAL(15, 2) GENERATED ALWAYS AS (area_sqft * rate_per_sqft) STORED,
    cgst_rate DECIMAL(5, 2) NOT NULL DEFAULT 9.00,
    sgst_rate DECIMAL(5, 2) NOT NULL DEFAULT 9.00,
    total_value DECIMAL(15, 2) GENERATED ALWAYS AS (area_sqft * rate_per_sqft * (1 + cgst_rate/100 + sgst_rate/100)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the single project
INSERT INTO projects (name, area_sqft, rate_per_sqft) 
VALUES ('Abhimanyu Tiling Works - Main Project', 198174, 90);

-- =====================================================
-- 2. WINGS TABLE
-- =====================================================
CREATE TABLE wings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE, -- A, B, C
    name TEXT NOT NULL,
    total_floors INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert wings
DO $$
DECLARE
    project_id UUID;
BEGIN
    SELECT id INTO project_id FROM projects LIMIT 1;
    
    INSERT INTO wings (project_id, code, name, total_floors) VALUES
    (project_id, 'A', 'Wing A', 16),
    (project_id, 'B', 'Wing B', 16),
    (project_id, 'C', 'Wing C', 17);
END $$;

-- =====================================================
-- 3. FLOORS TABLE
-- =====================================================
CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wing_id UUID NOT NULL REFERENCES wings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wing_id, floor_number)
);

-- Insert floors for all wings
DO $$
DECLARE
    wing_rec RECORD;
    floor_num INTEGER;
BEGIN
    FOR wing_rec IN SELECT id, code, total_floors FROM wings LOOP
        FOR floor_num IN 1..wing_rec.total_floors LOOP
            INSERT INTO floors (wing_id, floor_number) 
            VALUES (wing_rec.id, floor_num);
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 4. FLATS TABLE
-- =====================================================
CREATE TABLE flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL, -- 101, 102, etc.
    bhk_type TEXT NOT NULL, -- '1BHK', '2BHK'
    is_refuge BOOLEAN NOT NULL DEFAULT FALSE,
    bathroom_count INTEGER NOT NULL DEFAULT 1,
    is_joint_refuge BOOLEAN NOT NULL DEFAULT FALSE, -- For A-702, B-702, A-1202, B-1202
    joint_refuge_partner_id UUID REFERENCES flats(id), -- Reference to partner flat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(floor_id, flat_number)
);

-- Insert flats for Wing A (16 floors × 4 flats each: 3×2BHK + 1×1BHK)
DO $$
DECLARE
    wing_a_id UUID;
    floor_rec RECORD;
    flat_num INTEGER;
    flat_id_702 UUID;
    flat_id_1202 UUID;
BEGIN
    SELECT id INTO wing_a_id FROM wings WHERE code = 'A';
    
    FOR floor_rec IN SELECT id, floor_number FROM floors WHERE wing_id = wing_a_id ORDER BY floor_number LOOP
        FOR flat_num IN 1..4 LOOP
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, bathroom_count)
            VALUES (
                floor_rec.id,
                floor_rec.floor_number || LPAD(flat_num::TEXT, 2, '0'),
                CASE WHEN flat_num = 4 THEN '1BHK' ELSE '2BHK' END,
                (floor_rec.floor_number = 7 AND flat_num = 2) OR (floor_rec.floor_number = 12 AND flat_num = 2),
                1
            );
        END LOOP;
    END LOOP;
    
    -- Mark 702 and 1202 as joint refuge (will link with Wing B later)
    UPDATE flats SET is_joint_refuge = TRUE 
    WHERE flat_number IN ('702', '1202') 
    AND floor_id IN (SELECT id FROM floors WHERE wing_id = wing_a_id);
END $$;

-- Insert flats for Wing B (16 floors × 7 flats each: 3×2BHK + 4×1BHK)
DO $$
DECLARE
    wing_b_id UUID;
    floor_rec RECORD;
    flat_num INTEGER;
BEGIN
    SELECT id INTO wing_b_id FROM wings WHERE code = 'B';
    
    FOR floor_rec IN SELECT id, floor_number FROM floors WHERE wing_id = wing_b_id ORDER BY floor_number LOOP
        FOR flat_num IN 1..7 LOOP
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, bathroom_count)
            VALUES (
                floor_rec.id,
                floor_rec.floor_number || LPAD(flat_num::TEXT, 2, '0'),
                CASE WHEN flat_num <= 3 THEN '2BHK' ELSE '1BHK' END,
                (floor_rec.floor_number = 7 AND flat_num = 2) OR (floor_rec.floor_number = 12 AND flat_num = 2),
                1
            );
        END LOOP;
    END LOOP;
    
    -- Mark 702 and 1202 as joint refuge
    UPDATE flats SET is_joint_refuge = TRUE 
    WHERE flat_number IN ('702', '1202') 
    AND floor_id IN (SELECT id FROM floors WHERE wing_id = wing_b_id);
END $$;

-- Link Wing A and Wing B joint refuge flats
DO $$
DECLARE
    wing_a_id UUID;
    wing_b_id UUID;
    flat_a_702 UUID;
    flat_b_702 UUID;
    flat_a_1202 UUID;
    flat_b_1202 UUID;
BEGIN
    SELECT id INTO wing_a_id FROM wings WHERE code = 'A';
    SELECT id INTO wing_b_id FROM wings WHERE code = 'B';
    
    -- Get 702 flats
    SELECT f.id INTO flat_a_702 FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    WHERE fl.wing_id = wing_a_id AND f.flat_number = '702';
    
    SELECT f.id INTO flat_b_702 FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    WHERE fl.wing_id = wing_b_id AND f.flat_number = '702';
    
    -- Get 1202 flats
    SELECT f.id INTO flat_a_1202 FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    WHERE fl.wing_id = wing_a_id AND f.flat_number = '1202';
    
    SELECT f.id INTO flat_b_1202 FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    WHERE fl.wing_id = wing_b_id AND f.flat_number = '1202';
    
    -- Link partners (bidirectional)
    UPDATE flats SET joint_refuge_partner_id = flat_b_702 WHERE id = flat_a_702;
    UPDATE flats SET joint_refuge_partner_id = flat_a_702 WHERE id = flat_b_702;
    UPDATE flats SET joint_refuge_partner_id = flat_b_1202 WHERE id = flat_a_1202;
    UPDATE flats SET joint_refuge_partner_id = flat_a_1202 WHERE id = flat_b_1202;
END $$;

-- Insert flats for Wing C
-- Floors 1-16: 6 flats each (3×2BHK + 3×1BHK)
-- Floor 17: 4 flats (2×2BHK + 2×1BHK)
DO $$
DECLARE
    wing_c_id UUID;
    floor_rec RECORD;
    flat_num INTEGER;
    flat_count INTEGER;
BEGIN
    SELECT id INTO wing_c_id FROM wings WHERE code = 'C';
    
    FOR floor_rec IN SELECT id, floor_number FROM floors WHERE wing_id = wing_c_id ORDER BY floor_number LOOP
        flat_count := CASE WHEN floor_rec.floor_number = 17 THEN 4 ELSE 6 END;
        
        FOR flat_num IN 1..flat_count LOOP
            INSERT INTO flats (floor_id, flat_number, bhk_type, is_refuge, bathroom_count)
            VALUES (
                floor_rec.id,
                floor_rec.floor_number || LPAD(flat_num::TEXT, 2, '0'),
                CASE 
                    WHEN floor_rec.floor_number = 17 THEN 
                        CASE WHEN flat_num <= 2 THEN '2BHK' ELSE '1BHK' END
                    ELSE 
                        CASE WHEN flat_num <= 3 THEN '2BHK' ELSE '1BHK' END
                END,
                (floor_rec.floor_number = 7 AND flat_num = 6) OR (floor_rec.floor_number = 12 AND flat_num = 6),
                1
            );
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 5. CONFIGURATION VERSIONS TABLE
-- =====================================================
CREATE TABLE config_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE, -- Locked after first proforma
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by_proforma_id UUID, -- Will reference proforma_invoices(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(project_id, version_number)
);

-- Create initial version
DO $$
DECLARE
    project_id UUID;
BEGIN
    SELECT id INTO project_id FROM projects LIMIT 1;
    INSERT INTO config_versions (project_id, version_number, is_active, notes)
    VALUES (project_id, 1, TRUE, 'Initial configuration');
END $$;

-- =====================================================
-- 6. WORK ITEMS TABLE
-- =====================================================
CREATE TABLE work_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_version_id UUID NOT NULL REFERENCES config_versions(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- A, B, C, D, E, F, G, H, I
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Nos',
    total_quantity INTEGER NOT NULL,
    is_quantity_locked BOOLEAN NOT NULL DEFAULT FALSE, -- C-G are locked
    percentage_weight DECIMAL(5, 2), -- Optional: for weighted progress calculation
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(config_version_id, code)
);

-- Insert default work items for version 1
DO $$
DECLARE
    version_id UUID;
BEGIN
    SELECT id INTO version_id FROM config_versions WHERE version_number = 1;
    
    INSERT INTO work_items (config_version_id, code, name, unit, total_quantity, is_quantity_locked) VALUES
    (version_id, 'A', 'Work Item A', 'Nos', 276, FALSE),
    (version_id, 'B', 'Work Item B', 'Nos', 276, FALSE),
    (version_id, 'C', 'Work Item C', 'Nos', 270, TRUE),
    (version_id, 'D', 'Work Item D', 'Nos', 550, TRUE),
    (version_id, 'E', 'Work Item E', 'Nos', 270, TRUE),
    (version_id, 'F', 'Work Item F', 'Nos', 276, TRUE),
    (version_id, 'G', 'Work Item G', 'Nos', 276, TRUE),
    (version_id, 'H', 'Work Item H', 'Nos', 276, FALSE),
    (version_id, 'I', 'Work Item I', 'Nos', 276, FALSE);
END $$;

-- =====================================================
-- 7. WORK ITEM APPLICABILITY TABLE
-- =====================================================
CREATE TABLE work_item_applicability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    is_applicable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(work_item_id, flat_id)
);

-- By default, all work items are applicable to all flats
-- Future: Add specific exclusions (e.g., refuge flats might not need certain items)

-- =====================================================
-- 8. PROGRESS ENTRIES TABLE
-- =====================================================
CREATE TABLE progress_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    quantity_completed INTEGER NOT NULL DEFAULT 1,
    remarks TEXT,
    is_billed BOOLEAN NOT NULL DEFAULT FALSE,
    billed_in_proforma_id UUID, -- Will reference proforma_invoices(id)
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_quantity CHECK (quantity_completed > 0)
);

-- Index for faster queries
CREATE INDEX idx_progress_flat_workitem ON progress_entries(flat_id, work_item_id);
CREATE INDEX idx_progress_date ON progress_entries(entry_date);
CREATE INDEX idx_progress_billed ON progress_entries(is_billed);

-- =====================================================
-- 9. PROFORMA INVOICES TABLE
-- =====================================================
CREATE TABLE proforma_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    config_version_id UUID NOT NULL REFERENCES config_versions(id),
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    
    -- Amounts
    base_amount DECIMAL(15, 2) NOT NULL,
    cgst_amount DECIMAL(15, 2) NOT NULL,
    sgst_amount DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    
    -- Progress tracking
    work_completed_percentage DECIMAL(5, 2),
    
    -- Metadata
    remarks TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. PROFORMA INVOICE ITEMS TABLE
-- =====================================================
CREATE TABLE proforma_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES work_items(id),
    quantity_billed INTEGER NOT NULL,
    rate DECIMAL(10, 2),
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. PROFORMA INVOICE BREAKUP TABLE
-- (Wing/Floor/Flat-wise proof)
-- =====================================================
CREATE TABLE proforma_invoice_breakup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    proforma_item_id UUID NOT NULL REFERENCES proforma_invoice_items(id) ON DELETE CASCADE,
    progress_entry_id UUID NOT NULL REFERENCES progress_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. TAX INVOICES TABLE
-- =====================================================
CREATE TABLE tax_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    proforma_invoice_id UUID REFERENCES proforma_invoices(id),
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    
    -- Payment received
    base_amount_received DECIMAL(15, 2) NOT NULL,
    cgst_amount DECIMAL(15, 2) NOT NULL,
    sgst_amount DECIMAL(15, 2) NOT NULL,
    total_amount_received DECIMAL(15, 2) NOT NULL,
    
    -- Percentage tracking
    payment_percentage DECIMAL(5, 2), -- Derived: (received / proforma_total) * 100
    
    -- Metadata
    payment_mode TEXT,
    transaction_reference TEXT,
    remarks TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_entries_updated_at BEFORE UPDATE ON progress_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proforma_invoices_updated_at BEFORE UPDATE ON proforma_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_invoices_updated_at BEFORE UPDATE ON tax_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC CONSTRAINTS
-- =====================================================

-- Prevent deletion of billed progress entries
CREATE OR REPLACE FUNCTION prevent_delete_billed_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_billed = TRUE THEN
        RAISE EXCEPTION 'Cannot delete billed progress entry';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_delete_billed BEFORE DELETE ON progress_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_delete_billed_progress();

-- Prevent editing billed progress entries
CREATE OR REPLACE FUNCTION prevent_edit_billed_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_billed = TRUE AND (
        NEW.quantity_completed != OLD.quantity_completed OR
        NEW.work_item_id != OLD.work_item_id OR
        NEW.flat_id != OLD.flat_id
    ) THEN
        RAISE EXCEPTION 'Cannot edit billed progress entry';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_edit_billed BEFORE UPDATE ON progress_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_edit_billed_progress();

-- Lock config version after first proforma
CREATE OR REPLACE FUNCTION lock_config_on_proforma()
RETURNS TRIGGER AS $$
DECLARE
    version_locked BOOLEAN;
BEGIN
    SELECT is_locked INTO version_locked 
    FROM config_versions 
    WHERE id = NEW.config_version_id;
    
    IF NOT version_locked THEN
        UPDATE config_versions 
        SET is_locked = TRUE, 
            locked_at = NOW(),
            locked_by_proforma_id = NEW.id
        WHERE id = NEW.config_version_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lock_config_on_first_proforma AFTER INSERT ON proforma_invoices
    FOR EACH ROW EXECUTE FUNCTION lock_config_on_proforma();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_applicability ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_breakup ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read/write all (single admin user)
CREATE POLICY "Authenticated users can access projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access wings" ON wings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access floors" ON floors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access flats" ON flats FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access config_versions" ON config_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access work_items" ON work_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access work_item_applicability" ON work_item_applicability FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access progress_entries" ON progress_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access proforma_invoices" ON proforma_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access proforma_invoice_items" ON proforma_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access proforma_invoice_breakup" ON proforma_invoice_breakup FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access tax_invoices" ON tax_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Complete flat information with wing and floor details
CREATE VIEW v_flats_complete AS
SELECT 
    f.id,
    w.code AS wing_code,
    w.name AS wing_name,
    fl.floor_number,
    f.flat_number,
    f.bhk_type,
    f.is_refuge,
    f.bathroom_count,
    f.is_joint_refuge,
    partner.flat_number AS joint_partner_flat_number,
    partner_w.code AS joint_partner_wing_code
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
LEFT JOIN flats partner ON f.joint_refuge_partner_id = partner.id
LEFT JOIN floors partner_fl ON partner.floor_id = partner_fl.id
LEFT JOIN wings partner_w ON partner_fl.wing_id = partner_w.id
ORDER BY w.code, fl.floor_number, f.flat_number;

-- View: Progress summary per flat per work item
CREATE VIEW v_progress_summary AS
SELECT 
    f.id AS flat_id,
    w.code AS wing_code,
    fl.floor_number,
    f.flat_number,
    wi.code AS work_item_code,
    wi.name AS work_item_name,
    wi.total_quantity,
    COALESCE(SUM(pe.quantity_completed), 0) AS quantity_completed,
    CASE 
        WHEN wi.total_quantity > 0 THEN 
            ROUND((COALESCE(SUM(pe.quantity_completed), 0)::DECIMAL / wi.total_quantity * 100), 2)
        ELSE 0 
    END AS completion_percentage,
    COUNT(pe.id) FILTER (WHERE pe.is_billed = FALSE) AS unbilled_entries_count,
    COUNT(pe.id) FILTER (WHERE pe.is_billed = TRUE) AS billed_entries_count
FROM flats f
JOIN floors fl ON f.floor_id = fl.id
JOIN wings w ON fl.wing_id = w.id
CROSS JOIN work_items wi
LEFT JOIN progress_entries pe ON pe.flat_id = f.id AND pe.work_item_id = wi.id
WHERE wi.is_active = TRUE
GROUP BY f.id, w.code, fl.floor_number, f.flat_number, wi.id, wi.code, wi.name, wi.total_quantity
ORDER BY w.code, fl.floor_number, f.flat_number, wi.code;

-- =====================================================
-- COMPLETE
-- =====================================================
