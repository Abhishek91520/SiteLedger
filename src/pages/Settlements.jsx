import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { DollarSign, Calendar, User, AlertCircle, TrendingUp, CheckCircle, FileText } from 'lucide-react'

export default function Settlements() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [workers, setWorkers] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const [error, setError] = useState('')
  const [settling, setSettling] = useState(null)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [settlementData, setSettlementData] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchWorkers()
    }
  }, [selectedProject, selectedMonth])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, settlement_day')
        .order('name')

      if (error) throw error
      setProjects(data || [])
      if (data?.length > 0) {
        setSelectedProject(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      setError('')

      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0) // Last day of month

      // Get workers active in the selected month
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select(`
          id,
          full_name,
          primary_mobile,
          category,
          base_daily_wage,
          travel_allowance,
          status,
          joining_date,
          last_working_date
        `)
        .eq('current_project_id', selectedProject)
        .lte('joining_date', endDate.toISOString().split('T')[0])
        .or(`last_working_date.is.null,last_working_date.gte.${startDate.toISOString().split('T')[0]}`)

      if (workersError) throw workersError

      // For each worker, get their balance
      const workersWithBalance = await Promise.all(
        (workersData || []).map(async (worker) => {
          // Get unpaid balance from view
          const { data: balanceData } = await supabase
            .from('v_worker_unpaid_balance')
            .select('*')
            .eq('id', worker.id)
            .eq('project_id', selectedProject)
            .single()

          // Get attendance for the selected month
          const { data: attendanceData } = await supabase
            .from('worker_attendance')
            .select('*')
            .eq('worker_id', worker.id)
            .eq('project_id', selectedProject)
            .gte('attendance_date', startDate.toISOString().split('T')[0])
            .lte('attendance_date', endDate.toISOString().split('T')[0])

          // Calculate month totals
          const monthEarned = attendanceData?.reduce((sum, r) => sum + parseFloat(r.daily_pay || 0), 0) || 0
          const monthKharci = attendanceData?.reduce((sum, r) => sum + parseFloat(r.kharci_amount || 0), 0) || 0
          const monthDays = attendanceData?.reduce((sum, r) => sum + parseFloat(r.attendance_multiplier || 0), 0) || 0

          // Get previous settlements this month
          const { data: settlementsData } = await supabase
            .from('worker_settlements')
            .select('amount_paid, settlement_date')
            .eq('worker_id', worker.id)
            .eq('settlement_month', month)
            .eq('settlement_year', year)

          const alreadyPaid = settlementsData?.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0) || 0

          return {
            ...worker,
            unpaid_balance: balanceData?.unpaid_balance || 0,
            month_earned: monthEarned,
            month_kharci: monthKharci,
            month_days: monthDays,
            already_paid_this_month: alreadyPaid,
            has_settlements: (settlementsData?.length || 0) > 0
          }
        })
      )

      // Filter workers with positive balance or activity this month
      setWorkers(
        workersWithBalance.filter(w => w.unpaid_balance > 0 || w.month_earned > 0)
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const prepareSettlement = async (worker) => {
    try {
      setSettling(worker.id)
      setError('')

      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      // Get attendance for the month
      const { data: attendanceData, error: attError } = await supabase
        .from('worker_attendance')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('project_id', selectedProject)
        .gte('attendance_date', startDate.toISOString().split('T')[0])
        .lte('attendance_date', endDate.toISOString().split('T')[0])

      if (attError) throw attError

      // Calculate breakdown
      const breakdown = {}
      attendanceData?.forEach(record => {
        const type = record.attendance_type
        breakdown[type] = (breakdown[type] || 0) + 1
      })

      const totalDaysWorked = attendanceData?.reduce((sum, r) => {
        return sum + parseFloat(r.attendance_multiplier || 0)
      }, 0) || 0

      const totalEarned = attendanceData?.reduce((sum, r) => sum + parseFloat(r.daily_pay || 0), 0) || 0
      const totalKharci = attendanceData?.reduce((sum, r) => sum + parseFloat(r.kharci_amount || 0), 0) || 0

      setSettlementData({
        worker,
        month,
        year,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalDaysWorked,
        attendanceBreakdown: breakdown,
        totalEarned,
        totalKharci,
        netPayable: totalEarned - totalKharci,
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: (totalEarned - totalKharci).toFixed(2),
        remarks: ''
      })

      setShowSettlementModal(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSettling(null)
    }
  }

  const processSettlement = async () => {
    try {
      setSettling(settlementData.worker.id)
      setError('')

      const amountPaid = parseFloat(settlementData.amount_paid) || 0
      const balanceRemaining = settlementData.netPayable - amountPaid

      // Create settlement record
      const { error: setError } = await supabase
        .from('worker_settlements')
        .insert({
          worker_id: settlementData.worker.id,
          project_id: selectedProject,
          settlement_month: settlementData.month,
          settlement_year: settlementData.year,
          settlement_date: new Date().toISOString().split('T')[0],
          settlement_type: 'monthly',
          period_start_date: settlementData.startDate,
          period_end_date: settlementData.endDate,
          total_days_worked: settlementData.totalDaysWorked,
          attendance_breakdown: settlementData.attendanceBreakdown,
          total_earned: settlementData.totalEarned,
          total_kharci: settlementData.totalKharci,
          net_payable: settlementData.netPayable,
          payment_mode: settlementData.payment_mode,
          payment_date: settlementData.payment_date,
          amount_paid: amountPaid,
          balance_remaining: balanceRemaining,
          remarks: settlementData.remarks || null,
          created_by: user.id
        })

      if (setError) throw setError

      setShowSettlementModal(false)
      setSettlementData(null)
      fetchWorkers() // Refresh list
    } catch (err) {
      setError(err.message)
    } finally {
      setSettling(null)
    }
  }

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 lg:p-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <DollarSign size={32} />
          Salary Settlements
        </h1>
        <p className="text-purple-100 mt-2">Monthly salary processing for workers</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Project
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 text-neutral-800 dark:text-dark-text"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.settlement_day && `(Settlement: ${project.settlement_day}${project.settlement_day === 1 ? 'st' : project.settlement_day === 2 ? 'nd' : project.settlement_day === 3 ? 'rd' : 'th'} of month)`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 text-neutral-800 dark:text-dark-text"
              />
            </div>
          </div>
        </div>

        {/* Workers List */}
        {loading ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-dark-muted">Loading workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl p-12 text-center">
            <Calendar size={48} className="mx-auto text-neutral-300 dark:text-dark-muted mb-4" />
            <p className="text-lg font-medium text-neutral-600 dark:text-dark-muted">
              No pending settlements for selected month
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workers.map(worker => (
              <div key={worker.id} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                        {worker.full_name}
                      </h3>
                      <span className="px-2 py-1 bg-neutral-100 dark:bg-dark-hover rounded-lg text-xs font-medium">
                        {worker.category}
                      </span>
                      {worker.has_settlements && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                          <CheckCircle size={12} />
                          Settled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-dark-muted">{worker.primary_mobile}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                        <p className="text-xs text-neutral-600 dark:text-dark-muted">Days Worked</p>
                        <p className="font-bold text-neutral-800 dark:text-dark-text">{worker.month_days.toFixed(2)}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                        <p className="text-xs text-neutral-600 dark:text-dark-muted">Earned</p>
                        <p className="font-bold text-neutral-800 dark:text-dark-text">{formatCurrency(worker.month_earned)}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                        <p className="text-xs text-neutral-600 dark:text-dark-muted">Kharci</p>
                        <p className="font-bold text-neutral-800 dark:text-dark-text">{formatCurrency(worker.month_kharci)}</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                        <p className="text-xs text-neutral-600 dark:text-dark-muted">Unpaid Balance</p>
                        <p className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(worker.unpaid_balance)}</p>
                      </div>
                    </div>

                    {worker.already_paid_this_month > 0 && (
                      <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Already paid: {formatCurrency(worker.already_paid_this_month)} this month
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => prepareSettlement(worker)}
                    disabled={settling === worker.id || worker.month_earned === 0}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {settling === worker.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <DollarSign size={18} />
                        Settle
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {showSettlementModal && settlementData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Process Settlement</h2>
              <p className="text-sm opacity-90">{settlementData.worker.full_name}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Work Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-neutral-800 dark:text-dark-text mb-3">
                  Work Summary - {new Date(settlementData.year, settlementData.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-dark-muted">Total Days Worked</p>
                    <p className="text-xl font-bold text-neutral-800 dark:text-dark-text">
                      {settlementData.totalDaysWorked.toFixed(2)} days
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-neutral-600 dark:text-dark-muted mb-2">Attendance Breakdown:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(settlementData.attendanceBreakdown).map(([type, count]) => (
                      <span key={type} className="px-2 py-1 bg-white dark:bg-dark-card rounded-lg text-xs font-medium">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-dark-muted">Total Earned</span>
                    <span className="font-semibold text-neutral-800 dark:text-dark-text">
                      {formatCurrency(settlementData.totalEarned)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-dark-muted">Total Kharci Taken</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      - {formatCurrency(settlementData.totalKharci)}
                    </span>
                  </div>
                  <div className="pt-2 border-t-2 border-green-300 dark:border-green-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 dark:text-dark-text">Net Payable</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(settlementData.netPayable)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                      Payment Mode *
                    </label>
                    <select
                      value={settlementData.payment_mode}
                      onChange={(e) => setSettlementData({ ...settlementData, payment_mode: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 text-neutral-800 dark:text-dark-text"
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={settlementData.payment_date}
                      onChange={(e) => setSettlementData({ ...settlementData, payment_date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 text-neutral-800 dark:text-dark-text"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      value={settlementData.amount_paid}
                      onChange={(e) => setSettlementData({ ...settlementData, amount_paid: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 text-neutral-800 dark:text-dark-text"
                      placeholder="₹"
                      step="0.01"
                      min="0"
                    />
                    {parseFloat(settlementData.amount_paid) < settlementData.netPayable && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ⚠️ Balance remaining: {formatCurrency(settlementData.netPayable - parseFloat(settlementData.amount_paid || 0))}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                      Remarks (Optional)
                    </label>
                    <textarea
                      value={settlementData.remarks}
                      onChange={(e) => setSettlementData({ ...settlementData, remarks: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 text-neutral-800 dark:text-dark-text resize-none"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-200 dark:border-dark-border flex gap-3">
              <button
                onClick={() => {
                  setShowSettlementModal(false)
                  setSettlementData(null)
                }}
                className="flex-1 px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-xl font-semibold text-neutral-700 dark:text-dark-text hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processSettlement}
                disabled={settling}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {settling ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Confirm Settlement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
