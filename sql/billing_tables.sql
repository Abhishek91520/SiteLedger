-- Proforma Invoices Table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    wing_id UUID REFERENCES wings(id) ON DELETE CASCADE,
    
    -- Amounts
    subtotal DECIMAL(15, 2) NOT NULL,
    cgst_rate DECIMAL(5, 2) DEFAULT 9.00,
    sgst_rate DECIMAL(5, 2) DEFAULT 9.00,
    cgst_amount DECIMAL(15, 2) NOT NULL,
    sgst_amount DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    
    -- Metadata
    notes TEXT,
    terms_conditions TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proforma Invoice Items (Work Items breakdown)
CREATE TABLE IF NOT EXISTS proforma_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_invoice_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    work_item_id UUID REFERENCES work_items(id),
    
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate_per_unit DECIMAL(15, 2) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proforma Invoice Flats (Which flats are included)
CREATE TABLE IF NOT EXISTS proforma_invoice_flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_invoice_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE,
    work_item_id UUID REFERENCES work_items(id),
    quantity_completed DECIMAL(10, 2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proforma_invoice_id, flat_id, work_item_id)
);

-- Tax Invoices Table
CREATE TABLE IF NOT EXISTS tax_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    proforma_invoice_id UUID REFERENCES proforma_invoices(id),
    
    -- Payment Details
    payment_amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    
    -- GST on received amount
    cgst_rate DECIMAL(5, 2) DEFAULT 9.00,
    sgst_rate DECIMAL(5, 2) DEFAULT 9.00,
    cgst_amount DECIMAL(15, 2) NOT NULL,
    sgst_amount DECIMAL(15, 2) NOT NULL,
    total_with_gst DECIMAL(15, 2) NOT NULL,
    
    -- Metadata
    notes TEXT,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled')),
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_wing ON proforma_invoices(wing_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_date ON proforma_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status ON proforma_invoices(status);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_items_invoice ON proforma_invoice_items(proforma_invoice_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_flats_invoice ON proforma_invoice_flats(proforma_invoice_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_proforma ON tax_invoices(proforma_invoice_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_date ON tax_invoices(invoice_date);

-- Enable RLS
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow authenticated users full access for now)
CREATE POLICY "Allow all operations for authenticated users" ON proforma_invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON proforma_invoice_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON proforma_invoice_flats FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON tax_invoices FOR ALL TO authenticated USING (true);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_proforma_invoices_updated_at BEFORE UPDATE ON proforma_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_invoices_updated_at BEFORE UPDATE ON tax_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
