-- =====================================================
-- LABOUR & ATTENDANCE MANAGEMENT SCHEMA
-- SiteLedger - Abhimanyu Tiling Works
-- =====================================================

-- Add labour settlement day to project settings
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS labour_settlement_day INTEGER DEFAULT 10;

COMMENT ON COLUMN projects.labour_settlement_day IS 'Day of month for salary settlement (default 10)';

-- =====================================================
-- WORKERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information (Mandatory)
  full_name VARCHAR(100) NOT NULL,
  primary_mobile VARCHAR(15) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  category VARCHAR(20) NOT NULL CHECK (category IN ('Helper', 'Mason')),
  base_daily_wage DECIMAL(10, 2) NOT NULL CHECK (base_daily_wage >= 0),
  travel_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (travel_allowance >= 0),
  joining_date DATE NOT NULL,
  
  -- Optional Information
  secondary_mobile VARCHAR(15),
  worker_photo_url TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  
  -- Status Management
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  last_working_date DATE,
  release_reason TEXT,
  
  -- Project Assignment
  current_project_id UUID REFERENCES projects(id),
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_mobile CHECK (primary_mobile ~ '^[0-9]{10,15}$'),
  CONSTRAINT valid_secondary_mobile CHECK (secondary_mobile IS NULL OR secondary_mobile ~ '^[0-9]{10,15}$'),
  CONSTRAINT valid_release_date CHECK (last_working_date IS NULL OR last_working_date >= joining_date)
);

CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_project ON workers(current_project_id);
CREATE INDEX IF NOT EXISTS idx_workers_created_at ON workers(created_at DESC);

COMMENT ON TABLE workers IS 'Worker master records - never deleted, only released';
COMMENT ON COLUMN workers.status IS 'active or released - workers are never deleted';
COMMENT ON COLUMN workers.travel_allowance IS 'Daily travel allowance - added once per day, never multiplied';
COMMENT ON COLUMN workers.last_working_date IS 'Set when worker is released';

-- =====================================================
-- WORKER ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  attendance_date DATE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- Attendance Type (Fixed multipliers)
  attendance_type VARCHAR(10) NOT NULL CHECK (attendance_type IN ('P', 'H', 'P+¼', 'P+½', 'P+P', 'A')),
  attendance_multiplier DECIMAL(3, 2) NOT NULL CHECK (attendance_multiplier >= 0),
  
  -- Daily Pay Calculation
  base_wage_used DECIMAL(10, 2) NOT NULL,
  travel_allowance_used DECIMAL(10, 2) NOT NULL,
  daily_pay DECIMAL(10, 2) NOT NULL CHECK (daily_pay >= 0),
  
  -- Optional Fields
  kharci_amount DECIMAL(10, 2) DEFAULT 0 CHECK (kharci_amount >= 0),
  remarks TEXT,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  edit_history JSONB DEFAULT '[]',
  
  -- Constraints
  CONSTRAINT unique_worker_date UNIQUE (worker_id, attendance_date),
  CONSTRAINT valid_multiplier CHECK (
    (attendance_type = 'P' AND attendance_multiplier = 1.0) OR
    (attendance_type = 'H' AND attendance_multiplier = 0.5) OR
    (attendance_type = 'P+¼' AND attendance_multiplier = 1.25) OR
    (attendance_type = 'P+½' AND attendance_multiplier = 1.5) OR
    (attendance_type = 'P+P' AND attendance_multiplier = 2.0) OR
    (attendance_type = 'A' AND attendance_multiplier = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_attendance_worker ON worker_attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON worker_attendance(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_project ON worker_attendance(project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON worker_attendance(worker_id, attendance_date DESC);

COMMENT ON TABLE worker_attendance IS 'Daily attendance records - never deleted, only edited with history';
COMMENT ON COLUMN worker_attendance.attendance_multiplier IS 'P=1.0, H=0.5, P+¼=1.25, P+½=1.5, P+P=2.0, A=0';
COMMENT ON COLUMN worker_attendance.daily_pay IS 'Formula: (base_wage × multiplier) + travel_allowance';
COMMENT ON COLUMN worker_attendance.kharci_amount IS 'Early withdrawal of earned salary - entered once per day';
COMMENT ON COLUMN worker_attendance.edit_history IS 'JSON array of {old_value, new_value, edited_at, edited_by}';

-- =====================================================
-- WORKER SETTLEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS worker_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  
  -- Settlement Period
  settlement_month INTEGER NOT NULL CHECK (settlement_month BETWEEN 1 AND 12),
  settlement_year INTEGER NOT NULL CHECK (settlement_year >= 2020),
  settlement_date DATE NOT NULL,
  settlement_type VARCHAR(20) NOT NULL CHECK (settlement_type IN ('monthly', 'final')),
  
  -- Period Details
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Work Summary
  total_days_worked DECIMAL(5, 2) NOT NULL CHECK (total_days_worked >= 0),
  attendance_breakdown JSONB NOT NULL, -- {P: 10, H: 2, "P+¼": 1, ...}
  
  -- Financial Summary
  total_earned DECIMAL(10, 2) NOT NULL CHECK (total_earned >= 0),
  total_kharci DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_kharci >= 0),
  net_payable DECIMAL(10, 2) NOT NULL,
  
  -- Payment Details
  payment_mode VARCHAR(20) CHECK (payment_mode IN ('cash', 'online')),
  payment_date DATE,
  amount_paid DECIMAL(10, 2) DEFAULT 0 CHECK (amount_paid >= 0),
  balance_remaining DECIMAL(10, 2) DEFAULT 0,
  
  -- Notes
  remarks TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_period CHECK (period_end_date >= period_start_date),
  CONSTRAINT valid_payment CHECK (amount_paid <= (total_earned - total_kharci))
);

CREATE INDEX IF NOT EXISTS idx_settlements_worker ON worker_settlements(worker_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON worker_settlements(settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON worker_settlements(settlement_year, settlement_month);
CREATE INDEX IF NOT EXISTS idx_settlements_project ON worker_settlements(project_id);

COMMENT ON TABLE worker_settlements IS 'Monthly and final salary settlements - never deleted';
COMMENT ON COLUMN worker_settlements.settlement_type IS 'monthly = regular monthly settlement, final = mid-month release settlement';
COMMENT ON COLUMN worker_settlements.net_payable IS 'total_earned - total_kharci';
COMMENT ON COLUMN worker_settlements.balance_remaining IS 'net_payable - amount_paid (carries forward if partial payment)';

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Current Unpaid Balance per Worker
CREATE OR REPLACE VIEW v_worker_unpaid_balance AS
SELECT 
  w.id AS worker_id,
  w.full_name,
  w.status,
  COALESCE(SUM(wa.daily_pay), 0) AS total_earned,
  COALESCE(SUM(wa.kharci_amount), 0) AS total_kharci,
  COALESCE(SUM(CASE WHEN ws.id IS NOT NULL THEN ws.amount_paid ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(wa.daily_pay), 0) - 
    COALESCE(SUM(wa.kharci_amount), 0) - 
    COALESCE(SUM(CASE WHEN ws.id IS NOT NULL THEN ws.amount_paid ELSE 0 END), 0) AS unpaid_balance
FROM workers w
LEFT JOIN worker_attendance wa ON w.id = wa.worker_id
LEFT JOIN worker_settlements ws ON w.id = ws.worker_id
GROUP BY w.id, w.full_name, w.status;

COMMENT ON VIEW v_worker_unpaid_balance IS 'Real-time calculation of unpaid balance per worker';

-- Monthly Labour Cost Summary
CREATE OR REPLACE VIEW v_monthly_labour_cost AS
SELECT 
  DATE_TRUNC('month', wa.attendance_date) AS month,
  wa.project_id,
  COUNT(DISTINCT wa.worker_id) AS total_workers,
  SUM(wa.daily_pay) AS total_labour_cost,
  SUM(wa.kharci_amount) AS total_kharci_paid,
  SUM(wa.daily_pay) - COALESCE(SUM(ws.amount_paid), 0) AS pending_payments
FROM worker_attendance wa
LEFT JOIN worker_settlements ws ON 
  ws.worker_id = wa.worker_id AND 
  DATE_TRUNC('month', wa.attendance_date) = DATE_TRUNC('month', ws.settlement_date)
GROUP BY DATE_TRUNC('month', wa.attendance_date), wa.project_id;

COMMENT ON VIEW v_monthly_labour_cost IS 'Monthly aggregated labour costs and pending payments';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_settlements ENABLE ROW LEVEL SECURITY;

-- Workers: All authenticated users can view and manage
DROP POLICY IF EXISTS workers_policy ON workers;
CREATE POLICY workers_policy ON workers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Attendance: All authenticated users can view and manage
DROP POLICY IF EXISTS attendance_policy ON worker_attendance;
CREATE POLICY attendance_policy ON worker_attendance
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Settlements: All authenticated users can view and manage
DROP POLICY IF EXISTS settlements_policy ON worker_settlements;
CREATE POLICY settlements_policy ON worker_settlements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON worker_attendance;
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON worker_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Auto-updates updated_at timestamp on record modification';
