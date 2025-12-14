// Enhanced Bulk Update - Component for detailed work item checks
import { useState, useEffect } from 'react'
import { Camera, FileText, Save, AlertCircle, CheckCircle, X, Upload, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EnhancedFlatWorkItem({ 
  flat, 
  workItem, 
  onSave, 
  onClose 
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailConfigs, setDetailConfigs] = useState([])
  const [progress, setProgress] = useState({})
  const [note, setNote] = useState('')
  const [images, setImages] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    loadDetailConfigs()
    loadProgress()
    loadNote()
    loadImages()
  }, [flat.id, workItem.id])

  const loadDetailConfigs = async () => {
    try {
      // Load applicable detail configs based on work item code and flat type
      const { data, error } = await supabase
        .from('work_item_detail_config')
        .select('*')
        .eq('work_item_code', workItem.code)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true })

      if (error) throw error

      // Filter by BHK type if required
      const filtered = (data || []).filter(config => {
        if (!config.requires_bhk_type) return true
        return config.requires_bhk_type === flat.bhk_type
      })

      // Special handling for Work Item D (Bathrooms)
      let finalConfigs = filtered
      if (workItem.code === 'D') {
        console.log('Work Item D - Flat info:', {
          flat_number: flat.flat_number,
          is_refuge: flat.is_refuge,
          is_joint_refuge: flat.is_joint_refuge,
          filtered_count: filtered.length,
          all_configs: filtered.map(c => c.detail_name)
        })
        
        // Refugee flats (non-joint) only have common bathroom
        // Explicit boolean checks to handle false/null/undefined
        if (flat.is_refuge === true && flat.is_joint_refuge !== true) {
          finalConfigs = filtered.filter(c => c.detail_name === 'Common Bathroom')
          console.log('Refugee flat (non-joint) detected - showing only Common Bathroom. Final configs:', finalConfigs.map(c => c.detail_name))
        } else {
          console.log('Normal flat or joint refuge - showing all bathrooms')
        }
      }

      setDetailConfigs(finalConfigs)
    } catch (error) {
      console.error('Error loading detail configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('work_item_details_progress')
        .select('*')
        .eq('flat_id', flat.id)
        .eq('work_item_id', workItem.id)

      if (error) throw error

      const progressMap = {}
      data?.forEach(item => {
        progressMap[item.detail_config_id] = item
      })
      setProgress(progressMap)
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const loadNote = async () => {
    try {
      const { data, error } = await supabase
        .from('flat_notes')
        .select('*')
        .eq('flat_id', flat.id)
        .eq('work_item_id', workItem.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) setNote(data.note_text)
    } catch (error) {
      // No note exists yet
    }
  }

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('flat_images')
        .select('*')
        .eq('flat_id', flat.id)
        .eq('work_item_id', workItem.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error loading images:', error)
    }
  }

  const toggleCheck = (configId) => {
    setProgress(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        is_completed: !prev[configId]?.is_completed
      }
    }))
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length + images.length > 10) {
      alert('Maximum 10 images allowed per flat')
      return
    }

    setUploadingImage(true)
    try {
      const user = await supabase.auth.getUser()
      
      for (const file of files) {
        // Check file size (max 2MB for base64)
        if (file.size > 2 * 1024 * 1024) {
          alert(`Image ${file.name} is too large. Maximum size is 2MB.`)
          continue
        }

        // Convert image to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Save to database with base64 data
        const { error: dbError } = await supabase
          .from('flat_images')
          .insert({
            flat_id: flat.id,
            work_item_id: workItem.id,
            image_url: base64, // Store base64 directly
            storage_path: file.name, // Store original filename
            uploaded_by: user.data.user?.id
          })

        if (dbError) {
          console.error('Database error:', dbError)
          throw new Error(`Failed to save image: ${dbError.message}`)
        }
      }

      await loadImages()
      alert('Images uploaded successfully!')
    } catch (error) {
      console.error('Error uploading images:', error)
      alert(`Failed to upload images: ${error.message}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async (image) => {
    if (!confirm('Delete this image?')) return

    try {
      // Delete from database (no storage to delete from)
      await supabase
        .from('flat_images')
        .delete()
        .eq('id', image.id)

      await loadImages()
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const user = await supabase.auth.getUser()

      console.log('Saving progress for', detailConfigs.length, 'checks:', progress)

      // Save all progress items - handle each check independently
      for (const config of detailConfigs) {
        const progressItem = progress[config.id]
        const isCompleted = progressItem?.is_completed || false

        // Check if entry exists in database
        const { data: existingEntry } = await supabase
          .from('work_item_details_progress')
          .select('id')
          .eq('flat_id', flat.id)
          .eq('work_item_id', workItem.id)
          .eq('detail_config_id', config.id)
          .maybeSingle()

        if (existingEntry) {
          // Update existing entry
          await supabase
            .from('work_item_details_progress')
            .update({
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null,
              completed_by: isCompleted ? user.data.user?.id : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEntry.id)
        } else if (isCompleted) {
          // Insert new entry only if checked
          await supabase
            .from('work_item_details_progress')
            .insert({
              flat_id: flat.id,
              work_item_id: workItem.id,
              detail_config_id: config.id,
              is_completed: true,
              completed_at: new Date().toISOString(),
              completed_by: user.data.user?.id
            })
        }
      }

      // Save note
      if (note.trim()) {
        const existingNote = await supabase
          .from('flat_notes')
          .select('id')
          .eq('flat_id', flat.id)
          .eq('work_item_id', workItem.id)
          .single()

        if (existingNote.data) {
          await supabase
            .from('flat_notes')
            .update({ note_text: note, updated_at: new Date().toISOString() })
            .eq('id', existingNote.data.id)
        } else {
          await supabase
            .from('flat_notes')
            .insert({
              flat_id: flat.id,
              work_item_id: workItem.id,
              note_text: note,
              created_by: user.data.user?.id
            })
        }
      }

      // Check if all checks are complete to update main progress_entries
      const allComplete = detailConfigs.every(config => progress[config.id]?.is_completed)
      
      if (allComplete) {
        // Update or create progress entry
        const quantity = flat.is_joint_refuge && workItem.code === 'D' ? 0.5 : 1

        const existing = await supabase
          .from('progress_entries')
          .select('id')
          .eq('flat_id', flat.id)
          .eq('work_item_id', workItem.id)
          .single()

        if (existing.data) {
          await supabase
            .from('progress_entries')
            .update({
              quantity_completed: quantity,
              completion_date: new Date().toISOString(),
              remarks: note || 'All checks completed'
            })
            .eq('id', existing.data.id)
        } else {
          await supabase
            .from('progress_entries')
            .insert({
              flat_id: flat.id,
              work_item_id: workItem.id,
              quantity_completed: quantity,
              completion_date: new Date().toISOString(),
              remarks: note || 'All checks completed',
              recorded_by: user.data.user?.id
            })
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  const groupByCategory = () => {
    if (!detailConfigs.length) return {}
    
    const grouped = {}
    detailConfigs.forEach(config => {
      const category = config.category || 'main'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(config)
    })
    return grouped
  }

  const getCategoryTitle = (category) => {
    if (category === 'main') return ''
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    )
  }

  const grouped = groupByCategory()
  const allComplete = detailConfigs.every(config => progress[config.id]?.is_completed)
  const completedCount = detailConfigs.filter(config => progress[config.id]?.is_completed).length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text">
              {flat.flat_number} - {workItem.code}: {workItem.name}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-dark-muted mt-1">
              {flat.bhk_type} • Floor {flat.floor} • Wing {flat.wing}
              {flat.is_refuge && <span className="ml-2 text-orange-600">• REFUGE</span>}
              {flat.is_joint_refuge && <span className="ml-2 text-blue-600">• JOINT REFUGE</span>}
            </p>
            <div className="mt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-48 bg-neutral-200 dark:bg-dark-hover rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${allComplete ? 'bg-green-600' : 'bg-primary-600'}`}
                    style={{ width: `${(completedCount / detailConfigs.length) * 100}%` }}
                  />
                </div>
                <span className="font-semibold text-neutral-700 dark:text-dark-text">
                  {completedCount} / {detailConfigs.length}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Work Item Checks */}
          {Object.entries(grouped).map(([category, configs]) => (
            <div key={category} className="space-y-3">
              {category !== 'main' && (
                <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                  {getCategoryTitle(category)}
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {configs.map(config => {
                  const isChecked = progress[config.id]?.is_completed || false
                  return (
                    <button
                      key={config.id}
                      onClick={() => toggleCheck(config.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        isChecked
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-neutral-200 dark:border-dark-border hover:border-primary-400'
                      }`}
                    >
                      {isChecked ? (
                        <CheckCircle className="text-green-600" size={24} />
                      ) : (
                        <div className="w-6 h-6 rounded border-2 border-neutral-400" />
                      )}
                      <span className={`font-medium ${
                        isChecked 
                          ? 'text-green-700 dark:text-green-400' 
                          : 'text-neutral-700 dark:text-dark-text'
                      }`}>
                        {config.detail_name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Notes Section */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-dark-text mb-2">
              <FileText size={16} className="inline mr-2" />
              Notes
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="3"
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text resize-none"
              placeholder="Add any notes or remarks..."
            />
          </div>

          {/* Images Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-neutral-700 dark:text-dark-text">
                <Camera size={16} className="inline mr-2" />
                Images ({images.length}/10)
              </label>
              <label className="btn-primary py-2 px-4 text-sm cursor-pointer">
                <Upload size={16} className="inline mr-2" />
                Upload
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage || images.length >= 10}
                />
              </label>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {images.map(image => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.image_url}
                    alt="Flat"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleDeleteImage(image)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {uploadingImage && (
                <div className="w-full h-24 bg-neutral-100 dark:bg-dark-hover rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border p-6 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-xl font-semibold text-neutral-700 dark:text-dark-text hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Progress
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
