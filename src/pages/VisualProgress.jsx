import { useState, useEffect, Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Box } from '@react-three/drei'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { Building2, Filter, X, Info, Home, StickyNote, Camera, CheckCircle2, Circle } from 'lucide-react'

// 3D Flat Component - Perfect cube
function FlatTile({ flat, position, onFlatClick }) {
  const completionRate = flat.completion_percentage || 0
  let color = '#EF4444' // Red for 0%
  if (completionRate === 100) color = '#10B981' // Green for 100%
  else if (completionRate > 0) color = '#F59E0B' // Amber for partial
  
  const handleClick = (e) => {
    e.stopPropagation()
    onFlatClick(flat)
  }
  
  return (
    <group position={position} onClick={handleClick}>
      {/* Perfect cube flat */}
      <Box
        args={[1.8, 1.8, 1.8]}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        }}
      >
        <meshStandardMaterial 
          color={color} 
          metalness={0.3} 
          roughness={0.5}
          transparent
          opacity={0.85}
        />
      </Box>
      
      {/* Flat number box on front face */}
      <Box args={[0.8, 0.35, 0.05]} position={[0, 0.65, 0.92]}>
        <meshStandardMaterial color="#1E293B" metalness={0.2} roughness={0.8} />
      </Box>
      
      {/* Flat number text */}
      <Text
        position={[0, 0.65, 0.96]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {flat.flat_number}
      </Text>
      
      {/* Refuge indicator - Orange stripe on top */}
      {flat.is_refuge && (
        <>
          <Box args={[1.8, 0.15, 0.05]} position={[0, 0.93, 0.92]}>
            <meshStandardMaterial color="#F97316" metalness={0.5} roughness={0.3} emissive="#F97316" emissiveIntensity={0.3} />
          </Box>
          <Text
            position={[0, 0.93, 0.97]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="middle"
            fontWeight={900}
          >
            {flat.is_joint_refuge ? 'JOINT REF' : 'REFUGE'}
          </Text>
        </>
      )}
      
      {/* Joint refuge indicator - Blue badge for shared bathroom */}
      {flat.is_joint_refuge && (
        <Box args={[0.6, 0.12, 0.05]} position={[0, 0.35, 0.92]}>
          <meshStandardMaterial color="#3B82F6" metalness={0.5} roughness={0.3} emissive="#3B82F6" emissiveIntensity={0.2} />
        </Box>
      )}
      
      {/* Window effect */}
      <Box args={[0.5, 0.5, 0.05]} position={[0, 0.1, 0.92]}>
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} />
      </Box>
      
      {/* Door effect */}
      <Box args={[0.35, 0.7, 0.05]} position={[0, -0.55, 0.92]}>
        <meshStandardMaterial color="#8B4513" metalness={0.4} roughness={0.6} />
      </Box>
      
      {/* Notes indicator badge - bottom left */}
      {flat.notes_count > 0 && (
        <>
          <Box args={[0.4, 0.25, 0.05]} position={[-0.65, -0.8, 0.93]}>
            <meshStandardMaterial color="#10B981" metalness={0.5} roughness={0.3} emissive="#10B981" emissiveIntensity={0.4} />
          </Box>
          <Text
            position={[-0.65, -0.8, 0.98]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
            fontWeight={900}
          >
            {flat.notes_count}N
          </Text>
        </>
      )}
      
      {/* Images indicator badge - bottom right */}
      {flat.images_count > 0 && (
        <>
          <Box args={[0.4, 0.25, 0.05]} position={[0.65, -0.8, 0.93]}>
            <meshStandardMaterial color="#3B82F6" metalness={0.5} roughness={0.3} emissive="#3B82F6" emissiveIntensity={0.4} />
          </Box>
          <Text
            position={[0.65, -0.8, 0.98]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
            fontWeight={900}
          >
            {flat.images_count}I
          </Text>
        </>
      )}
    </group>
  )
}

// 3D Building Component - Vertical stacking like real building
function Building({ wings, selectedWing, selectedWorkItem, onFlatClick }) {
  const wingData = wings.find(w => w.code === selectedWing)
  const floors = wingData?.floors || []
  
  // Sort floors by floor number
  const sortedFloors = [...floors].sort((a, b) => a.floor_number - b.floor_number)
  
  return (
    <group>
      {/* Lighting setup for realistic building */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
      <directionalLight position={[-20, 20, -10]} intensity={0.4} />
      <pointLight position={[0, 20, 0]} intensity={0.6} color="#FFF8DC" />
      <hemisphereLight intensity={0.2} groundColor="#60A5FA" />
      
      {/* Ground with blue shade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.7, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#60A5FA" roughness={0.9} />
      </mesh>

      {/* Building foundation */}
      {(() => {
        const maxFlatsInBuilding = Math.max(...sortedFloors.map(f => (f.flats || []).length))
        const buildingWidth = maxFlatsInBuilding * 2 + 2
        return (
          <Box args={[buildingWidth, 0.4, 4]} position={[0, 0.9, 0]}>
            <meshStandardMaterial color="#4A4A4A" metalness={0.3} roughness={0.8} />
          </Box>
        )
      })()}

      {/* Wing label sign at the top */}
      <group position={[0, sortedFloors.length * 2.2 + 1, 0]}>
        <Box args={[6, 1.2, 0.3]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#0EA5E9" metalness={0.6} roughness={0.4} />
        </Box>
        <Text
          position={[0, 0, 0.2]}
          fontSize={0.8}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          WING {selectedWing}
        </Text>
      </group>

      {/* Render floors stacked vertically */}
      {sortedFloors.map((floor, floorIndex) => {
        const flats = floor.flats || []
        const baseHeight = 2 // Lift building up from ground
        const yPosition = baseHeight + (floorIndex * 1.9) // Vertical height spacing between floors (cube height + gap)
        const maxFlatsInBuilding = Math.max(...sortedFloors.map(f => (f.flats || []).length))
        const buildingWidth = maxFlatsInBuilding * 2 + 0.4
        
        return (
          <group key={floor.id}>
            {/* Floor base slab - full width */}
            <Box args={[buildingWidth, 0.15, 2.2]} position={[0, yPosition - 1, 0]}>
              <meshStandardMaterial color="#8B8680" metalness={0.4} roughness={0.7} />
            </Box>

            {/* Floor Label on the left side */}
            <Text 
              position={[-buildingWidth / 2 - 1.5, yPosition, 0]} 
              fontSize={0.5} 
              color="#10B981"
              anchorX="center"
              anchorY="middle"
              fontWeight={700}
              rotation={[0, -Math.PI / 2, 0]}
            >
              F{floor.floor_number}
            </Text>
            
            {/* Flats arranged in single horizontal row - perfect cubes */}
            {flats.map((flat, flatIndex) => {
              const xPos = (flatIndex - flats.length / 2) * 2 + 1
              
              return (
                <FlatTile
                  key={flat.id}
                  flat={flat}
                  position={[xPos, yPosition, 0]}
                  onFlatClick={onFlatClick}
                />
              )
            })}

            {/* Support pillars at both ends */}
            <Box args={[0.25, 1.9, 0.25]} position={[-buildingWidth / 2 - 0.15, yPosition - 0.05, -1.1]}>
              <meshStandardMaterial color="#606060" metalness={0.5} roughness={0.5} />
            </Box>
            <Box args={[0.25, 1.9, 0.25]} position={[buildingWidth / 2 + 0.15, yPosition - 0.05, -1.1]}>
              <meshStandardMaterial color="#606060" metalness={0.5} roughness={0.5} />
            </Box>
            <Box args={[0.25, 1.9, 0.25]} position={[-buildingWidth / 2 - 0.15, yPosition - 0.05, 1.1]}>
              <meshStandardMaterial color="#606060" metalness={0.5} roughness={0.5} />
            </Box>
            <Box args={[0.25, 1.9, 0.25]} position={[buildingWidth / 2 + 0.15, yPosition - 0.05, 1.1]}>
              <meshStandardMaterial color="#606060" metalness={0.5} roughness={0.5} />
            </Box>
          </group>
        )
      })}
    </group>
  )
}

export default function VisualProgress() {
  const { isDark } = useTheme()
  const [selectedWing, setSelectedWing] = useState('A')
  const [selectedWorkItem, setSelectedWorkItem] = useState('ALL')
  const [workItems, setWorkItems] = useState([])
  const [wings, setWings] = useState([])
  const [selectedFlat, setSelectedFlat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flatProgress, setFlatProgress] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const cameraRef = useRef()
  const controlsRef = useRef()

  useEffect(() => {
    loadData()
  }, [selectedWing, selectedWorkItem, workItems.length])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load work items
      const { data: items } = await supabase
        .from('work_items')
        .select('*')
        .eq('is_active', true)
        .order('code')

      setWorkItems(items || [])

      // Load wings with floors and flats
      const { data: wingsData } = await supabase
        .from('wings')
        .select('id, code, name')
        .order('code')

      // Load floors for each wing
      const wingsWithFloors = await Promise.all((wingsData || []).map(async (wing) => {
        const { data: floors } = await supabase
          .from('floors')
          .select('id, floor_number, wing_id')
          .eq('wing_id', wing.id)
          .order('floor_number')

        // Load flats for each floor
        const floorsWithFlats = await Promise.all((floors || []).map(async (floor) => {
          const { data: flats } = await supabase
            .from('flats')
            .select('*')
            .eq('floor_id', floor.id)
            .order('flat_number')

          // Calculate completion for each flat
          const flatsWithCompletion = await Promise.all((flats || []).map(async (flat) => {
            // Get progress entries for this flat
            const query = supabase
              .from('progress_entries')
              .select('work_item_id, quantity_completed')
              .eq('flat_id', flat.id)

            // Filter by work item if selected
            if (selectedWorkItem !== 'ALL') {
              const selectedItem = workItems.find(item => item.code === selectedWorkItem)
              if (selectedItem) {
                query.eq('work_item_id', selectedItem.id)
              }
            }

            const { data: entries } = await query

            // Load notes and images count for this flat - filtered by selected work item
            let notesCount = 0
            let imagesCount = 0
            
            if (selectedWorkItem !== 'ALL') {
              const selectedItem = workItems.find(item => item.code === selectedWorkItem)
              if (selectedItem) {
                const { count: notes } = await supabase
                  .from('flat_notes')
                  .select('*', { count: 'exact', head: true })
                  .eq('flat_id', flat.id)
                  .eq('work_item_id', selectedItem.id)

                const { count: images } = await supabase
                  .from('flat_images')
                  .select('*', { count: 'exact', head: true })
                  .eq('flat_id', flat.id)
                  .eq('work_item_id', selectedItem.id)
                
                notesCount = notes || 0
                imagesCount = images || 0
              }
            }

            // Helper function to get applicable configs for a flat
            const getApplicableConfigs = async (workItemCode, bhkType, isRefuge, isJointRefuge) => {
              const { data: configs } = await supabase
                .from('work_item_detail_config')
                .select('id')
                .eq('work_item_code', workItemCode)
                .eq('is_active', true)

              if (!configs) return []

              // Filter by BHK type if required
              let filtered = configs.filter(config => {
                if (!config.requires_bhk_type) return true
                return config.requires_bhk_type === bhkType
              })

              // Special handling for Work Item D (Bathrooms)
              if (workItemCode === 'D') {
                // Refugee flats (non-joint) only have common bathroom
                if (isRefuge === true && isJointRefuge !== true) {
                  // For refuge flats, we need to get the Common Bathroom config
                  const { data: allConfigs } = await supabase
                    .from('work_item_detail_config')
                    .select('*')
                    .eq('work_item_code', 'D')
                    .eq('is_active', true)
                  
                  filtered = allConfigs.filter(c => c.detail_name === 'Common Bathroom')
                }
              }

              return filtered.map(c => c.id)
            }

            // Calculate completion percentage based on detail checks
            let completion_percentage = 0

            if (selectedWorkItem === 'ALL') {
              // All work items - average completion across all work items
              const workItemCompletions = await Promise.all(workItems.map(async (item) => {
                // Get applicable config IDs for this flat
                const applicableConfigIds = await getApplicableConfigs(
                  item.code, 
                  flat.bhk_type, 
                  flat.is_refuge, 
                  flat.is_joint_refuge
                )

                if (applicableConfigIds.length === 0) {
                  // No configs applicable, check progress_entries fallback
                  const itemEntry = (entries || []).find(e => e.work_item_id === item.id)
                  return itemEntry && itemEntry.quantity_completed > 0 ? 100 : 0
                }

                // Get detail checks ONLY for applicable configs
                const { data: detailChecks } = await supabase
                  .from('work_item_details_progress')
                  .select('is_completed')
                  .eq('flat_id', flat.id)
                  .eq('work_item_id', item.id)
                  .in('detail_config_id', applicableConfigIds)
                
                if (detailChecks && detailChecks.length > 0) {
                  const completed = detailChecks.filter(c => c.is_completed).length
                  return (completed / applicableConfigIds.length) * 100
                }
                
                // Fallback: check progress_entries
                const itemEntry = (entries || []).find(e => e.work_item_id === item.id)
                return itemEntry && itemEntry.quantity_completed > 0 ? 100 : 0
              }))
              
              completion_percentage = workItemCompletions.reduce((a, b) => a + b, 0) / workItems.length
            } else {
              // Specific work item - check detail checks for this work item
              const selectedItem = workItems.find(item => item.code === selectedWorkItem)
              if (selectedItem) {
                // Get applicable config IDs for this flat
                const applicableConfigIds = await getApplicableConfigs(
                  selectedItem.code, 
                  flat.bhk_type, 
                  flat.is_refuge, 
                  flat.is_joint_refuge
                )

                if (applicableConfigIds.length === 0) {
                  // No configs applicable, check progress_entries fallback
                  const hasEntry = (entries || []).some(e => e.work_item_id === selectedItem.id && e.quantity_completed > 0)
                  completion_percentage = hasEntry ? 100 : 0
                } else {
                  // Get detail checks ONLY for applicable configs
                  const { data: detailChecks } = await supabase
                    .from('work_item_details_progress')
                    .select('is_completed')
                    .eq('flat_id', flat.id)
                    .eq('work_item_id', selectedItem.id)
                    .in('detail_config_id', applicableConfigIds)
                  
                  if (detailChecks && detailChecks.length > 0) {
                    const completed = detailChecks.filter(c => c.is_completed).length
                    completion_percentage = (completed / applicableConfigIds.length) * 100
                  } else {
                    // Fallback: check progress_entries
                    const hasEntry = (entries || []).some(e => e.work_item_id === selectedItem.id && e.quantity_completed > 0)
                    completion_percentage = hasEntry ? 100 : 0
                  }
                }
              }
            }

            return {
              ...flat,
              completion_percentage: Math.min(100, Math.round(completion_percentage)),
              work_items_progress: [], // Will be loaded when flat is clicked
              notes_count: notesCount || 0,
              images_count: imagesCount || 0
            }
          }))

          return {
            ...floor,
            flats: flatsWithCompletion
          }
        }))

        return {
          ...wing,
          floors: floorsWithFlats
        }
      }))

      setWings(wingsWithFloors)
    } catch (error) {
      console.error('Error loading visual progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFlatClick = async (flat) => {
    // Load detailed work item progress for this flat
    try {
      // Use flat.id (not flat.flat_id)
      const flatId = flat.id
      
      // Helper function to get applicable configs for a flat
      const getApplicableConfigsForFlat = async (workItemCode) => {
        const { data: configs } = await supabase
          .from('work_item_detail_config')
          .select('*')
          .eq('work_item_code', workItemCode)
          .eq('is_active', true)

        if (!configs) return []

        // Filter by BHK type if required
        let filtered = configs.filter(config => {
          if (!config.requires_bhk_type) return true
          return config.requires_bhk_type === flat.bhk_type
        })

        // Special handling for Work Item D (Bathrooms)
        if (workItemCode === 'D') {
          // Refugee flats (non-joint) only have common bathroom
          if (flat.is_refuge === true && flat.is_joint_refuge !== true) {
            filtered = configs.filter(c => c.detail_name === 'Common Bathroom')
          }
        }

        return filtered
      }
      
      // Load enhanced work item progress with detailed checks
      const workItemsProgress = await Promise.all(workItems.map(async (workItem) => {
        const { data: itemEntries } = await supabase
          .from('progress_entries')
          .select('quantity_completed, entry_date')
          .eq('flat_id', flatId)
          .eq('work_item_id', workItem.id)

        // Get applicable configs for this flat
        const applicableConfigs = await getApplicableConfigsForFlat(workItem.code)
        const applicableConfigIds = applicableConfigs.map(c => c.id)

        // Load detailed checks ONLY for applicable configs
        let detailChecks = []
        if (applicableConfigIds.length > 0) {
          const { data } = await supabase
            .from('work_item_details_progress')
            .select(`
              *,
              detail_config:work_item_detail_config(*)
            `)
            .eq('flat_id', flatId)
            .eq('work_item_id', workItem.id)
            .in('detail_config_id', applicableConfigIds)
          
          detailChecks = data || []
        }

        // Calculate completion based on detailed checks if available
        let percentage = 0
        let completedChecks = 0
        let totalChecks = applicableConfigs.length

        if (totalChecks > 0) {
          completedChecks = detailChecks.filter(c => c.is_completed).length
          percentage = Math.round((completedChecks / totalChecks) * 100)
        } else {
          // Fallback to old system
          const isCompleted = (itemEntries || []).some(e => e.quantity_completed > 0)
          percentage = isCompleted ? 100 : 0
          completedChecks = isCompleted ? 1 : 0
          totalChecks = 1
        }

        return {
          work_item_code: workItem.code,
          work_item_name: workItem.name,
          completed_quantity: completedChecks,
          total_quantity: totalChecks,
          unit: applicableConfigs.length > 0 ? 'checks' : 'flat',
          completion_percentage: percentage,
          last_updated: itemEntries && itemEntries.length > 0 ? itemEntries[0].entry_date : null,
          detailed_checks: detailChecks || []
        }
      }))

      // Load flat notes with work item information
      const { data: notes } = await supabase
        .from('flat_notes')
        .select('*, work_items(code, name)')
        .eq('flat_id', flatId)
        .order('created_at', { ascending: false })

      // Load flat images with work item information
      const { data: images } = await supabase
        .from('flat_images')
        .select('*, work_items(code, name)')
        .eq('flat_id', flatId)
        .order('uploaded_at', { ascending: false })

      setSelectedFlat({
        ...flat,
        work_items_progress: workItemsProgress,
        notes: notes || [],
        images: images || []
      })
      setIsSidebarOpen(true)
    } catch (error) {
      console.error('Error loading flat details:', error)
      setSelectedFlat(flat)
      setIsSidebarOpen(true)
    }
  }

  const handleRecenter = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 8, 25)
      controlsRef.current.target.set(0, 5, 0)
      controlsRef.current.update()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-neutral-600 dark:text-dark-muted">Loading 3D visualization...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card flex flex-col pb-20 md:pb-6 transition-colors duration-300">
      {/* Header with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white px-4 py-6 md:px-6 md:py-8 shadow-soft-lg"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Building2 size={32} />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">3D Visual Progress</h1>
          </div>
          <p className="text-primary-100 dark:text-primary-200 text-base md:text-lg">Interactive building visualization with real-time progress</p>
        </div>
      </motion.div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border px-4 py-3 md:px-6 md:py-4 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Top Row: Wing Selector and Recenter */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Filter size={18} className="text-neutral-600 dark:text-dark-muted hidden sm:block" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-dark-text hidden sm:inline">Wing:</span>
              <div className="flex gap-2 flex-1 sm:flex-none">
                {['A', 'B', 'C'].map((wing) => (
                  <button
                    key={wing}
                    onClick={() => setSelectedWing(wing)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-bold text-base sm:text-sm transition-all ${
                      selectedWing === wing
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-dark-text hover:bg-neutral-200 dark:hover:bg-dark-border'
                    }`}
                  >
                    {wing}
                  </button>
                ))}
              </div>
            </div>

            {/* Recenter Button */}
            <button
              onClick={handleRecenter}
              className="px-3 sm:px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md"
            >
              <Home size={20} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Bottom Row: Work Item Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-dark-text whitespace-nowrap">Filter:</span>
            <select
              value={selectedWorkItem}
              onChange={(e) => setSelectedWorkItem(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-neutral-100 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-lg font-medium text-neutral-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Work Items</option>
              {workItems.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Legend - Hidden on mobile, shown as bottom bar */}
          <div className="hidden md:flex items-center gap-4 text-sm pt-2 border-t border-neutral-200 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-progress-pending"></div>
              <span className="text-neutral-600 dark:text-dark-muted">Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-progress-partial"></div>
              <span className="text-neutral-600 dark:text-dark-muted">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-progress-complete"></div>
              <span className="text-neutral-600 dark:text-dark-muted">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas and Details */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows camera={{ position: [0, 8, 25], fov: 60 }}>
            <Suspense fallback={null}>
              <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 8, 25]} />
              <OrbitControls
                ref={controlsRef}
                enableDamping
                dampingFactor={0.05}
                rotateSpeed={0.8}
                zoomSpeed={1.2}
                panSpeed={0.8}
                maxPolarAngle={Math.PI / 2.1}
                minDistance={15}
                maxDistance={80}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                target={[0, 5, 0]}
                makeDefault
              />
              <Building
                wings={wings}
                selectedWing={selectedWing}
                selectedWorkItem={selectedWorkItem}
                onFlatClick={handleFlatClick}
              />
              <gridHelper args={[100, 100, '#cccccc', '#eeeeee']} position={[0, -0.51, 0]} />
            </Suspense>
          </Canvas>

          {/* Instructions - Smaller on mobile */}
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-xs bg-white/95 dark:bg-dark-card/95 backdrop-blur-sm border border-neutral-200 dark:border-dark-border rounded-xl px-3 py-2 md:px-4 md:py-3 shadow-lg">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs md:text-sm">
                <p className="font-semibold text-neutral-800 dark:text-dark-text mb-1">Controls</p>
                <p className="text-neutral-600 dark:text-dark-muted">
                  <span className="hidden md:inline">🖱️ Drag to rotate • Scroll to zoom • Click flat for details</span>
                  <span className="md:hidden">👆 Touch to rotate • Pinch to zoom • Tap flat for details</span>
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Legend - Bottom bar */}
          <div className="md:hidden absolute bottom-20 left-0 right-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur-sm border-t border-neutral-200 dark:border-dark-border px-4 py-2 shadow-lg">
            <div className="flex items-center justify-around text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-progress-pending"></div>
                <span className="text-neutral-600 dark:text-dark-muted">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-progress-partial"></div>
                <span className="text-neutral-600 dark:text-dark-muted">Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-progress-complete"></div>
                <span className="text-neutral-600 dark:text-dark-muted">Done</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flat Details Panel - Slide-in sidebar */}
        {selectedFlat && isSidebarOpen && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white dark:bg-dark-card border-l border-neutral-200 dark:border-dark-border p-4 md:p-6 overflow-y-auto transition-colors duration-300 z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6 sticky top-0 bg-white dark:bg-dark-card pb-3 border-b border-neutral-200 dark:border-dark-border z-10">
              <h3 className="text-lg md:text-xl font-bold text-neutral-800 dark:text-dark-text">Flat Details</h3>
              <button
                onClick={() => {
                  setIsSidebarOpen(false)
                  setTimeout(() => setSelectedFlat(null), 300)
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X size={22} className="text-neutral-600 dark:text-dark-muted" />
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* Flat Number Card */}
              <div className="p-4 md:p-5 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <p className="text-xs md:text-sm text-primary-600 dark:text-primary-400 mb-1">Flat Number</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-3xl md:text-2xl font-bold text-primary-700 dark:text-primary-300">{selectedFlat.flat_number}</p>
                  {selectedFlat.is_refuge && (
                    <span className="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded-md shadow-md">
                      REFUGE
                    </span>
                  )}
                  {selectedFlat.is_joint_refuge && (
                    <span className="px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded-md shadow-md">
                      SHARED BATH
                    </span>
                  )}
                  {(selectedFlat.notes?.length > 0 || selectedFlat.images?.length > 0) && (
                    <div className="flex gap-1.5 ml-auto">
                      {selectedFlat.notes?.length > 0 && (
                        <span className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-md shadow-md flex items-center gap-1">
                          <StickyNote size={12} />
                          {selectedFlat.notes.length}
                        </span>
                      )}
                      {selectedFlat.images?.length > 0 && (
                        <span className="px-2 py-1 text-xs font-bold bg-purple-600 text-white rounded-md shadow-md flex items-center gap-1">
                          <Camera size={12} />
                          {selectedFlat.images.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {selectedFlat.is_joint_refuge && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                    💡 Shares bathroom with partner flat
                  </p>
                )}
              </div>

              {/* Overall Completion Card */}
              <div className="p-4 md:p-5 bg-neutral-50 dark:bg-dark-hover rounded-xl">
                <p className="text-xs md:text-sm text-neutral-600 dark:text-dark-muted mb-2">Overall Completion</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-4 md:h-3 bg-neutral-200 dark:bg-dark-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selectedFlat.completion_percentage === 100
                            ? 'bg-progress-complete'
                            : selectedFlat.completion_percentage > 0
                            ? 'bg-progress-partial'
                            : 'bg-progress-pending'
                        }`}
                        style={{ width: `${selectedFlat.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xl md:text-lg font-bold text-neutral-800 dark:text-dark-text">
                    {selectedFlat.completion_percentage}%
                  </span>
                </div>
              </div>

              {/* Flat Notes */}
              {selectedFlat.notes && selectedFlat.notes.length > 0 && (
                <div className="mt-4 md:mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote size={18} className="text-neutral-700 dark:text-dark-text" />
                    <h4 className="text-base md:text-lg font-bold text-neutral-800 dark:text-dark-text">Notes by Work Item</h4>
                  </div>
                  <div className="space-y-4">
                    {/* Group notes by work item */}
                    {Object.entries(
                      selectedFlat.notes.reduce((acc, note) => {
                        const workItemCode = note.work_items?.code || 'Unknown'
                        const workItemName = note.work_items?.name || 'Unknown Work Item'
                        const key = `${workItemCode}-${workItemName}`
                        if (!acc[key]) acc[key] = { code: workItemCode, name: workItemName, notes: [] }
                        acc[key].notes.push(note)
                        return acc
                      }, {})
                    ).map(([key, group]) => (
                      <div key={key} className="border border-neutral-200 dark:border-dark-border rounded-lg p-3">
                        <h5 className="text-sm font-bold text-primary-600 dark:text-primary-400 mb-2">
                          {group.code} - {group.name}
                        </h5>
                        <div className="space-y-2">
                          {group.notes.map((note) => (
                            <div key={note.id} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{note.note_text}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                                {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flat Images */}
              {selectedFlat.images && selectedFlat.images.length > 0 && (
                <div className="mt-4 md:mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera size={18} className="text-neutral-700 dark:text-dark-text" />
                    <h4 className="text-base md:text-lg font-bold text-neutral-800 dark:text-dark-text">Images ({selectedFlat.images.length})</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFlat.images.map((image) => (
                      <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        <img
                          src={image.image_url}
                          alt={image.caption || 'Flat image'}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => {
                            // Create a new window with the base64 image
                            const newWindow = window.open('', '_blank')
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head>
                                    <title>${image.caption || 'Image'}</title>
                                    <style>
                                      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
                                      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                    </style>
                                  </head>
                                  <body>
                                    <img src="${image.image_url}" alt="${image.caption || 'Image'}" />
                                  </body>
                                </html>
                              `)
                              newWindow.document.close()
                            }
                          }}
                        />
                        {image.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 px-2">
                            {image.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Items Progress - Moved to bottom */}
              {selectedFlat.work_items_progress && selectedFlat.work_items_progress.length > 0 && (
                <div className="mt-4 md:mt-6">
                  <h4 className="text-base md:text-lg font-bold text-neutral-800 dark:text-dark-text mb-3 md:mb-4">Work Items Progress</h4>
                  <div className="space-y-2.5 md:space-y-3 max-h-[50vh] md:max-h-96 overflow-y-auto pr-1">
                    {selectedFlat.work_items_progress.map((item) => (
                      <div key={item.work_item_code} className="p-3 md:p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg border border-neutral-200 dark:border-dark-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm md:text-sm font-bold text-neutral-700 dark:text-neutral-300">
                            {item.work_item_code}
                          </span>
                          <span className="text-base md:text-sm font-bold text-neutral-800 dark:text-dark-text">
                            {item.completion_percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-dark-muted mb-2 line-clamp-1">{item.work_item_name}</p>
                        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                          <span className="font-medium">{item.completed_quantity}</span>
                          <span>/</span>
                          <span>{item.total_quantity}</span>
                          <span className="ml-auto font-medium">{item.unit}</span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5 md:h-2 mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.completion_percentage === 100
                                ? 'bg-progress-complete'
                                : item.completion_percentage > 0
                                ? 'bg-progress-partial'
                                : 'bg-progress-pending'
                            }`}
                            style={{ width: `${item.completion_percentage}%` }}
                          />
                        </div>
                        
                        {/* Show detailed checks if available */}
                        {item.detailed_checks && item.detailed_checks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.detailed_checks.map((check) => (
                              <div key={check.id} className="flex items-center gap-2 text-xs">
                                {check.is_completed ? (
                                  <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                                ) : (
                                  <Circle size={14} className="text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                                )}
                                <span className={check.is_completed ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-500 dark:text-neutral-500"}>
                                  {check.detail_config?.detail_name}
                                  {check.detail_config?.category && (
                                    <span className="text-neutral-400 dark:text-neutral-600 ml-1">
                                      ({check.detail_config.category.replace('_', ' ')})
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs md:text-sm text-neutral-600 dark:text-dark-muted space-y-1 mt-4 md:mt-6 pt-3 md:pt-4 border-t border-neutral-200 dark:border-dark-border">
                <p>💡 Tap other flats to view their details</p>
                <p className="hidden md:block">🖱️ Drag to rotate • Scroll to zoom • Pan to move</p>
                <p className="md:hidden">👆 Swipe to rotate • Pinch to zoom</p>
                <p>🎨 Colors indicate completion status</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
