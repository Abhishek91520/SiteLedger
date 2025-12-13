import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CheckSquare, Square, Filter, Save, AlertCircle, CheckCircle, Building2, Home } from 'lucide-react'

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

  // Filter states
  const [selectedWing, setSelectedWing] = useState('')
  const [selectedWorkItem, setSelectedWorkItem] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')

  // Selection state - { flatId: { workItemId: true/false } }
  const [selections, setSelections] = useState({})

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
    } catch (error) {
      console.error('Error loading progress:', error)
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

    if (selectedFloor) {
      filtered = filtered.filter(f => f.floors.floor_number === parseInt(selectedFloor))
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
            {Object.entries(groupedFlats).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([floor, floorFlats]) => (
              <div key={floor} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={20} className="text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                    Floor {floor}
                  </h3>
                  <span className="text-sm text-neutral-600 dark:text-dark-muted">
                    ({floorFlats.length} flats)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {floorFlats.map(flat => {
                    const isSelected = selections[flat.id]?.[selectedWorkItem]
                    const isCompleted = isAlreadyCompleted(flat.id)
                    const workItem = workItems.find(w => w.id === selectedWorkItem)
                    const isNotApplicable = flat.is_refuge && workItem && ['C', 'E'].includes(workItem.code)

                    return (
                      <button
                        key={flat.id}
                        onClick={() => !isNotApplicable && toggleSelection(flat.id, selectedWorkItem)}
                        disabled={isNotApplicable}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all
                          ${isNotApplicable
                            ? 'border-neutral-200 dark:border-dark-border bg-neutral-100 dark:bg-neutral-800 opacity-50 cursor-not-allowed'
                            : isSelected 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' 
                            : isCompleted
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                            : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-hover hover:border-primary-300'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Home size={16} className={`${
                            isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-600'
                          }`} />
                          {isSelected ? (
                            <CheckSquare size={20} className="text-primary-600 dark:text-primary-400" />
                          ) : isCompleted ? (
                            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
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
                          ) : isCompleted && !isSelected && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                              ✓ Completed
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
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
    </div>
  )
}
