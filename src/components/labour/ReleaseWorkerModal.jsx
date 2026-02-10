import { useState } from 'react'
import { X, AlertCircle, UserX, DollarSign } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function ReleaseWorkerModal({ worker, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')
  const [settlement, setSettlement] = useState(null)

  const [formData, setFormData] = useState({
    last_working_date: new Date().toISOString().split('T')[0],
    release_reason: '',
    payment_mode: 'cash',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  })

  const calculateFinalSettlement = async () => {
    try {
      console.log('🔍 Starting calculateFinalSettlement...')
      console.log('Worker:', worker)
      console.log('FormData:', formData)
      
      setCalculating(true)
      setError('')

      // Validate last working date
      if (formData.last_working_date < worker.joining_date) {
        throw new Error('Last working date cannot be before joining date')
      }

      console.log('✅ Date validation passed')

      // Get all attendance up to last working date
      console.log('📊 Fetching attendance data...')
      const { data: attendanceData, error: attError } = await supabase
        .from('worker_attendance')
        .select('*')
        .eq('worker_id', worker.id)
        .lte('attendance_date', formData.last_working_date)
        .gte('attendance_date', worker.joining_date)

      console.log('Attendance data fetched:', attendanceData?.length, 'records')
      if (attError) {
        console.error('❌ Attendance fetch error:', attError)
        throw attError
      }

      // Get all previous settlements
      console.log('💰 Fetching previous settlements...')
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('worker_settlements')
        .select('amount_paid')
        .eq('worker_id', worker.id)

      console.log('Settlements data fetched:', settlementsData?.length, 'records')
      if (settlementsError) {
        console.error('❌ Settlements fetch error:', settlementsError)
        throw settlementsError
      }

      // Calculate totals
      console.log('🧮 Calculating totals...')
      const totalEarned = attendanceData?.reduce((sum, r) => sum + (parseFloat(r.daily_pay) || 0), 0) || 0
      const totalKharci = attendanceData?.reduce((sum, r) => sum + (parseFloat(r.kharci_amount) || 0), 0) || 0
      const totalPaid = settlementsData?.reduce((sum, r) => sum + (parseFloat(r.amount_paid) || 0), 0) || 0
      const netPayable = totalEarned - totalKharci - totalPaid

      console.log('Totals:', { totalEarned, totalKharci, totalPaid, netPayable })

      // Calculate attendance breakdown
      const breakdown = {}
      attendanceData?.forEach(record => {
        const type = record.attendance_type
        breakdown[type] = (breakdown[type] || 0) + 1
      })

      // Calculate total days worked (sum of all multipliers)
      const totalDaysWorked = attendanceData?.reduce((sum, r) => {
        return sum + (parseFloat(r.attendance_multiplier) || 0)
      }, 0) || 0

      console.log('Total days worked:', totalDaysWorked)
      console.log('Attendance breakdown:', breakdown)

      setSettlement({
        totalEarned,
        totalKharci,
        totalPaid,
        netPayable,
        attendanceBreakdown: breakdown,
        totalDaysWorked,
        attendanceRecords: attendanceData?.length || 0
      })

      console.log('✅ Settlement calculated successfully')

      // Pre-fill amount paid with net payable
      setFormData(prev => ({ ...prev, amount_paid: netPayable.toFixed(2) }))
    } catch (err) {
      console.error('❌ calculateFinalSettlement error:', err)
      console.error('Error stack:', err.stack)
      setError(err.message)
    } finally {
      setCalculating(false)
    }
  }

  const handleRelease = async () => {
    try {
      console.log('🚀 Starting handleRelease...')
      console.log('Worker:', worker)
      console.log('Settlement:', settlement)
      console.log('FormData:', formData)
      
      setLoading(true)
      setError('')

      if (!settlement) {
        throw new Error('Please calculate settlement first')
      }

      if (!formData.release_reason.trim()) {
        throw new Error('Please enter a release reason')
      }

      const amountPaid = parseFloat(formData.amount_paid) || 0
      const balanceRemaining = settlement.netPayable - amountPaid

      console.log('💵 Amount paid:', amountPaid, 'Balance:', balanceRemaining)

      // Create final settlement record
      console.log('📝 Creating settlement record...')
      const { data: settlementRecord, error: settlementError } = await supabase
        .from('worker_settlements')
        .insert({
          worker_id: worker.id,
          project_id: worker.current_project_id,
          settlement_month: new Date(formData.last_working_date).getMonth() + 1,
          settlement_year: new Date(formData.last_working_date).getFullYear(),
          settlement_date: new Date().toISOString().split('T')[0],
          settlement_type: 'final',
          period_start_date: worker.joining_date,
          period_end_date: formData.last_working_date,
          total_days_worked: settlement.totalDaysWorked,
          attendance_breakdown: settlement.attendanceBreakdown,
          total_earned: settlement.totalEarned,
          total_kharci: settlement.totalKharci,
          net_payable: settlement.netPayable,
          payment_mode: formData.payment_mode,
          payment_date: formData.payment_date,
          amount_paid: amountPaid,
          balance_remaining: balanceRemaining,
          remarks: formData.remarks || null,
          created_by: user.id
        })
        .select()
        .single()

      if (settlementError) {
        console.error('❌ Settlement record error:', settlementError)
        throw settlementError
      }

      console.log('✅ Settlement record created:', settlementRecord)

      // Update worker status
      console.log('👤 Updating worker status...')
      const { error: workerError } = await supabase
        .from('workers')
        .update({
          status: 'released',
          last_working_date: formData.last_working_date,
          release_reason: formData.release_reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', worker.id)

      if (workerError) {
        console.error('❌ Worker update error:', workerError)
        throw workerError
      }

      console.log('✅ Worker status updated successfully')
      console.log('🎉 Release process completed!')

      onSuccess()
    } catch (err) {
      console.error('❌ handleRelease error:', err)
      console.error('Error stack:', err.stack)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <UserX size={28} />
            <div>
              <h2 className="text-2xl font-bold">Release Worker</h2>
              <p className="text-sm opacity-90">{worker.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Last Working Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
              Last Working Date *
            </label>
            <input
              type="date"
              value={formData.last_working_date}
              onChange={(e) => {
                setFormData({ ...formData, last_working_date: e.target.value })
                setSettlement(null) // Reset settlement when date changes
              }}
              min={worker.joining_date}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
            />
          </div>

          {/* Release Reason */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
              Reason for Release *
            </label>
            <textarea
              value={formData.release_reason}
              onChange={(e) => setFormData({ ...formData, release_reason: e.target.value })}
              rows="3"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text resize-none"
              placeholder="E.g., Found better job, Personal reasons, etc."
            />
          </div>

          {/* Calculate Button */}
          {!settlement && (
            <button
              onClick={calculateFinalSettlement}
              disabled={calculating}
              className="w-full px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {calculating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <DollarSign size={20} />
                  Calculate Final Settlement
                </>
              )}
            </button>
          )}

          {/* Settlement Summary */}
          {settlement && (
            <div className="space-y-4">
              {/* Work Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-neutral-800 dark:text-dark-text mb-3">Work Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-600 dark:text-dark-muted">Total Days Worked</p>
                    <p className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                      {settlement.totalDaysWorked.toFixed(2)} days
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-600 dark:text-dark-muted">Attendance Records</p>
                    <p className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                      {settlement.attendanceRecords} entries
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-neutral-600 dark:text-dark-muted mb-2">Attendance Breakdown:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(settlement.attendanceBreakdown).map(([type, count]) => (
                      <span key={type} className="px-2 py-1 bg-white dark:bg-dark-card rounded-lg text-xs font-medium">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-neutral-800 dark:text-dark-text mb-3">Financial Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-dark-muted">Total Earned</span>
                    <span className="font-semibold text-neutral-800 dark:text-dark-text">
                      ₹{settlement.totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-dark-muted">Total Kharci Taken</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      - ₹{settlement.totalKharci.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-dark-muted">Previous Payments</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      - ₹{settlement.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-2 border-t-2 border-green-300 dark:border-green-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 dark:text-dark-text">Net Payable</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ₹{settlement.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-800 dark:text-dark-text">Payment Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                      Payment Mode *
                    </label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
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
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                      placeholder="₹"
                      step="0.01"
                      min="0"
                    />
                    {parseFloat(formData.amount_paid) < settlement.netPayable && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ⚠️ Balance remaining: ₹{(settlement.netPayable - parseFloat(formData.amount_paid || 0)).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                    Payment Remarks (Optional)
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-dark-border flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-xl font-semibold text-neutral-700 dark:text-dark-text hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          {settlement && (
            <button
              onClick={handleRelease}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Releasing...
                </>
              ) : (
                <>
                  <UserX size={20} />
                  Confirm Release
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
