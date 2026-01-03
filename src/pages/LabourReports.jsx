import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart3, Users, DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

export default function LabourReports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchStats()
    }
  }, [selectedProject, selectedMonth])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
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

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError('')

      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      // Get active workers count
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('id')
        .eq('current_project_id', selectedProject)
        .eq('status', 'active')

      if (workersError) throw workersError

      // Get monthly labour cost from view
      const { data: costData, error: costError } = await supabase
        .from('v_monthly_labour_cost')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('year', year)
        .eq('month', month)
        .single()

      // Get previous month for comparison
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      
      const { data: prevCostData } = await supabase
        .from('v_monthly_labour_cost')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .single()

      // Get unpaid balances
      const { data: balanceData, error: balanceError } = await supabase
        .from('v_worker_unpaid_balance')
        .select('*')
        .eq('project_id', selectedProject)

      if (balanceError) throw balanceError

      // Calculate total unpaid
      const totalUnpaid = balanceData?.reduce((sum, w) => sum + parseFloat(w.unpaid_balance || 0), 0) || 0
      const workersWithBalance = balanceData?.filter(w => parseFloat(w.unpaid_balance) > 0).length || 0

      // Get current month attendance data for breakdown
      const { data: attendanceData } = await supabase
        .from('worker_attendance')
        .select('attendance_type')
        .eq('project_id', selectedProject)
        .gte('attendance_date', startDate.toISOString().split('T')[0])
        .lte('attendance_date', endDate.toISOString().split('T')[0])

      // Count attendance types
      const attendanceBreakdown = {}
      attendanceData?.forEach(record => {
        const type = record.attendance_type
        attendanceBreakdown[type] = (attendanceBreakdown[type] || 0) + 1
      })

      setStats({
        activeWorkers: workersData?.length || 0,
        currentMonthCost: costData?.total_labour_cost || 0,
        currentMonthDays: costData?.total_days_worked || 0,
        currentMonthKharci: costData?.total_kharci || 0,
        previousMonthCost: prevCostData?.total_labour_cost || 0,
        totalUnpaid,
        workersWithBalance,
        attendanceBreakdown
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const calculateChange = (current, previous) => {
    if (previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return change
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={24} />
          Labour Reports
        </h1>
        <p className="text-blue-100 mt-1 text-sm">Track costs & attendance</p>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 sm:space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5">
                Project
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-neutral-800 dark:text-dark-text"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-neutral-800 dark:text-dark-text"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-dark-card rounded-xl p-8 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-neutral-600 dark:text-dark-muted">Loading statistics...</p>
          </div>
        ) : stats ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {/* Active Workers */}
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Active Workers</p>
                <p className="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-dark-text">{stats.activeWorkers}</p>
              </div>

              {/* Monthly Cost */}
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  {stats.previousMonthCost > 0 && (
                    <span className={`text-xs font-semibold ${
                      calculateChange(stats.currentMonthCost, stats.previousMonthCost) > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {calculateChange(stats.currentMonthCost, stats.previousMonthCost) > 0 ? '+' : ''}
                      {calculateChange(stats.currentMonthCost, stats.previousMonthCost)?.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Monthly Cost</p>
                <p className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-dark-text truncate">
                  {formatCurrency(stats.currentMonthCost)}
                </p>
                {stats.currentMonthDays > 0 && (
                  <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-dark-muted mt-0.5">
                    {stats.currentMonthDays.toFixed(1)} days worked
                  </p>
                )}
              </div>

              {/* Pending Payments */}
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <TrendingUp size={18} className="text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Pending</p>
                <p className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-dark-text truncate">
                  {formatCurrency(stats.totalUnpaid)}
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-dark-muted mt-0.5">
                  {stats.workersWithBalance} worker{stats.workersWithBalance !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Kharci */}
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Kharci (Month)</p>
                <p className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-dark-text truncate">
                  {formatCurrency(stats.currentMonthKharci)}
                </p>
              </div>
            </div>

            {/* Attendance Breakdown */}
            {Object.keys(stats.attendanceBreakdown).length > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm">
                <h3 className="text-sm sm:text-base font-bold text-neutral-800 dark:text-dark-text mb-2 sm:mb-3">
                  Attendance Breakdown
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {Object.entries(stats.attendanceBreakdown)
                    .sort(([a], [b]) => {
                      const order = ['P', 'P+¼', 'P+½', 'P+P', 'H', 'A']
                      return order.indexOf(a) - order.indexOf(b)
                    })
                    .map(([type, count]) => (
                      <div key={type} className="text-center p-2 sm:p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg">
                        <p className="text-xs text-neutral-600 dark:text-dark-muted mb-0.5">{type}</p>
                        <p className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-dark-text">{count}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Comparison */}
            {stats.previousMonthCost > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 sm:p-4 shadow-sm">
                <h3 className="text-sm sm:text-base font-bold text-neutral-800 dark:text-dark-text mb-2 sm:mb-3">
                  Month Comparison
                </h3>
                <div className="grid md:grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Current Month</p>
                    <p className="text-base sm:text-lg font-bold text-neutral-800 dark:text-dark-text truncate">
                      {formatCurrency(stats.currentMonthCost)}
                    </p>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg">
                    <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Previous Month</p>
                    <p className="text-base sm:text-lg font-bold text-neutral-800 dark:text-dark-text truncate">
                      {formatCurrency(stats.previousMonthCost)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-200 dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-neutral-700 dark:text-dark-text font-medium">Difference:</span>
                    <span className={`text-base sm:text-lg font-bold ${
                      stats.currentMonthCost > stats.previousMonthCost
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {stats.currentMonthCost > stats.previousMonthCost ? '+' : ''}
                      {formatCurrency(stats.currentMonthCost - stats.previousMonthCost)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-dark-card rounded-xl p-8 text-center">
            <BarChart3 size={40} className="mx-auto text-neutral-300 dark:text-dark-muted mb-3" />
            <p className="text-sm font-medium text-neutral-600 dark:text-dark-muted">
              No data available for selected period
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
