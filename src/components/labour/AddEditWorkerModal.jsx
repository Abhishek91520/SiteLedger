import { useState, useEffect } from 'react'
import { X, Upload, AlertCircle, Save, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AddEditWorkerModal({ worker, onClose, onSuccess }) {
  const { user } = useAuth()
  const isEdit = !!worker
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState([])

  const [formData, setFormData] = useState({
    full_name: worker?.full_name || '',
    primary_mobile: worker?.primary_mobile || '',
    secondary_mobile: worker?.secondary_mobile || '',
    age: worker?.age || '',
    category: worker?.category || 'Helper',
    base_daily_wage: worker?.base_daily_wage || '',
    travel_allowance: worker?.travel_allowance || 0,
    joining_date: worker?.joining_date || new Date().toISOString().split('T')[0],
    current_project_id: worker?.current_project_id || '',
    worker_photo_url: worker?.worker_photo_url || '',
    aadhaar_front_url: worker?.aadhaar_front_url || '',
    aadhaar_back_url: worker?.aadhaar_back_url || ''
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      setProjects(data || [])
      
      // Auto-select first project if new worker
      if (!isEdit && data && data.length > 0 && !formData.current_project_id) {
        setFormData(prev => ({ ...prev, current_project_id: data[0].id }))
      }
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const handleImageUpload = async (file, field) => {
    try {
      setUploading(true)
      setError('')

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB')
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      // Create unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${field}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `workers/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('labour-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('labour-documents')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, [field]: publicUrl }))
    } catch (err) {
      console.error('Error uploading image:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.full_name || !formData.primary_mobile || !formData.age || 
          !formData.base_daily_wage || !formData.joining_date || !formData.current_project_id) {
        throw new Error('Please fill all required fields')
      }

      // Validate mobile number
      if (!/^[0-9]{10}$/.test(formData.primary_mobile)) {
        throw new Error('Primary mobile must be 10 digits')
      }

      if (formData.secondary_mobile && !/^[0-9]{10}$/.test(formData.secondary_mobile)) {
        throw new Error('Secondary mobile must be 10 digits')
      }

      // Validate age
      const age = parseInt(formData.age)
      if (age < 18 || age > 100) {
        throw new Error('Age must be between 18 and 100')
      }

      // Validate wage
      const wage = parseFloat(formData.base_daily_wage)
      if (wage < 0) {
        throw new Error('Base daily wage cannot be negative')
      }

      const workerData = {
        full_name: formData.full_name.trim(),
        primary_mobile: formData.primary_mobile,
        secondary_mobile: formData.secondary_mobile || null,
        age: parseInt(formData.age),
        category: formData.category,
        base_daily_wage: parseFloat(formData.base_daily_wage),
        travel_allowance: parseFloat(formData.travel_allowance) || 0,
        joining_date: formData.joining_date,
        current_project_id: formData.current_project_id,
        worker_photo_url: formData.worker_photo_url || null,
        aadhaar_front_url: formData.aadhaar_front_url || null,
        aadhaar_back_url: formData.aadhaar_back_url || null,
        updated_at: new Date().toISOString()
      }

      if (isEdit) {
        // Update existing worker
        const { error } = await supabase
          .from('workers')
          .update(workerData)
          .eq('id', worker.id)

        if (error) throw error
      } else {
        // Create new worker
        workerData.created_by = user.id
        workerData.status = 'active'

        const { error } = await supabase
          .from('workers')
          .insert([workerData])

        if (error) throw error
      }

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-3xl w-full min-h-screen sm:min-h-0 sm:my-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white p-4 sm:p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <User size={24} className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold truncate">{isEdit ? 'Edit Worker' : 'Add New Worker'}</h2>
              <p className="text-xs sm:text-sm opacity-90 truncate">Enter worker details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-safe">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-dark-text border-b border-neutral-200 dark:border-dark-border pb-2">
              Basic Information *
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  placeholder="18-100"
                  min="18"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  required
                >
                  <option value="Helper">Helper</option>
                  <option value="Mason">Mason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Primary Mobile *
                </label>
                <input
                  type="tel"
                  value={formData.primary_mobile}
                  onChange={(e) => setFormData({ ...formData, primary_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  placeholder="10 digits"
                  pattern="[0-9]{10}"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Secondary Mobile
                </label>
                <input
                  type="tel"
                  value={formData.secondary_mobile}
                  onChange={(e) => setFormData({ ...formData, secondary_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  placeholder="10 digits (optional)"
                  pattern="[0-9]{10}"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Joining Date *
                </label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Base Daily Wage *
                </label>
                <input
                  type="number"
                  value={formData.base_daily_wage}
                  onChange={(e) => setFormData({ ...formData, base_daily_wage: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  placeholder="₹ per day"
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Travel Allowance
                </label>
                <input
                  type="number"
                  value={formData.travel_allowance}
                  onChange={(e) => setFormData({ ...formData, travel_allowance: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  placeholder="₹ per day"
                  min="0"
                  step="1"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
                  Assign to Project *
                </label>
                <select
                  value={formData.current_project_id}
                  onChange={(e) => setFormData({ ...formData, current_project_id: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text text-sm sm:text-base"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Optional Images */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-dark-text border-b border-neutral-200 dark:border-dark-border pb-2">
              Documents (Optional)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Worker Photo */}
              <ImageUploadField
                label="Worker Photo"
                value={formData.worker_photo_url}
                onChange={(file) => handleImageUpload(file, 'worker_photo_url')}
                uploading={uploading}
              />

              {/* Aadhaar Front */}
              <ImageUploadField
                label="Aadhaar Front"
                value={formData.aadhaar_front_url}
                onChange={(file) => handleImageUpload(file, 'aadhaar_front_url')}
                uploading={uploading}
              />

              {/* Aadhaar Back */}
              <ImageUploadField
                label="Aadhaar Back"
                value={formData.aadhaar_back_url}
                onChange={(file) => handleImageUpload(file, 'aadhaar_back_url')}
                uploading={uploading}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 sticky bottom-0 bg-white dark:bg-dark-card pb-4 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-xl font-semibold text-neutral-700 dark:text-dark-text hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 sm:px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} className="sm:hidden" />
                  <Save size={20} className="hidden sm:block" />
                  <span>{isEdit ? 'Update Worker' : 'Add Worker'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImageUploadField({ label, value, onChange, uploading }) {
  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-dark-text mb-1.5 sm:mb-2">
        {label}
      </label>
      <div className="relative">
        {value ? (
          <div className="relative group">
            <img 
              src={value} 
              alt={label}
              className="w-full h-28 sm:h-32 object-cover rounded-lg border-2 border-neutral-200 dark:border-dark-border"
            />
            <label className="absolute inset-0 bg-black/50 opacity-0 active:opacity-100 sm:group-hover:opacity-100 flex items-center justify-center cursor-pointer rounded-lg transition-opacity">
              <Upload className="text-white" size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onChange(e.target.files[0])}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-28 sm:h-32 border-2 border-dashed border-neutral-300 dark:border-dark-border rounded-lg cursor-pointer hover:border-primary-500 active:border-primary-500 transition-colors">
            <Upload className="text-neutral-400 mb-1" size={20} />
            <span className="text-xs sm:text-sm text-neutral-600 dark:text-dark-muted">Upload</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onChange(e.target.files[0])}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-dark-bg/80 flex items-center justify-center rounded-lg">
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  )
}
