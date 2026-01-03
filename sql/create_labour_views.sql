

-- Create missing views for Labour & Attendance Module
-- Run this in Supabase SQL Editor

-- Drop existing views if they exist (to avoid column rename conflicts)
DROP VIEW IF EXISTS v_worker_unpaid_balance CASCADE;
DROP VIEW IF EXISTS v_monthly_labour_cost CASCADE;

-- View: Real-time unpaid balance per worker
CREATE OR REPLACE VIEW v_worker_unpaid_balance AS
SELECT 
  w.id,
  w.current_project_id AS project_id,
  w.full_name,
  w.category,
  COALESCE(SUM(wa.daily_pay), 0) AS total_earned,
  COALESCE(SUM(wa.kharci_amount), 0) AS total_kharci,
  COALESCE(SUM(ws.amount_paid), 0) AS total_paid,
  COALESCE(SUM(wa.daily_pay), 0) - COALESCE(SUM(wa.kharci_amount), 0) - COALESCE(SUM(ws.amount_paid), 0) AS unpaid_balance
FROM workers w
LEFT JOIN worker_attendance wa ON w.id = wa.worker_id
LEFT JOIN worker_settlements ws ON w.id = ws.worker_id
WHERE w.status = 'active'
GROUP BY w.id, w.current_project_id, w.full_name, w.category;

COMMENT ON VIEW v_worker_unpaid_balance IS 'Real-time calculation of unpaid balance per worker';

-- View: Monthly aggregated labour costs
CREATE VIEW v_monthly_labour_cost AS
SELECT 
  w.current_project_id AS project_id,
  CAST(EXTRACT(YEAR FROM wa.attendance_date) AS INTEGER) AS year,
  CAST(EXTRACT(MONTH FROM wa.attendance_date) AS INTEGER) AS month,
  COUNT(DISTINCT w.id) AS worker_count,
  SUM(wa.daily_pay) AS total_cost,
  SUM(wa.kharci_amount) AS total_kharci,
  SUM(wa.daily_pay) - COALESCE(SUM(ws.amount_paid), 0) AS pending_payment
FROM workers w
INNER JOIN worker_attendance wa ON w.id = wa.worker_id
LEFT JOIN worker_settlements ws ON w.id = ws.worker_id 
  AND EXTRACT(YEAR FROM ws.payment_date) = EXTRACT(YEAR FROM wa.attendance_date)
  AND EXTRACT(MONTH FROM ws.payment_date) = EXTRACT(MONTH FROM wa.attendance_date)
GROUP BY w.current_project_id, CAST(EXTRACT(YEAR FROM wa.attendance_date) AS INTEGER), CAST(EXTRACT(MONTH FROM wa.attendance_date) AS INTEGER);

COMMENT ON VIEW v_monthly_labour_cost IS 'Monthly aggregated labour costs and pending payments';
