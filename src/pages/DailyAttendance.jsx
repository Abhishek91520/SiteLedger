import { useState, useEffect } from 'react'
import { Calendar, Save, AlertCircle, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart3, X } from 'lucide-react'
import { format, subDays, addDays, isToday, isFuture, parseISO, startOfDay, addMonths, subMonths, startOfMonth } from 'date-fns'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import WorkerMonthlyModal from '../components/WorkerMonthlyModal'

const ATTENDANCE_TYPES = [
  { value: 'P', label: 'P', multiplier: 1.0, color: 'green' },
  { value: 'H', label: 'H', multiplier: 0.5, color: 'red' },
  { value: 'P+¼', label: 'P+¼', multiplier: 1.25, color: 'blue' },
  { value: 'P+½', label: 'P+½', multiplier: 1.5, color: 'blue' },
  { value: 'P+P', label: 'P+P', multiplier: 2.0, color: 'purple' },
  { value: 'A', label: 'A', multiplier: 0, color: 'red' }
]

export default function DailyAttendance() {
  const { user } = useAuth()
  const [selectedWorkerForReport, setSelectedWorkerForReport] = useState(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateRange, setDateRange] = useState([])
  const [workers, setWorkers] = useState([])
  const [attendance, setAttendance] = useState({})
  const [workerBalances, setWorkerBalances] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Generate date range using date-fns
  useEffect(() => {
    generateDateRange()
  }, [selectedDate])

  const generateDateRange = () => {
    const dates = []
    const selected = parseISO(selectedDate)
    const today = startOfDay(new Date())
    
    // Generate 7 days: 3 before, selected, 3 after
    for (let i = -3; i <= 3; i++) {
      const date = i < 0 ? subDays(selected, Math.abs(i)) : addDays(selected, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // Only show dates up to today
      if (!isFuture(date)) {
        dates.push({
          date: dateStr,
          day: format(date, 'd'),
          dayName: format(date, 'EEE').toUpperCase(),
          month: format(date, 'MMM').toUpperCase(),
          isToday: isToday(date),
          isSelected: dateStr === selectedDate
        })
      }
    }
    
    setDateRange(dates)
  }

  const navigateDate = (direction) => {
    const current = parseISO(selectedDate)
    const newDate = direction === 'next' ? addDays(current, 1) : subDays(current, 1)
    
    // Don't navigate to future dates
    if (!isFuture(newDate)) {
      setSelectedDate(format(newDate, 'yyyy-MM-dd'))
    }
  }

  const navigateMonth = (direction) => {
    const currentDate = parseISO(selectedDate)
    const newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
    const newDateStr = format(startOfMonth(newDate), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')
    
    // Don't go beyond today when navigating forward
    if (direction === 'next' && newDateStr > today) {
      setSelectedDate(today)
    } else {
      setSelectedDate(newDateStr)
    }
  }

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  useEffect(() => {
    loadWorkersAndAttendance()
  }, [selectedDate])

  const loadWorkersAndAttendance = async () => {
    try {
      setLoading(true)
      
      // Load active workers
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .eq('status', 'active')
        .order('full_name')

      if (workersError) throw workersError

      // Load existing attendance for selected date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('worker_attendance')
        .select('*')
        .eq('attendance_date', selectedDate)

      if (attendanceError) throw attendanceError

      // Build attendance map
      const attendanceMap = {}
      attendanceData?.forEach(record => {
        attendanceMap[record.worker_id] = {
          id: record.id,
          attendance_type: record.attendance_type,
          kharci_amount: record.kharci_amount || 0,
          remarks: record.remarks || ''
        }
      })

      setWorkers(workersData || [])
      setAttendance(attendanceMap)
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const calculateDailyPay = (worker, attendanceType) => {
    const typeData = ATTENDANCE_TYPES.find(t => t.value === attendanceType)
    if (!typeData) return 0

    const baseWage = worker.base_daily_wage || 0
    const travelAllowance = worker.travel_allowance || 0
    const multiplier = typeData.multiplier

    // Formula: (base_wage × multiplier) + travel_allowance
    // Travel allowance is NOT multiplied
    if (multiplier === 0) return 0
    return (baseWage * multiplier) + travelAllowance
  }

  const handleAttendanceChange = (workerId, field, value) => {
    setAttendance(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value
      }
    }))
    setHasChanges(true)

    // Fetch balance when attendance type is selected (so it's ready when they enter kharci)
    if (field === 'attendance_type' && value !== 'A') {
      fetchWorkerBalance(workerId)
    }
  }

  const fetchWorkerBalance = async (workerId) => {
    try {
      // Get total earned
      const { data: earnedData } = await supabase
        .from('worker_attendance')
        .select('daily_pay, kharci_amount')
        .eq('worker_id', workerId)

      const totalEarned = earnedData?.reduce((sum, r) => sum + (r.daily_pay || 0), 0) || 0
      const totalKharci = earnedData?.reduce((sum, r) => sum + (r.kharci_amount || 0), 0) || 0

      // Get total paid from settlements
      const { data: settlementsData } = await supabase
        .from('worker_settlements')
        .select('amount_paid')
        .eq('worker_id', workerId)

      const totalPaid = settlementsData?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0
      
      const unpaidBalance = totalEarned - totalKharci - totalPaid
      
      // Store the balance
      setWorkerBalances(prev => ({
        ...prev,
        [workerId]: unpaidBalance
      }))
    } catch (error) {
      console.error('Error fetching worker balance:', error)
    }
  }

  const canMarkAttendance = (worker) => {
    const selectedDateObj = new Date(selectedDate)
    const joiningDateObj = new Date(worker.joining_date)
    
    // Block if before joining date
    if (selectedDateObj < joiningDateObj) {
      return { allowed: false, reason: 'Before joining date' }
    }

    // Block if after release date
    if (worker.last_working_date) {
      const lastWorkingDateObj = new Date(worker.last_working_date)
      if (selectedDateObj > lastWorkingDateObj) {
        return { allowed: false, reason: 'After last working date' }
      }
    }

    return { allowed: true }
  }

  const validateKharci = async (workerId, kharciAmount) => {
    if (kharciAmount <= 0) return { valid: true }

    try {
      // Calculate unpaid balance
      const { data: earnedData } = await supabase
        .from('worker_attendance')
        .select('daily_pay, kharci_amount')
        .eq('worker_id', workerId)

      const { data: settlementsData } = await supabase
        .from('worker_settlements')
        .select('amount_paid')
        .eq('worker_id', workerId)

      const totalEarned = earnedData?.reduce((sum, r) => sum + (r.daily_pay || 0), 0) || 0
      const totalKharci = earnedData?.reduce((sum, r) => sum + (r.kharci_amount || 0), 0) || 0
      const totalPaid = settlementsData?.reduce((sum, r) => sum + (r.amount_paid || 0), 0) || 0
      const unpaidBalance = totalEarned - totalKharci - totalPaid

      if (kharciAmount > unpaidBalance) {
        return {
          valid: false,
          unpaidBalance,
          message: `Kharci ₹${kharciAmount} exceeds unpaid balance ₹${unpaidBalance.toFixed(2)}`
        }
      }

      return { valid: true, unpaidBalance }
    } catch (error) {
      console.error('Error validating kharci:', error)
      return { valid: true } // Allow on error
    }
  }

  const handleSaveAttendance = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const records = []
      const kharciWarnings = []

      for (const [workerId, data] of Object.entries(attendance)) {
        if (!data.attendance_type) continue

        const worker = workers.find(w => w.id === workerId)
        if (!worker) continue

        const canMark = canMarkAttendance(worker)
        if (!canMark.allowed) {
          setMessage({ type: 'error', text: `Cannot mark attendance for ${worker.full_name}: ${canMark.reason}` })
          return
        }

        const typeData = ATTENDANCE_TYPES.find(t => t.value === data.attendance_type)
        const dailyPay = calculateDailyPay(worker, data.attendance_type)
        const kharciAmount = parseFloat(data.kharci_amount) || 0

        // Validate kharci
        if (kharciAmount > 0) {
          const validation = await validateKharci(workerId, kharciAmount)
          if (!validation.valid) {
            kharciWarnings.push({
              worker: worker.full_name,
              message: validation.message
            })
          }
        }

        records.push({
          worker_id: workerId,
          attendance_date: selectedDate,
          project_id: worker.current_project_id,
          attendance_type: data.attendance_type,
          attendance_multiplier: typeData.multiplier,
          base_wage_used: worker.base_daily_wage,
          travel_allowance_used: worker.travel_allowance || 0,
          daily_pay: dailyPay,
          kharci_amount: kharciAmount,
          remarks: data.remarks || null,
          created_by: user.id,
          updated_by: user.id
        })
      }

      // Show kharci warnings
      if (kharciWarnings.length > 0) {
        const proceed = confirm(
          `⚠️ KHARCI WARNINGS:\n\n${kharciWarnings.map(w => `${w.worker}: ${w.message}`).join('\n')}\n\nDo you want to proceed anyway (override)?`
        )
        if (!proceed) {
          setSaving(false)
          return
        }
      }

      if (records.length === 0) {
        setMessage({ type: 'error', text: 'No attendance marked' })
        return
      }

      // Upsert records
      const { error } = await supabase
        .from('worker_attendance')
        .upsert(records, {
          onConflict: 'worker_id,attendance_date',
          ignoreDuplicates: false
        })

      if (error) throw error

      setMessage({ type: 'success', text: `Saved attendance for ${records.length} worker(s)` })
      setHasChanges(false)
      loadWorkersAndAttendance()
    } catch (error) {
      console.error('Error saving attendance:', error)
      setMessage({ type: 'error', text: 'Failed to save attendance' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-indigo-700 text-white px-4 py-4 md:py-6 shadow-soft-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-4">
            <Calendar size={24} />
            Daily Attendance
          </h1>
          
          {/* Month/Year Navigation & Today Button */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-2 transition-colors"
                aria-label="Previous month"
              >
                <ChevronsLeft size={18} />
              </button>
              <div className="text-white font-semibold text-sm sm:text-base min-w-[120px] text-center">
                {format(parseISO(selectedDate), 'MMMM yyyy')}
              </div>
              <button
                onClick={() => navigateMonth('next')}
                disabled={selectedDate >= format(new Date(), 'yyyy-MM-dd')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next month"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="bg-white text-blue-600 hover:bg-white/90 font-medium px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
            >
              Today
            </button>
          </div>
          
          {/* Horizontal Date Picker */}
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={() => navigateDate('prev')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft size={20} />
            </button>
            
            <button
              onClick={() => navigateDate('next')}
              disabled={selectedDate >= format(new Date(), 'yyyy-MM-dd')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next day"
            >
              <ChevronRight size={20} />
            </button>

            {/* Date Cards */}
            <div className="overflow-x-auto scrollbar-hide px-10">
              <div className="flex gap-2 py-2 min-w-min">
                {dateRange.length > 0 ? dateRange.map((dateObj) => (
                  <button
                    key={dateObj.date}
                    onClick={() => setSelectedDate(dateObj.date)}
                    className={`flex-shrink-0 w-16 sm:w-20 rounded-2xl p-3 transition-all duration-200 ${
                      dateObj.date === selectedDate
                        ? 'bg-white text-blue-600 shadow-lg scale-105'
                        : dateObj.isToday
                        ? 'bg-white/30 text-white border-2 border-white/50'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    aria-label={`Select ${dateObj.month} ${dateObj.day}`}
                  >
                    <div className="text-center">
                      <div className="text-[10px] font-medium opacity-80 mb-1">
                        {dateObj.month}
                      </div>
                      <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
                        selectedDate === dateObj.date ? 'text-blue-600' : ''
                      }`}>
                        {dateObj.day}
                      </div>
                      <div className="text-[10px] font-medium opacity-80">
                        {dateObj.dayName}
                      </div>
                      {dateObj.isToday && (
                        <div className="mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full mx-auto ${
                            selectedDate === dateObj.date ? 'bg-blue-600' : 'bg-white'
                          }`}></div>
                        </div>
                      )}
                    </div>
                  </button>
                )) : (
                  <div className="text-white text-sm py-4 text-center w-full">Loading dates...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Workers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-8 text-center">
            <p className="text-neutral-600 dark:text-dark-muted">No active workers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workers.map(worker => {
              const workerAttendance = attendance[worker.id] || {}
              const selectedType = workerAttendance.attendance_type
              const dailyPay = selectedType ? calculateDailyPay(worker, selectedType) : 0
              const canMark = canMarkAttendance(worker)

              return (
                <div
                  key={worker.id}
                  className={`bg-white dark:bg-dark-card rounded-xl shadow-soft overflow-hidden ${
                    !canMark.allowed ? 'opacity-60' : ''
                  }`}
                >
                  {/* Worker Header */}
                  <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-dark-hover dark:to-dark-border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-neutral-800 dark:text-dark-text">{worker.full_name}</h3>
                        <p className="text-sm text-neutral-600 dark:text-dark-muted">
                          {worker.category} • Base ₹{worker.base_daily_wage}
                          {worker.travel_allowance > 0 && ` + TA ₹${worker.travel_allowance}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {dailyPay > 0 && (
                          <div className="text-right">
                            <div className="text-xs text-neutral-600 dark:text-dark-muted">Daily Pay</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              ₹{dailyPay.toFixed(0)}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedWorkerForReport(worker)}
                          className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                          title="View Monthly Report"
                        >
                          <BarChart3 size={20} />
                        </button>
                      </div>
                    </div>
                    {!canMark.allowed && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                        🚫 {canMark.reason}
                      </div>
                    )}
                  </div>

                  {/* Attendance Buttons */}
                  {canMark.allowed && (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {ATTENDANCE_TYPES.map(type => (
                          <button
                            key={type.value}
                            onClick={() => handleAttendanceChange(worker.id, 'attendance_type', type.value)}
                            className={`py-2 px-1 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                              selectedType === type.value
                                ? `bg-${type.color}-600 text-white shadow-lg scale-105`
                                : `bg-${type.color}-50 dark:bg-${type.color}-900/20 text-${type.color}-700 dark:text-${type.color}-400 hover:bg-${type.color}-100 dark:hover:bg-${type.color}-900/20`
                            }`}
                            style={{
                              backgroundColor: selectedType === type.value 
                                ? type.color === 'green' ? '#16a34a'
                                : type.color === 'yellow' ? '#ca8a04'
                                : type.color === 'blue' ? '#2563eb'
                                : type.color === 'indigo' ? '#4f46e5'
                                : type.color === 'purple' ? '#9333ea'
                                : '#dc2626'
                                : undefined
                            }}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>

                      {/* Kharci Input */}
                      {selectedType && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-dark-text mb-1">
                            Kharci (Optional)
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={workerAttendance.kharci_amount || ''}
                            onChange={(e) => handleAttendanceChange(worker.id, 'kharci_amount', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                          />
                          {workerBalances[worker.id] !== undefined && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                              💰 Available balance: <span className="font-bold text-green-600 dark:text-green-400">₹{workerBalances[worker.id].toFixed(2)}</span>
                            </p>
                          )}
                        </div>
                      )}    

                      {/* Remarks */}
                      {selectedType && (
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-dark-text mb-1">
                            Remarks (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={workerAttendance.remarks || ''}
                            onChange={(e) => handleAttendanceChange(worker.id, 'remarks', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Save Button */}
        {workers.length > 0 && (
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50 shadow-lg sticky bottom-4"
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={24} />
                Save Attendance
              </>
            )}
          </button>
        )}

        {/* Floating Save Button - Shows when changes detected */}
        {hasChanges && workers.length > 0 && (
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="fixed bottom-20 right-6 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold text-base transition-all disabled:opacity-50 z-50 animate-bounce"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save
              </>
            )}
          </button>
        )}

        {/* Floating Save Button - Shows when changes detected */}
        {hasChanges && workers.length > 0 && (
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="fixed bottom-20 right-6 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold text-base transition-all disabled:opacity-50 z-50 animate-bounce"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save
              </>
            )}
          </button>
        )}
      </div>

      {/* Worker Monthly Report Modal */}
      {selectedWorkerForReport && (
        <WorkerMonthlyModal
          worker={selectedWorkerForReport}
          onClose={() => setSelectedWorkerForReport(null)}
        />
      )}
    </div>
  )
}
