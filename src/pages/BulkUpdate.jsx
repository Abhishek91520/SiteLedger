import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CheckSquare, Square, Filter, Save, AlertCircle, CheckCircle, Building2, Home, FileText, Camera, Info } from 'lucide-react'
import EnhancedFlatWorkItem from '../components/EnhancedFlatWorkItem'

export default function BulkUpdate() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Data states
  const [wings, setWings] = useState([])
  const [workItems, setWorkItems] = useState([])
  const [flats, setFlats] = useState([])
  const [existingProgress, setExistingProgress] = useState({})
  const [detailProgress, setDetailProgress] = useState({}) // For detailed checks completion
  const [flatMetadata, setFlatMetadata] = useState({}) // Notes and images counts

  // Filter states
  const [selectedWing, setSelectedWing] = useState('')
  const [selectedWorkItem, setSelectedWorkItem] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')
  const [filterCompletionStatus, setFilterCompletionStatus] = useState('ALL') // ALL, COMPLETED, PARTIAL, PENDING
  const [filterDocumentation, setFilterDocumentation] = useState('ALL') // ALL, HAS_NOTES, HAS_IMAGES, NO_DOCS
  const [filterBHK, setFilterBHK] = useState('ALL') // ALL, 1BHK, 2BHK

  // Selection state - { flatId: { workItemId: true/false } }
  const [selections, setSelections] = useState({})

  // Enhanced detail modal
  const [showEnhancedModal, setShowEnhancedModal] = useState(false)
  const [selectedFlat, setSelectedFlat] = useState(null)

  // Completion date
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedWing) {
      loadFlatsForWing()
    }
  }, [selectedWing])

  useEffect(() => {
    if (selectedWing && selectedWorkItem) {
      loadExistingProgress()
    }
  }, [selectedWing, selectedWorkItem])

  const loadInitialData = async () => {
    try {
      const [wingsRes, workItemsRes] = await Promise.all([
        supabase.from('wings').select('*').order('code'),
        supabase.from('work_items').select('*').eq('is_active', true).order('code')
      ])

      setWings(wingsRes.data || [])
      setWorkItems(workItemsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const loadFlatsForWing = async () => {
    try {
      const selectedWingData = wings.find(w => w.id === selectedWing)
      if (!selectedWingData) return

      const { data, error } = await supabase
        .from('flats')
        .select(`
          *,
          floors!inner(floor_number, wing_id)
        `)
        .eq('floors.wing_id', selectedWing)
        .order('flat_number', { ascending: true })

      if (error) throw error
      
      // Sort by floor number after fetching since we can't order by joined table
      const sortedData = (data || []).sort((a, b) => {
        if (a.floors.floor_number !== b.floors.floor_number) {
          return a.floors.floor_number - b.floors.floor_number
        }
        return a.flat_number.localeCompare(b.flat_number)
      })
      
      setFlats(sortedData)
    } catch (error) {
      console.error('Error loading flats:', error)
    }
  }

  const loadFlatMetadata = async () => {
    if (flats.length === 0) return

    try {
      // Load notes counts
      const { data: notesData, error: notesError } = await supabase
        .from('flat_notes')
        .select('flat_id')
        .in('flat_id', flats.map(f => f.id))

      if (notesError) throw notesError

      // Load images counts
      const { data: imagesData, error: imagesError } = await supabase
        .from('flat_images')
        .select('flat_id')
        .in('flat_id', flats.map(f => f.id))

      if (imagesError) throw imagesError

      // Count notes and images per flat
      const metadata = {}
      flats.forEach(flat => {
        metadata[flat.id] = {
          notesCount: notesData?.filter(n => n.flat_id === flat.id).length || 0,
          imagesCount: imagesData?.filter(i => i.flat_id === flat.id).length || 0
        }
      })

      setFlatMetadata(metadata)
    } catch (error) {
      console.error('Error loading flat metadata:', error)
    }
  }

  const loadExistingProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('flat_id, work_item_id, quantity_completed')
        .eq('work_item_id', selectedWorkItem)
        .in('flat_id', flats.map(f => f.id))

      if (error) throw error

      const progressMap = {}
      data?.forEach(entry => {
        if (entry.quantity_completed > 0) {
          if (!progressMap[entry.flat_id]) {
            progressMap[entry.flat_id] = {}
          }
          progressMap[entry.flat_id][entry.work_item_id] = true
        }
      })

      setExistingProgress(progressMap)

      // Load detailed progress for sub-checks and metadata
      await Promise.all([
        loadDetailProgress(),
        loadFlatMetadata()
      ])
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const loadDetailProgress = async () => {
    if (!selectedWorkItem || flats.length === 0) return

    try {
      const workItem = workItems.find(w => w.id === selectedWorkItem)
      if (!workItem) return

      // Load detail configs for this work item
      const { data: configs, error: configError } = await supabase
        .from('work_item_detail_config')
        .select('*')
        .eq('work_item_code', workItem.code)
        .eq('is_active', true)

      if (configError) throw configError
      
      // If no detail configs, skip this work item (A, H, I don't have detail checks)
      if (!configs || configs.length === 0) {
        setDetailProgress({})
        return
      }

      // Load detail progress for all flats
      const { data: progress, error: progressError } = await supabase
        .from('work_item_details_progress')
        .select('*')
        .eq('work_item_id', selectedWorkItem)
        .in('flat_id', flats.map(f => f.id))

      if (progressError) throw progressError

      // Calculate completion percentage for each flat
      const detailProgressMap = {}
      
      flats.forEach(flat => {
        // Filter configs based on flat's BHK type and refugee status
        let applicableConfigs = configs.filter(config => {
          if (!config.requires_bhk_type) return true
          return config.requires_bhk_type === flat.bhk_type
        })

        // Special handling for Work Item D (Bathrooms) and refugee flats
        if (workItem.code === 'D') {
          // Refugee flats (non-joint) only have Common Bathroom
          if (flat.is_refuge === true && flat.is_joint_refuge !== true) {
            applicableConfigs = applicableConfigs.filter(c => c.detail_name === 'Common Bathroom')
          }
        }

        const totalChecks = applicableConfigs.length
        if (totalChecks === 0) {
          detailProgressMap[flat.id] = { percentage: 0, completed: 0, total: 0 }
          return
        }

        const completedChecks = progress.filter(p => 
          p.flat_id === flat.id && 
          p.is_completed &&
          applicableConfigs.some(c => c.id === p.detail_config_id)
        ).length

        const percentage = Math.round((completedChecks / totalChecks) * 100)
        detailProgressMap[flat.id] = { 
          percentage, 
          completed: completedChecks, 
          total: totalChecks 
        }
      })

      setDetailProgress(detailProgressMap)
    } catch (error) {
      console.error('Error loading detail progress:', error)
    }
  }

  const toggleSelection = (flatId, workItemId) => {
    setSelections(prev => ({
      ...prev,
      [flatId]: {
        ...(prev[flatId] || {}),
        [workItemId]: !prev[flatId]?.[workItemId]
      }
    }))
  }

  const toggleAllFlats = () => {
    if (!selectedWorkItem) return

    const filteredFlats = getFilteredFlats()
    const allSelected = filteredFlats.every(flat => selections[flat.id]?.[selectedWorkItem])

    const newSelections = { ...selections }
    filteredFlats.forEach(flat => {
      if (!newSelections[flat.id]) newSelections[flat.id] = {}
      newSelections[flat.id][selectedWorkItem] = !allSelected
    })

    setSelections(newSelections)
  }

  const getFilteredFlats = () => {
    let filtered = flats

    // Floor filter
    if (selectedFloor) {
      filtered = filtered.filter(f => f.floors.floor_number === parseInt(selectedFloor))
    }

    // Completion status filter
    if (filterCompletionStatus !== 'ALL' && selectedWorkItem) {
      filtered = filtered.filter(flat => {
        const flatDetail = detailProgress[flat.id] || { percentage: 0 }
        
        if (filterCompletionStatus === 'COMPLETED') {
          return flatDetail.percentage === 100
        } else if (filterCompletionStatus === 'PARTIAL') {
          return flatDetail.percentage > 0 && flatDetail.percentage < 100
        } else if (filterCompletionStatus === 'PENDING') {
          return flatDetail.percentage === 0
        }
        return true
      })
    }

    // Documentation filter
    if (filterDocumentation !== 'ALL') {
      filtered = filtered.filter(flat => {
        const metadata = flatMetadata[flat.id] || { notesCount: 0, imagesCount: 0 }
        
        if (filterDocumentation === 'HAS_NOTES') {
          return metadata.notesCount > 0
        } else if (filterDocumentation === 'HAS_IMAGES') {
          return metadata.imagesCount > 0
        } else if (filterDocumentation === 'HAS_BOTH') {
          return metadata.notesCount > 0 && metadata.imagesCount > 0
        } else if (filterDocumentation === 'NO_DOCS') {
          return metadata.notesCount === 0 && metadata.imagesCount === 0
        }
        return true
      })
    }

    // BHK filter
    if (filterBHK !== 'ALL') {
      filtered = filtered.filter(flat => flat.bhk_type === filterBHK)
    }

    return filtered
  }

  const handleBulkSave = async () => {
    if (!selectedWorkItem) {
      setMessage({ type: 'error', text: 'Please select a work item' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const workItem = workItems.find(w => w.id === selectedWorkItem)
      if (!workItem) throw new Error('Work item not found')

      // Get all selected flats
      const selectedFlats = Object.entries(selections)
        .filter(([flatId, workItems]) => workItems[selectedWorkItem])
        .map(([flatId]) => flatId)

      if (selectedFlats.length === 0) {
        setMessage({ type: 'error', text: 'No flats selected' })
        setSaving(false)
        return
      }

      // Check for existing entries and handle them
      for (const flatId of selectedFlats) {
        const flat = flats.find(f => f.id === flatId)
        const workItem = workItems.find(w => w.id === selectedWorkItem)
        
        // For joint refuge flats with bathroom work (D), quantity = 0.5 (2 flats share 1 bathroom)
        const isJointRefugeBathroom = flat?.is_joint_refuge && workItem?.code === 'D'
        const quantity = isJointRefugeBathroom ? 0.5 : 1
        
        // Check if entry already exists
        const { data: existing, error: checkError } = await supabase
          .from('progress_entries')
          .select('id, quantity_completed')
          .eq('flat_id', flatId)
          .eq('work_item_id', selectedWorkItem)
          .maybeSingle()

        if (checkError) throw checkError

        if (existing) {
          // Update existing entry
          const { error: updateError } = await supabase
            .from('progress_entries')
            .update({
              quantity_completed: quantity,
              entry_date: completionDate,
              remarks: isJointRefugeBathroom 
                ? 'Bulk update - joint refuge (0.5 bathroom shared)' 
                : 'Bulk update - marked as completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (updateError) throw updateError
        } else {
          // Insert new entry
          const { error: insertError } = await supabase
            .from('progress_entries')
            .insert({
              flat_id: flatId,
              work_item_id: selectedWorkItem,
              quantity_completed: quantity,
              entry_date: completionDate,
              remarks: isJointRefugeBathroom 
                ? 'Bulk update - joint refuge (0.5 bathroom shared)' 
                : 'Bulk update - marked as completed',
              created_by: user.id
            })

          if (insertError) throw insertError
        }
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully updated ${selectedFlats.length} flats for ${workItem.code}` 
      })

      // Reload progress
      loadExistingProgress()

      // Clear selections after save
      setSelections({})

    } catch (error) {
      console.error('Error saving:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const getFloorNumbers = () => {
    const floors = [...new Set(flats.map(f => f.floors.floor_number))].sort((a, b) => a - b)
    return floors
  }

  const groupFlatsByFloor = () => {
    const filteredFlats = getFilteredFlats()
    const grouped = {}

    filteredFlats.forEach(flat => {
      const floor = flat.floors.floor_number
      if (!grouped[floor]) grouped[floor] = []
      grouped[floor].push(flat)
    })

    return grouped
  }

  const getSelectionStats = () => {
    const filteredFlats = getFilteredFlats()
    const selected = filteredFlats.filter(flat => selections[flat.id]?.[selectedWorkItem]).length
    const total = filteredFlats.length
    return { selected, total }
  }

  const isAlreadyCompleted = (flatId) => {
    return existingProgress[flatId]?.[selectedWorkItem]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    )
  }

  const stats = getSelectionStats()
  const groupedFlats = groupFlatsByFloor()

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-dark-bg dark:to-dark-card p-4 md:p-8 pb-24 md:pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-700 dark:to-blue-800 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <CheckSquare size={36} />
            Bulk Progress Update
          </h1>
          <p className="text-blue-100 text-lg">
            Quickly mark multiple flats as completed for past work
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`rounded-xl p-4 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Wing *
              </label>
              <select
                value={selectedWing}
                onChange={(e) => {
                  setSelectedWing(e.target.value)
                  setSelectedFloor('')
                  setSelections({})
                }}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="">Select Wing</option>
                {wings.map(wing => (
                  <option key={wing.id} value={wing.id}>
                    Wing {wing.code} - {wing.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Work Item *
              </label>
              <select
                value={selectedWorkItem}
                onChange={(e) => {
                  setSelectedWorkItem(e.target.value)
                  setSelections({})
                }}
                disabled={!selectedWing}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text disabled:opacity-50"
              >
                <option value="">Select Work Item</option>
                {workItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Floor (Optional)
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                disabled={!selectedWing}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text disabled:opacity-50"
              >
                <option value="">All Floors</option>
                {getFloorNumbers().map(floor => (
                  <option key={floor} value={floor}>
                    Floor {floor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Completion Status
              </label>
              <select
                value={filterCompletionStatus}
                onChange={(e) => setFilterCompletionStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="ALL">All Flats</option>
                <option value="COMPLETED">Completed (100%)</option>
                <option value="PARTIAL">Partial (1-99%)</option>
                <option value="PENDING">Pending (0%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Documentation
              </label>
              <select
                value={filterDocumentation}
                onChange={(e) => setFilterDocumentation(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="ALL">All Flats</option>
                <option value="HAS_NOTES">Has Notes</option>
                <option value="HAS_IMAGES">Has Images</option>
                <option value="HAS_BOTH">Has Notes & Images</option>
                <option value="NO_DOCS">No Documentation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                BHK Type
              </label>
              <select
                value={filterBHK}
                onChange={(e) => setFilterBHK(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="ALL">All Types</option>
                <option value="1BHK">1 BHK</option>
                <option value="2BHK">2 BHK</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Completion Date
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              />
            </div>
          </div>

          {/* Filter Status */}
          {selectedWing && selectedWorkItem && (
            <div className="mt-4 p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg border border-neutral-200 dark:border-dark-border">
              <div className="flex items-center gap-2 text-sm">
                <Info size={16} className="text-neutral-600 dark:text-dark-muted" />
                <span className="text-neutral-700 dark:text-dark-text">
                  Showing <span className="font-bold text-primary-600 dark:text-primary-400">{getFilteredFlats().length}</span> of{' '}
                  <span className="font-bold">{flats.length}</span> flats
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selection Actions */}
        {selectedWing && selectedWorkItem && (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAllFlats}
                  className="px-6 py-3 bg-neutral-100 dark:bg-dark-hover hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl font-semibold text-neutral-800 dark:text-dark-text transition-colors flex items-center gap-2"
                >
                  {stats.selected === stats.total ? <Square size={20} /> : <CheckSquare size={20} />}
                  {stats.selected === stats.total ? 'Deselect All' : 'Select All'}
                </button>

                <div className="text-neutral-600 dark:text-dark-muted">
                  <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">
                    {stats.selected}
                  </span>
                  {' / '}
                  <span className="font-semibold">{stats.total}</span>
                  {' flats selected'}
                </div>
              </div>

              <button
                onClick={handleBulkSave}
                disabled={saving || stats.selected === 0}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save {stats.selected} Flats
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Flats Grid */}
        {selectedWing && selectedWorkItem ? (
          <div className="space-y-6">
            {Object.entries(groupedFlats).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([floor, floorFlats]) => {
              // Calculate floor completion percentage
              const completedCount = floorFlats.filter(flat => {
                const workItem = workItems.find(w => w.id === selectedWorkItem)
                const isNotApplicable = flat.is_refuge && workItem && ['C', 'E'].includes(workItem.code)
                if (isNotApplicable) return false
                return isAlreadyCompleted(flat.id)
              }).length
              
              const applicableFlats = floorFlats.filter(flat => {
                const workItem = workItems.find(w => w.id === selectedWorkItem)
                const isNotApplicable = flat.is_refuge && workItem && ['C', 'E'].includes(workItem.code)
                return !isNotApplicable
              }).length
              
              const floorCompletionPercentage = applicableFlats > 0 ? Math.round((completedCount / applicableFlats) * 100) : 0
              
              return (
                <div key={floor} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-primary-600 dark:text-primary-400" />
                      <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                        Floor {floor}
                      </h3>
                      <span className="text-sm text-neutral-600 dark:text-dark-muted">
                        ({floorFlats.length} flats)
                      </span>
                    </div>
                    
                    {/* Floor Completion Badge */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-neutral-600 dark:text-dark-muted">
                          {completedCount} / {applicableFlats} complete
                        </div>
                        <div className="w-32 bg-neutral-200 dark:bg-dark-border rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              floorCompletionPercentage === 100
                                ? 'bg-green-600'
                                : floorCompletionPercentage > 0
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${floorCompletionPercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-2xl font-bold ${
                        floorCompletionPercentage === 100
                          ? 'text-green-600'
                          : floorCompletionPercentage > 0
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {floorCompletionPercentage}%
                      </span>
                    </div>
                  </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {floorFlats.map(flat => {
                    const isSelected = selections[flat.id]?.[selectedWorkItem]
                    const workItem = workItems.find(w => w.id === selectedWorkItem)
                    const isNotApplicable = flat.is_refuge && workItem && ['C', 'E'].includes(workItem.code)
                    const flatDetail = detailProgress[flat.id] || { percentage: 0, completed: 0, total: 0 }
                    
                    // For work items with detail configs (B-G), use detail progress
                    // For simple work items (A, H, I), use old completion check
                    const hasDetailConfigs = workItem && ['B', 'C', 'D', 'E', 'F', 'G'].includes(workItem.code)
                    const isFullyCompleted = hasDetailConfigs 
                      ? flatDetail.percentage === 100 
                      : isAlreadyCompleted(flat.id)
                    const isPartiallyCompleted = hasDetailConfigs && flatDetail.percentage > 0 && flatDetail.percentage < 100

                    return (
                      <button
                        key={flat.id}
                        onClick={() => {
                          if (isNotApplicable) return
                          if (!hasDetailConfigs) {
                            // For A, H, I - just toggle selection (old bulk update behavior)
                            toggleSelection(flat.id, selectedWorkItem)
                            return
                          }
                          setSelectedFlat(flat)
                          setShowEnhancedModal(true)
                        }}
                        disabled={isNotApplicable}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all
                          ${isNotApplicable
                            ? 'border-neutral-200 dark:border-dark-border bg-neutral-100 dark:bg-neutral-800 opacity-50 cursor-not-allowed'
                            : isSelected 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' 
                            : isFullyCompleted
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                            : isPartiallyCompleted
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                            : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover hover:border-primary-300'
                          }
                        `}
                      >
                        {/* Completion Badge at Top Right */}
                        {!isNotApplicable && flatDetail.total > 0 && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div className={`px-2 py-1 rounded-full text-xs font-bold shadow-md ${
                              flatDetail.percentage === 100
                                ? 'bg-green-600 text-white'
                                : flatDetail.percentage > 0
                                ? 'bg-amber-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                              {flatDetail.percentage}%
                            </div>
                          </div>
                        )}

                        {/* Notes and Images Icons at Top Left */}
                        {(flatMetadata[flat.id]?.notesCount > 0 || flatMetadata[flat.id]?.imagesCount > 0) && (
                          <div className="absolute -top-2 -left-2 z-10 flex gap-1">
                            {flatMetadata[flat.id]?.notesCount > 0 && (
                              <div className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-xs font-semibold shadow-md">
                                <FileText size={10} />
                                <span>{flatMetadata[flat.id].notesCount}</span>
                              </div>
                            )}
                            {flatMetadata[flat.id]?.imagesCount > 0 && (
                              <div className="bg-purple-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-xs font-semibold shadow-md">
                                <Camera size={10} />
                                <span>{flatMetadata[flat.id].imagesCount}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-2">
                          <Home size={16} className={`${
                            isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-600'
                          }`} />
                          {isSelected ? (
                            <CheckSquare size={20} className="text-primary-600 dark:text-primary-400" />
                          ) : isFullyCompleted ? (
                            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                          ) : isPartiallyCompleted ? (
                            <CheckCircle size={20} className="text-amber-500 dark:text-amber-400" />
                          ) : (
                            <Square size={20} className="text-neutral-300 dark:text-neutral-600" />
                          )}
                        </div>
                        
                        <div className="text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-neutral-800 dark:text-dark-text">
                              {flat.flat_number}
                            </p>
                            {flat.is_refuge && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                                REF
                              </span>
                            )}
                            {flat.is_joint_refuge && workItem?.code === 'D' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                0.5 BATH
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-dark-muted">
                            {flat.bhk_type}
                          </p>
                          {isNotApplicable ? (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                              N/A (No Kitchen)
                            </p>
                          ) : flatDetail.total > 0 ? (
                            <div className="mt-2">
                              <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">
                                {flatDetail.completed}/{flatDetail.total} checks
                              </p>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    flatDetail.percentage === 100
                                      ? 'bg-green-600'
                                      : flatDetail.percentage > 0
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${flatDetail.percentage}%` }}
                                />
                              </div>
                            </div>
                          ) : isFullyCompleted && !isSelected ? (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                              ✓ Completed
                            </p>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900/30 dark:to-blue-900/30 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <CheckSquare size={48} className="text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-xl font-bold text-neutral-800 dark:text-dark-text mb-2">
              Select Wing and Work Item
            </p>
            <p className="text-neutral-600 dark:text-dark-muted">
              Choose a wing and work item to start bulk updating progress
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Work Item Modal */}
      {showEnhancedModal && selectedFlat && (
        <EnhancedFlatWorkItem
          flat={selectedFlat}
          workItem={workItems.find(w => w.id === selectedWorkItem)}
          onSave={() => {
            setShowEnhancedModal(false)
            setSelectedFlat(null)
            loadExistingProgress() // This now also loads metadata
            loadDetailProgress() // Refresh floor and flat completion percentages
          }}
          onClose={() => {
            setShowEnhancedModal(false)
            setSelectedFlat(null)
          }}
        />
      )}
    </div>
  )
}
