import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Save, AlertCircle } from 'lucide-react'

export default function DailyProgress() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    wingCode: '',
    floorNumber: '',
    flatId: '',
    workItemId: '',
    quantityCompleted: 1,
    remarks: '',
  })
  
  const [wings, setWings] = useState([])
  const [floors, setFloors] = useState([])
  const [flats, setFlats] = useState([])
  const [workItems, setWorkItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (formData.wingCode) {
      loadFloors()
    }
  }, [formData.wingCode])

  useEffect(() => {
    if (formData.floorNumber && formData.wingCode) {
      loadFlats()
    }
  }, [formData.floorNumber, formData.wingCode])

  const loadInitialData = async () => {
    try {
      const [wingsRes, workItemsRes] = await Promise.all([
        supabase.from('wings').select('*').order('code'),
        supabase.from('work_items').select('*').eq('is_active', true).order('code')
      ])

      setWings(wingsRes.data || [])
      setWorkItems(workItemsRes.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const loadFloors = async () => {
    try {
      const wing = wings.find(w => w.code === formData.wingCode)
      if (!wing) return

      const { data } = await supabase
        .from('floors')
        .select('*')
        .eq('wing_id', wing.id)
        .order('floor_number')

      setFloors(data || [])
      setFormData(prev => ({ ...prev, floorNumber: '', flatId: '' }))
    } catch (err) {
      console.error('Error loading floors:', err)
    }
  }

  const loadFlats = async () => {
    try {
      const wing = wings.find(w => w.code === formData.wingCode)
      if (!wing) return

      const floor = floors.find(f => f.floor_number === parseInt(formData.floorNumber))
      if (!floor) return

      const { data } = await supabase
        .from('flats')
        .select('*')
        .eq('floor_id', floor.id)
        .order('flat_number')

      setFlats(data || [])
      setFormData(prev => ({ ...prev, flatId: '' }))
    } catch (err) {
      console.error('Error loading flats:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validation
      if (!formData.flatId || !formData.workItemId) {
        throw new Error('Please select all required fields')
      }

      // Check if this work item is already completed for this flat
      const { data: existing } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('flat_id', formData.flatId)
        .eq('work_item_id', formData.workItemId)

      // Business logic: Prevent double completion (simplified for now)
      // Full logic will check total quantity vs work item total

      // Insert progress entry
      const { error: insertError } = await supabase
        .from('progress_entries')
        .insert({
          flat_id: formData.flatId,
          work_item_id: formData.workItemId,
          entry_date: formData.entryDate,
          quantity_completed: formData.quantityCompleted,
          remarks: formData.remarks,
          created_by: user.id,
        })

      if (insertError) throw insertError

      setSuccess('Progress entry saved successfully!')
      
      // Reset form
      setFormData({
        entryDate: new Date().toISOString().split('T')[0],
        wingCode: formData.wingCode,
        floorNumber: formData.floorNumber,
        flatId: '',
        workItemId: '',
        quantityCompleted: 1,
        remarks: '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card pb-20 md:pb-6 transition-colors duration-300">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Daily Progress Entry</h1>
          <p className="text-primary-100 dark:text-primary-200 mt-2 text-lg">Record construction work completion</p>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 md:p-8 space-y-6 border border-neutral-200 dark:border-dark-border transition-colors duration-300">
          {/* Date */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Entry Date <span className="text-progress-pending">*</span>
            </label>
            <input
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text"
              required
            />
          </div>

          {/* Wing */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Wing <span className="text-progress-pending">*</span>
            </label>
            <select
              value={formData.wingCode}
              onChange={(e) => setFormData({ ...formData, wingCode: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text"
              required
            >
              <option value="">Select Wing</option>
              {wings.map((wing) => (
                <option key={wing.id} value={wing.code}>
                  Wing {wing.code} - {wing.name}
                </option>
              ))}
            </select>
          </div>

          {/* Floor */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Floor <span className="text-progress-pending">*</span>
            </label>
            <select
              value={formData.floorNumber}
              onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.wingCode}
              required
            >
              <option value="">Select Floor</option>
              {floors.map((floor) => (
                <option key={floor.id} value={floor.floor_number}>
                  Floor {floor.floor_number}
                </option>
              ))}
            </select>
          </div>

          {/* Flat */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Flat <span className="text-progress-pending">*</span>
            </label>
            <select
              value={formData.flatId}
              onChange={(e) => setFormData({ ...formData, flatId: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.floorNumber}
              required
            >
              <option value="">Select Flat</option>
              {flats.map((flat) => (
                <option key={flat.id} value={flat.id}>
                  Flat {flat.flat_number} ({flat.bhk_type})
                  {flat.is_refuge && ' - Refuge'}
                </option>
              ))}
            </select>
          </div>

          {/* Work Item */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Work Item <span className="text-progress-pending">*</span>
            </label>
            <select
              value={formData.workItemId}
              onChange={(e) => setFormData({ ...formData, workItemId: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text"
              required
            >
              <option value="">Select Work Item</option>
              {workItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name} (Total: {item.total_quantity} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Quantity Completed (Nos) <span className="text-progress-pending">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantityCompleted}
              onChange={(e) => setFormData({ ...formData, quantityCompleted: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text"
              required
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              Remarks <span className="text-neutral-400 dark:text-neutral-500 text-xs">(Optional)</span>
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-neutral-800 dark:text-dark-text resize-none"
              rows="4"
              placeholder="Add notes about progress, quality, or any observations..."
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-progress-pending/10 border-2 border-progress-pending text-progress-pending px-6 py-4 rounded-2xl flex items-start gap-3 shadow-soft">
              <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-progress-complete/10 border-2 border-progress-complete text-progress-complete px-6 py-4 rounded-2xl font-medium shadow-soft">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3 mt-8"
          >
            <Save size={24} />
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : (
              'Save Progress Entry'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
