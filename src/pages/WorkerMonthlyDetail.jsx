import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Wallet, TrendingUp, Info, X, Save } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ATTENDANCE_TYPES = [
  { value: 'P', label: 'P (Present)', multiplier: 1.0 },
  { value: '½', label: '½ (Half Day)', multiplier: 0.5 },
  { value: 'P+¼', label: 'P+¼ (1.25x)', multiplier: 1.25 },
  { value: 'P+½', label: 'P+½ (1.5x)', multiplier: 1.5 },
  { value: 'P+P', label: 'P+P (Double)', multiplier: 2.0 },
  { value: 'A', label: 'A (Absent)', multiplier: 0 }
]

export default function WorkerMonthlyDetail() {
  const { user } = useAuth()
  const { workerId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [worker, setWorker] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const [attendanceData, setAttendanceData] = useState([])
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [balance, setBalance] = useState(null)
  const [editingDay, setEditingDay] = useState(null)
  const [editForm, setEditForm] = useState({
    attendanceType: 'P',
    kharci: 0,
    remarks: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (workerId) {
      loadWorkerData()
    }
  }, [workerId, selectedMonth])

  const loadWorkerData = async () => {
    try {
      setLoading(true)

      // Load worker details
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single()

      if (workerError) throw workerError
      setWorker(workerData)

      // Parse month
      const [year, month] = selectedMonth.split('-').map(Number)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      const startDate = format(monthStart, 'yyyy-MM-dd')
      const endDate = format(monthEnd, 'yyyy-MM-dd')

      // Load attendance data for the month
      const { data: attendance, error: attendanceError } = await supabase
        .from('worker_attendance')
        .select('*')
        .eq('worker_id', workerId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date')

      if (attendanceError) throw attendanceError

      // Create day-by-day data
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
      const attendanceMap = new Map(attendance?.map(a => [a.attendance_date, a]) || [])
      
      const dailyData = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const record = attendanceMap.get(dateStr)
        return {
          date: dateStr,
          dayName: format(day, 'EEE'),
          dayNum: format(day, 'dd'),
          attendance: record || null,
          hajari: record?.attendance_multiplier || 0,
          payment: record?.daily_pay || 0
        }
      })

      setAttendanceData(dailyData)

      // Calculate monthly totals
      const totalDays = dailyData.reduce((sum, d) => sum + d.hajari, 0)
      const totalEarned = dailyData.reduce((sum, d) => sum + d.payment, 0)
      
      // Get settlements for this month
      const { data: settlements, error: settlementsError } = await supabase
        .from('worker_settlements')
        .select('*')
        .eq('worker_id', workerId)
        .eq('settlement_year', year)
        .eq('settlement_month', month)

      if (settlementsError) throw settlementsError

      const totalPaid = settlements?.reduce((sum, s) => sum + parseFloat(s.amount_paid), 0) || 0
      const totalKharci = settlements?.reduce((sum, s) => sum + parseFloat(s.kharci || 0), 0) || 0

      // Get unpaid balance from view
      const { data: balanceData, error: balanceError } = await supabase
        .from('v_worker_unpaid_balance')
        .select('*')
        .eq('id', workerId)
        .single()

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Balance error:', balanceError)
      }

      setBalance(balanceData)
      
      // Carry forward is the balance from before this month's work
      const carryForward = (balanceData?.unpaid_balance || 0) - (totalEarned - totalPaid - totalKharci)
      
      setMonthlyStats({
        totalDays,
        totalEarned,
        totalKharci,
        totalPaid,
        balance: balanceData?.unpaid_balance || 0,
        carryForward
      })

    } catch (error) {
      console.error('Error loading worker data:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const currentDate = new Date(year, month - 1, 1)
    const newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
    const today = new Date()
    
    // Don't go beyond current month
    if (direction === 'next' && newDate > today) {
      return
    }
    
    setSelectedMonth(format(newDate, 'yyyy-MM'))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleDayClick = (day) => {
    setEditingDay(day)
    if (day.attendance) {
      setEditForm({
        attendanceType: day.attendance.attendance_type,
        kharci: day.attendance.kharci_amount || 0,
        remarks: day.attendance.remarks || ''
      })
    } else {
      setEditForm({
        attendanceType: 'P',
        kharci: 0,
        remarks: ''
      })
    }
  }

  const handleSaveAttendance = async () => {
    try {
      setSaving(true)
      const attendanceType = ATTENDANCE_TYPES.find(t => t.value === editForm.attendanceType)
      const dailyPay = attendanceType.multiplier * worker.base_daily_wage

      const attendanceRecord = {
        worker_id: workerId,
        attendance_date: editingDay.date,
        project_id: worker.current_project_id,
        attendance_type: editForm.attendanceType,
        attendance_multiplier: attendanceType.multiplier,
        base_wage_used: worker.base_daily_wage,
        travel_allowance_used: worker.travel_allowance || 0,
        daily_pay: dailyPay,
        kharci_amount: parseFloat(editForm.kharci) || 0,
        remarks: editForm.remarks || null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      if (editingDay.attendance) {
        // Update existing
        const { error } = await supabase
          .from('worker_attendance')
          .update(attendanceRecord)
          .eq('id', editingDay.attendance.id)

        if (error) throw error
      } else {
        // Insert new
        attendanceRecord.created_by = user.id
        attendanceRecord.created_at = new Date().toISOString()
        
        const { error } = await supabase
          .from('worker_attendance')
          .insert(attendanceRecord)

        if (error) throw error
      }

      // Reload data
      await loadWorkerData()
      setEditingDay(null)
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600 dark:text-dark-muted">Loading worker details...</p>
        </div>
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 dark:text-dark-muted">Worker not found</p>
          <button
            onClick={() => navigate('/labour-reports')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentMonthDate = parseISO(selectedMonth + '-01')
  const isCurrentMonth = format(currentMonthDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-indigo-700 text-white px-4 py-4 md:py-6 shadow-soft-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          {/* Back Button & Title */}
          <button
            onClick={() => navigate('/labour-reports')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back to Reports</span>
          </button>

          {/* Worker Info */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">👷</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold">{worker.full_name}</h1>
              <p className="text-white/90 text-sm mt-1">
                Rate/Salary - {worker.base_daily_wage}
              </p>
              <p className="text-white/80 text-sm">{worker.category}</p>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-2 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 min-w-[180px] justify-center">
              <Calendar size={18} />
              <span className="font-semibold">
                {format(currentMonthDate, 'MMMM yyyy')}
              </span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              disabled={isCurrentMonth}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Attendance Table */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-100 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border font-semibold text-sm text-neutral-700 dark:text-dark-text">
            <div>Date</div>
            <div className="text-center">Hajari</div>
            <div className="text-right">Payment</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-neutral-200 dark:divide-dark-border">
            {attendanceData.map((day) => (
              <button
                key={day.date}
                onClick={() => handleDayClick(day)}
                className={`w-full grid grid-cols-3 gap-2 p-3 text-sm text-left transition-colors ${
                  day.attendance ? 'bg-white dark:bg-dark-card hover:bg-blue-50 dark:hover:bg-blue-900/10' : 'bg-neutral-50 dark:bg-dark-bg hover:bg-neutral-100 dark:hover:bg-dark-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-800 dark:text-dark-text">
                    {day.dayName}
                  </span>
                  <span className="text-neutral-600 dark:text-dark-muted">
                    {day.dayNum}
                  </span>
                </div>
                <div className="text-center font-medium text-neutral-800 dark:text-dark-text">
                  {day.hajari > 0 ? day.hajari.toFixed(2) : '-'}
                </div>
                <div className="text-right">
                  {day.payment > 0 ? (
                    <span className="font-medium text-neutral-800 dark:text-dark-text">
                      ₹ {day.payment.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-dark-muted">-</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Total Row */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800 font-bold">
            <div className="text-neutral-800 dark:text-dark-text">Total</div>
            <div className="text-center text-blue-600 dark:text-blue-400">
              {monthlyStats?.totalDays?.toFixed(2) || '0'} + 0L + 0OT
            </div>
            <div className="text-right text-blue-600 dark:text-blue-400">
              {formatCurrency(monthlyStats?.totalEarned || 0)}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4">
          {/* Balance Card */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="text-purple-600" size={20} />
              <h3 className="font-semibold text-neutral-800 dark:text-dark-text">BALANCE</h3>
              <Info size={16} className="text-neutral-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 dark:text-dark-muted">Balance</span>
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                  {formatCurrency(monthlyStats?.balance || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-dark-border">
                <span className="text-sm text-neutral-600 dark:text-dark-muted">+ CARRY FORWARD</span>
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                  {formatCurrency(monthlyStats?.carryForward || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Allowance & Total Card */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600 dark:text-dark-muted">Allowance Paid (Above Salary)</span>
              <span className="font-bold text-neutral-800 dark:text-dark-text">
                {formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-neutral-300 dark:border-dark-border">
              <span className="font-semibold text-neutral-800 dark:text-dark-text">Total</span>
              <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                {formatCurrency((monthlyStats?.balance || 0) + (monthlyStats?.carryForward || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingDay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-indigo-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {format(parseISO(editingDay.date), 'EEEE, MMM dd')}
                </h3>
                <p className="text-sm text-white/80">{worker.full_name}</p>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Attendance Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Attendance Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ATTENDANCE_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setEditForm({ ...editForm, attendanceType: type.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        editForm.attendanceType === type.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover text-neutral-700 dark:text-dark-text hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold text-lg">{type.value}</div>
                      <div className="text-xs opacity-75">{type.multiplier}x</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kharci */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Kharci (Allowance)
                </label>
                <input
                  type="number"
                  value={editForm.kharci}
                  onChange={(e) => setEditForm({ ...editForm, kharci: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 text-neutral-800 dark:text-dark-text"
                  placeholder="Enter kharci amount"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 text-neutral-800 dark:text-dark-text"
                  rows="2"
                  placeholder="Add any notes..."
                />
              </div>

              {/* Payment Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-dark-muted">Daily Payment:</span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      (ATTENDANCE_TYPES.find(t => t.value === editForm.attendanceType)?.multiplier || 0) * 
                      worker.base_daily_wage
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-dark-border flex gap-3">
              <button
                onClick={() => setEditingDay(null)}
                className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-dark-text rounded-lg hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save
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
