import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar, Wallet, Info, Save } from 'lucide-react'
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

export default function WorkerMonthlyModal({ worker, onClose }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const [attendanceData, setAttendanceData] = useState([])
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [editingDay, setEditingDay] = useState(null)
  const [editForm, setEditForm] = useState({
    attendanceType: 'P',
    kharci: 0,
    remarks: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (worker) {
      loadWorkerData()
    }
  }, [worker, selectedMonth])

  const loadWorkerData = async () => {
    try {
      setLoading(true)

      const [year, month] = selectedMonth.split('-').map(Number)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      const startDate = format(monthStart, 'yyyy-MM-dd')
      const endDate = format(monthEnd, 'yyyy-MM-dd')

      const { data: attendance, error: attendanceError } = await supabase
        .from('worker_attendance')
        .select('*')
        .eq('worker_id', worker.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date')

      if (attendanceError) throw attendanceError

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

      const totalDays = dailyData.reduce((sum, d) => sum + d.hajari, 0)
      const totalEarned = dailyData.reduce((sum, d) => sum + d.payment, 0)
      const totalKharciFromAttendance = dailyData.reduce((sum, d) => sum + (d.attendance?.kharci_amount || 0), 0)
      
      const { data: settlements, error: settlementsError } = await supabase
        .from('worker_settlements')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('settlement_year', year)
        .eq('settlement_month', month)

      if (settlementsError) throw settlementsError

      const totalPaid = settlements?.reduce((sum, s) => sum + parseFloat(s.amount_paid), 0) || 0
      const totalKharci = settlements?.reduce((sum, s) => sum + parseFloat(s.kharci || 0), 0) || 0

      const { data: balanceData, error: balanceError } = await supabase
        .from('v_worker_unpaid_balance')
        .select('*')
        .eq('id', worker.id)
        .single()

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Balance error:', balanceError)
      }

      const carryForward = (balanceData?.unpaid_balance || 0) - (totalEarned - totalPaid - totalKharci)
      
      setMonthlyStats({
        totalDays,
        totalEarned,
        totalKharci: totalKharciFromAttendance,
        totalPaid,
        balance: balanceData?.unpaid_balance || 0,
        carryForward
      })

    } catch (error) {
      console.error('Error loading worker data:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const currentDate = new Date(year, month - 1, 1)
    const newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
    const today = new Date()
    
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
        worker_id: worker.id,
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
        const { error } = await supabase
          .from('worker_attendance')
          .update(attendanceRecord)
          .eq('id', editingDay.attendance.id)

        if (error) throw error
      } else {
        attendanceRecord.created_by = user.id
        attendanceRecord.created_at = new Date().toISOString()
        
        const { error } = await supabase
          .from('worker_attendance')
          .insert(attendanceRecord)

        if (error) throw error
      }

      await loadWorkerData()
      setEditingDay(null)
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const currentMonthDate = parseISO(selectedMonth + '-01')
  const isCurrentMonth = format(currentMonthDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-indigo-700 text-white px-4 py-4 rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">👷</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{worker.full_name}</h2>
                <p className="text-white/90 text-sm">Rate/Salary - {worker.base_daily_wage}</p>
                <p className="text-white/80 text-sm">{worker.category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-2 transition-colors"
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
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Attendance Table */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-soft overflow-hidden">
                <div className="grid grid-cols-4 gap-2 p-3 bg-neutral-100 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border font-semibold text-sm text-neutral-800 dark:text-dark-text">
                  <div>Date</div>
                  <div className="text-center">Hajari</div>
                  <div className="text-right">Kharchi</div>
                  <div className="text-right">Payment</div>
                </div>

                <div className="divide-y divide-neutral-200 dark:divide-dark-border max-h-[500px] overflow-y-auto">
                  {attendanceData.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => handleDayClick(day)}
                      className={`w-full grid grid-cols-4 gap-2 p-3 text-sm text-left transition-colors ${
                        day.attendance ? 'bg-white dark:bg-dark-card hover:bg-blue-50 dark:hover:bg-blue-900/10' : 'bg-neutral-50 dark:bg-dark-bg hover:bg-neutral-100 dark:hover:bg-dark-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-800 dark:text-dark-text">{day.dayName}</span>
                        <span className="text-neutral-600 dark:text-dark-muted">{day.dayNum}</span>
                      </div>
                      <div className="text-center font-medium text-neutral-800 dark:text-dark-text">
                        {day.hajari > 0 ? day.hajari.toFixed(2) : '-'}
                      </div>
                      <div className="text-right">
                        {day.attendance?.kharci_amount > 0 ? (
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            ₹ {day.attendance.kharci_amount.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-dark-muted">-</span>
                        )}
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

                <div className="grid grid-cols-4 gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800 font-bold">
                  <div>Total</div>
                  <div className="text-center text-blue-600 dark:text-blue-400">
                    {monthlyStats?.totalDays?.toFixed(2) || '0'} + 0L + 0OT
                  </div>
                  <div className="text-right text-orange-600 dark:text-orange-400">
                    {formatCurrency(monthlyStats?.totalKharci || 0)}
                  </div>
                  <div className="text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(monthlyStats?.totalEarned || 0)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Edit Modal */}
        {editingDay && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full m-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    {format(parseISO(editingDay.date), 'EEEE, MMM dd')}
                  </h3>
                  <p className="text-sm text-white/80">{worker.full_name}</p>
                </div>
                <button onClick={() => setEditingDay(null)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
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
    </div>
  )
}
